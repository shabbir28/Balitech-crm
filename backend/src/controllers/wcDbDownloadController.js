const db = require("../config/db");
const { Parser } = require("json2csv");
const { areaCodesMap } = require("../utils/areaCodes");
const { scrubPhones, normalizePhone } = require("../utils/blacklistAlliance");

const normalizeTextArray = (value) => {
  if (!value) return [];

  if (Array.isArray(value)) {
    return value.map((v) => String(v).trim()).filter(Boolean);
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return [];

    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed.map((v) => String(v).trim()).filter(Boolean);
      }
    } catch (_) {}

    return trimmed
      .split(",")
      .map((v) => v.replace(/^\[|\]$/g, "").replace(/^"|"$/g, "").trim())
      .filter(Boolean);
  }

  return [];
};


const CSV_GOOD_FIELDS = [
  { label: "First Name", value: "firstname" },
  { label: "Middle Name", value: "middlename" },
  { label: "Last Name", value: "lastname" },
  { label: "Address", value: "address" },
  { label: "Address 2", value: "address2" },
  { label: "City", value: "city" },
  { label: "State", value: "state" },
  { label: "Zip", value: "zip" },
  { label: "Zip4", value: "zip4" },
  { label: "County", value: "county" },
  { label: "Phone No", value: "phone" },
  { label: "Land Line", value: "land_line" },
  { label: "Cell", value: "cell" },
  { label: "Home Owner", value: "homeownerrenter" },
  { label: "Home Value", value: "homevalue" },
  { label: "Income", value: "householdincome" },
  { label: "Credit Rating", value: "creditrating" },
  { label: "Age", value: "age" },
  { label: "Gender", value: "gender" },
  { label: "Marital Stats", value: "maritalstats" },
  { label: "DPV Indicator", value: "dpv_indicator" },
  { label: "DNC Flag", value: "dnc_flag" },
];

const CSV_BAD_FIELDS = [
  ...CSV_GOOD_FIELDS,
  { label: "DNC Type", value: "dnc_type" },
  { label: "Reason", value: "reason" },
];

const DNC_UPSERT_BATCH_SIZE = 3000;

const upsertDeadNumbersBatched = async ({ queryFn, badItems }) => {
  if (!Array.isArray(badItems) || badItems.length === 0) return;
  for (let i = 0; i < badItems.length; i += DNC_UPSERT_BATCH_SIZE) {
    const chunk = badItems.slice(i, i + DNC_UPSERT_BATCH_SIZE);
    const valueStrings = [];
    const insertValues = [];
    let idx = 1;
    for (const badItem of chunk) {
      valueStrings.push(`($${idx}, $${idx + 1})`);
      insertValues.push(badItem.phone, "WC DB Download BLA Scrub");
      idx += 2;
    }
    await queryFn(
      `INSERT INTO dead_numbers (phone, source) VALUES ${valueStrings.join(",")} ON CONFLICT (phone) DO NOTHING`,
      insertValues
    );
  }
};

function isUuid(value) {
  return (
    typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
  );
}

function buildFilters({ vendor_id, states, min_age, max_age, include_downloaded, job_id }) {
  const filters = include_downloaded
    ? ["status IN ('available', 'downloaded')"]
    : ["status = 'available'"];

  filters.push(
    `NOT EXISTS (SELECT 1 FROM dnc_numbers d WHERE d.phone = wc_db_data.phone)`,
    `NOT EXISTS (SELECT 1 FROM refine_dnc_numbers d WHERE d.phone = wc_db_data.phone)`,
    `NOT EXISTS (SELECT 1 FROM premium_dnc_numbers d WHERE d.phone = wc_db_data.phone)`,
    `NOT EXISTS (SELECT 1 FROM dead_numbers d WHERE d.phone = wc_db_data.phone)`,
    `NOT EXISTS (SELECT 1 FROM separation_data sd WHERE sd.phone = wc_db_data.phone)`
  );

  const params = [];
  let idx = 1;

  if (vendor_id && vendor_id !== "all") {
    filters.push(`vendor_id = $${idx++}`);
    params.push(vendor_id);
  }

  if (job_id && (Array.isArray(job_id) ? job_id.length > 0 : job_id !== "")) {
    const jobIds = Array.isArray(job_id) ? job_id : [job_id];
    const placeholders = jobIds.map((_, i) => `$${idx + i}`).join(",");
    filters.push(`job_id IN (${placeholders})`);
    params.push(...jobIds);
    idx += jobIds.length;
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

// POST /api/wc-db-download
const downloadWcDbData = async (req, res) => {
  const client = await db.getClient();
  try {
    const { vendor_id, quantity, states, min_age, max_age, include_downloaded, job_id } = req.body;
    const normalizedStates = normalizeTextArray(states);
    if (!quantity || quantity <= 0)
      return res.status(400).json({ message: "Valid quantity is required" });

    const { filters, params, paramIdx } = buildFilters({
      vendor_id, states: normalizedStates, min_age, max_age, include_downloaded, job_id,
    });
    const whereClause = filters.join(" AND ");

    await client.query("BEGIN");
    const updateQuery = `
      WITH selected AS (
        SELECT id FROM wc_db_data WHERE ${whereClause}
        ORDER BY id ASC FOR UPDATE SKIP LOCKED LIMIT $${paramIdx}
      )
      UPDATE wc_db_data d SET status='downloaded', downloaded_at=CURRENT_TIMESTAMP
      FROM selected s WHERE d.id = s.id
      RETURNING d.*
    `;
    params.push(quantity);
    const result = await client.query(updateQuery, params);
    await client.query("COMMIT");

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "No available WC DB data found matching criteria" });
    }

    let finalRows = [];
    let badRowsWithState = [];
    let blacklistCount = 0;
    let stateDncCount = 0;
    let federalDncCount = 0;
    let badPhoneCount = 0;
    let scrubErrors = 0;

    const allPhones = result.rows.map((r) => r.phone);

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

        await client.query("BEGIN");
        await client.query(
          `UPDATE wc_db_data SET status='DNC', downloaded_at=null WHERE phone = ANY($1::text[])`,
          [badPhones]
        );
        await upsertDeadNumbersBatched({ queryFn: client.query.bind(client), badItems: scrubResult.bad });
        await client.query("COMMIT");

        const badLeads = result.rows.filter((r) => isBadPhone(r.phone));
        badRowsWithState = badLeads.map((r) => {
          const scrubInfo = scrubInfoByPhone.get(normalizePhone(r.phone)) || {};
          let code = r.area_code;
          if (!code) {
            const clean = r.phone ? String(r.phone).replace(/\D/g, "") : "";
            if (clean.length === 11 && clean.startsWith("1")) code = clean.substring(1, 4);
            else if (clean.length === 10) code = clean.substring(0, 3);
          }
          return { ...r, state: areaCodesMap[code] || "Unknown", dnc_type: scrubInfo.type || "DNC", reason: scrubInfo.reason || "Blacklist Alliance Match" };
        });

        finalRows = result.rows.filter((r) => !isBadPhone(r.phone));
      } else {
        finalRows = result.rows;
      }
    } catch (scrubErr) {
      console.error("[BLA] WC DB scrub failed, proceeding without BLA scrub.", scrubErr.message);
      scrubErrors = result.rows.length;
      finalRows = result.rows;
    }

    const rowsWithState = finalRows.map((r) => {
      let code = r.area_code;
      if (!code) {
        const clean = r.phone ? String(r.phone).replace(/\D/g, "") : "";
        if (clean.length === 11 && clean.startsWith("1")) code = clean.substring(1, 4);
        else if (clean.length === 10) code = clean.substring(0, 3);
      }
      return { ...r, state: areaCodesMap[code] || "Unknown" };
    });

    const csv = rowsWithState.length > 0 ? new Parser({ fields: CSV_GOOD_FIELDS }).parse(rowsWithState) : "";
    const badCsv = badRowsWithState.length > 0 ? new Parser({ fields: CSV_BAD_FIELDS }).parse(badRowsWithState) : "";
    const fileName = `wc_db_download_${Date.now()}.csv`;

    const logRes = await db.query(
      `INSERT INTO wc_db_download_logs (user_id, vendor_id, quantity, states, min_age, max_age)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
      [req.user.id, vendor_id && vendor_id !== "all" ? vendor_id : null, rowsWithState.length, normalizedStates.length > 0 ? normalizedStates : null, min_age || null, max_age || null]
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
      scrubFailed: scrubErrors > 0 && finalRows.length === result.rows.length,
    };

    const responseBody = { fileName, logId, count: rowsWithState.length, goodCsv: csv, csv, badCsv, summary: summaryData };

    if (logId) {
      db.query("UPDATE wc_db_download_logs SET csv_payload=$1 WHERE id=$2", [JSON.stringify(responseBody), logId]).catch(() => {});
    }

    return res.status(200).json(responseBody);
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    console.error("WC DB Download Error:", err);
    res.status(500).json({ message: "Server error during download" });
  } finally {
    client.release();
  }
};

// POST /api/wc-db-download/state-counts
const getStateCounts = async (req, res) => {
  try {
    const { vendor_id, states, min_age, max_age, include_downloaded, job_id } = req.body;
    const { filters, params } = buildFilters({ vendor_id, states, min_age, max_age, include_downloaded, job_id });
    const whereClause = filters.join(" AND ");

    const result = await db.query(
      `SELECT area_code, COUNT(id)::int as count FROM wc_db_data WHERE ${whereClause} GROUP BY area_code`,
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
    console.error("WC DB State Counts Error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// GET /api/wc-db-download/already-downloaded
const getAlreadyDownloaded = async (req, res) => {
  try {
    const { page = 1, limit = 100 } = req.query;
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(500, parseInt(limit, 10) || 100);
    const offset = (pageNum - 1) * limitNum;

    const dataQuery = `
      SELECT dl.*, v.name as vendor_name, u.username, u.first_name as user_first_name, u.last_name as user_last_name
      FROM wc_db_download_logs dl
      LEFT JOIN wc_db_vendors v ON dl.vendor_id = v.vendor_id
      LEFT JOIN users u ON dl.user_id = u.id
      ORDER BY dl.download_date DESC
      LIMIT $1 OFFSET $2
    `;
    const countQuery = `SELECT COUNT(*)::int as count FROM wc_db_download_logs`;

    const [dataResult, countResult] = await Promise.all([
      db.query(dataQuery, [limitNum, offset]),
      db.query(countQuery),
    ]);

    const data = dataResult.rows.map((row) => {
      let canRedownload = false;
      let fileName = `wc_db_download_${row.id}.csv`;
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
    console.error("WC DB Already Downloaded Error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// GET /api/wc-db-download/logs/:id/file
const getDownloadFile = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await db.query("SELECT csv_payload FROM wc_db_download_logs WHERE id=$1", [id]);
    if (result.rows.length === 0) return res.status(404).json({ message: "Record not found" });
    if (!result.rows[0].csv_payload) return res.status(404).json({ message: "No stored file" });
    res.json(JSON.parse(result.rows[0].csv_payload));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// ─────────────────────────────────────────────────────────────
// POST /api/wc-db-download/preview-scrub
// Dialer Agent → run BLA scrub PREVIEW without marking data as downloaded.
// ─────────────────────────────────────────────────────────────
const previewScrub = async (req, res) => {
  const client = await db.getClient();
  try {
    const {
      vendor_id, quantity, states,
      min_age, max_age, job_id, include_downloaded,
    } = req.body;

    if (!vendor_id) return res.status(400).json({ message: 'Please select a vendor.' });
    if (!quantity || quantity <= 0) return res.status(400).json({ message: 'Valid quantity is required.' });

    const { filters, params, paramIdx } = buildFilters({
      vendor_id: vendor_id && vendor_id !== 'all' ? vendor_id : null,
      states, min_age, max_age, job_id, include_downloaded,
    });

    const whereClause = filters.length > 0 ? filters.join(' AND ') : '1=1';

    await client.query("SET local work_mem = '256MB'");
    const result = await client.query(
      `SELECT phone FROM wc_db_data WHERE ${whereClause} ORDER BY uploaded_at ASC LIMIT $${paramIdx}`,
      [...params, quantity]
    );

    const rows = result.rows;
    if (rows.length === 0) {
      client.release();
      return res.status(404).json({ message: 'No available leads found matching your criteria.' });
    }

    const allPhones = rows.map(r => normalizePhone(r.phone)).filter(p => p.length === 10);
    let blacklist = 0, stateDnc = 0, federalDnc = 0, badPhone = 0, good = rows.length;
    let scrubRan = false;

    const MAX_API_SCRUB_PHONES = parseInt(process.env.MAX_API_SCRUB_PHONES || '5000');
    if (MAX_API_SCRUB_PHONES > 0 && allPhones.length <= MAX_API_SCRUB_PHONES) {
      try {
        const scrubResult = await scrubPhones(allPhones);
        if (!(allPhones.length >= 200 && scrubResult.bad.length === allPhones.length)) {
          for (const item of scrubResult.bad) {
            const typeLower = String(item.type || '').toLowerCase();
            if (typeLower.includes('federal')) federalDnc++;
            else if (typeLower.includes('state')) stateDnc++;
            else if (typeLower.includes('invalid') || typeLower.includes('bad')) badPhone++;
            else blacklist++;
          }
          good = rows.length - scrubResult.bad.length;
          scrubRan = true;
        }
      } catch (scrubErr) {
        console.error('[WC DB Preview Scrub] BLA failed:', scrubErr.message);
      }
    }
    client.release();

    return res.status(200).json({
      summary: {
        total: rows.length, good, blacklist, stateDnc, federalDnc, badPhone,
        suppress: 0, wireless: 0, landline: 0, errors: 0,
        scrubPending: false, scrubCompleted: scrubRan,
        scrubDate: new Date().toLocaleString(),
        fileName: `wc_db_preview_${Date.now()}.csv`,
        blaSkipped: !scrubRan,
      }
    });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    client.release();
    console.error('[WC DB Preview Scrub] Error:', err.message);
    return res.status(500).json({ message: 'Server error running preview scrub.' });
  }
};

// POST /api/wc-db-download/request
const createDownloadRequest = async (req, res) => {
  try {
    const { vendor_id, quantity, states, min_age, max_age, job_id, include_downloaded } = req.body;

    if (!vendor_id) return res.status(400).json({ message: "Please select a vendor." });
    if (!quantity || quantity <= 0) return res.status(400).json({ message: "Valid quantity is required." });

    const blaSummary = req.body.bla_summary || null;
    const disposition = req.body.disposition || null;

    const result = await db.query(
      `INSERT INTO wc_db_download_requests (admin_id, vendor_id, quantity, states, min_age, max_age, job_id, include_downloaded, bla_summary, disposition)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
      [
        req.user.id, 
        vendor_id && vendor_id !== "all" ? vendor_id : null, 
        quantity, 
        states && states.length ? states : null, 
        min_age || null, 
        max_age || null, 
        job_id || null, 
        include_downloaded === true || include_downloaded === "true",
        blaSummary ? JSON.stringify(blaSummary) : null,
        disposition && disposition.length > 0 ? disposition : null,
      ]
    );

    const newRequest = result.rows[0];

    const superAdmins = await db.query(`SELECT id FROM users WHERE role='super_admin'`);
    const adminDisplayName = req.user.first_name
      ? `${req.user.first_name} ${req.user.last_name || ""}`.trim()
      : req.user.username;

    let notifMsg = `${adminDisplayName} has requested to download ${quantity.toLocaleString()} leads from WC DB.`;
    if (blaSummary) {
      notifMsg += ` BLA Preview: ${(blaSummary.good || 0).toLocaleString()} good / ${(blaSummary.total || quantity).toLocaleString()} total.`;
    }

    for (const sa of superAdmins.rows) {
      await db.query(
        `INSERT INTO notifications (user_id, type, title, message, reference_id) VALUES ($1, $2, $3, $4, $5)`,
        [sa.id, "download_request_new", "📥 New WC DB Download Request", notifMsg, newRequest.id]
      );
    }

    return res.status(201).json({ message: "Download request submitted successfully. Awaiting SuperAdmin approval.", request: newRequest });
  } catch (err) {
    console.error("WC DB Create Download Request Error:", err);
    return res.status(500).json({ message: "Server error creating request" });
  }
};

// GET /api/wc-db-download/requests
const getDownloadRequests = async (req, res) => {
  try {
    const result = await db.query(`
      SELECT dr.id, dr.quantity, dr.states, dr.status, dr.rejection_reason, dr.min_age, dr.max_age,
             dr.requested_at, dr.reviewed_at,
             u.username AS admin_username, u.first_name AS admin_first_name, u.last_name AS admin_last_name,
             v.name AS vendor_name, rv.username AS reviewed_by_username
      FROM wc_db_download_requests dr
      LEFT JOIN users u ON dr.admin_id = u.id
      LEFT JOIN wc_db_vendors v ON dr.vendor_id = v.vendor_id
      LEFT JOIN users rv ON dr.reviewed_by = rv.id
      ORDER BY CASE LOWER(dr.status) WHEN 'pending' THEN 0 ELSE 1 END, dr.requested_at DESC
    `);
    return res.json(result.rows);
  } catch (err) {
    console.error("WC DB Get Download Requests Error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// GET /api/wc-db-download/requests/mine
const getMyDownloadRequests = async (req, res) => {
  try {
    const result = await db.query(
      `SELECT dr.id, dr.quantity, dr.states, dr.status, dr.rejection_reason, dr.min_age, dr.max_age,
              dr.requested_at, dr.reviewed_at, v.name AS vendor_name
       FROM wc_db_download_requests dr
       LEFT JOIN wc_db_vendors v ON dr.vendor_id = v.vendor_id
       WHERE dr.admin_id = $1 ORDER BY dr.requested_at DESC`,
      [req.user.id]
    );
    return res.json(result.rows);
  } catch (err) {
    console.error("WC DB Get My Download Requests Error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// PATCH /api/wc-db-download/requests/:id
const reviewDownloadRequest = async (req, res) => {
  const { id } = req.params;
  const { action, rejection_reason } = req.body;

  if (!["accept", "reject"].includes(action))
    return res.status(400).json({ message: 'Action must be "accept" or "reject".' });

  const client = await db.getClient();
  try {
    const reqRes = await client.query(`SELECT * FROM wc_db_download_requests WHERE id = $1`, [id]);
    if (reqRes.rows.length === 0) return res.status(404).json({ message: "Download request not found." });

    const dlReq = reqRes.rows[0];
    if (dlReq.status.toLowerCase() !== "pending")
      return res.status(400).json({ message: `Request is already ${dlReq.status}.` });

    if (action === "reject") {
      await client.query(
        `UPDATE wc_db_download_requests SET status='rejected', rejection_reason=$1, reviewed_at=NOW(), reviewed_by=$2 WHERE id=$3`,
        [rejection_reason || null, req.user.id, id]
      );
      await db.query(
        `INSERT INTO notifications (user_id, type, title, message, reference_id) VALUES ($1, $2, $3, $4, $5)`,
        [dlReq.admin_id, "download_request_rejected", "❌ WC DB Download Request Rejected", rejection_reason ? `Your WC DB download request was rejected. Reason: ${rejection_reason}` : "Your WC DB download request was rejected.", dlReq.id]
      );
      return res.json({ message: "Request rejected successfully." });
    }

    const { filters, params, paramIdx } = buildFilters({
      vendor_id: dlReq.vendor_id, states: dlReq.states, min_age: dlReq.min_age,
      max_age: dlReq.max_age, include_downloaded: dlReq.include_downloaded, job_id: dlReq.job_id,
    });
    const whereClause = filters.join(" AND ");

    await client.query("BEGIN");
    const updateQuery = `
      WITH selected AS (
        SELECT id FROM wc_db_data WHERE ${whereClause}
        ORDER BY id ASC FOR UPDATE SKIP LOCKED LIMIT $${paramIdx}
      )
      UPDATE wc_db_data d SET status='downloaded', downloaded_at=CURRENT_TIMESTAMP
      FROM selected s WHERE d.id = s.id
      RETURNING d.*
    `;
    params.push(dlReq.quantity);
    const result = await client.query(updateQuery, params);
    await client.query("COMMIT");

    if (result.rows.length === 0) {
      await client.query(
        `UPDATE wc_db_download_requests SET status='rejected', rejection_reason='No available leads found.', reviewed_at=NOW(), reviewed_by=$1 WHERE id=$2`,
        [req.user.id, id]
      );
      return res.status(404).json({ message: "No available leads found. Request rejected." });
    }

    let finalRows = result.rows;
    let badRowsWithState = [];
    const allPhones = result.rows.map((r) => r.phone);

    const hasBlaPreview = !!dlReq.bla_summary;

    if (!hasBlaPreview) {
      try {
        const scrubResult = await scrubPhones(allPhones);
        if (scrubResult.bad.length > 0) {
          const badPhones = scrubResult.bad.map((b) => b.phone);
          const badPhoneSet = new Set(badPhones);
          const isBadPhone = (rowPhone) => badPhoneSet.has(normalizePhone(rowPhone));
          const scrubInfoByPhone = new Map(scrubResult.bad.map((b) => [b.phone, b]));

          await client.query("BEGIN");
          await client.query(`UPDATE wc_db_data SET status='available', downloaded_at=null WHERE phone=ANY($1::text[])`, [badPhones]);
          await upsertDeadNumbersBatched({ queryFn: client.query.bind(client), badItems: scrubResult.bad });
          await client.query("COMMIT");

          badRowsWithState = result.rows.filter((r) => isBadPhone(r.phone)).map((r) => {
            const scrubInfo = scrubInfoByPhone.get(normalizePhone(r.phone)) || {};
            return { ...r, dnc_type: scrubInfo.type || "DNC", reason: scrubInfo.reason || "Blacklist Alliance" };
          });
          finalRows = result.rows.filter((r) => !isBadPhone(r.phone));
        }
      } catch (e) { console.error("WC DB scrub failed during review", e); }
    } else {
      console.log(`[Approval] bla_summary present for request ${id} — skipping BLA re-scrub, building CSV immediately.`);
    }

    const rowsWithState = finalRows.map((r) => {
      let code = r.area_code;
      if (!code) {
        const clean = r.phone ? String(r.phone).replace(/\D/g, "") : "";
        if (clean.length === 11 && clean.startsWith("1")) code = clean.substring(1, 4);
        else if (clean.length === 10) code = clean.substring(0, 3);
      }
      return { ...r, state: areaCodesMap[code] || "Unknown" };
    });

    const goodCsv = rowsWithState.length > 0 ? new Parser({ fields: CSV_GOOD_FIELDS }).parse(rowsWithState) : "";
    const badCsv = badRowsWithState.length > 0 ? new Parser({ fields: CSV_BAD_FIELDS }).parse(badRowsWithState) : "";
    const serializedData = JSON.stringify({ isScrubbed: true, goodCsv, badCsv });

    await client.query(
      `UPDATE wc_db_download_requests SET status='accepted', reviewed_at=NOW(), reviewed_by=$1, csv_data=$2 WHERE id=$3`,
      [req.user.id, serializedData, id]
    );

    await db.query(
      `INSERT INTO notifications (user_id, type, title, message, reference_id) VALUES ($1, $2, $3, $4, $5)`,
      [dlReq.admin_id, "download_request_accepted", "✅ WC DB Download Request Approved!", `Your WC DB download request for ${rowsWithState.length.toLocaleString()} leads has been approved.`, dlReq.id]
    );

    return res.json({ message: `Request accepted. ${rowsWithState.length} leads are ready to download.`, lead_count: rowsWithState.length });
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    console.error("WC DB Review Request Error:", err);
    return res.status(500).json({ message: "Server error" });
  } finally {
    client.release();
  }
};

// GET /api/wc-db-download/requests/:id/file
const executeApprovedDownload = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await db.query(
      `SELECT * FROM wc_db_download_requests WHERE id=$1 AND admin_id=$2`,
      [id, req.user.id]
    );
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
    console.error("WC DB Execute Approved Download Error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// GET /api/wc-db-download/logs/:id/summary
const getDownloadLogSummary = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query('SELECT csv_payload FROM wc_db_download_logs WHERE id=$1', [id]);
    if (result.rows.length === 0) return res.status(404).json({ message: 'Log not found' });
    const payloadStr = result.rows[0].csv_payload;
    if (!payloadStr) return res.status(200).json({ summary: { scrubPending: true } });
    
    const payload = JSON.parse(payloadStr);
    res.json({
      summary: payload.summary,
      scrubCompleted: payload.summary?.scrubCompleted,
      scrubFailed: payload.summary?.scrubFailed,
      scrubError: payload.summary?.scrubError
    });
  } catch (err) {
    console.error('Error fetching scrub summary:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// GET /api/wc-db-download/job/:jobId/stats
const getJobStats = async (req, res) => {
  try {
    const { jobId } = req.params;
    const result = await db.query(`
      SELECT 
        COUNT(*) as total_leads,
        COUNT(CASE WHEN status = 'available' THEN 1 END) as available_leads,
        COUNT(CASE WHEN status = 'downloaded' THEN 1 END) as downloaded_leads,
        COUNT(CASE WHEN status = 'DNC' THEN 1 END) as dnc_leads
      FROM wc_db_data
      WHERE job_id = $1
    `, [jobId]);
    if (result.rows.length === 0) return res.status(404).json({ message: 'Job not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error fetching job stats:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// GET /api/wc-db-download/job/:jobId/file
const downloadJobFile = async (req, res) => {
  try {
    const { jobId } = req.params;
    const result = await db.query('SELECT * FROM wc_db_data WHERE job_id = $1', [jobId]);
    if (result.rows.length === 0) return res.status(404).json({ message: 'No leads found for this job' });
    
    return res.status(400).json({ message: 'Direct job download not fully implemented for WC DB yet. Use the standard download form.' });
  } catch (err) {
    console.error('Error downloading job file:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  downloadWcDbData,
  getStateCounts,
  getAlreadyDownloaded,
  getDownloadFile,
  createDownloadRequest,
  getDownloadRequests,
  getMyDownloadRequests,
  reviewDownloadRequest,
  executeApprovedDownload,
  getDownloadLogSummary,
  getJobStats,
  downloadJobFile,
  previewScrub,
};
