const db = require("../config/db");
const { scrubPhones, normalizePhone } = require("../utils/blacklistAlliance");
const { areaCodesMap } = require("../utils/areaCodes");

const STATE_NAME_TO_ABBR = {
  alabama: "AL", alaska: "AK", arizona: "AZ", arkansas: "AR", california: "CA",
  colorado: "CO", connecticut: "CT", delaware: "DE", florida: "FL", georgia: "GA",
  hawaii: "HI", idaho: "ID", illinois: "IL", indiana: "IN", iowa: "IA", kansas: "KS",
  kentucky: "KY", louisiana: "LA", maine: "ME", maryland: "MD", massachusetts: "MA",
  michigan: "MI", minnesota: "MN", mississippi: "MS", missouri: "MO", montana: "MT",
  nebraska: "NE", nevada: "NV", "new hampshire": "NH", "new jersey": "NJ",
  "new mexico": "NM", "new york": "NY", "north carolina": "NC", "north dakota": "ND",
  ohio: "OH", oklahoma: "OK", oregon: "OR", pennsylvania: "PA", "rhode island": "RI",
  "south carolina": "SC", "south dakota": "SD", tennessee: "TN", texas: "TX",
  utah: "UT", vermont: "VT", virginia: "VA", washington: "WA", "west virginia": "WV",
  wisconsin: "WI", wyoming: "WY", "district of columbia": "DC",
};

const stateFilter = (states, startIdx) => {
  const abbrs = (Array.isArray(states) ? states : [])
    .map((value) => String(value || "").trim().toUpperCase())
    .filter((value) => /^[A-Z]{2}$/.test(value));
  if (!abbrs.length) return { sql: "TRUE", params: [] };
  const names = Object.entries(STATE_NAME_TO_ABBR)
    .filter(([, abbr]) => abbrs.includes(abbr))
    .map(([name]) => name);
  const codes = Object.entries(areaCodesMap)
    .filter(([, abbr]) => abbrs.includes(abbr))
    .map(([code]) => code);
  return {
    sql: `(
      UPPER(TRIM(COALESCE(state, ''))) = ANY($${startIdx}::text[])
      OR LOWER(TRIM(COALESCE(state, ''))) = ANY($${startIdx + 1}::text[])
      OR TRIM(COALESCE(area_code, '')) = ANY($${startIdx + 2}::text[])
    )`,
    params: [abbrs, names, codes],
  };
};

const resolveState = (rawState, areaCode) => {
  const text = String(rawState || "").trim();
  if (/^[A-Za-z]{2}$/.test(text)) return text.toUpperCase();
  const named = STATE_NAME_TO_ABBR[text.toLowerCase()];
  if (named) return named;
  const fromArea = areaCodesMap[String(areaCode || "").replace(/\D/g, "").slice(0, 3)];
  if (fromArea) return fromArea;
  return text || "Unknown";
};

const csvCell = (value) => {
  if (value === null || value === undefined) return "";
  const text = String(value);
  if (/[",\n\r]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
};

const classifyBad = (item) => {
  const text = `${item?.type || ""} ${item?.reason || ""}`.toLowerCase();
  if (text.includes("federal")) return "federal";
  if (text.includes("state")) return "state";
  if (text.includes("invalid") || text.includes("bad phone") || text.includes("bad_phone")) return "badPhone";
  return "blacklist";
};

const buildScrubSummary = ({ total, goodCount, badItems, fileName }) => {
  const counts = { blacklist: 0, stateDnc: 0, federalDnc: 0, badPhone: 0 };
  for (const item of badItems) counts[classifyBad(item)] += 1;
  const accounted = counts.blacklist + counts.stateDnc + counts.federalDnc + counts.badPhone;
  const gap = Math.max(0, total - goodCount - accounted);
  counts.blacklist += gap;
  return {
    total,
    good: goodCount,
    blacklist: counts.blacklist,
    suppress: 0,
    stateDnc: counts.stateDnc,
    federalDnc: counts.federalDnc,
    wireless: 0,
    landline: 0,
    errors: 0,
    badPhone: counts.badPhone,
    scrubPending: false,
    scrubCompleted: true,
    scrubFailed: false,
    scrubDate: new Date().toLocaleString(),
    fileName: fileName || `safe_quote_refine_${Date.now()}.csv`,
    blaSkipped: false,
  };
};

const toGoodCsv = (rows) => {
  const header = ["phone", "name", "email", "duration", "disposition", "campaign", "state", "call_date", "quality", "area_code"];
  const lines = [header.join(",")];
  for (const row of rows) {
    lines.push([
      row.phone, row.name, row.email, row.duration, row.disposition,
      row.campaign_type, row.state, row.call_date, row.quality, row.area_code,
    ].map(csvCell).join(","));
  }
  return lines.join("\n");
};

const toBadCsv = (rows) => {
  const header = ["phone", "name", "duration", "state", "dnc_type", "reason"];
  const lines = [header.join(",")];
  for (const row of rows) {
    lines.push([row.phone, row.name, row.duration, row.state, row.dnc_type, row.reason].map(csvCell).join(","));
  }
  return rows.length ? lines.join("\n") : "";
};

const readFilters = (body) => {
  const quantity = parseInt(body.quantity, 10);
  const vendorId = body.vendor_id || null;
  const campaign = body.campaign_type ? String(body.campaign_type).trim() : null;
  const minDuration = body.min_duration === "" || body.min_duration === undefined || body.min_duration === null
    ? null
    : parseInt(body.min_duration, 10);
  const maxDuration = body.max_duration === "" || body.max_duration === undefined || body.max_duration === null
    ? null
    : parseInt(body.max_duration, 10);
  const includeDownloaded = body.include_downloaded === true || body.include_downloaded === "true";
  return { quantity, vendorId, campaign, minDuration, maxDuration, states: body.states, includeDownloaded };
};

const includeDownloaded = (body) => body?.include_downloaded === true || body?.include_downloaded === "true";

const statusClause = (includeDownloaded) => (
  includeDownloaded ? "status IN ('available', 'downloaded')" : "status = 'available'"
);

const markBadNumbers = async (queryFn, badPhones) => {
  if (!badPhones.length) return;
  await queryFn(
    `UPDATE safe_quote_refine_data
     SET status = 'DNC', downloaded_at = NULL
     WHERE phone = ANY($1::text[])`,
    [badPhones]
  );
  await queryFn(
    `UPDATE safe_quote_data
     SET status = 'DNC', downloaded_at = NULL
     WHERE phone = ANY($1::text[])
       AND COALESCE(status, '') NOT IN ('SALE', 'SEPARATION')`,
    [badPhones]
  );
  await insertSafeQuoteDnc(queryFn, badPhones);
};

const insertSafeQuoteDnc = async (queryFn, phones) => {
  const unique = [...new Set(phones.map((phone) => normalizePhone(phone)).filter(Boolean))];
  const batchSize = 500;
  for (let i = 0; i < unique.length; i += batchSize) {
    const chunk = unique.slice(i, i + batchSize);
    const values = [];
    const params = [];
    let idx = 1;
    for (const phone of chunk) {
      values.push(`($${idx}, $${idx + 1})`);
      params.push(phone, "DNC");
      idx += 2;
    }
    if (!values.length) continue;
    await queryFn(
      `INSERT INTO safe_quote_dnc_numbers (phone, dnc_type)
       VALUES ${values.join(",")}
       ON CONFLICT (phone) DO NOTHING`,
      params
    );
  }
};

const getDownloadOptions = async (req, res) => {
  try {
    const campaign = req.query.campaign ? String(req.query.campaign).trim() : null;
    const [vendors, campaigns] = await Promise.all([
      db.query(
        `SELECT v.vendor_id, v.name,
                COUNT(d.id)::int AS total_leads,
                COUNT(d.id) FILTER (
                  WHERE d.status = 'available'
                    AND NOT EXISTS (SELECT 1 FROM safe_quote_dnc_numbers n WHERE n.phone = d.phone)
                    AND NOT EXISTS (SELECT 1 FROM safe_quote_separation_data sep WHERE sep.phone = d.phone)
                )::int AS available_leads,
                COUNT(d.id) FILTER (WHERE d.status = 'downloaded')::int AS downloaded_leads,
                COUNT(d.id) FILTER (WHERE d.status = 'DNC')::int AS dnc_leads
         FROM safe_quote_vendors v
         INNER JOIN safe_quote_refine_data d ON d.vendor_id = v.vendor_id
         WHERE ($1::text IS NULL OR LOWER(d.campaign_type) = LOWER($1))
         GROUP BY v.vendor_id, v.name
         HAVING COUNT(d.id) > 0
         ORDER BY v.name ASC`,
        [campaign]
      ),
      db.query(
        `SELECT c.campaign_id, c.name
         FROM safe_quote_campaigns c
         WHERE c.status = 'Active'
           AND EXISTS (
             SELECT 1 FROM safe_quote_refine_data d
             WHERE LOWER(d.campaign_type) = LOWER(c.name)
           )
         ORDER BY c.name ASC`
      ),
    ]);
    res.json({ vendors: vendors.rows, campaigns: campaigns.rows });
  } catch (err) {
    console.error("Safe Quote Refine download options error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

const downloadData = async (req, res) => {
  let client;
  try {
    client = await db.getClient();
    const quantity = parseInt(req.body.quantity, 10);
    if (!Number.isFinite(quantity) || quantity < 1) {
      return res.status(400).json({ message: "Quantity is required" });
    }

    const vendorId = req.body.vendor_id || null;
    const campaign = req.body.campaign_type ? String(req.body.campaign_type).trim() : null;
    const minDuration = req.body.min_duration === "" || req.body.min_duration === undefined || req.body.min_duration === null
      ? null
      : parseInt(req.body.min_duration, 10);
    const maxDuration = req.body.max_duration === "" || req.body.max_duration === undefined || req.body.max_duration === null
      ? null
      : parseInt(req.body.max_duration, 10);

    await client.query("BEGIN");
    const states = stateFilter(req.body.states, 5);
    const picked = await client.query(
      `SELECT id, phone, name, email, duration, disposition, campaign_type, state, call_date, quality, area_code
       FROM safe_quote_refine_data
       WHERE ${statusClause(includeDownloaded(req.body))}
         AND ($1::uuid IS NULL OR vendor_id = $1::uuid)
         AND ($2::text IS NULL OR LOWER(campaign_type) = LOWER($2))
         AND ($3::int IS NULL OR COALESCE(duration, 0) >= $3)
         AND ($4::int IS NULL OR COALESCE(duration, 0) <= $4)
         AND ${states.sql}
         AND NOT EXISTS (
           SELECT 1 FROM safe_quote_dnc_numbers n WHERE n.phone = safe_quote_refine_data.phone
         )
         AND NOT EXISTS (
           SELECT 1 FROM safe_quote_separation_data sep WHERE sep.phone = safe_quote_refine_data.phone
         )
       ORDER BY COALESCE(duration, 0) DESC, uploaded_at ASC
       LIMIT $${5 + states.params.length}
       FOR UPDATE SKIP LOCKED`,
      [vendorId, campaign, minDuration, maxDuration, ...states.params, quantity]
    );

    if (picked.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(400).json({
        message: "No matching Safe Quote Refine data. Numbers on Safe Quote DNC, Sale, or Separation are excluded.",
      });
    }

    let scrubResult;
    try {
      scrubResult = await scrubPhones(picked.rows.map((row) => row.phone));
    } catch (scrubErr) {
      await client.query("ROLLBACK");
      console.error("Safe Quote Refine BLA failed:", scrubErr.message);
      return res.status(502).json({
        message: "BLA scrub failed. Nothing was downloaded. Try again.",
        error: scrubErr.message,
      });
    }

    const badSet = new Set(scrubResult.bad.map((item) => normalizePhone(item.phone)));
    if (picked.rows.length >= 100 && badSet.size === picked.rows.length) {
      await client.query("ROLLBACK");
      return res.status(502).json({
        message: "BLA flagged every number. Download was stopped so these numbers were not added to DNC. Check the BLA API key.",
      });
    }

    const scrubByPhone = new Map(scrubResult.bad.map((item) => [normalizePhone(item.phone), item]));
    const goodRows = picked.rows.filter((row) => !badSet.has(normalizePhone(row.phone)));
    const badRows = picked.rows
      .filter((row) => badSet.has(normalizePhone(row.phone)))
      .map((row) => {
        const info = scrubByPhone.get(normalizePhone(row.phone)) || {};
        return { ...row, dnc_type: info.type || "DNC", reason: info.reason || "Blacklist Alliance Match" };
      });
    const badPhones = badRows.map((row) => normalizePhone(row.phone));

    if (goodRows.length > 0) {
      await client.query(
        `UPDATE safe_quote_refine_data
         SET status = 'downloaded', downloaded_at = NOW()
         WHERE id = ANY($1::uuid[])`,
        [goodRows.map((row) => row.id)]
      );
    }

    await markBadNumbers(client.query.bind(client), badPhones);

    const fileName = `safe_quote_refine_${Date.now()}.csv`;
    if (goodRows.length > 0) {
      await client.query(
        `INSERT INTO safe_quote_refine_download_logs
           (admin_id, vendor_id, campaign_type, quantity, min_duration, max_duration, file_name)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [req.user?.id || null, vendorId, campaign, goodRows.length, minDuration, maxDuration, fileName]
      );
    }
    await client.query("COMMIT");

    const csv = toGoodCsv(goodRows);
    const badCsv = toBadCsv(badRows);
    const summary = buildScrubSummary({
      total: picked.rows.length,
      goodCount: goodRows.length,
      badItems: scrubResult.bad.length ? scrubResult.bad : badRows,
      fileName,
    });
    res.json({
      count: goodRows.length,
      fileName,
      csv,
      goodCsv: csv,
      badCsv,
      summary,
      message: goodRows.length === 0
        ? `${badPhones.length.toLocaleString()} numbers were flagged by BLA and added to Safe Quote DNC. No clean numbers were left.`
        : undefined,
    });
  } catch (err) {
    try { if (client) await client.query("ROLLBACK"); } catch (_) { /* already closed */ }
    console.error("Safe Quote Refine download error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  } finally {
    if (client) client.release();
  }
};

const getStateCounts = async (req, res) => {
  try {
    const vendorId = req.body.vendor_id || null;
    if (!vendorId) return res.json({});
    const campaign = req.body.campaign_type ? String(req.body.campaign_type).trim() : null;
    const minDuration = req.body.min_duration === "" || req.body.min_duration === undefined || req.body.min_duration === null
      ? null
      : parseInt(req.body.min_duration, 10);
    const maxDuration = req.body.max_duration === "" || req.body.max_duration === undefined || req.body.max_duration === null
      ? null
      : parseInt(req.body.max_duration, 10);

    const states = stateFilter(req.body.states, 5);
    const result = await db.query(
      `SELECT COALESCE(NULLIF(TRIM(state), ''), '') AS state, area_code, COUNT(id)::int AS count
       FROM safe_quote_refine_data
       WHERE ${statusClause(includeDownloaded(req.body))}
         AND vendor_id = $1::uuid
         AND ($2::text IS NULL OR LOWER(campaign_type) = LOWER($2))
         AND ($3::int IS NULL OR COALESCE(duration, 0) >= $3)
         AND ($4::int IS NULL OR COALESCE(duration, 0) <= $4)
         AND ${states.sql}
         AND NOT EXISTS (
           SELECT 1 FROM safe_quote_dnc_numbers n WHERE n.phone = safe_quote_refine_data.phone
         )
         AND NOT EXISTS (
           SELECT 1 FROM safe_quote_separation_data sep WHERE sep.phone = safe_quote_refine_data.phone
         )
       GROUP BY 1, 2`,
      [vendorId, campaign, Number.isFinite(minDuration) ? minDuration : null, Number.isFinite(maxDuration) ? maxDuration : null, ...states.params]
    );

    const stateCounts = {};
    for (const row of result.rows) {
      const state = resolveState(row.state, row.area_code);
      stateCounts[state] = (stateCounts[state] || 0) + Number(row.count || 0);
    }
    res.json(stateCounts);
  } catch (err) {
    console.error("Safe Quote Refine state counts error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

const previewScrub = async (req, res) => {
  try {
    const { quantity, vendorId, campaign, minDuration, maxDuration } = readFilters(req.body);
    if (!vendorId) return res.status(400).json({ message: "Select a vendor." });
    if (!Number.isFinite(quantity) || quantity < 1) return res.status(400).json({ message: "Quantity is required" });
    if (quantity > 100000) return res.status(400).json({ message: "Maximum allowed quantity is 100,000." });

    const states = stateFilter(req.body.states, 5);
    const picked = await db.query(
      `SELECT id, phone, name, duration, state
       FROM safe_quote_refine_data
       WHERE ${statusClause(includeDownloaded(req.body))}
         AND vendor_id = $1::uuid
         AND ($2::text IS NULL OR LOWER(campaign_type) = LOWER($2))
         AND ($3::int IS NULL OR COALESCE(duration, 0) >= $3)
         AND ($4::int IS NULL OR COALESCE(duration, 0) <= $4)
         AND ${states.sql}
         AND NOT EXISTS (SELECT 1 FROM safe_quote_dnc_numbers n WHERE n.phone = safe_quote_refine_data.phone)
         AND NOT EXISTS (SELECT 1 FROM safe_quote_separation_data sep WHERE sep.phone = safe_quote_refine_data.phone)
       ORDER BY COALESCE(duration, 0) DESC, uploaded_at ASC
       LIMIT $${5 + states.params.length}`,
      [vendorId, campaign, minDuration, maxDuration, ...states.params, quantity]
    );
    if (picked.rows.length === 0) {
      return res.status(400).json({ message: "No matching Safe Quote Refine data." });
    }

    let scrubResult;
    try {
      scrubResult = await scrubPhones(picked.rows.map((row) => row.phone));
    } catch (scrubErr) {
      return res.status(502).json({ message: "BLA preview failed. Nothing was changed.", error: scrubErr.message });
    }
    if (picked.rows.length >= 100 && scrubResult.bad.length === picked.rows.length) {
      return res.status(502).json({ message: "BLA flagged every number. Preview was stopped. Check the BLA API key." });
    }

    const badSet = new Set(scrubResult.bad.map((item) => normalizePhone(item.phone)));
    const badPhones = picked.rows.filter((row) => badSet.has(normalizePhone(row.phone))).map((row) => normalizePhone(row.phone));
    if (badPhones.length) await markBadNumbers(db.query.bind(db), badPhones);

    const goodCount = picked.rows.length - badPhones.length;
    const summary = buildScrubSummary({
      total: picked.rows.length,
      goodCount,
      badItems: scrubResult.bad,
      fileName: `safe_quote_refine_preview_${Date.now()}.csv`,
    });
    res.json({ summary });
  } catch (err) {
    console.error("Safe Quote Refine preview error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

const createDownloadRequest = async (req, res) => {
  try {
    const { quantity, vendorId, campaign, minDuration, maxDuration } = readFilters(req.body);
    let blaSummary = req.body.bla_summary || null;
    if (typeof blaSummary === "string") {
      try { blaSummary = JSON.parse(blaSummary); } catch (_) { blaSummary = null; }
    }
    if (!vendorId) return res.status(400).json({ message: "Select a vendor." });
    if (!Number.isFinite(quantity) || quantity < 1) return res.status(400).json({ message: "Quantity is required" });
    if (!blaSummary || blaSummary.scrubCompleted !== true) {
      return res.status(400).json({ message: "Run the BLA preview first. Only scrubbed good data can be requested." });
    }
    const states = Array.isArray(req.body.states) && req.body.states.length ? req.body.states : null;
    const result = await db.query(
      `INSERT INTO safe_quote_refine_download_requests
         (admin_id, vendor_id, campaign_type, quantity, states, min_duration, max_duration, bla_summary, include_downloaded)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING id, status, quantity, requested_at`,
      [req.user.id, vendorId, campaign, blaSummary.good || quantity, states, minDuration, maxDuration, JSON.stringify(blaSummary), includeDownloaded(req.body)]
    );
    res.status(201).json({ message: "Download request submitted. Waiting for Super Admin approval.", request: result.rows[0] });
  } catch (err) {
    console.error("Safe Quote Refine request error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

const requestSelect = `
  SELECT dr.id, dr.quantity, dr.states, dr.status, dr.rejection_reason, dr.min_duration, dr.max_duration,
         dr.campaign_type, dr.requested_at, dr.reviewed_at, dr.bla_summary,
         u.username AS admin_username, u.first_name AS admin_first_name, u.last_name AS admin_last_name,
         v.name AS vendor_name
  FROM safe_quote_refine_download_requests dr
  LEFT JOIN users u ON u.id = dr.admin_id
  LEFT JOIN safe_quote_vendors v ON v.vendor_id = dr.vendor_id
`;

const getDownloadRequests = async (req, res) => {
  try {
    const result = await db.query(`${requestSelect} ORDER BY dr.requested_at DESC`);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

const getMyDownloadRequests = async (req, res) => {
  try {
    const result = await db.query(`${requestSelect} WHERE dr.admin_id = $1 ORDER BY dr.requested_at DESC`, [req.user.id]);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

const reviewDownloadRequest = async (req, res) => {
  try {
    const action = String(req.body.action || "").toLowerCase();
    const status = action === "accept" ? "accepted" : action === "reject" ? "rejected" : "";
    if (!status) return res.status(400).json({ message: "Action must be accept or reject" });
    const result = await db.query(
      `UPDATE safe_quote_refine_download_requests
       SET status = $1, rejection_reason = $2, reviewed_at = NOW(), reviewed_by = $3
       WHERE id = $4 AND status = 'pending'
       RETURNING id, status`,
      [status, req.body.rejection_reason || null, req.user.id, req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ message: "Pending request not found" });
    res.json({ message: status === "accepted" ? "Request approved" : "Request declined", request: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

const executeApprovedDownload = async (req, res) => {
  try {
    const found = await db.query(
      `SELECT * FROM safe_quote_refine_download_requests WHERE id = $1 AND admin_id = $2`,
      [req.params.id, req.user.id]
    );
    if (!found.rows.length) return res.status(404).json({ message: "Request not found" });
    const request = found.rows[0];
    if (request.status !== "accepted") return res.status(400).json({ message: "This request is not approved yet." });
    if (request.csv_data) {
      const stored = JSON.parse(request.csv_data);
      return res.json(stored);
    }

    req.body = {
      vendor_id: request.vendor_id,
      campaign_type: request.campaign_type,
      quantity: request.quantity,
      min_duration: request.min_duration,
      max_duration: request.max_duration,
      states: request.states || [],
      include_downloaded: request.include_downloaded === true,
    };
    const captured = { statusCode: 200, body: null };
    const fakeRes = {
      status(code) { captured.statusCode = code; return this; },
      json(payload) { captured.body = payload; return this; },
    };
    await downloadData(req, fakeRes);
    if (captured.statusCode >= 400 || !captured.body) {
      return res.status(captured.statusCode || 500).json(captured.body || { message: "Could not prepare the file" });
    }
    await db.query(
      `UPDATE safe_quote_refine_download_requests SET csv_data = $1, file_name = $2 WHERE id = $3`,
      [JSON.stringify(captured.body), captured.body.fileName || null, request.id]
    );
    res.json(captured.body);
  } catch (err) {
    console.error("Safe Quote Refine approved download error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

module.exports = {
  downloadData,
  getDownloadOptions,
  getStateCounts,
  previewScrub,
  createDownloadRequest,
  getDownloadRequests,
  getMyDownloadRequests,
  reviewDownloadRequest,
  executeApprovedDownload,
};
