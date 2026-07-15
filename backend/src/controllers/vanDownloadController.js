const db = require("../config/db");
const { Parser } = require("json2csv");
const { areaCodesMap } = require("../utils/areaCodes");
const { scrubPhones, normalizePhone } = require("../utils/blacklistAlliance");

const CSV_GOOD_FIELDS = [
  { label: 'First Name', value: 'first_name' },
  { label: 'Last Name', value: 'last_name' },
  { label: 'Phone No', value: 'phone' },
  { label: 'Email', value: 'email' },
  { label: 'Area Code', value: 'area_code' },
  { label: 'State', value: 'state' },
  { label: 'Age', value: 'age' }
];

const CSV_BAD_FIELDS = [
  ...CSV_GOOD_FIELDS,
  { label: 'DNC Type', value: 'dnc_type' },
  { label: 'Reason', value: 'reason' }
];

const DNC_UPSERT_BATCH_SIZE = 3000;

// Local helper to upsert bad phones into dead_numbers
const upsertDeadNumbersBatched = async ({ queryFn, badItems }) => {
  if (!Array.isArray(badItems) || badItems.length === 0) return;

  for (let i = 0; i < badItems.length; i += DNC_UPSERT_BATCH_SIZE) {
    const chunk = badItems.slice(i, i + DNC_UPSERT_BATCH_SIZE);
    const valueStrings = [];
    const insertValues = [];
    let idx = 1;

    for (const badItem of chunk) {
      valueStrings.push(`($${idx}, $${idx + 1})`);
      insertValues.push(badItem.phone, 'Van Desk Download BLA Scrub');
      idx += 2;
    }

    await queryFn(
      `
        INSERT INTO dead_numbers (phone, source)
        VALUES ${valueStrings.join(",")}
        ON CONFLICT (phone) DO NOTHING
      `,
      insertValues
    );
  }
};

// Build WHERE filters for download queries
function buildFilters({ vendor_id, states, min_age, max_age, include_downloaded, job_id }) {
  const filters = include_downloaded 
    ? ["status IN ('available', 'downloaded', 'DNC')"] 
    : ["status = 'available'"];
  const params = [];
  let idx = 1;

  if (vendor_id && vendor_id !== "all") {
    filters.push(`vendor_id = $${idx++}`);
    params.push(vendor_id);
  }

  if (job_id) {
    filters.push(`job_id = $${idx++}`);
    params.push(job_id);
  }

  if (states && Array.isArray(states) && states.length > 0) {
    const matchingCodes = [];
    for (const [code, stateAbbr] of Object.entries(areaCodesMap)) {
      if (states.includes(stateAbbr)) matchingCodes.push(code);
    }
    if (matchingCodes.length > 0) {
      const placeholders = matchingCodes.map(() => `$${idx++}`).join(",");
      filters.push(`area_code IN (${placeholders})`);
      params.push(...matchingCodes);
    } else {
      filters.push("1=0");
    }
  }

  if (min_age !== undefined && min_age !== null && min_age !== "") {
    filters.push(`age >= $${idx++}`);
    params.push(parseInt(min_age));
  }

  if (max_age !== undefined && max_age !== null && max_age !== "") {
    filters.push(`age <= $${idx++}`);
    params.push(parseInt(max_age));
  }

  return { filters, params, paramIdx: idx };
}

// POST /api/van-download
const downloadVanData = async (req, res) => {
  const client = await db.getClient();
  try {
    const { vendor_id, quantity, states, min_age, max_age, include_downloaded, job_id } = req.body;
    if (!quantity || quantity <= 0) return res.status(400).json({ message: "Valid quantity is required" });

    const { filters, params, paramIdx } = buildFilters({ vendor_id, states, min_age, max_age, include_downloaded, job_id });
    const whereClause = filters.join(" AND ");

    await client.query("BEGIN");

    const updateQuery = `
      WITH selected AS (
        SELECT id FROM van_data WHERE ${whereClause}
        ORDER BY uploaded_at ASC FOR UPDATE SKIP LOCKED LIMIT $${paramIdx}
      )
      UPDATE van_data d SET status='downloaded', downloaded_at=CURRENT_TIMESTAMP
      FROM selected s WHERE d.id = s.id
      RETURNING d.id, d.first_name, d.last_name, d.phone, d.email, d.area_code, d.age
    `;
    params.push(quantity);
    const result = await client.query(updateQuery, params);
    await client.query("COMMIT");

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "No available van data found matching criteria" });
    }

    let finalRows = [];
    let badRowsWithState = [];
    let blacklistCount = 0;
    let stateDncCount = 0;
    let federalDncCount = 0;
    let badPhoneCount = 0;
    let scrubErrors = 0;

    const allPhones = result.rows.map((r) => r.phone);

    // Run Blacklist Alliance Scrub
    try {
      const scrubResult = await scrubPhones(allPhones);

      for (const item of scrubResult.bad) {
        const typeLower = String(item.type || "").toLowerCase();
        if (typeLower.includes("federal")) federalDncCount++;
        else if (typeLower.includes("state")) stateDncCount++;
        else if (typeLower.includes("invalid") || typeLower.includes("bad")) badPhoneCount++;
        else blacklistCount++;
      }

      if (scrubResult.bad.length > 0) {
        const badPhones = scrubResult.bad.map((b) => b.phone);
        const badPhoneSet = new Set(badPhones);
        const isBadPhone = (rowPhone) => badPhoneSet.has(normalizePhone(rowPhone));
        const scrubInfoByPhone = new Map(scrubResult.bad.map((b) => [b.phone, b]));

        // Revert bad rows back and set status to DNC
        await client.query("BEGIN");
        try {
          await client.query(
            `
              UPDATE van_data
              SET status = 'DNC',
                  downloaded_at = null
              WHERE phone = ANY($1::text[])
            `,
            [badPhones]
          );

          await upsertDeadNumbersBatched({
            queryFn: client.query.bind(client),
            badItems: scrubResult.bad
          });
          await client.query("COMMIT");
        } catch (badErr) {
          await client.query("ROLLBACK").catch(() => {});
          throw badErr;
        }

        const badLeads = result.rows.filter((r) => isBadPhone(r.phone));
        badRowsWithState = badLeads.map((r) => {
          const scrubInfo = scrubInfoByPhone.get(normalizePhone(r.phone)) || {};
          let code = r.area_code;
          if (!code || code === "Unknown") {
            const clean = r.phone ? String(r.phone).replace(/\D/g, "") : "";
            if (clean.length === 11 && clean.startsWith("1")) code = clean.substring(1, 4);
            else if (clean.length === 10) code = clean.substring(0, 3);
          }
          return {
            ...r,
            state: areaCodesMap[code] || "Unknown",
            dnc_type: scrubInfo.type || "DNC",
            reason: scrubInfo.reason || "Blacklist Alliance Match",
          };
        });

        finalRows = result.rows.filter((r) => !isBadPhone(r.phone));
      } else {
        finalRows = result.rows;
      }
    } catch (scrubErr) {
      console.error("[Blacklist Alliance] Scrubbing failed. Proceeding without BLA scrub.", scrubErr.message);
      scrubErrors = result.rows.length;
      finalRows = result.rows;
    }

    // Attach states to final good rows
    const rowsWithState = finalRows.map((r) => {
      let code = r.area_code;
      if (!code || code === "Unknown") {
        const clean = r.phone ? String(r.phone).replace(/\D/g, "") : "";
        if (clean.length === 11 && clean.startsWith("1")) code = clean.substring(1, 4);
        else if (clean.length === 10) code = clean.substring(0, 3);
      }
      return {
        ...r,
        state: areaCodesMap[code] || "Unknown",
      };
    });

    const csv = rowsWithState.length > 0 ? new Parser({ fields: CSV_GOOD_FIELDS }).parse(rowsWithState) : "";
    const badCsv = badRowsWithState.length > 0 ? new Parser({ fields: CSV_BAD_FIELDS }).parse(badRowsWithState) : "";
    const fileName = `van_download_${Date.now()}.csv`;

    const logRes = await db.query(
      `INSERT INTO van_download_logs (user_id, vendor_id, quantity, states, min_age, max_age)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
      [
        req.user.id,
        vendor_id && vendor_id !== "all" ? vendor_id : null,
        rowsWithState.length,
        states && states.length > 0 ? states : null,
        min_age || null,
        max_age || null,
      ]
    );
    const logId = logRes.rows[0]?.id;

    const summaryData = {
      total: result.rows.length,
      fileName,
      blacklist: blacklistCount,
      suppress: 0,
      stateDnc: stateDncCount,
      federalDnc: federalDncCount,
      wireless: 0,
      landline: 0,
      good: rowsWithState.length,
      errors: scrubErrors,
      badPhone: badPhoneCount,
      scrubPending: false,
      scrubCompleted: true,
      scrubFailed: scrubErrors > 0 && finalRows.length === result.rows.length
    };

    const responseBody = {
      fileName,
      logId,
      count: rowsWithState.length,
      csv,
      badCsv,
      summary: summaryData,
    };

    // Save payload for re-download
    if (logId) {
      db.query("UPDATE van_download_logs SET csv_payload=$1 WHERE id=$2", [
        JSON.stringify(responseBody),
        logId,
      ]).catch(() => {});
    }

    return res.status(200).json(responseBody);
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    console.error("Van Download Error:", err);
    res.status(500).json({ message: "Server error during download" });
  } finally {
    client.release();
  }
};

// POST /api/van-download/state-counts
const getStateCounts = async (req, res) => {
  try {
    const { vendor_id, states, min_age, max_age, include_downloaded, job_id } = req.body;
    const { filters, params } = buildFilters({ vendor_id, states, min_age, max_age, include_downloaded, job_id });
    const whereClause = filters.join(" AND ");

    const result = await db.query(
      `SELECT area_code, COUNT(id)::int as count FROM van_data WHERE ${whereClause} GROUP BY area_code`,
      params
    );

    const stateCounts = {};
    for (const row of result.rows) {
      const abbr = areaCodesMap[row.area_code] || "Unknown";
      stateCounts[abbr] = (stateCounts[abbr] || 0) + row.count;
    }

    if (states && Array.isArray(states) && states.length > 0) {
      for (const s of states) {
        if (stateCounts[s] === undefined) stateCounts[s] = 0;
      }
    }

    res.json(stateCounts);
  } catch (err) {
    console.error("Van State Counts Error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// GET /api/van-download/already-downloaded
const getAlreadyDownloaded = async (req, res) => {
  try {
    const { page = 1, limit = 100 } = req.query;
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(500, parseInt(limit, 10) || 100);
    const offset = (pageNum - 1) * limitNum;

    const dataQuery = `
      SELECT dl.*, v.name as vendor_name, u.username, u.first_name as user_first_name, u.last_name as user_last_name
      FROM van_download_logs dl
      LEFT JOIN van_vendors v ON dl.vendor_id = v.vendor_id
      LEFT JOIN users u ON dl.user_id = u.id
      ORDER BY dl.download_date DESC
      LIMIT $1 OFFSET $2
    `;
    const countQuery = `SELECT COUNT(*)::int as count FROM van_download_logs`;

    const [dataResult, countResult] = await Promise.all([
      db.query(dataQuery, [limitNum, offset]),
      db.query(countQuery),
    ]);

    const data = dataResult.rows.map((row) => {
      let canRedownload = false;
      let fileName = `van_download_${row.id}.csv`;
      if (row.csv_payload) {
        try {
          const payload = JSON.parse(row.csv_payload);
          canRedownload = Boolean(payload.csv);
          fileName = payload.fileName || fileName;
        } catch (_) {}
      }
      const name = [row.user_first_name, row.user_last_name].filter(Boolean).join(" ") || row.username || "—";
      return {
        id: row.id,
        download_date: row.download_date,
        downloaded_by: name,
        vendor_name: row.vendor_name || "All Vendors",
        vendor_id: row.vendor_id,
        file_name: fileName,
        quantity: row.quantity,
        states: Array.isArray(row.states) ? row.states : [],
        can_redownload: canRedownload,
      };
    });

    res.json({ data, total: countResult.rows[0]?.count || 0, page: pageNum, limit: limitNum });
  } catch (err) {
    console.error("Van Already Downloaded Error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// GET /api/van-download/logs/:id/file
const getDownloadFile = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await db.query("SELECT csv_payload FROM van_download_logs WHERE id=$1", [id]);
    if (result.rows.length === 0) return res.status(404).json({ message: "Record not found" });
    if (!result.rows[0].csv_payload) return res.status(404).json({ message: "No stored file" });
    res.json(JSON.parse(result.rows[0].csv_payload));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};



// ─────────────────────────────────────────────────────────────
// POST /api/van-download/request
// Admin submits a download request → stored as "pending"
// ─────────────────────────────────────────────────────────────
const createDownloadRequest = async (req, res) => {
  try {
    const {
      vendor_id,
      quantity,
      states,
      campaign_id,
      min_age,
      max_age,
      min_duration,
      max_duration,
      job_id,
      include_downloaded,
    } = req.body;

    if (!vendor_id) {
      return res.status(400).json({ message: "Please select a vendor." });
    }
    if (!quantity || quantity <= 0) {
      return res.status(400).json({ message: "Valid quantity is required." });
    }
    if ((include_downloaded === true || include_downloaded === 'true') && (!vendor_id || vendor_id === 'all')) {
      return res.status(400).json({ message: "Re-download mode requires a specific vendor (not All Vendors)." });
    }

    const result = await db.query(
      `INSERT INTO van_download_requests
               (admin_id, vendor_id, campaign_id, quantity, states, min_age, max_age, min_duration, max_duration, job_id, include_downloaded)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
             RETURNING *`,
      [
        req.user.id,
        vendor_id && vendor_id !== "all" ? vendor_id : null,
        campaign_id && campaign_id !== "all" ? campaign_id : null,
        quantity,
        states && states.length ? states : null,
        min_age || null,
        max_age || null,
        min_duration || null,
        max_duration || null,
        job_id || null,
        include_downloaded === true || include_downloaded === 'true',
      ]
    );

    const newRequest = result.rows[0];

    // Notify all super_admins
    const superAdmins = await db.query(`SELECT id FROM users WHERE role='super_admin'`);
    const adminDisplayName = req.user.first_name ? `${req.user.first_name} ${req.user.last_name || ""}`.trim() : req.user.username;

    // Optional: we can require createNotification from notifications
    // const { createNotification } = require('./notificationController');
    // For now we'll do a simple raw insert to avoid circular deps if notificationController isn't ready
    for (const sa of superAdmins.rows) {
      await db.query(`INSERT INTO notifications (user_id, type, title, message, reference_id) VALUES ($1, $2, $3, $4, $5)`, [
        sa.id,
        "download_request_new",
        "📥 New Download Request",
        `${adminDisplayName} has requested to download ${quantity.toLocaleString()} leads from Van Desk.`,
        newRequest.id
      ]);
    }

    return res.status(201).json({
      message: "Download request submitted successfully. Awaiting SuperAdmin approval.",
      request: newRequest,
    });
  } catch (err) {
    console.error("Create Download Request Error:", err);
    return res.status(500).json({ message: "Server error creating request" });
  }
};

// ─────────────────────────────────────────────────────────────
// GET /api/van-download/requests
// SuperAdmin → fetch ALL requests
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
                dr.min_duration,
                dr.max_duration,
                dr.requested_at,
                dr.reviewed_at,
                u.username  AS admin_username,
                u.first_name AS admin_first_name,
                u.last_name  AS admin_last_name,
                v.name       AS vendor_name,
                c.name       AS campaign_name,
                rv.username  AS reviewed_by_username
            FROM van_download_requests dr
            LEFT JOIN users u  ON dr.admin_id = u.id
            LEFT JOIN van_vendors v ON dr.vendor_id = v.vendor_id
            LEFT JOIN van_campaigns c ON dr.campaign_id = c.campaign_id
            LEFT JOIN users rv ON dr.reviewed_by = rv.id
            ORDER BY
                CASE LOWER(dr.status) WHEN 'pending' THEN 0 ELSE 1 END,
                dr.requested_at DESC
        `);
    return res.json(result.rows);
  } catch (err) {
    console.error("Get Download Requests Error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// ─────────────────────────────────────────────────────────────
// GET /api/van-download/requests/mine
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
                dr.min_duration,
                dr.max_duration,
                dr.requested_at,
                dr.reviewed_at,
                v.name AS vendor_name,
                c.name AS campaign_name
            FROM van_download_requests dr
            LEFT JOIN van_vendors v  ON dr.vendor_id  = v.vendor_id
            LEFT JOIN van_campaigns c ON dr.campaign_id = c.campaign_id
            WHERE dr.admin_id = $1
            ORDER BY dr.requested_at DESC
        `,
      [req.user.id]
    );
    return res.json(result.rows);
  } catch (err) {
    console.error("Get My Download Requests Error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// ─────────────────────────────────────────────────────────────
// PATCH /api/van-download/requests/:id
// SuperAdmin → Accept or Reject a pending request
// ─────────────────────────────────────────────────────────────
const reviewDownloadRequest = async (req, res) => {
  const { id } = req.params;
  const { action, rejection_reason } = req.body;

  if (!["accept", "reject"].includes(action)) {
    return res.status(400).json({ message: 'Action must be "accept" or "reject".' });
  }

  const client = await db.getClient();
  try {
    const reqRes = await client.query(`SELECT * FROM van_download_requests WHERE id = $1`, [id]);
    if (reqRes.rows.length === 0) return res.status(404).json({ message: "Download request not found." });
    
    const dlReq = reqRes.rows[0];
    if (dlReq.status.toLowerCase() !== "pending") return res.status(400).json({ message: `Request is already ${dlReq.status}.` });

    if (action === "reject") {
      await client.query(
        `UPDATE van_download_requests SET status='rejected', rejection_reason=$1, reviewed_at=NOW(), reviewed_by=$2 WHERE id=$3`,
        [rejection_reason || null, req.user.id, id]
      );
      await db.query(`INSERT INTO notifications (user_id, type, title, message, reference_id) VALUES ($1, $2, $3, $4, $5)`, [
        dlReq.admin_id, "download_request_rejected", "❌ Download Request Rejected",
        rejection_reason ? `Your download request was rejected. Reason: ${rejection_reason}` : "Your download request was rejected.",
        dlReq.id
      ]);
      return res.json({ message: "Request rejected successfully." });
    }

    // Accept -> We must execute the download logic similar to downloadVanData
    if (typeof res.setTimeout === "function") res.setTimeout(0);
    req.socket?.setKeepAlive?.(true, 30 * 1000);

    const { filters, params, paramIdx } = buildFilters({ 
        vendor_id: dlReq.vendor_id, 
        states: dlReq.states, 
        min_age: dlReq.min_age, 
        max_age: dlReq.max_age, 
        include_downloaded: dlReq.include_downloaded, 
        job_id: dlReq.job_id 
    });
    const whereClause = filters.join(" AND ");

    await client.query("BEGIN");
    const updateQuery = `
      WITH selected AS (
        SELECT id FROM van_data WHERE ${whereClause}
        ORDER BY uploaded_at ASC FOR UPDATE SKIP LOCKED LIMIT $${paramIdx}
      )
      UPDATE van_data d SET status='downloaded', downloaded_at=CURRENT_TIMESTAMP
      FROM selected s WHERE d.id = s.id
      RETURNING d.id, d.first_name, d.last_name, d.phone, d.email, d.area_code, d.age
    `;
    params.push(dlReq.quantity);
    const result = await client.query(updateQuery, params);
    await client.query("COMMIT");

    if (result.rows.length === 0) {
      await client.query(`UPDATE van_download_requests SET status='rejected', rejection_reason='No available leads found matching criteria at time of approval.', reviewed_at=NOW(), reviewed_by=$1 WHERE id=$2`, [req.user.id, id]);
      return res.status(404).json({ message: "No available leads found. Request rejected." });
    }

    let finalRows = result.rows;
    let badRowsWithState = [];
    const allPhones = result.rows.map(r => r.phone);

    try {
      const scrubResult = await scrubPhones(allPhones);
      if (scrubResult.bad.length > 0) {
        const badPhones = scrubResult.bad.map(b => b.phone);
        const badPhoneSet = new Set(badPhones);
        const isBadPhone = rowPhone => badPhoneSet.has(normalizePhone(rowPhone));
        const scrubInfoByPhone = new Map(scrubResult.bad.map(b => [b.phone, b]));

        await client.query("BEGIN");
        await client.query(`UPDATE van_data SET status='DNC', downloaded_at=null WHERE phone=ANY($1::text[])`, [badPhones]);
        await upsertDeadNumbersBatched({ queryFn: client.query.bind(client), badItems: scrubResult.bad });
        await client.query("COMMIT");

        badRowsWithState = result.rows.filter(r => isBadPhone(r.phone)).map(r => {
          const scrubInfo = scrubInfoByPhone.get(normalizePhone(r.phone)) || {};
          return { ...r, dnc_type: scrubInfo.type || "DNC", reason: scrubInfo.reason || "Blacklist Alliance" };
        });
        finalRows = result.rows.filter(r => !isBadPhone(r.phone));
      }
    } catch (e) {
      console.error("Scrub failed during review", e);
    }

    const rowsWithState = finalRows.map(r => {
      let code = r.area_code;
      if (!code || code === "Unknown") {
        const clean = r.phone ? String(r.phone).replace(/\D/g, "") : "";
        if (clean.length === 11 && clean.startsWith("1")) code = clean.substring(1, 4);
        else if (clean.length === 10) code = clean.substring(0, 3);
      }
      return { ...r, state: areaCodesMap[code] || "Unknown" };
    });

    const goodCsv = rowsWithState.length > 0 ? new Parser({ fields: CSV_GOOD_FIELDS }).parse(rowsWithState) : "";
    const badCsv = badRowsWithState.length > 0 ? new Parser({ fields: CSV_BAD_FIELDS }).parse(badRowsWithState) : "";
    const serializedData = JSON.stringify({ isScrubbed: true, goodCsv, badCsv });

    await client.query(`UPDATE van_download_requests SET status='accepted', reviewed_at=NOW(), reviewed_by=$1, csv_data=$2 WHERE id=$3`, [req.user.id, serializedData, id]);
    
    await db.query(`INSERT INTO notifications (user_id, type, title, message, reference_id) VALUES ($1, $2, $3, $4, $5)`, [
      dlReq.admin_id, "download_request_accepted", "✅ Download Request Approved!",
      `Your download request for ${rowsWithState.length.toLocaleString()} leads has been approved.`, dlReq.id
    ]);

    return res.json({ message: `Request accepted. ${rowsWithState.length} leads are ready to download.`, lead_count: rowsWithState.length });
  } catch (err) {
    await client.query("ROLLBACK").catch(()=>{});
    console.error("Review Request Error:", err);
    return res.status(500).json({ message: "Server error" });
  } finally {
    client.release();
  }
};

// ─────────────────────────────────────────────────────────────
// GET /api/van-download/requests/:id/file
// Admin → download the CSV for an accepted request
// ─────────────────────────────────────────────────────────────
const executeApprovedDownload = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await db.query(`SELECT * FROM van_download_requests WHERE id=$1 AND admin_id=$2`, [id, req.user.id]);
    if (result.rows.length === 0) return res.status(404).json({ message: "Request not found." });
    
    const dlReq = result.rows[0];
    if (dlReq.status !== "accepted") return res.status(400).json({ message: `Request is ${dlReq.status}, not accepted.` });
    if (!dlReq.csv_data) return res.status(400).json({ message: "CSV data not available." });

    if (dlReq.csv_data.trim().startsWith("{")) {
      return res.status(200).json(JSON.parse(dlReq.csv_data));
    } else {
      return res.status(200).json({ isScrubbed: false, goodCsv: dlReq.csv_data, badCsv: "" });
    }
  } catch (err) {
    console.error("Execute Approved Download Error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

module.exports = {
  createDownloadRequest,
  getDownloadRequests,
  getMyDownloadRequests,
  reviewDownloadRequest,
  executeApprovedDownload,
 downloadVanData, getStateCounts, getAlreadyDownloaded, getDownloadFile };
