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

const upsertSafeQuoteDncBatched = async ({ queryFn, badItems }) => {
  if (!Array.isArray(badItems) || badItems.length === 0) return;
  for (let i = 0; i < badItems.length; i += DNC_UPSERT_BATCH_SIZE) {
    const chunk = badItems.slice(i, i + DNC_UPSERT_BATCH_SIZE);
    const valueStrings = [];
    const insertValues = [];
    const seen = new Set();
    let idx = 1;
    for (const badItem of chunk) {
      const phone = normalizePhone(badItem.phone);
      if (!phone || seen.has(phone)) continue;
      seen.add(phone);
      valueStrings.push(`($${idx}, $${idx + 1})`);
      insertValues.push(phone, "DNC");
      idx += 2;
    }
    if (valueStrings.length === 0) continue;
    await queryFn(
      `INSERT INTO safe_quote_dnc_numbers (phone, dnc_type) VALUES ${valueStrings.join(",")} ON CONFLICT (phone) DO NOTHING`,
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
    `COALESCE(status, '') NOT IN ('DNC', 'SALE', 'SEPARATION')`,
    `NOT EXISTS (SELECT 1 FROM safe_quote_dnc_numbers d WHERE d.phone = safe_quote_data.phone)`,
    `NOT EXISTS (SELECT 1 FROM safe_quote_separation_data s WHERE s.phone = safe_quote_data.phone)`
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

// POST /api/safe-quote-download
const downloadSafeQuoteData = async (req, res) => {
  const client = await db.getClient();
  try {
    const { vendor_id, quantity, states, min_age, max_age, include_downloaded, job_id } = req.body;
    const normalizedStates = normalizeTextArray(states);
    if (!quantity || quantity <= 0)
      return res.status(400).json({ message: "Valid quantity is required" });
    if (quantity > 100000) {
      return res.status(400).json({ message: "Maximum allowed quantity is 100,000." });
    }

    const wantsAsyncScrub = req.body.async_scrub === true || req.body.async_scrub === "true";

    if (wantsAsyncScrub) {
      const fileName = `safe_quote_download_${Date.now()}.csv`;

      const pendingSummary = {
        total: Number(quantity) || 0,
        fileName,
        blacklist: 0,
        suppress: 0,
        stateDnc: 0,
        federalDnc: 0,
        wireless: 0,
        landline: 0,
        good: 0,
        errors: 0,
        badPhone: 0,
        scrubPending: true,
        scrubCompleted: false,
        scrubFailed: false,
      };

      const pendingPayload = {
        fileName,
        logId: null,
        count: 0,
        goodCsv: "",
        csv: "",
        badCsv: "",
        summary: pendingSummary,
      };

      const logRes = await db.query(
        `INSERT INTO safe_quote_download_logs (user_id, vendor_id, quantity, states, min_age, max_age, csv_payload)
         VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
        [
          req.user.id,
          vendor_id && vendor_id !== "all" ? vendor_id : null,
          Number(quantity) || 0,
          normalizedStates.length > 0 ? normalizedStates : null,
          min_age || null,
          max_age || null,
          JSON.stringify(pendingPayload),
        ]
      );

      const asyncLogId = logRes.rows[0].id;
      pendingPayload.logId = asyncLogId;

      await db.query(
        `UPDATE safe_quote_download_logs SET csv_payload=$1 WHERE id=$2`,
        [JSON.stringify(pendingPayload), asyncLogId]
      );

      setImmediate(async () => {
        try {
          const bgReq = {
            body: {
              vendor_id,
              quantity,
              states: normalizedStates,
              min_age,
              max_age,
              include_downloaded,
              job_id,
              async_scrub: false,
            },
            user: req.user,
            params: {},
            query: {},
            headers: {},
          };

          const bgResult = await new Promise((resolve, reject) => {
            const fakeRes = {
              statusCode: 200,
              status(code) { this.statusCode = code; return this; },
              setHeader() { return this; },
              header() { return this; },
              json(data) { resolve({ statusCode: this.statusCode, body: data }); return this; },
              send(data) { resolve({ statusCode: this.statusCode, body: data }); return this; },
              end(data) { resolve({ statusCode: this.statusCode, body: data }); return this; },
            };

            Promise.resolve(downloadSafeQuoteData(bgReq, fakeRes)).catch(reject);
          });

          if (bgResult.statusCode >= 400) {
            const failedPayload = {
              ...pendingPayload,
              summary: {
                ...pendingSummary,
                scrubPending: false,
                scrubCompleted: false,
                scrubFailed: true,
                scrubError: bgResult.body?.message || "Background Safe Quote export failed",
              },
            };

            await db.query(
              `UPDATE safe_quote_download_logs SET csv_payload=$1 WHERE id=$2`,
              [JSON.stringify(failedPayload), asyncLogId]
            );
            return;
          }

          const finalPayload = bgResult.body || {};
          const generatedLogId = finalPayload.logId;

          finalPayload.logId = asyncLogId;
          finalPayload.summary = {
            ...(finalPayload.summary || {}),
            scrubPending: false,
            scrubCompleted: true,
          };

          const finalCount = finalPayload.count || finalPayload.summary?.good || 0;

          await db.query(
            `UPDATE safe_quote_download_logs SET quantity=$1, csv_payload=$2 WHERE id=$3`,
            [finalCount, JSON.stringify(finalPayload), asyncLogId]
          );

          if (generatedLogId && Number(generatedLogId) !== Number(asyncLogId)) {
            await db.query(`DELETE FROM safe_quote_download_logs WHERE id=$1`, [generatedLogId]).catch(() => {});
          }

          console.log(`[Safe Quote Async] completed log ${asyncLogId}, good=${finalCount}`);
        } catch (bgErr) {
          console.error(`[Safe Quote Async] failed log ${asyncLogId}:`, bgErr);

          const failedPayload = {
            ...pendingPayload,
            summary: {
              ...pendingSummary,
              scrubPending: false,
              scrubCompleted: false,
              scrubFailed: true,
              scrubError: bgErr.message || "Background Safe Quote export failed",
            },
          };

          await db.query(
            `UPDATE safe_quote_download_logs SET csv_payload=$1 WHERE id=$2`,
            [JSON.stringify(failedPayload), asyncLogId]
          ).catch(() => {});
        }
      });

      return res.status(202).json(pendingPayload);
    }

    const { filters, params, paramIdx } = buildFilters({
      vendor_id, states: normalizedStates, min_age, max_age, include_downloaded, job_id,
    });
    const whereClause = filters.join(" AND ");

    await client.query("BEGIN");
    const updateQuery = `
      WITH selected AS (
        SELECT id FROM safe_quote_data WHERE ${whereClause}
        ORDER BY RANDOM() FOR UPDATE SKIP LOCKED LIMIT $${paramIdx}
      )
      UPDATE safe_quote_data d SET status='downloaded', downloaded_at=CURRENT_TIMESTAMP
      FROM selected s WHERE d.id = s.id
      RETURNING d.*
    `;
    params.push(quantity);
    const result = await client.query(updateQuery, params);
    await client.query("COMMIT");

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "No available Safe Quote data found matching criteria" });
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
          `UPDATE safe_quote_data SET status='DNC', downloaded_at=null WHERE phone = ANY($1::text[]) AND COALESCE(status, '') NOT IN ('SALE', 'SEPARATION')`,
          [badPhones]
        );
        await upsertSafeQuoteDncBatched({ queryFn: client.query.bind(client), badItems: scrubResult.bad });
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
      console.error("[BLA] Safe Quote scrub failed, proceeding without BLA scrub.", scrubErr.message);
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
    const fileName = `safe_quote_download_${Date.now()}.csv`;

    const logRes = await db.query(
      `INSERT INTO safe_quote_download_logs (user_id, vendor_id, quantity, states, min_age, max_age)
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
      db.query("UPDATE safe_quote_download_logs SET csv_payload=$1 WHERE id=$2", [JSON.stringify(responseBody), logId]).catch(() => {});
    }

    return res.status(200).json(responseBody);
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    console.error("Safe Quote Download Error:", err);
    res.status(500).json({ message: "Server error during download" });
  } finally {
    client.release();
  }
};

// POST /api/safe-quote-download/state-counts
const getStateCounts = async (req, res) => {
  try {
    const { vendor_id, states, min_age, max_age, include_downloaded, job_id } = req.body;
    const { filters, params } = buildFilters({
      vendor_id,
      states,
      min_age,
      max_age,
      include_downloaded,
      job_id,
    });
    const whereClause = filters.join(" AND ");

    const result = await db.query(
      `SELECT COALESCE(NULLIF(UPPER(TRIM(state)), ''), 'Unknown') AS state, COUNT(id)::int AS count
       FROM safe_quote_data
       WHERE ${whereClause}
       GROUP BY 1`,
      params
    );

    const stateCounts = {};
    for (const row of result.rows) {
      stateCounts[row.state || "Unknown"] = Number(row.count || 0);
    }

    if (states && Array.isArray(states) && states.length > 0) {
      for (const st of states) {
        if (stateCounts[st] === undefined) stateCounts[st] = 0;
      }
    }

    return res.json(stateCounts);
  } catch (err) {
    console.error("Safe Quote State Counts Error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// GET /api/safe-quote-download/already-downloaded
const getAlreadyDownloaded = async (req, res) => {
  try {
    const { page = 1, limit = 100 } = req.query;
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(500, parseInt(limit, 10) || 100);
    const offset = (pageNum - 1) * limitNum;

    const dataQuery = `
      SELECT dl.*, v.name as vendor_name, u.username, u.first_name as user_first_name, u.last_name as user_last_name
      FROM safe_quote_download_logs dl
      LEFT JOIN safe_quote_vendors v ON dl.vendor_id = v.vendor_id
      LEFT JOIN users u ON dl.user_id = u.id
      ORDER BY dl.download_date DESC
      LIMIT $1 OFFSET $2
    `;
    const countQuery = `SELECT COUNT(*)::int as count FROM safe_quote_download_logs`;

    const [dataResult, countResult] = await Promise.all([
      db.query(dataQuery, [limitNum, offset]),
      db.query(countQuery),
    ]);

    const data = dataResult.rows.map((row) => {
      let canRedownload = false;
      let fileName = `safe_quote_download_${row.id}.csv`;
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
    console.error("Safe Quote Already Downloaded Error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// GET /api/safe-quote-download/logs/:id/file
const getDownloadFile = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await db.query("SELECT csv_payload FROM safe_quote_download_logs WHERE id=$1", [id]);
    if (result.rows.length === 0) return res.status(404).json({ message: "Record not found" });
    if (!result.rows[0].csv_payload) return res.status(404).json({ message: "No stored file" });
    res.json(JSON.parse(result.rows[0].csv_payload));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// ─────────────────────────────────────────────────────────────
// POST /api/safe-quote-download/preview-scrub
// Dialer Agent → run BLA scrub PREVIEW without marking data as downloaded.
// ─────────────────────────────────────────────────────────────
const previewScrub = async (req, res) => {
  const client = await db.getClient();

  try {
    const {
      vendor_id,
      quantity,
      states,
      min_age,
      max_age,
      job_id,
      include_downloaded,
    } = req.body;

    if (!vendor_id) {
      return res.status(400).json({ message: "Please select a vendor." });
    }

    const requestedQty = parseInt(quantity, 10);
    if (!requestedQty || requestedQty <= 0) {
      return res.status(400).json({ message: "Valid quantity is required." });
    }
    if (requestedQty > 100000) {
      return res.status(400).json({ message: "Maximum allowed quantity is 100,000." });
    }

    const { filters, params, paramIdx } = buildFilters({
      vendor_id: vendor_id && vendor_id !== "all" ? vendor_id : null,
      states,
      min_age,
      max_age,
      job_id,
      include_downloaded,
    });

    const whereClause = filters.length > 0 ? filters.join(" AND ") : "1=1";

    await client.query("SET local work_mem = '256MB'");

    const selectSql =
      "SELECT id, phone, area_code FROM safe_quote_data WHERE " +
      whereClause +
      " ORDER BY RANDOM() LIMIT $" +
      paramIdx;

    const result = await client.query(selectSql, [...params, requestedQty]);
    const rows = result.rows;

    if (rows.length === 0) {
      return res.status(404).json({ message: "No available leads found matching your criteria." });
    }

    let finalRows = rows;
    let blacklist = 0;
    let stateDnc = 0;
    let federalDnc = 0;
    let badPhone = 0;

    try {
      const allPhones = rows.map(r => r.phone).filter(Boolean);
      const scrubResult = await scrubPhones(allPhones);

      if (allPhones.length >= 200 && scrubResult.bad.length === allPhones.length) {
        throw new Error("Suspicious scrub result: all numbers flagged DNC. Check BLACKLIST_ALLIANCE_API_KEY.");
      }

      const scrubInfoByPhone = new Map(
        scrubResult.bad.map(b => [normalizePhone(b.phone), b])
      );

      const badRows = rows.filter(r =>
        scrubInfoByPhone.has(normalizePhone(r.phone))
      );

      for (const r of badRows) {
        const item = scrubInfoByPhone.get(normalizePhone(r.phone)) || {};
        const typeLower = String(item.type || "").toLowerCase();

        if (typeLower.includes("federal")) federalDnc++;
        else if (typeLower.includes("state")) stateDnc++;
        else if (typeLower.includes("invalid") || typeLower.includes("bad")) badPhone++;
        else blacklist++;
      }

      if (badRows.length > 0) {
        const badPhones = [...new Set(badRows.map(r => r.phone).filter(Boolean))];

        await client.query("BEGIN");
        try {
          await client.query(
            "UPDATE safe_quote_data SET status='DNC', downloaded_at=null WHERE phone = ANY($1::text[]) AND COALESCE(status, '') NOT IN ('SALE', 'SEPARATION')",
            [badPhones]
          );
          await upsertSafeQuoteDncBatched({
            queryFn: client.query.bind(client),
            badItems: badRows.map((r) => {
              const info = scrubInfoByPhone.get(normalizePhone(r.phone)) || {};
              return { phone: r.phone, type: info.type || "DNC", reason: info.reason || "Blacklist Alliance Match" };
            }),
          });

          await client.query("COMMIT");
        } catch (badErr) {
          await client.query("ROLLBACK").catch(() => {});
          throw badErr;
        }
      }

      finalRows = rows.filter(r => !scrubInfoByPhone.has(normalizePhone(r.phone)));
    } catch (scrubErr) {
      console.error("[Safe Quote Preview Scrub] BLA failed:", scrubErr.message);
      return res.status(502).json({
        message: "BLA preview failed. Please try again.",
        error: scrubErr.message,
      });
    }

    const summary = {
      total: rows.length,
      good: finalRows.length,
      blacklist,
      stateDnc,
      federalDnc,
      badPhone,
      suppress: 0,
      wireless: 0,
      landline: 0,
      errors: 0,
      scrubPending: false,
      scrubCompleted: true,
      scrubFailed: false,
      scrubDate: new Date().toLocaleString(),
      fileName: "safe_quote_preview_" + Date.now() + ".csv",
      blaSkipped: false,
    };

    return res.status(200).json({ summary });
  } catch (err) {
    console.error("[Safe Quote Preview Scrub] Error:", err.message);
    return res.status(500).json({
      message: "Server error running preview scrub.",
      error: err.message,
    });
  } finally {
    client.release();
  }
};


// POST /api/safe-quote-download/request
const createDownloadRequest = async (req, res) => {
  try {
    const { vendor_id, quantity, states, min_age, max_age, job_id, include_downloaded } = req.body;

    if (!vendor_id) return res.status(400).json({ message: "Please select a vendor." });
    if (!quantity || quantity <= 0) return res.status(400).json({ message: "Valid quantity is required." });
    if (quantity > 100000) return res.status(400).json({ message: "Maximum allowed quantity is 100,000." });

    let blaSummary = req.body.bla_summary || null;


    if (typeof blaSummary === "string") {


      try { blaSummary = JSON.parse(blaSummary); } catch (_) {}


    }



    if (!blaSummary || blaSummary.scrubCompleted !== true || blaSummary.blaSkipped === true) {


      return res.status(400).json({


        message: "Please run Preview BLA first. Only scrubbed good data can be requested."


      });


    }
    const disposition = req.body.disposition || null;

    const result = await db.query(
      `INSERT INTO safe_quote_download_requests (admin_id, vendor_id, quantity, states, min_age, max_age, job_id, include_downloaded, bla_summary, disposition)
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

    let notifMsg = `${adminDisplayName} has requested to download ${quantity.toLocaleString()} leads from Safe Quote.`;
    if (blaSummary) {
      notifMsg += ` BLA Preview: ${(blaSummary.good || 0).toLocaleString()} good / ${(blaSummary.total || quantity).toLocaleString()} total.`;
    }

    for (const sa of superAdmins.rows) {
      await db.query(
        `INSERT INTO notifications (user_id, type, title, message, reference_id) VALUES ($1, $2, $3, $4, $5)`,
        [sa.id, "download_request_new", "📥 New Safe Quote Download Request", notifMsg, newRequest.id]
      );
    }

    return res.status(201).json({ message: "Download request submitted successfully. Awaiting SuperAdmin approval.", request: newRequest });
  } catch (err) {
    console.error("Safe Quote Create Download Request Error:", err);
    return res.status(500).json({ message: "Server error creating request" });
  }
};

// GET /api/safe-quote-download/requests
const getDownloadRequests = async (req, res) => {
  try {
    const result = await db.query(`
      SELECT dr.id, dr.quantity, dr.states, dr.status, dr.rejection_reason, dr.min_age, dr.max_age,
             dr.requested_at, dr.reviewed_at,
             u.username AS admin_username, u.first_name AS admin_first_name, u.last_name AS admin_last_name,
             v.name AS vendor_name, rv.username AS reviewed_by_username
      FROM safe_quote_download_requests dr
      LEFT JOIN users u ON dr.admin_id = u.id
      LEFT JOIN safe_quote_vendors v ON dr.vendor_id = v.vendor_id
      LEFT JOIN users rv ON dr.reviewed_by = rv.id
      ORDER BY CASE LOWER(dr.status) WHEN 'pending' THEN 0 ELSE 1 END, dr.requested_at DESC
    `);
    return res.json(result.rows);
  } catch (err) {
    console.error("Safe Quote Get Download Requests Error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// GET /api/safe-quote-download/requests/mine
const getMyDownloadRequests = async (req, res) => {
  try {
    const result = await db.query(
      `SELECT dr.id, dr.quantity, dr.states, dr.status, dr.rejection_reason, dr.min_age, dr.max_age,
              dr.requested_at, dr.reviewed_at, v.name AS vendor_name
       FROM safe_quote_download_requests dr
       LEFT JOIN safe_quote_vendors v ON dr.vendor_id = v.vendor_id
       WHERE dr.admin_id = $1 ORDER BY dr.requested_at DESC`,
      [req.user.id]
    );
    return res.json(result.rows);
  } catch (err) {
    console.error("Safe Quote Get My Download Requests Error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// PATCH /api/safe-quote-download/requests/:id
const reviewDownloadRequest = async (req, res) => {
  const { id } = req.params;
  const { action, rejection_reason } = req.body;

  if (!["accept", "reject"].includes(action))
    return res.status(400).json({ message: 'Action must be "accept" or "reject".' });

  const client = await db.getClient();
  try {
    const reqRes = await client.query(`SELECT * FROM safe_quote_download_requests WHERE id = $1`, [id]);
    if (reqRes.rows.length === 0) return res.status(404).json({ message: "Download request not found." });

    const dlReq = reqRes.rows[0];
    if (dlReq.status.toLowerCase() !== "pending")
      return res.status(400).json({ message: `Request is already ${dlReq.status}.` });

    if (action === "reject") {
      await client.query(
        `UPDATE safe_quote_download_requests SET status='rejected', rejection_reason=$1, reviewed_at=NOW(), reviewed_by=$2 WHERE id=$3`,
        [rejection_reason || null, req.user.id, id]
      );
      await db.query(
        `INSERT INTO notifications (user_id, type, title, message, reference_id) VALUES ($1, $2, $3, $4, $5)`,
        [dlReq.admin_id, "download_request_rejected", "❌ Safe Quote Download Request Rejected", rejection_reason ? `Your Safe Quote download request was rejected. Reason: ${rejection_reason}` : "Your Safe Quote download request was rejected.", dlReq.id]
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
        SELECT id FROM safe_quote_data WHERE ${whereClause}
        ORDER BY RANDOM() FOR UPDATE SKIP LOCKED LIMIT $${paramIdx}
      )
      UPDATE safe_quote_data d SET status='downloaded', downloaded_at=CURRENT_TIMESTAMP
      FROM selected s WHERE d.id = s.id
      RETURNING d.*
    `;
    params.push(dlReq.quantity);
    const result = await client.query(updateQuery, params);
    await client.query("COMMIT");

    if (result.rows.length === 0) {
      await client.query(
        `UPDATE safe_quote_download_requests SET status='rejected', rejection_reason='No available leads found.', reviewed_at=NOW(), reviewed_by=$1 WHERE id=$2`,
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
          await client.query(
            `UPDATE safe_quote_data SET status='DNC', downloaded_at=null WHERE phone=ANY($1::text[]) AND COALESCE(status, '') NOT IN ('SALE', 'SEPARATION')`,
            [badPhones]
          );
          await upsertSafeQuoteDncBatched({ queryFn: client.query.bind(client), badItems: scrubResult.bad });
          await client.query("COMMIT");

          badRowsWithState = result.rows.filter((r) => isBadPhone(r.phone)).map((r) => {
            const scrubInfo = scrubInfoByPhone.get(normalizePhone(r.phone)) || {};
            return { ...r, dnc_type: scrubInfo.type || "DNC", reason: scrubInfo.reason || "Blacklist Alliance" };
          });
          finalRows = result.rows.filter((r) => !isBadPhone(r.phone));
        }
      } catch (e) { console.error("Safe Quote scrub failed during review", e); }
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
      `UPDATE safe_quote_download_requests SET status='accepted', reviewed_at=NOW(), reviewed_by=$1, csv_data=$2, quantity=$4 WHERE id=$3`,
      [req.user.id, serializedData, id, rowsWithState.length]
    );

    await db.query(
      `INSERT INTO notifications (user_id, type, title, message, reference_id) VALUES ($1, $2, $3, $4, $5)`,
      [dlReq.admin_id, "download_request_accepted", "✅ Safe Quote Download Request Approved!", `Your Safe Quote download request for ${rowsWithState.length.toLocaleString()} leads has been approved.`, dlReq.id]
    );

    return res.json({ message: `Request accepted. ${rowsWithState.length} leads are ready to download.`, lead_count: rowsWithState.length });
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    console.error("Safe Quote Review Request Error:", err);
    return res.status(500).json({ message: "Server error" });
  } finally {
    client.release();
  }
};

// GET /api/safe-quote-download/requests/:id/file
const executeApprovedDownload = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await db.query(
      `SELECT * FROM safe_quote_download_requests WHERE id=$1 AND admin_id=$2`,
      [id, req.user.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: "Request not found." });
    const dlReq = result.rows[0];
    if (dlReq.status !== "accepted") return res.status(400).json({ message: `Request is ${dlReq.status}, not accepted.` });
    if (!dlReq.csv_data) return res.status(400).json({ message: "CSV data not available." });
    let payload;
    if (dlReq.csv_data.trim().startsWith("{")) {
      payload = JSON.parse(dlReq.csv_data);
    } else {
      payload = { isScrubbed: false, goodCsv: dlReq.csv_data, badCsv: "" };
    }
    if (!payload.summary) {
      let bla = dlReq.bla_summary;
      if (typeof bla === "string") {
        try { bla = JSON.parse(bla); } catch { bla = null; }
      }
      payload.summary = bla && typeof bla === "object"
        ? bla
        : {
            scrubPending: false,
            scrubCompleted: true,
            good: dlReq.quantity,
            total: dlReq.quantity,
            fileName: `safe_quote_request_${dlReq.id}.csv`,
          };
    }
    return res.status(200).json(payload);
  } catch (err) {
    console.error("Safe Quote Execute Approved Download Error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// GET /api/safe-quote-download/logs/:id/summary
const getDownloadLogSummary = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query('SELECT csv_payload FROM safe_quote_download_logs WHERE id=$1', [id]);
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

// GET /api/safe-quote-download/job/:jobId/stats
const getJobStats = async (req, res) => {
  try {
    const { jobId } = req.params;
    const result = await db.query(`
      SELECT 
        COUNT(*) as total_leads,
        COUNT(CASE WHEN status = 'available' THEN 1 END) as available_leads,
        COUNT(CASE WHEN status = 'downloaded' THEN 1 END) as downloaded_leads,
        COUNT(CASE WHEN status = 'DNC' THEN 1 END) as dnc_leads
      FROM safe_quote_data
      WHERE job_id = $1
    `, [jobId]);
    if (result.rows.length === 0) return res.status(404).json({ message: 'Job not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error fetching job stats:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// GET /api/safe-quote-download/job/:jobId/file
const downloadJobFile = async (req, res) => {
  try {
    const { jobId } = req.params;
    const result = await db.query('SELECT * FROM safe_quote_data WHERE job_id = $1', [jobId]);
    if (result.rows.length === 0) return res.status(404).json({ message: 'No leads found for this job' });
    
    return res.status(400).json({ message: 'Direct job download not fully implemented for Safe Quote yet. Use the standard download form.' });
  } catch (err) {
    console.error('Error downloading job file:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  downloadSafeQuoteData,
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
