const db = require("../config/db");
const { Parser } = require("json2csv");
const { areaCodesMap } = require("../utils/areaCodes");
const { createNotification } = require("./notificationController");
const { scrubPhones } = require("../utils/blacklistAlliance");

const CSV_GOOD_FIELDS = [
  "name",
  "phone",
  "email",
  "country_code",
  "area_code",
  "state",
  "disposition",
  "age",
];
const CSV_BAD_FIELDS = [
  ...CSV_GOOD_FIELDS,
  "dnc_type",
  "reason",
];

const serializeDownloadPayload = (goodRows, badRows, summary, fileName) => {
  const goodCsv =
    goodRows.length > 0
      ? new Parser({ fields: CSV_GOOD_FIELDS }).parse(goodRows)
      : "";
  const badCsv =
    badRows.length > 0
      ? new Parser({ fields: CSV_BAD_FIELDS }).parse(badRows)
      : "";

  return JSON.stringify({
    isScrubbed: true,
    summary: {
      fileName: fileName || `leads_download_${Date.now()}.csv`,
      scrubDate: new Date().toLocaleString(),
      ...summary,
    },
    goodCsv,
    badCsv,
  });
};

const saveDownloadLogPayload = async (logId, payload) => {
  if (!logId || !payload) return;
  await db.query(
    `UPDATE download_logs SET csv_payload = $1 WHERE id = $2`,
    [payload, logId],
  );
};

// ─────────────────────────────────────────────────────────────
// HELPER: build WHERE clause from filters (shared logic)
// ─────────────────────────────────────────────────────────────
async function buildFilters(
  client,
  { vendor_id, campaign_id, states, min_age, max_age },
) {
  const filters = ["status = 'available'"];
  const params = [];
  let paramIdx = 1;

  if (vendor_id && vendor_id !== "all") {
    filters.push(`vendor_id = $${paramIdx++}`);
    params.push(vendor_id);
  }

  if (campaign_id && campaign_id !== "all") {
    const campRes = await client.query(
      "SELECT name FROM campaigns WHERE campaign_id = $1",
      [campaign_id],
    );
    if (campRes.rows.length > 0) {
      filters.push(`campaign_type = $${paramIdx++}`);
      params.push(campRes.rows[0].name);
    } else {
      filters.push(`1 = 0`);
    }
  }

  if (states && Array.isArray(states) && states.length > 0) {
    const matchingCodes = [];
    for (const [code, state] of Object.entries(areaCodesMap)) {
      if (states.includes(state)) matchingCodes.push(code);
    }
    if (matchingCodes.length > 0) {
      const placeholders = matchingCodes.map(() => `$${paramIdx++}`).join(",");
      filters.push(`area_code IN (${placeholders})`);
      params.push(...matchingCodes);
    } else {
      filters.push(`1 = 0`);
    }
  }

  if (min_age !== undefined && min_age !== null && min_age !== "") {
    filters.push(`age >= $${paramIdx++}`);
    params.push(parseInt(min_age));
  }

  if (max_age !== undefined && max_age !== null && max_age !== "") {
    filters.push(`age <= $${paramIdx++}`);
    params.push(parseInt(max_age));
  }

  return { filters, params, paramIdx };
}

// ─────────────────────────────────────────────────────────────
// HELPER: perform the actual DB download + return CSV rows
// ─────────────────────────────────────────────────────────────
async function executeDownload(
  client,
  {
    vendor_id,
    campaign_id,
    states,
    quantity,
    user_id,
    approved_by_id,
    min_age,
    max_age,
  },
) {
  const { filters, params, paramIdx } = await buildFilters(client, {
    vendor_id,
    campaign_id,
    states,
    min_age,
    max_age,
  });
  const whereClause = filters.join(" AND ");

  const updateQuery = `
        WITH selected_leads AS (
            SELECT id 
            FROM leads 
            WHERE ${whereClause} 
              AND NOT EXISTS (
                SELECT 1 FROM dnc_numbers d WHERE d.phone = leads.phone
              )
            ORDER BY uploaded_at ASC
            FOR UPDATE SKIP LOCKED
            LIMIT $${paramIdx}
        )
        UPDATE leads l
        SET status = 'downloaded', downloaded_at = CURRENT_TIMESTAMP
        FROM selected_leads sl
        WHERE l.id = sl.id
        RETURNING l.name, l.phone, l.email, l.country_code, l.area_code, l.disposition, l.age
    `;
  params.push(quantity);

  const result = await client.query(updateQuery, params);

  let finalRows = result.rows;
  let badRowsWithState = [];
  let blacklistCount = 0;
  let stateDncCount = 0;
  let federalDncCount = 0;
  let badPhoneCount = 0;
  let scrubErrors = 0;

  if (result.rows.length > 0) {
    const allPhones = result.rows.map((r) => r.phone);

    try {
      const scrubResult = await scrubPhones(allPhones);

      // Classify the bad numbers
      for (const item of scrubResult.bad) {
        const typeLower = String(item.type || "").toLowerCase();
        if (typeLower.includes("federal")) {
          federalDncCount++;
        } else if (typeLower.includes("state")) {
          stateDncCount++;
        } else if (typeLower.includes("invalid") || typeLower.includes("bad")) {
          badPhoneCount++;
        } else {
          blacklistCount++;
        }
      }

      if (scrubResult.bad.length > 0) {
        const badPhones = scrubResult.bad.map((b) => b.phone);

        // 1. Revert status back in leads table (set to available, downloaded_at to null, disposition to 'DNC')
        await client.query(
          `
            UPDATE leads
            SET status = 'available',
                downloaded_at = null,
                disposition = 'DNC'
            WHERE phone = ANY($1::text[])
          `,
          [badPhones],
        );

        // 2. Add bad numbers to dnc_numbers table in a single high-performance batch insert
        const valueStrings = [];
        const insertValues = [];
        let idx = 1;
        for (const badItem of scrubResult.bad) {
          valueStrings.push(
            `($${idx}, $${idx + 1}, $${idx + 2}, $${idx + 3}, $${idx + 4})`,
          );
          insertValues.push(
            badItem.phone,
            "DNC",
            "Blacklist Alliance API",
            `Auto-Scrubbed on download. Reason: ${badItem.reason}`,
            user_id || null,
          );
          idx += 5;
        }

        const insertDncQuery = `
          INSERT INTO dnc_numbers (phone, dnc_type, source, notes, created_by)
          VALUES ${valueStrings.join(",")}
          ON CONFLICT (phone) DO UPDATE
          SET dnc_type = EXCLUDED.dnc_type,
              source = EXCLUDED.source,
              notes = EXCLUDED.notes,
              created_by = EXCLUDED.created_by
        `;
        await client.query(insertDncQuery, insertValues);

        // 3. Prepare the bad rows return array
        const badLeads = result.rows.filter((r) => badPhones.includes(r.phone));
        badRowsWithState = badLeads.map((r) => {
          const scrubInfo =
            scrubResult.bad.find((b) => b.phone === r.phone) || {};
          let code = r.area_code;
          if (!code || code === "Unknown") {
            const clean = r.phone ? String(r.phone).replace(/\D/g, "") : "";
            if (clean.length === 11 && clean.startsWith("1"))
              code = clean.substring(1, 4);
            else if (clean.length === 10) code = clean.substring(0, 3);
          }
          return {
            ...r,
            state: areaCodesMap[code] || "Unknown",
            dnc_type: scrubInfo.type || "DNC",
            reason: scrubInfo.reason || "Blacklist Alliance Match",
          };
        });

        // 4. Filter out bad leads so only good leads are downloaded
        finalRows = result.rows.filter((r) => !badPhones.includes(r.phone));
      }
    } catch (scrubErr) {
      console.error(
        "[Blacklist Alliance] Scrubbing failed. Proceeding with original leads for safety.",
        scrubErr.message,
      );
      scrubErrors = result.rows.length;
    }
  }

  // Log the download — include approved_by if it was a request approval
  const logRes = await client.query(
    `INSERT INTO download_logs (
       user_id, vendor_id, country_code, area_code, quantity, approved_by,
       campaign_id, states, min_age, max_age
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     RETURNING id`,
    [
      user_id,
      vendor_id || null,
      null,
      null,
      finalRows.length,
      approved_by_id || null,
      campaign_id && campaign_id !== "all" ? campaign_id : null,
      states && states.length > 0 ? states : null,
      min_age !== undefined && min_age !== null && min_age !== ""
        ? parseInt(min_age, 10)
        : null,
      max_age !== undefined && max_age !== null && max_age !== ""
        ? parseInt(max_age, 10)
        : null,
    ],
  );
  const logId = logRes.rows[0]?.id || null;

  const rowsWithState = finalRows.map((r) => {
    let code = r.area_code;
    if (!code || code === "Unknown") {
      const clean = r.phone ? String(r.phone).replace(/\D/g, "") : "";
      if (clean.length === 11 && clean.startsWith("1"))
        code = clean.substring(1, 4);
      else if (clean.length === 10) code = clean.substring(0, 3);
    }
    return {
      ...r,
      state: areaCodesMap[code] || "Unknown",
    };
  });

  return {
    logId,
    goodRows: rowsWithState,
    badRows: badRowsWithState,
    summary: {
      total: result.rows.length,
      blacklist: blacklistCount,
      suppress: 0,
      stateDnc: stateDncCount,
      federalDnc: federalDncCount,
      wireless: 0,
      landline: 0,
      good: finalRows.length,
      errors: scrubErrors,
      badPhone: badPhoneCount,
    },
  };
}

// ─────────────────────────────────────────────────────────────
// POST /api/download
// SuperAdmin → direct download (existing behaviour preserved)
// Admin      → now blocked; use /api/download/request instead
// ─────────────────────────────────────────────────────────────
const downloadLeads = async (req, res) => {
  // Only super_admin can use the direct download endpoint
  if (req.user.role !== "super_admin") {
    return res.status(403).json({
      message:
        "Admins must submit a download request. Use POST /api/download/request",
    });
  }

  const client = await db.getClient();
  try {
    const { vendor_id, quantity, states, campaign_id, min_age, max_age } =
      req.body;
    if (!quantity || quantity <= 0) {
      return res.status(400).json({ message: "Valid quantity is required" });
    }

    await client.query("BEGIN");
    const { goodRows, badRows, summary, logId } = await executeDownload(client, {
      vendor_id: vendor_id && vendor_id !== "all" ? vendor_id : null,
      campaign_id: campaign_id && campaign_id !== "all" ? campaign_id : null,
      states,
      quantity,
      user_id: req.user.id,
      min_age,
      max_age,
    });

    if (goodRows.length === 0 && badRows.length === 0) {
      await client.query("ROLLBACK");
      return res
        .status(404)
        .json({ message: "No available leads found matching criteria" });
    }

    await client.query("COMMIT");

    const fileName = `leads_download_${Date.now()}.csv`;
    const payload = serializeDownloadPayload(
      goodRows,
      badRows,
      summary,
      fileName,
    );
    await saveDownloadLogPayload(logId, payload);

    const parsed = JSON.parse(payload);
    return res.status(200).json({
      isScrubbed: true,
      logId,
      ...parsed,
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Direct Download Error:", err);
    return res
      .status(500)
      .json({ message: "Server error processing download" });
  } finally {
    client.release();
  }
};

// ─────────────────────────────────────────────────────────────
// POST /api/download/request
// Admin submits a download request → stored as "pending"
// ─────────────────────────────────────────────────────────────
const createDownloadRequest = async (req, res) => {
  try {
    const { vendor_id, quantity, states, campaign_id, min_age, max_age } =
      req.body;

    if (!vendor_id) {
      return res.status(400).json({ message: "Please select a vendor." });
    }
    if (!quantity || quantity <= 0) {
      return res.status(400).json({ message: "Valid quantity is required." });
    }

    const result = await db.query(
      `INSERT INTO download_requests
               (admin_id, vendor_id, campaign_id, quantity, states, min_age, max_age)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             RETURNING *`,
      [
        req.user.id,
        vendor_id && vendor_id !== "all" ? vendor_id : null,
        campaign_id && campaign_id !== "all" ? campaign_id : null,
        quantity,
        states && states.length ? states : null,
        min_age || null,
        max_age || null,
      ],
    );

    const newRequest = result.rows[0];

    // Notify all super_admins
    const superAdmins = await db.query(
      `SELECT id FROM users WHERE role='super_admin'`,
    );
    const adminDisplayName = req.user.first_name
      ? `${req.user.first_name} ${req.user.last_name || ""}`.trim()
      : req.user.username;

    for (const sa of superAdmins.rows) {
      await createNotification(
        sa.id,
        "download_request_new",
        "📥 New Download Request",
        `${adminDisplayName} has requested to download ${quantity.toLocaleString()} leads from vendor data.`,
        newRequest.id,
      );
    }

    return res.status(201).json({
      message:
        "Download request submitted successfully. Awaiting SuperAdmin approval.",
      request: newRequest,
    });
  } catch (err) {
    console.error("Create Download Request Error:", err);
    return res.status(500).json({ message: "Server error creating request" });
  }
};

// ─────────────────────────────────────────────────────────────
// GET /api/download/requests
// SuperAdmin → fetch ALL requests (with admin & vendor names)
// ─────────────────────────────────────────────────────────────
const getDownloadRequests = async (req, res) => {
  try {
    const result = await db.query(`
            SELECT
                dr.id,
                dr.quantity,
                dr.states,
                dr.status,
                dr.rejection_reason,
                dr.min_age,
                dr.max_age,
                dr.requested_at,
                dr.reviewed_at,
                u.username  AS admin_username,
                u.first_name AS admin_first_name,
                u.last_name  AS admin_last_name,
                v.name       AS vendor_name,
                c.name       AS campaign_name,
                rv.username  AS reviewed_by_username
            FROM download_requests dr
            LEFT JOIN users u  ON dr.admin_id = u.id
            LEFT JOIN vendors v ON dr.vendor_id = v.vendor_id
            LEFT JOIN campaigns c ON dr.campaign_id = c.campaign_id
            LEFT JOIN users rv ON dr.reviewed_by = rv.id
            ORDER BY
                CASE dr.status WHEN 'pending' THEN 0 ELSE 1 END,
                dr.requested_at DESC
        `);
    return res.json(result.rows);
  } catch (err) {
    console.error("Get Download Requests Error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// ─────────────────────────────────────────────────────────────
// GET /api/download/requests/mine
// Admin → fetch only their own requests
// ─────────────────────────────────────────────────────────────
const getMyDownloadRequests = async (req, res) => {
  try {
    const result = await db.query(
      `
            SELECT
                dr.id,
                dr.quantity,
                dr.states,
                dr.status,
                dr.rejection_reason,
                dr.min_age,
                dr.max_age,
                dr.requested_at,
                dr.reviewed_at,
                v.name AS vendor_name,
                c.name AS campaign_name
            FROM download_requests dr
            LEFT JOIN vendors v  ON dr.vendor_id  = v.vendor_id
            LEFT JOIN campaigns c ON dr.campaign_id = c.campaign_id
            WHERE dr.admin_id = $1
            ORDER BY dr.requested_at DESC
        `,
      [req.user.id],
    );
    return res.json(result.rows);
  } catch (err) {
    console.error("Get My Download Requests Error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// ─────────────────────────────────────────────────────────────
// PATCH /api/download/requests/:id
// SuperAdmin → Accept or Reject a pending request
// Body: { action: 'accept' | 'reject', rejection_reason?: string }
// ─────────────────────────────────────────────────────────────
const reviewDownloadRequest = async (req, res) => {
  const { id } = req.params;
  const { action, rejection_reason } = req.body;

  if (!["accept", "reject"].includes(action)) {
    return res
      .status(400)
      .json({ message: 'Action must be "accept" or "reject".' });
  }

  const client = await db.getClient();
  let txnStarted = false;
  try {
    // Fetch the request
    const reqRes = await client.query(
      `SELECT * FROM download_requests WHERE id = $1`,
      [id],
    );
    if (reqRes.rows.length === 0) {
      return res.status(404).json({ message: "Download request not found." });
    }
    const dlReq = reqRes.rows[0];
    if (dlReq.status !== "pending") {
      return res
        .status(400)
        .json({ message: `Request is already ${dlReq.status}.` });
    }

    if (action === "reject") {
      await client.query(
        `UPDATE download_requests
                 SET status='rejected', rejection_reason=$1, reviewed_at=NOW(), reviewed_by=$2
                 WHERE id=$3`,
        [rejection_reason || null, req.user.id, id],
      );
      // Notify the admin
      await createNotification(
        dlReq.admin_id,
        "download_request_rejected",
        "❌ Download Request Rejected",
        rejection_reason
          ? `Your download request for ${dlReq.quantity?.toLocaleString()} leads was rejected. Reason: ${rejection_reason}`
          : `Your download request for ${dlReq.quantity?.toLocaleString()} leads was rejected by the SuperAdmin.`,
        dlReq.id,
      );
      return res.json({ message: "Request rejected successfully." });
    }

    // ── Accept ── (BEGIN transaction only for accepts)
    await client.query("BEGIN");
    txnStarted = true;

    const { goodRows, badRows, summary, logId } = await executeDownload(client, {
      vendor_id: dlReq.vendor_id,
      campaign_id: dlReq.campaign_id,
      states: dlReq.states,
      quantity: dlReq.quantity,
      min_age: dlReq.min_age,
      max_age: dlReq.max_age,
      user_id: dlReq.admin_id,
      approved_by_id: req.user.id, // ← the super_admin who approved
    });

    if (goodRows.length === 0 && badRows.length === 0) {
      await client.query("ROLLBACK");
      txnStarted = false;
      // Mark as rejected due to no data available
      await db.query(
        `UPDATE download_requests
                 SET status='rejected', rejection_reason='No available leads found matching the criteria at time of approval.',
                     reviewed_at=NOW(), reviewed_by=$1
                 WHERE id=$2`,
        [req.user.id, id],
      );
      return res.status(404).json({
        message:
          "No available leads found. Request has been marked as rejected.",
      });
    }

    // Store CSV in the request row so admin can download it later
    const serializedData = serializeDownloadPayload(
      goodRows,
      badRows,
      summary,
      `approved_leads_${id}.csv`,
    );

    await client.query(
      `UPDATE download_requests
             SET status='accepted', reviewed_at=NOW(), reviewed_by=$1, csv_data=$2
             WHERE id=$3`,
      [req.user.id, serializedData, id],
    );

    await client.query("COMMIT");
    await saveDownloadLogPayload(logId, serializedData);
    txnStarted = false;

    // Notify the admin that their request was approved
    await createNotification(
      dlReq.admin_id,
      "download_request_accepted",
      "✅ Download Request Approved!",
      `Your download request for ${goodRows.length.toLocaleString()} leads has been approved. You can now download your CSV file.`,
      dlReq.id,
    );

    return res.json({
      message: `Request accepted. ${goodRows.length} leads are ready for the admin to download.`,
      lead_count: goodRows.length,
    });
  } catch (err) {
    if (txnStarted) await client.query("ROLLBACK").catch(() => {});
    console.error("Review Download Request Error:", err);
    return res.status(500).json({ message: "Server error processing request" });
  } finally {
    client.release();
  }
};

// ─────────────────────────────────────────────────────────────
// GET /api/download/requests/:id/file
// Admin → download the CSV for an accepted request
// ─────────────────────────────────────────────────────────────
const executeApprovedDownload = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await db.query(
      `SELECT * FROM download_requests WHERE id=$1 AND admin_id=$2`,
      [id, req.user.id],
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Request not found." });
    }
    const dlReq = result.rows[0];
    if (dlReq.status !== "accepted") {
      return res
        .status(400)
        .json({ message: `Request is ${dlReq.status}, not accepted.` });
    }
    if (!dlReq.csv_data) {
      return res
        .status(400)
        .json({ message: "CSV data not available for this request." });
    }

    if (dlReq.csv_data.trim().startsWith("{")) {
      return res.status(200).json(JSON.parse(dlReq.csv_data));
    } else {
      // Legacy compatibility
      return res.status(200).json({
        isScrubbed: false,
        goodCsv: dlReq.csv_data,
        badCsv: "",
        summary: {
          fileName: `approved_leads_${id}.csv`,
          scrubDate: new Date(dlReq.reviewed_at || Date.now()).toLocaleString(),
          total: dlReq.quantity,
          blacklist: 0,
          suppress: 0,
          stateDnc: 0,
          federalDnc: 0,
          wireless: 0,
          landline: 0,
          good: dlReq.quantity,
          errors: 0,
          badPhone: 0,
        },
      });
    }
  } catch (err) {
    console.error("Execute Approved Download Error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// ─────────────────────────────────────────────────────────────
// GET /api/download/logs  (existing – unchanged)
// ─────────────────────────────────────────────────────────────
const getDownloadLogs = async (req, res) => {
  try {
    const result = await db.query(`
            SELECT
                dl.*,
                u.username,
                u.first_name  AS user_first_name,
                u.last_name   AS user_last_name,
                v.name        AS vendor_name,
                ap.username   AS approved_by_username,
                ap.first_name AS approved_by_first_name,
                ap.last_name  AS approved_by_last_name
            FROM download_logs dl
            LEFT JOIN users u  ON dl.user_id    = u.id
            LEFT JOIN users ap ON dl.approved_by = ap.id
            LEFT JOIN vendors v ON dl.vendor_id  = v.vendor_id
            ORDER BY dl.download_date DESC
            LIMIT 100
        `);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

const formatDownloadedBy = (row) => {
  const name = [row.user_first_name, row.user_last_name].filter(Boolean).join(" ").trim();
  return name || row.username || "—";
};

const parseDownloadLogMeta = (row) => {
  let fileName = null;
  let cleanCount = parseInt(row.quantity, 10) || 0;
  let dncCount = 0;
  let canRedownload = false;
  let canDownloadDnc = false;

  if (row.csv_payload) {
    try {
      const payload = JSON.parse(row.csv_payload);
      const summary = payload.summary || {};
      fileName = summary.fileName || null;
      cleanCount = parseInt(summary.good, 10);
      if (Number.isNaN(cleanCount)) cleanCount = parseInt(row.quantity, 10) || 0;

      dncCount =
        (parseInt(summary.blacklist, 10) || 0) +
        (parseInt(summary.stateDnc, 10) || 0) +
        (parseInt(summary.federalDnc, 10) || 0) +
        (parseInt(summary.badPhone, 10) || 0);

      if (payload.badCsv && String(payload.badCsv).trim()) {
        const badLines = String(payload.badCsv).trim().split("\n");
        const badRows = Math.max(0, badLines.length - 1);
        if (badRows > dncCount) dncCount = badRows;
        canDownloadDnc = badRows > 0;
      }

      canRedownload = Boolean(payload.goodCsv && String(payload.goodCsv).trim());
    } catch (_) {
      canRedownload = false;
      canDownloadDnc = false;
    }
  }

  const statesList = Array.isArray(row.states) ? row.states.filter(Boolean) : [];

  return {
    id: row.id,
    download_date: row.download_date,
    downloaded_by: formatDownloadedBy(row),
    vendor_name: row.vendor_name || "All Vendors",
    vendor_id: row.vendor_id,
    file_name: fileName || `download_${row.id}.csv`,
    states: statesList,
    states_label: statesList.length > 0 ? statesList.join(", ") : "All States",
    dnc_removed: dncCount,
    clean_count: cleanCount,
    campaign_name: row.campaign_name || null,
    can_redownload: canRedownload,
    can_download_dnc: canDownloadDnc,
    approved_by_username: row.approved_by_username || null,
  };
};

// GET /api/download/already-downloaded/list — flat table for UI
const getAlreadyDownloadedList = async (req, res) => {
  try {
    const { vendor_id, page = 1, limit = 100 } = req.query;
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(500, Math.max(1, parseInt(limit, 10) || 100));
    const offset = (pageNum - 1) * limitNum;

    const params = [];
    let where = "WHERE 1=1";
    if (vendor_id && vendor_id !== "all") {
      params.push(vendor_id);
      where += ` AND dl.vendor_id = $${params.length}`;
    }

    const dataQuery = `
      SELECT
        dl.id,
        dl.vendor_id,
        dl.quantity,
        dl.states,
        dl.download_date,
        dl.csv_payload,
        COALESCE(v.name, 'All Vendors') AS vendor_name,
        c.name AS campaign_name,
        u.username,
        u.first_name AS user_first_name,
        u.last_name AS user_last_name,
        ap.username AS approved_by_username
      FROM download_logs dl
      LEFT JOIN vendors v ON dl.vendor_id = v.vendor_id
      LEFT JOIN campaigns c ON dl.campaign_id = c.campaign_id
      LEFT JOIN users u ON dl.user_id = u.id
      LEFT JOIN users ap ON dl.approved_by = ap.id
      ${where}
      ORDER BY dl.download_date DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `;

    const countQuery = `
      SELECT COUNT(*)::int AS count
      FROM download_logs dl
      ${where}
    `;

    const [dataResult, countResult] = await Promise.all([
      db.query(dataQuery, [...params, limitNum, offset]),
      db.query(countQuery, params),
    ]);

    const data = dataResult.rows.map(parseDownloadLogMeta);

    res.json({
      data,
      total: countResult.rows[0]?.count || 0,
      page: pageNum,
      limit: limitNum,
    });
  } catch (err) {
    console.error("Already Downloaded List Error:", err);
    res.status(500).json({ message: "Server error fetching download list" });
  }
};

// GET /api/download/already-downloaded — vendors grouped with download counts
const getAlreadyDownloadedSummary = async (req, res) => {
  try {
    const result = await db.query(`
      SELECT
        dl.vendor_id,
        COALESCE(v.name, 'All Vendors') AS vendor_name,
        COUNT(dl.id)::int AS download_count,
        COALESCE(SUM(dl.quantity), 0)::int AS total_leads_downloaded,
        MAX(dl.download_date) AS last_download_at,
        BOOL_OR(dl.csv_payload IS NOT NULL AND dl.csv_payload <> '') AS has_stored_file
      FROM download_logs dl
      LEFT JOIN vendors v ON dl.vendor_id = v.vendor_id
      GROUP BY dl.vendor_id, v.name
      ORDER BY MAX(dl.download_date) DESC
    `);
    res.json({ data: result.rows });
  } catch (err) {
    console.error("Already Downloaded Summary Error:", err);
    res.status(500).json({ message: "Server error fetching download history" });
  }
};

// GET /api/download/already-downloaded/:vendorId/history — each download event
const getVendorDownloadHistory = async (req, res) => {
  try {
    const { vendorId } = req.params;
    const isAll = vendorId === "all" || vendorId === "null";

    const params = [];
    let vendorFilter = "";
    if (isAll) {
      vendorFilter = "dl.vendor_id IS NULL";
    } else {
      vendorFilter = `dl.vendor_id = $1`;
      params.push(vendorId);
    }

    const result = await db.query(
      `
      SELECT
        dl.id,
        dl.vendor_id,
        dl.quantity,
        dl.states,
        dl.min_age,
        dl.max_age,
        dl.download_date,
        dl.csv_payload IS NOT NULL AND dl.csv_payload <> '' AS can_redownload,
        COALESCE(v.name, 'All Vendors') AS vendor_name,
        c.name AS campaign_name,
        u.username,
        u.first_name AS user_first_name,
        u.last_name AS user_last_name,
        ap.username AS approved_by_username
      FROM download_logs dl
      LEFT JOIN vendors v ON dl.vendor_id = v.vendor_id
      LEFT JOIN campaigns c ON dl.campaign_id = c.campaign_id
      LEFT JOIN users u ON dl.user_id = u.id
      LEFT JOIN users ap ON dl.approved_by = ap.id
      WHERE ${vendorFilter}
      ORDER BY dl.download_date DESC
      `,
      params,
    );

    res.json({
      vendor_id: isAll ? null : vendorId,
      vendor_name: result.rows[0]?.vendor_name || "Unknown",
      download_count: result.rows.length,
      history: result.rows,
    });
  } catch (err) {
    console.error("Vendor Download History Error:", err);
    res.status(500).json({ message: "Server error fetching vendor history" });
  }
};

// GET /api/download/logs/:id/file — re-download stored CSV from history
const getDownloadLogFile = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query(
      `SELECT csv_payload, quantity FROM download_logs WHERE id = $1`,
      [id],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Download record not found" });
    }

    const row = result.rows[0];
    if (!row.csv_payload) {
      return res.status(404).json({
        message:
          "This download was recorded before file storage was enabled. Re-download is not available.",
      });
    }

    return res.status(200).json(JSON.parse(row.csv_payload));
  } catch (err) {
    console.error("Get Download Log File Error:", err);
    res.status(500).json({ message: "Server error loading download file" });
  }
};

module.exports = {
  downloadLeads,
  createDownloadRequest,
  getDownloadRequests,
  getMyDownloadRequests,
  reviewDownloadRequest,
  executeApprovedDownload,
  getDownloadLogs,
  getAlreadyDownloadedSummary,
  getAlreadyDownloadedList,
  getVendorDownloadHistory,
  getDownloadLogFile,
};
