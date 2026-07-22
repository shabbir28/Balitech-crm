const db = require("../config/db");
const { Parser } = require("json2csv");
const { areaCodesMap } = require("../utils/areaCodes");
const { createNotification } = require("./notificationController");
const { scrubPhones, normalizePhone } = require("../utils/blacklistAlliance");

/**
 * Blacklist Alliance API is 1 HTTP call per phone. On big downloads (100k phones)
 * even at 100 concurrent it takes many minutes — way past any nginx proxy_read_timeout
 * (default 60s) and causes 502 Bad Gateway.
 *
 * MAX_API_SCRUB_PHONES — above this size we skip the external API scrub.
 *   - Local `premium_dnc_numbers` filter (NOT EXISTS) still runs on every download.
 *   - Set to 0 in .env to fully disable the external scrub.
 */
const MAX_API_SCRUB_PHONES = (() => {
  const v = parseInt(process.env.MAX_API_SCRUB_PHONES, 10);
  return Number.isFinite(v) && v >= 0 ? v : 5000;
})();

const AUTO_ASYNC_SCRUB_MIN = (() => {
  const v = parseInt(process.env.AUTO_ASYNC_SCRUB_MIN, 10);
  return Number.isFinite(v) && v > 0 ? v : 50000;
})();

const CSV_GOOD_FIELDS = [
  { label: 'Age', value: 'age' },
  { label: 'Dob', value: 'dob' },
  { label: 'Name', value: 'name' },
  { label: 'Zipcode', value: 'zipcode' },
  { label: 'Jornaya Lead id', value: 'jornaya_lead_id' },
  { label: 'State', value: 'state' },
  { label: 'Caller id', value: 'caller_id' },
  { label: 'Duration', value: 'duration' }
];
const CSV_BAD_FIELDS = [
  ...CSV_GOOD_FIELDS,
  { label: 'DNC Type', value: 'dnc_type' },
  { label: 'Reason', value: 'reason' },
];
const DNC_UPSERT_BATCH_SIZE = 3000;

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
    `UPDATE premium_download_logs SET csv_payload = $1 WHERE id = $2`,
    [payload, logId],
  );
};

const upsertDncNumbersBatched = async ({
  queryFn,
  badItems,
  campaignId = null,
}) => {
  if (!Array.isArray(badItems) || badItems.length === 0) return;

  for (let i = 0; i < badItems.length; i += DNC_UPSERT_BATCH_SIZE) {
    const chunk = badItems.slice(i, i + DNC_UPSERT_BATCH_SIZE);
    const valueStrings = [];
    const insertValues = [];
    let idx = 1;

    for (const badItem of chunk) {
      valueStrings.push(
        `($${idx}, $${idx + 1}, $${idx + 2})`,
      );
      insertValues.push(
        badItem.phone,
        "DNC",
        campaignId || null,
      );
      idx += 3;
    }

    await queryFn(
      `
        INSERT INTO premium_dnc_numbers (phone, dnc_type, campaign_id)
        VALUES ${valueStrings.join(",")}
      `,
      insertValues,
    );
  }
};

const markScrubFailed = async (logId, errMessage) => {
  if (!logId) return;
  try {
    const { rows } = await db.query(
      `SELECT csv_payload FROM premium_download_logs WHERE id = $1`,
      [logId],
    );
    const payload = rows[0]?.csv_payload ? JSON.parse(rows[0].csv_payload) : {};
    payload.summary = {
      ...(payload.summary || {}),
      scrubPending: false,
      scrubCompleted: false,
      scrubFailed: true,
      scrubError: errMessage || "Background scrub failed",
    };
    await saveDownloadLogPayload(logId, JSON.stringify(payload));
  } catch (e) {
    console.error("[Background Scrub] could not mark failed:", e.message);
  }
};

const runBackgroundScrub = async ({
  logId,
  exportedRows,
  userId,
  fileName,
  campaignId = null,
}) => {
  if (!Array.isArray(exportedRows) || exportedRows.length === 0) return;
  try {
    const phones = exportedRows
      .map((r) => normalizePhone(r.phone))
      .filter((p) => p.length === 10);
    console.log(
      `[Background Scrub] start logId=${logId} phones=${phones.length}`,
    );
    const scrubResult = await scrubPhones(phones);
    if (phones.length >= 200 && scrubResult.bad.length === phones.length) {
      throw new Error(
        "Suspicious scrub result: all numbers flagged DNC. Check BLACKLIST_ALLIANCE_API_KEY.",
      );
    }
    const badPhones = scrubResult.bad.map((x) => x.phone);
    const badPhoneSet = new Set(badPhones);
    const scrubInfoByPhone = new Map(scrubResult.bad.map((x) => [x.phone, x]));

    let blacklist = 0;
    let stateDnc = 0;
    let federalDnc = 0;
    let badPhone = 0;
    for (const item of scrubResult.bad) {
      const typeLower = String(item.type || "").toLowerCase();
      if (typeLower.includes("federal")) federalDnc += 1;
      else if (typeLower.includes("state")) stateDnc += 1;
      else if (typeLower.includes("invalid") || typeLower.includes("bad"))
        badPhone += 1;
      else blacklist += 1;
    }

    if (badPhones.length > 0) {
      await db.query(
        `
          UPDATE premium_data
          SET status = 'available',
              downloaded_at = null,
              disposition = 'DNC'
          WHERE phone = ANY($1::text[])
        `,
        [badPhones],
      );

      await upsertDncNumbersBatched({
        queryFn: db.query.bind(db),
        badItems: scrubResult.bad,
        createdBy: userId,
        notePrefix: "Background scrub. Reason: ",
        campaignId,
      });
    }

    const finalGoodRows = [];
    const finalBadRows = [];
    for (const row of exportedRows) {
      const np = normalizePhone(row.phone);
      if (badPhoneSet.has(np)) {
        const info = scrubInfoByPhone.get(np) || {};
        finalBadRows.push({
          ...row,
          dnc_type: info.type || "DNC",
          reason: info.reason || "Blacklist Alliance Match",
        });
      } else {
        finalGoodRows.push(row);
      }
    }

    const payload = serializeDownloadPayload(
      finalGoodRows,
      finalBadRows,
      {
        total: exportedRows.length,
        blacklist,
        suppress: 0,
        stateDnc,
        federalDnc,
        wireless: 0,
        landline: 0,
        good: finalGoodRows.length,
        errors: 0,
        badPhone,
        scrubPending: false,
        scrubCompleted: true,
      },
      fileName,
    );
    await saveDownloadLogPayload(logId, payload);

    console.log(
      `[Background Scrub] done logId=${logId} bad=${finalBadRows.length}/${exportedRows.length}`,
    );
  } catch (err) {
    console.error("[Background Scrub] failed:", err.message);
    await markScrubFailed(logId, err.message);
  }
};

// ─────────────────────────────────────────────────────────────
// HELPER: build WHERE clause from filters (shared logic)
// ─────────────────────────────────────────────────────────────
async function buildFilters(
  client,
  {
    vendor_id,
    campaign_id,
    states,
    min_age,
    max_age,
    min_duration,
    max_duration,
    job_id,
    include_downloaded,
  },
) {
  const includeAllVendorLeads =
    include_downloaded === true || include_downloaded === "true";

  // Re-download mode: all premium_data for this vendor (any status), not only "downloaded"
  const filters = includeAllVendorLeads ? [] : ["status = 'available'"];
  const params = [];
  let paramIdx = 1;

  if (job_id && (Array.isArray(job_id) ? job_id.length > 0 : job_id !== "")) {
    const jobIds = Array.isArray(job_id) ? job_id : [job_id];
    
    const validJobIds = [];
    const missingJobIds = [];
    
    // Check which jobIds exist in premium_data
    for (const jid of jobIds) {
      const check = await client.query(`SELECT 1 FROM premium_data WHERE job_id = $1 LIMIT 1`, [jid]);
      if (check.rows.length > 0) validJobIds.push(jid);
      else missingJobIds.push(jid);
    }
    
    const jobConditions = [];
    
    if (validJobIds.length > 0) {
      const placeholders = validJobIds.map((_, i) => `$${paramIdx + i}`).join(',');
      jobConditions.push(`job_id IN (${placeholders})`);
      params.push(...validJobIds);
      paramIdx += validJobIds.length;
    }
    
    if (missingJobIds.length > 0) {
      const jobRes = await client.query(
        `SELECT j.id, j.created_at, s.vendor_id 
         FROM premium_jobs j
         JOIN premium_sessions s ON j.session_id = s.id
         WHERE j.id = ANY($1)`,
        [missingJobIds]
      );
      
      for (const job of jobRes.rows) {
        jobConditions.push(`(vendor_id = $${paramIdx++} AND uploaded_at >= $${paramIdx++}::timestamp with time zone - INTERVAL '5 minutes' AND uploaded_at <= $${paramIdx++}::timestamp with time zone + INTERVAL '5 minutes')`);
        params.push(job.vendor_id, job.created_at, job.created_at);
      }
      
      const unfoundJobIds = missingJobIds.filter(id => !jobRes.rows.some(r => String(r.id) === String(id)));
      if (unfoundJobIds.length > 0) {
        const placeholders = unfoundJobIds.map((_, i) => `$${paramIdx + i}`).join(',');
        jobConditions.push(`job_id IN (${placeholders})`);
        params.push(...unfoundJobIds);
        paramIdx += unfoundJobIds.length;
      }
    }
    
    if (jobConditions.length > 0) {
      filters.push(`(${jobConditions.join(' OR ')})`);
    }
  } else if (vendor_id && vendor_id !== "all") {
    filters.push(`vendor_id = $${paramIdx++}`);
    params.push(vendor_id);
  }

  if (campaign_id && campaign_id !== "all") {
    const campRes = await client.query(
      "SELECT name FROM premium_campaigns WHERE campaign_id = $1",
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

  if (min_duration !== undefined && min_duration !== null && min_duration !== "") {
    filters.push(`duration >= $${paramIdx++}`);
    params.push(parseInt(min_duration));
  }

  if (max_duration !== undefined && max_duration !== null && max_duration !== "") {
    filters.push(`duration <= $${paramIdx++}`);
    params.push(parseInt(max_duration));
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
    min_duration,
    max_duration,
    force_scrub = false,
    async_scrub = false,
    job_id,
    include_downloaded = false,
  },
) {
  const { filters, params, paramIdx } = await buildFilters(client, {
    vendor_id,
    campaign_id,
    states,
    min_age,
    max_age,
    min_duration,
    max_duration,
    job_id,
    include_downloaded,
  });
  const includeAllVendorLeads =
    include_downloaded === true || include_downloaded === "true";

  let currentParamIdx = paramIdx;
  const whereParts = [...filters];
  whereParts.push(
    `NOT EXISTS (SELECT 1 FROM premium_dnc_numbers d WHERE d.phone = premium_data.phone)`,
  );
  if (campaign_id && campaign_id !== "all") {
    whereParts.push(
      `NOT EXISTS (SELECT 1 FROM separation_data sd WHERE sd.phone = premium_data.phone AND sd.campaign_id = $${currentParamIdx++})`
    );
    params.push(campaign_id);
  }
  const whereClause =
    whereParts.length > 0 ? whereParts.join(" AND ") : "1=1";

    await client.query("SET local work_mem = '512MB'");

  const updateQuery = `
        WITH selected_leads AS (
            SELECT id 
            FROM premium_data 
            WHERE ${whereClause}
            ORDER BY uploaded_at ASC
            FOR UPDATE SKIP LOCKED
            LIMIT $${currentParamIdx}
        )
        UPDATE premium_data l
        SET status = 'downloaded', downloaded_at = CURRENT_TIMESTAMP
        FROM selected_leads sl
        WHERE l.id = sl.id
        RETURNING l.name, l.phone, l.email, l.country_code, l.area_code, l.disposition, l.age, l.dob, l.zipcode, l.jornaya_lead_id, l.state, COALESCE(NULLIF(TRIM(l.caller_id), ''), l.phone, '') AS caller_id, l.duration
    `;
  params.push(quantity);

  // ── Phase 1 (SHORT transaction): claim rows + commit ──────────────────────
  // We need the locks released ASAP so other downloads aren't blocked while we
  // talk to the external Blacklist Alliance API (which can take minutes).
  const result = await client.query(updateQuery, params);
  await client.query("COMMIT");

  let finalRows = result.rows;
  let badRowsWithState = [];
  let blacklistCount = 0;
  let stateDncCount = 0;
  let federalDncCount = 0;
  let badPhoneCount = 0;
  let scrubErrors = 0;

  if (result.rows.length > 0) {
    const allPhones = result.rows.map((r) => r.phone);

    // force_scrub (from request body) overrides MAX_API_SCRUB_PHONES — use it
    // when you explicitly want to test/run the Blacklist Alliance API on a big batch.
    const wouldSkip =
      MAX_API_SCRUB_PHONES === 0 || allPhones.length > MAX_API_SCRUB_PHONES;
    const skipApiScrub = async_scrub || (wouldSkip && !force_scrub);

    if (async_scrub) {
      console.warn(
        `[Download] async_scrub enabled for ${allPhones.length} phones; returning fast and scrubbing in background.`,
      );
    } else if (skipApiScrub) {
      console.warn(
        `[Download] Skipping Blacklist Alliance API scrub for ${allPhones.length} phones ` +
          `(threshold ${MAX_API_SCRUB_PHONES}). Local premium_dnc_numbers filter still applied. ` +
          `Pass force_scrub=true in the request body to override.`,
      );
    } else if (force_scrub && wouldSkip) {
      console.log(
        `[Download] force_scrub=true — running API scrub on ${allPhones.length} phones (this can take several minutes).`,
      );
    }

    try {
      const scrubResult = skipApiScrub
        ? { good: allPhones, bad: [] }
        : await scrubPhones(allPhones);
      if (
        !skipApiScrub &&
        allPhones.length >= 200 &&
        scrubResult.bad.length === allPhones.length
      ) {
        throw new Error(
          "Suspicious scrub result: all numbers flagged DNC. Check BLACKLIST_ALLIANCE_API_KEY.",
        );
      }

      for (const item of scrubResult.bad) {
        const typeLower = String(item.type || "").toLowerCase();
        if (typeLower.includes("federal")) federalDncCount++;
        else if (typeLower.includes("state")) stateDncCount++;
        else if (typeLower.includes("invalid") || typeLower.includes("bad"))
          badPhoneCount++;
        else blacklistCount++;
      }

      if (scrubResult.bad.length > 0) {
        const badPhones = scrubResult.bad.map((b) => b.phone);
        const badPhoneSet = new Set(badPhones); // O(1) lookups vs Array.includes
        const isBadPhone = (rowPhone) => badPhoneSet.has(normalizePhone(rowPhone));
        const scrubInfoByPhone = new Map(
          scrubResult.bad.map((b) => [b.phone, b]),
        );

        // ── Phase 2 (SMALL new transaction): revert bad rows + add to DNC ───
        await client.query("BEGIN");
        try {
          await client.query(
            `
              UPDATE premium_data
              SET status = 'available',
                  downloaded_at = null,
                  disposition = 'DNC'
              WHERE phone = ANY($1::text[])
            `,
            [badPhones],
          );

          await upsertDncNumbersBatched({
            queryFn: client.query.bind(client),
            badItems: scrubResult.bad,
            createdBy: user_id,
            notePrefix: "Auto-Scrubbed on download. Reason: ",
            campaignId: campaign_id || null,
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

        finalRows = result.rows.filter((r) => !isBadPhone(r.phone));
      }
    } catch (scrubErr) {
      console.error(
        "[Blacklist Alliance] Scrubbing failed. Proceeding with original premium_data for safety.",
        scrubErr.message,
      );
      scrubErrors = result.rows.length;
    }
  }

  // ── Phase 3: log the download (single insert, no transaction needed) ──────
  const logRes = await client.query(
    `INSERT INTO premium_download_logs (
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
    allPhones: result.rows.map((r) => r.phone),
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
      scrubPending: async_scrub === true,
      scrubCompleted: async_scrub !== true,
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

  // Disable Node's socket timeout — big downloads can legitimately take minutes.
  // Reverse proxies (nginx) still apply their own timeouts; raise those in production.
  if (typeof res.setTimeout === "function") res.setTimeout(0);
  req.socket?.setKeepAlive?.(true, 30 * 1000);

  const client = await db.getClient();
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
      force_scrub,
      async_scrub,
      job_id,
      include_downloaded,
    } = req.body;
    if (!quantity || quantity <= 0) {
      return res.status(400).json({ message: "Valid quantity is required" });
    }
    if (
      (include_downloaded === true || include_downloaded === "true") &&
      (!vendor_id || vendor_id === "all")
    ) {
      return res.status(400).json({
        message:
          "Re-download mode requires a specific vendor (not All Vendors).",
      });
    }

    const forceScrub = force_scrub === true || force_scrub === "true";
    const requestedAsync = async_scrub === true || async_scrub === "true";
    const autoAsync = Number(quantity) >= AUTO_ASYNC_SCRUB_MIN;
    const asyncScrub = requestedAsync || (autoAsync && !forceScrub);

    await client.query("BEGIN");
    const { goodRows, badRows, summary, logId, allPhones } = await executeDownload(client, {
      vendor_id: vendor_id && vendor_id !== "all" ? vendor_id : null,
      campaign_id: campaign_id && campaign_id !== "all" ? campaign_id : null,
      states,
      quantity,
      user_id: req.user.id,
      min_age,
      max_age,
      min_duration,
      max_duration,
      force_scrub: forceScrub,
      async_scrub: asyncScrub,
      job_id,
      include_downloaded,
    });
    // executeDownload now commits internally; outer rollback is a no-op afterwards.

    if (goodRows.length === 0 && badRows.length === 0) {
      return res.status(404).json({
        message:
          include_downloaded === true || include_downloaded === "true"
            ? "No premium_data found to re-download for this vendor (check filters)."
            : "No available premium_data found matching criteria",
      });
    }

    const fileName = `leads_download_${Date.now()}.csv`;

    // Build CSVs (this is the slowest CPU step for 100k rows — ~1-2s)
    const goodCsv =
      goodRows.length > 0
        ? new Parser({ fields: CSV_GOOD_FIELDS }).parse(goodRows)
        : "";
    const badCsv =
      badRows.length > 0
        ? new Parser({ fields: CSV_BAD_FIELDS }).parse(badRows)
        : "";

    const responseBody = {
      isScrubbed: true,
      logId,
      summary: {
        fileName,
        scrubDate: new Date().toLocaleString(),
        ...summary,
      },
      goodCsv,
      badCsv,
    };

    // Persist a copy to premium_download_logs so "Already Downloaded" can re-download.
    // Run in the background — don't make the user wait on a second JSON.stringify.
    saveDownloadLogPayload(logId, JSON.stringify(responseBody)).catch((err) =>
      console.error("Failed to persist download payload:", err.message),
    );

    if (asyncScrub && Array.isArray(allPhones) && allPhones.length > 0) {
      setImmediate(() =>
        runBackgroundScrub({
          logId,
          exportedRows: goodRows,
          userId: req.user.id,
          fileName,
          campaignId:
            campaign_id && campaign_id !== "all" ? campaign_id : null,
        }),
      );
    }

    return res.status(200).json(responseBody);
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
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
    if (
      (include_downloaded === true || include_downloaded === "true") &&
      (!vendor_id || vendor_id === "all")
    ) {
      return res.status(400).json({
        message:
          "Re-download mode requires a specific vendor (not All Vendors).",
      });
    }

    const result = await db.query(
      `INSERT INTO premium_download_requests
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
        include_downloaded === true || include_downloaded === "true",
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
        `${adminDisplayName} has requested to download ${quantity.toLocaleString()} premium_data from vendor data.`,
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
            FROM premium_download_requests dr
            LEFT JOIN users u  ON dr.admin_id = u.id
            LEFT JOIN premium_vendors v ON dr.vendor_id = v.vendor_id
            LEFT JOIN premium_campaigns c ON dr.campaign_id = c.campaign_id
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
            FROM premium_download_requests dr
            LEFT JOIN premium_vendors v  ON dr.vendor_id  = v.vendor_id
            LEFT JOIN premium_campaigns c ON dr.campaign_id = c.campaign_id
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
      `SELECT * FROM premium_download_requests WHERE id = $1`,
      [id],
    );
    if (reqRes.rows.length === 0) {
      return res.status(404).json({ message: "Download request not found." });
    }
    const dlReq = reqRes.rows[0];
    if (dlReq.status.toLowerCase() !== "pending") {
      return res
        .status(400)
        .json({ message: `Request is already ${dlReq.status}.` });
    }

    if (action === "reject") {
      await client.query(
        `UPDATE premium_download_requests
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
          ? `Your download request for ${dlReq.quantity?.toLocaleString()} premium_data was rejected. Reason: ${rejection_reason}`
          : `Your download request for ${dlReq.quantity?.toLocaleString()} premium_data was rejected by the SuperAdmin.`,
        dlReq.id,
      );
      return res.json({ message: "Request rejected successfully." });
    }

    // ── Accept ── executeDownload manages its own short transactions internally
    if (typeof res.setTimeout === "function") res.setTimeout(0);
    req.socket?.setKeepAlive?.(true, 30 * 1000);

    await client.query("BEGIN");
    txnStarted = true;

    const { goodRows, badRows, summary, logId } = await executeDownload(client, {
      vendor_id: dlReq.vendor_id,
      campaign_id: dlReq.campaign_id,
      states: dlReq.states,
      quantity: dlReq.quantity,
      min_age: dlReq.min_age,
      max_age: dlReq.max_age,
      min_duration: dlReq.min_duration,
      max_duration: dlReq.max_duration,
      user_id: dlReq.admin_id,
      approved_by_id: req.user.id,
      job_id: dlReq.job_id,
      include_downloaded: dlReq.include_downloaded,
    });
    // executeDownload already committed (phase 1/2). Outer tx is effectively done.
    txnStarted = false;

    if (goodRows.length === 0 && badRows.length === 0) {
      await db.query(
        `UPDATE premium_download_requests
                 SET status='rejected', rejection_reason='No available premium_data found matching the criteria at time of approval.',
                     reviewed_at=NOW(), reviewed_by=$1
                 WHERE id=$2`,
        [req.user.id, id],
      );
      return res.status(404).json({
        message:
          "No available premium_data found. Request has been marked as rejected.",
      });
    }

    const serializedData = serializeDownloadPayload(
      goodRows,
      badRows,
      summary,
      `approved_leads_${id}.csv`,
    );

    await db.query(
      `UPDATE premium_download_requests
             SET status='accepted', reviewed_at=NOW(), reviewed_by=$1, csv_data=$2
             WHERE id=$3`,
      [req.user.id, serializedData, id],
    );

    saveDownloadLogPayload(logId, serializedData).catch((err) =>
      console.error("Failed to persist download payload:", err.message),
    );
    txnStarted = false;

    // Notify the admin that their request was approved
    await createNotification(
      dlReq.admin_id,
      "download_request_accepted",
      "✅ Download Request Approved!",
      `Your download request for ${goodRows.length.toLocaleString()} premium_data has been approved. You can now download your CSV file.`,
      dlReq.id,
    );

    return res.json({
      message: `Request accepted. ${goodRows.length} premium_data are ready for the admin to download.`,
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
      `SELECT * FROM premium_download_requests WHERE id=$1 AND admin_id=$2`,
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
            FROM premium_download_logs dl
            LEFT JOIN users u  ON dl.user_id    = u.id
            LEFT JOIN users ap ON dl.approved_by = ap.id
            LEFT JOIN premium_vendors v ON dl.vendor_id  = v.vendor_id
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
  let scrubPending = false;
  let scrubCompleted = true;
  let scrubFailed = false;

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
      scrubPending = summary.scrubPending === true;
      scrubCompleted =
        summary.scrubCompleted === true || summary.scrubPending !== true;
      scrubFailed = summary.scrubFailed === true;
      if (scrubFailed) {
        scrubPending = false;
        scrubCompleted = false;
      }
    } catch (_) {
      canRedownload = false;
      canDownloadDnc = false;
      scrubPending = false;
      scrubCompleted = true;
      scrubFailed = false;
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
    scrub_pending: scrubPending,
    scrub_completed: scrubCompleted,
    scrub_status: scrubPending ? "pending" : scrubFailed ? "failed" : "completed",
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
      FROM premium_download_logs dl
      LEFT JOIN premium_vendors v ON dl.vendor_id = v.vendor_id
      LEFT JOIN premium_campaigns c ON dl.campaign_id = c.campaign_id
      LEFT JOIN users u ON dl.user_id = u.id
      LEFT JOIN users ap ON dl.approved_by = ap.id
      ${where}
      ORDER BY dl.download_date DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `;

    const countQuery = `
      SELECT COUNT(*)::int AS count
      FROM premium_download_logs dl
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

// GET /api/download/already-downloaded — premium_vendors grouped with download counts
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
      FROM premium_download_logs dl
      LEFT JOIN premium_vendors v ON dl.vendor_id = v.vendor_id
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
      FROM premium_download_logs dl
      LEFT JOIN premium_vendors v ON dl.vendor_id = v.vendor_id
      LEFT JOIN premium_campaigns c ON dl.campaign_id = c.campaign_id
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

// GET /api/download/logs/:id/summary — lightweight poll for background BLA scrub (large exports)
const getDownloadLogSummary = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query(
      `SELECT csv_payload FROM premium_download_logs WHERE id = $1`,
      [id],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Download record not found" });
    }

    const row = result.rows[0];
    if (!row.csv_payload) {
      return res.status(404).json({
        message: "No stored scrub data for this download yet.",
      });
    }

    const payload = JSON.parse(row.csv_payload);
    const summary = payload.summary || {};
    const scrubPending = summary.scrubPending === true;
    const scrubFailed = summary.scrubFailed === true;
    const scrubCompleted =
      summary.scrubCompleted === true ||
      (!scrubPending && !scrubFailed);

    return res.status(200).json({
      summary,
      scrubPending,
      scrubCompleted,
      scrubFailed,
      scrubError: summary.scrubError || null,
    });
  } catch (err) {
    console.error("Get Download Log Summary Error:", err);
    res.status(500).json({ message: "Server error loading scrub summary" });
  }
};

// GET /api/download/logs/:id/file — re-download stored CSV from history
const getDownloadLogFile = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query(
      `SELECT csv_payload, quantity FROM premium_download_logs WHERE id = $1`,
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

// ─────────────────────────────────────────────────────────────
// POST /api/download/state-counts
// Return available premium_data count mapped by state
// ─────────────────────────────────────────────────────────────
const getStateCounts = async (req, res) => {
  try {
    const {
      vendor_id,
      campaign_id,
      states,
      min_age,
      max_age,
      min_duration,
      max_duration,
      job_id,
      include_downloaded,
    } = req.body;
    const client = await db.getClient();
    try {
      const { filters, params } = await buildFilters(client, {
        vendor_id,
        campaign_id,
        states,
        min_age,
        max_age,
        min_duration,
        max_duration,
        job_id,
        include_downloaded,
      });
      const whereClause = filters.join(" AND ");

      let currentParamIdx = params.length + 1;
      let dncFilter = `NOT EXISTS (SELECT 1 FROM premium_dnc_numbers d WHERE d.phone = premium_data.phone)`;
      if (campaign_id && campaign_id !== "all") {
        dncFilter += ` AND NOT EXISTS (SELECT 1 FROM separation_data sd WHERE sd.phone = premium_data.phone AND sd.campaign_id = $${currentParamIdx++})`;
        params.push(campaign_id);
      }

      const query = `
        SELECT area_code, COUNT(id)::int as count 
        FROM premium_data 
        WHERE ${whereClause} AND ${dncFilter}
        GROUP BY area_code
      `;
      const result = await client.query(query, params);
      
      const stateCounts = {};
      for (const row of result.rows) {
        let stateAbbr = areaCodesMap[row.area_code] || "Unknown";
        stateCounts[stateAbbr] = (stateCounts[stateAbbr] || 0) + row.count;
      }
      
      // If specific states were requested, ensure they are all in the response (even if 0)
      if (states && Array.isArray(states) && states.length > 0) {
        for (const s of states) {
           if (stateCounts[s] === undefined) stateCounts[s] = 0;
        }
      }

      res.json(stateCounts);
    } finally {
      client.release();
    }
  } catch (err) {
    console.error("Get State Counts Error:", err);
    res.status(500).json({ message: "Server error getting state counts" });
  }
};

// GET /api/download/job/:jobId/file
const downloadJobFile = async (req, res) => {
  const { jobId } = req.params;
  try {
    const jobRes = await db.query(
      `SELECT j.id, j.file_name, j.created_at, s.vendor_id, v.name as vendor_name
       FROM premium_jobs j
       JOIN premium_sessions s ON j.session_id = s.id
       JOIN premium_vendors v ON s.vendor_id = v.vendor_id
       WHERE j.id = $1`,
      [jobId]
    );

    if (jobRes.rows.length === 0) {
      return res.status(404).json({ message: "Upload job not found" });
    }

    const job = jobRes.rows[0];

    // Query premium_data of this job
    let leadsRes = await db.query(
      `SELECT name, phone, email, country_code, area_code, disposition, age, status, uploaded_at
       FROM premium_data
       WHERE job_id = $1
       ORDER BY id ASC`,
      [jobId]
    );

    // Fallback if no premium_data have this job_id (old premium_jobs before this migration)
    if (leadsRes.rows.length === 0) {
      leadsRes = await db.query(
        `SELECT name, phone, email, country_code, area_code, disposition, age, status, uploaded_at
         FROM premium_data
         WHERE vendor_id = $1
           AND uploaded_at >= $2::timestamp with time zone - INTERVAL '5 minutes'
           AND uploaded_at <= $2::timestamp with time zone + INTERVAL '5 minutes'
         ORDER BY id ASC`,
        [job.vendor_id, job.created_at]
      );
    }

    const premium_data = leadsRes.rows.map((r) => {
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

    if (premium_data.length === 0) {
      return res.status(404).json({ message: "No premium_data found for this uploaded file" });
    }

    const csv = new Parser({ fields: CSV_GOOD_FIELDS }).parse(premium_data);

    return res.status(200).json({
      fileName: job.file_name,
      csv,
      count: premium_data.length
    });
  } catch (err) {
    console.error("Error downloading job file:", err);
    return res.status(500).json({ message: "Server error downloading job file" });
  }
};

// GET /api/download/job/:jobId/stats
const getJobStats = async (req, res) => {
  const { jobId } = req.params;
  try {
    const jobRes = await db.query(
      `SELECT j.id, j.file_name, j.created_at, s.vendor_id, v.name as vendor_name
       FROM premium_jobs j
       JOIN premium_sessions s ON j.session_id = s.id
       JOIN premium_vendors v ON s.vendor_id = v.vendor_id
       WHERE j.id = $1`,
      [jobId]
    );

    if (jobRes.rows.length === 0) {
      return res.status(404).json({ message: "Upload job not found" });
    }

    const job = jobRes.rows[0];

    // Check if there are premium_data with this job_id
    const jobCheck = await db.query(
      `SELECT 1 FROM premium_data WHERE job_id = $1 LIMIT 1`,
      [jobId]
    );

    let countQuery;
    let countParams;

    if (jobCheck.rows.length > 0) {
      countQuery = `
        SELECT 
          COUNT(l.id)::int as total_leads,
          COUNT(CASE WHEN l.status = 'downloaded' THEN 1 END)::int as downloaded_leads,
          COUNT(CASE WHEN l.status = 'available' AND COALESCE(l.disposition, '') <> 'DNC' AND d.phone IS NULL THEN 1 END)::int as available_leads,
          COUNT(CASE WHEN COALESCE(l.disposition, '') = 'DNC' OR d.phone IS NOT NULL THEN 1 END)::int as dnc_leads
        FROM premium_data l
        LEFT JOIN premium_dnc_numbers d ON l.phone = d.phone
        WHERE l.job_id = $1
      `;
      countParams = [jobId];
    } else {
      // Fallback for old premium_jobs
      countQuery = `
        SELECT 
          COUNT(l.id)::int as total_leads,
          COUNT(CASE WHEN l.status = 'downloaded' THEN 1 END)::int as downloaded_leads,
          COUNT(CASE WHEN l.status = 'available' AND COALESCE(l.disposition, '') <> 'DNC' AND d.phone IS NULL THEN 1 END)::int as available_leads,
          COUNT(CASE WHEN COALESCE(l.disposition, '') = 'DNC' OR d.phone IS NOT NULL THEN 1 END)::int as dnc_leads
        FROM premium_data l
        LEFT JOIN premium_dnc_numbers d ON l.phone = d.phone
        WHERE l.vendor_id = $1
          AND l.uploaded_at >= $2::timestamp with time zone - INTERVAL '5 minutes'
          AND l.uploaded_at <= $2::timestamp with time zone + INTERVAL '5 minutes'
      `;
      countParams = [job.vendor_id, job.created_at];
    }

    const countsRes = await db.query(countQuery, countParams);
    const counts = countsRes.rows[0] || { total_leads: 0, downloaded_leads: 0, available_leads: 0, dnc_leads: 0 };

    return res.status(200).json({
      jobId,
      name: job.file_name,
      total_leads: counts.total_leads,
      downloaded_leads: counts.downloaded_leads,
      available_leads: counts.available_leads,
      dnc_leads: counts.dnc_leads
    });
  } catch (err) {
    console.error("Error getting job stats:", err);
    return res.status(500).json({ message: "Server error getting job stats" });
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
  getDownloadLogSummary,
  getStateCounts,
  downloadJobFile,
  getJobStats,
};
