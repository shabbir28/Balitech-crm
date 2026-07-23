const db = require("../config/db");
const { Parser } = require("json2csv");
const { areaCodesMap } = require("../utils/areaCodes");
const { scrubPhones, normalizePhone } = require("../utils/blacklistAlliance");

const CSV_GOOD_FIELDS = [
  { label: "First Name", value: "first_name" },
  { label: "Last Name", value: "last_name" },
  { label: "Phone No", value: "phone" },
  { label: "Email", value: "email" },
  { label: "Area Code", value: "area_code" },
  { label: "State", value: "state" },
  { label: "Age", value: "age" },
  { label: "Source", value: "source_module" }, // added source to identify where it came from
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
      insertValues.push(badItem.phone, "Mixed Download BLA Scrub");
      idx += 2;
    }

    await queryFn(
      `
        INSERT INTO dead_numbers (phone, source)
        VALUES ${valueStrings.join(",")}
        ON CONFLICT (phone) DO NOTHING
      `,
      insertValues,
    );
  }
};

function isUuid(value) {
  return (
    typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value,
    )
  );
}

function buildFilters(
  tableName,
  {
    data_campaign,
    states,
    min_age,
    max_age,
    include_downloaded,
    vendor_id,
    quality,
  },
) {
  const filters = include_downloaded
    ? ["status IN ('available', 'downloaded')"]
    : ["status = 'available'"];

  filters.push(
    `NOT EXISTS (SELECT 1 FROM dnc_numbers d WHERE d.phone = ${tableName}.phone)`,
  );
  filters.push(
    `NOT EXISTS (SELECT 1 FROM refine_dnc_numbers d WHERE d.phone = ${tableName}.phone)`,
  );
  filters.push(
    `NOT EXISTS (SELECT 1 FROM premium_dnc_numbers d WHERE d.phone = ${tableName}.phone)`,
  );
  filters.push(
    `NOT EXISTS (SELECT 1 FROM dead_numbers dn WHERE dn.phone = ${tableName}.phone)`,
  );
  filters.push(
    `NOT EXISTS (SELECT 1 FROM separation_data sd WHERE sd.phone = ${tableName}.phone)`,
  );
  const params = [];
  let idx = 1;

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

  if (vendor_id && vendor_id !== "all") {
    filters.push(`vendor_id = $${idx++}`);
    params.push(vendor_id);
  }

  if (
    quality &&
    quality !== "All" &&
    (tableName === "refine_data" || tableName === "premium_data")
  ) {
    filters.push(`quality = $${idx++}`);
    params.push(quality);
  }

  if (data_campaign && data_campaign !== "all") {
    if (tableName === "van_data") {
      filters.push(
        `EXISTS (SELECT 1 FROM van_sessions s WHERE s.id = van_data.session_id AND s.campaign_type = $${idx++})`,
      );
      params.push(String(data_campaign));
    } else {
      filters.push(`campaign_type = $${idx++}`);
      params.push(String(data_campaign));
    }
  }

  return { filters, params, paramIdx: idx };
}

async function fetchFromTable(client, tableName, qty, filtersConfig) {
  if (qty <= 0) return [];
  const { filters, params, paramIdx } = filtersConfig;
  const whereClause = filters.join(" AND ");

  let nameCols = "d.first_name, d.last_name";
  if (tableName === "refine_data" || tableName === "premium_data") {
    nameCols = "d.name as first_name, '' as last_name";
  }

  const updateQuery = `
    WITH selected AS (
      SELECT id FROM ${tableName} WHERE ${whereClause}
      ORDER BY uploaded_at ASC FOR UPDATE SKIP LOCKED LIMIT $${paramIdx}
    )
    UPDATE ${tableName} d SET status='downloaded', downloaded_at=CURRENT_TIMESTAMP
    FROM selected s WHERE d.id = s.id
    RETURNING d.id, ${nameCols}, d.phone, d.email, d.area_code, d.age, '${tableName}' as source_table
  `;
  const result = await client.query(updateQuery, [...params, qty]);
  return result.rows.map((r) => ({
    ...r,
    source_module: tableName.replace("_data", ""),
  }));
}

const downloadMixedData = async (req, res) => {
  const client = await db.getClient();
  try {
    const {
      quantity,
      van_percentage = 50,
      refine_percentage = 30,
      premium_percentage = 20,
      states,
      min_age,
      max_age,
      include_downloaded,
      van_vendor,
      refine_vendor,
      premium_vendor,
      quality,
      van_campaign,
      refine_campaign,
      premium_campaign,
    } = req.body;

    if (!quantity || quantity <= 0)
      return res.status(400).json({ message: "Valid quantity is required" });
    if (van_percentage + refine_percentage + premium_percentage !== 100) {
      return res
        .status(400)
        .json({ message: "Percentages must sum up to 100." });
    }

    const van_qty = Math.floor(quantity * (van_percentage / 100));
    const refine_qty = Math.floor(quantity * (refine_percentage / 100));
    const premium_qty = quantity - van_qty - refine_qty; // remaining

    await client.query("BEGIN");

    const vanFilters = buildFilters("van_data", {
      data_campaign: van_campaign,
      states,
      min_age,
      max_age,
      include_downloaded,
      vendor_id: van_vendor,
      quality,
    });
    const refineFilters = buildFilters("refine_data", {
      data_campaign: refine_campaign,
      states,
      min_age,
      max_age,
      include_downloaded,
      vendor_id: refine_vendor,
      quality,
    });
    const premiumFilters = buildFilters("premium_data", {
      data_campaign: premium_campaign,
      states,
      min_age,
      max_age,
      include_downloaded,
      vendor_id: premium_vendor,
      quality,
    });

    const vanRows = await fetchFromTable(
      client,
      "van_data",
      van_qty,
      vanFilters,
    );
    const refineRows = await fetchFromTable(
      client,
      "refine_data",
      refine_qty,
      refineFilters,
    );
    const premiumRows = await fetchFromTable(
      client,
      "premium_data",
      premium_qty,
      premiumFilters,
    );

    await client.query("COMMIT");

    const allLeads = [...vanRows, ...refineRows, ...premiumRows];

    if (allLeads.length === 0) {
      return res
        .status(404)
        .json({ message: "No available mixed data found matching criteria" });
    }

    let finalRows = [];
    let badRowsWithState = [];
    let blacklistCount = 0;
    let stateDncCount = 0;
    let federalDncCount = 0;
    let badPhoneCount = 0;
    let scrubErrors = 0;

    const allPhones = allLeads.map((r) => r.phone);

    try {
      const scrubResult = await scrubPhones(allPhones);

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
        const badPhoneSet = new Set(badPhones);
        const isBadPhone = (rowPhone) =>
          badPhoneSet.has(normalizePhone(rowPhone));
        const scrubInfoByPhone = new Map(
          scrubResult.bad.map((b) => [b.phone, b]),
        );

        await client.query("BEGIN");
        try {
          // Revert bad rows in each table
          const badVan = vanRows
            .filter((r) => isBadPhone(r.phone))
            .map((r) => r.phone);
          if (badVan.length > 0)
            await client.query(
              `UPDATE van_data SET status='DNC', downloaded_at=null WHERE phone = ANY($1::text[])`,
              [badVan],
            );

          const badRefine = refineRows
            .filter((r) => isBadPhone(r.phone))
            .map((r) => r.phone);
          if (badRefine.length > 0)
            await client.query(
              `UPDATE refine_data SET status='DNC', downloaded_at=null WHERE phone = ANY($1::text[])`,
              [badRefine],
            );

          const badPremium = premiumRows
            .filter((r) => isBadPhone(r.phone))
            .map((r) => r.phone);
          if (badPremium.length > 0)
            await client.query(
              `UPDATE premium_data SET status='DNC', downloaded_at=null WHERE phone = ANY($1::text[])`,
              [badPremium],
            );

          await upsertDeadNumbersBatched({
            queryFn: client.query.bind(client),
            badItems: scrubResult.bad,
          });
          await client.query("COMMIT");
        } catch (badErr) {
          await client.query("ROLLBACK").catch(() => {});
          throw badErr;
        }

        const badLeads = allLeads.filter((r) => isBadPhone(r.phone));
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

        finalRows = allLeads.filter((r) => !isBadPhone(r.phone));
      } else {
        finalRows = allLeads;
      }
    } catch (scrubErr) {
      console.error(
        "[Blacklist Alliance] Scrubbing failed. Proceeding without BLA scrub.",
        scrubErr.message,
      );
      scrubErrors = allLeads.length;
      finalRows = allLeads;
    }

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

    const csv =
      rowsWithState.length > 0
        ? new Parser({ fields: CSV_GOOD_FIELDS }).parse(rowsWithState)
        : "";
    const badCsv =
      badRowsWithState.length > 0
        ? new Parser({ fields: CSV_BAD_FIELDS }).parse(badRowsWithState)
        : "";
    const fileName = `mixed_download_${Date.now()}.csv`;

    const logRes = await db.query(
      `INSERT INTO mixed_download_logs (user_id, quantity, van_percentage, refine_percentage, premium_percentage, states, min_age, max_age)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id`,
      [
        req.user.id,
        rowsWithState.length,
        van_percentage,
        refine_percentage,
        premium_percentage,
        states && states.length > 0 ? JSON.stringify(states) : null,
        min_age || null,
        max_age || null,
      ],
    );
    const logId = logRes.rows[0]?.id;

    const summaryData = {
      total: allLeads.length,
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
      scrubFailed: scrubErrors > 0 && finalRows.length === allLeads.length,
    };

    const responseBody = {
      fileName,
      logId,
      count: rowsWithState.length,
      csv,
      badCsv,
      summary: summaryData,
    };

    if (logId) {
      db.query("UPDATE mixed_download_logs SET csv_payload=$1 WHERE id=$2", [
        JSON.stringify(responseBody),
        logId,
      ]).catch(() => {});
    }

    return res.status(200).json(responseBody);
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    console.error("Mixed Download Error:", err);
    res.status(500).json({ message: "Server error during download" });
  } finally {
    client.release();
  }
};

const getAlreadyDownloaded = async (req, res) => {
  try {
    const { page = 1, limit = 100 } = req.query;
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(500, parseInt(limit, 10) || 100);
    const offset = (pageNum - 1) * limitNum;

    const dataQuery = `
      SELECT dl.*, u.username, u.first_name as user_first_name, u.last_name as user_last_name
      FROM mixed_download_logs dl
      LEFT JOIN users u ON dl.user_id = u.id
      ORDER BY dl.download_date DESC
      LIMIT $1 OFFSET $2
    `;
    const countQuery = `SELECT COUNT(*)::int as count FROM mixed_download_logs`;

    const [dataResult, countResult] = await Promise.all([
      db.query(dataQuery, [limitNum, offset]),
      db.query(countQuery),
    ]);

    const data = dataResult.rows.map((row) => {
      let canRedownload = false;
      let fileName = `mixed_download_${row.id}.csv`;
      if (row.csv_payload) {
        try {
          const payload = JSON.parse(row.csv_payload);
          canRedownload = Boolean(payload.csv || payload.goodCsv);
          fileName = payload.summary?.fileName || payload.fileName || fileName;
        } catch (_) {}
      }
      const name =
        [row.user_first_name, row.user_last_name].filter(Boolean).join(" ") ||
        row.username ||
        "—";
      return {
        id: row.id,
        download_date: row.download_date,
        downloaded_by: name,
        file_name: fileName,
        quantity: row.quantity,
        van_percentage: row.van_percentage,
        refine_percentage: row.refine_percentage,
        premium_percentage: row.premium_percentage,
        states: Array.isArray(row.states) ? row.states : [],
        can_redownload: canRedownload,
      };
    });

    res.json({
      data,
      total: countResult.rows[0]?.count || 0,
      page: pageNum,
      limit: limitNum,
    });
  } catch (err) {
    console.error("Mixed Already Downloaded Error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

const getDownloadFile = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await db.query(
      "SELECT csv_payload FROM mixed_download_logs WHERE id=$1",
      [id],
    );
    if (result.rows.length === 0)
      return res.status(404).json({ message: "Record not found" });
    if (!result.rows[0].csv_payload)
      return res.status(404).json({ message: "No stored file" });
    res.json(JSON.parse(result.rows[0].csv_payload));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};



const { createNotification } = require('./notificationController');

// Added for request handling
const createMixedDownloadRequest = async (req, res) => {
  try {
    const { quantity, states, min_age, max_age, min_duration, max_duration, include_downloaded, van_percentage, refine_percentage, premium_percentage } = req.body;

    if (!quantity || quantity <= 0) {
      return res.status(400).json({ message: "Valid quantity is required." });
    }

    const result = await db.query(
      `INSERT INTO mixed_download_requests
               (admin_id, quantity, van_percentage, refine_percentage, premium_percentage, states, min_age, max_age, min_duration, max_duration, include_downloaded)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
             RETURNING *`,
      [
        req.user.id,
        quantity,
        van_percentage || 0,
        refine_percentage || 0,
        premium_percentage || 0,
        states && states.length ? JSON.stringify(states) : null,
        min_age || null,
        max_age || null,
        min_duration || null,
        max_duration || null,
        include_downloaded === true || include_downloaded === "true",
      ],
    );

    const newRequest = result.rows[0];

    // Notify all super_admins
    const superAdmins = await db.query(`SELECT id FROM users WHERE role='super_admin'`);
    const adminDisplayName = req.user.first_name
      ? `${req.user.first_name} ${req.user.last_name || ""}`.trim()
      : req.user.username;

    for (const sa of superAdmins.rows) {
      await createNotification(
        sa.id,
        "download_request_new",
        "📥 New Mixed Download Request",
        `${adminDisplayName} has requested to download ${quantity.toLocaleString()} mixed leads.`,
        newRequest.id,
      );
    }

    return res.status(201).json({
      message: "Download request submitted successfully. Awaiting SuperAdmin approval.",
      request: newRequest,
    });
  } catch (err) {
    console.error("Create Mixed Download Request Error:", err);
    return res.status(500).json({ message: "Server error creating request" });
  }
};

const getDownloadRequests = async (req, res) => {
  try {
    const result = await db.query(`
            SELECT
                dr.*,
                u.username as admin_username,
                u.first_name as admin_first_name,
                u.last_name as admin_last_name
            FROM mixed_download_requests dr
            LEFT JOIN users u ON dr.admin_id = u.id
            ORDER BY dr.requested_at DESC
        `);
    return res.status(200).json(result.rows);
  } catch (err) {
    console.error("Get Mixed Download Requests Error:", err);
    return res.status(500).json({ message: "Server error fetching requests" });
  }
};

const getMyDownloadRequests = async (req, res) => {
  try {
    const result = await db.query(
      `
            SELECT dr.*
            FROM mixed_download_requests dr
            WHERE dr.admin_id = $1
            ORDER BY dr.requested_at DESC
        `,
      [req.user.id]
    );
    return res.status(200).json(result.rows);
  } catch (err) {
    console.error("Get My Mixed Requests Error:", err);
    return res.status(500).json({ message: "Server error fetching requests" });
  }
};

const reviewDownloadRequest = async (req, res) => {
  const client = await db.getClient();
  try {
    const { id } = req.params;
    const { action, rejection_reason } = req.body;

    if (!["accept", "reject"].includes(action)) {
      client.release();
      return res.status(400).json({ message: "Invalid action" });
    }

    const reqRes = await client.query(`SELECT * FROM mixed_download_requests WHERE id = $1`, [id]);
    if (reqRes.rows.length === 0) {
      client.release();
      return res.status(404).json({ message: "Request not found" });
    }
    const dlReq = reqRes.rows[0];
    if (dlReq.status !== "pending") {
      client.release();
      return res.status(400).json({ message: "Request already processed" });
    }

    if (action === "reject") {
      await client.query(
        `UPDATE mixed_download_requests SET status = 'rejected', rejection_reason = $1, reviewed_at = NOW(), reviewed_by = $2 WHERE id = $3`,
        [rejection_reason || null, req.user.id, id]
      );
      await createNotification(dlReq.admin_id, "download_request_rejected", "❌ Download Request Declined", `Your mixed download request for ${dlReq.quantity} leads was declined.`, id);
      client.release();
      return res.status(200).json({ message: "Request rejected" });
    }

    // Accept: fetch data and generate CSV
    await client.query("BEGIN");
    
    let states = [];
    if (dlReq.states) {
        try { states = typeof dlReq.states === 'string' ? JSON.parse(dlReq.states) : dlReq.states; } catch(e){}
    }

    const van_qty = Math.floor(dlReq.quantity * ((dlReq.van_percentage || 0) / 100));
    const refine_qty = Math.floor(dlReq.quantity * ((dlReq.refine_percentage || 0) / 100));
    const premium_qty = dlReq.quantity - van_qty - refine_qty;

    const vanFilters = buildFilters("van_data", { states, min_age: dlReq.min_age, max_age: dlReq.max_age, include_downloaded: dlReq.include_downloaded });
    const refineFilters = buildFilters("refine_data", { states, min_age: dlReq.min_age, max_age: dlReq.max_age, include_downloaded: dlReq.include_downloaded });
    const premiumFilters = buildFilters("premium_data", { states, min_age: dlReq.min_age, max_age: dlReq.max_age, include_downloaded: dlReq.include_downloaded });

    const vanRows = await fetchFromTable(client, "van_data", van_qty, vanFilters);
    const refineRows = await fetchFromTable(client, "refine_data", refine_qty, refineFilters);
    const premiumRows = await fetchFromTable(client, "premium_data", premium_qty, premiumFilters);

    const allRows = [...vanRows, ...refineRows, ...premiumRows];
    if (allRows.length === 0) {
      await client.query("ROLLBACK");
      client.release();
      return res.status(404).json({ message: "No matching leads found for this request criteria." });
    }

    const phones = allRows.map((r) => r.phone);
    let badPhoneSet = new Set();
    let finalGoodRows = allRows;
    let finalBadRows = [];
    
    // We skip async scrub for this mixed request to keep it simple, or run standard scrub
    const scrubResult = await scrubPhones(phones);
    
    let blacklist = 0, stateDnc = 0, federalDnc = 0, badPhone = 0;
    if (scrubResult.bad.length > 0) {
      const badPhones = scrubResult.bad.map((b) => b.phone);
      badPhoneSet = new Set(badPhones);
      const scrubInfoByPhone = new Map(scrubResult.bad.map((b) => [b.phone, b]));

      // Update dead numbers
      await upsertDeadNumbersBatched({ queryFn: client.query.bind(client), badItems: scrubResult.bad });

      finalBadRows = allRows.filter((r) => badPhoneSet.has(normalizePhone(r.phone))).map(r => {
        const info = scrubInfoByPhone.get(normalizePhone(r.phone)) || {};
        const typeLower = String(info.type || "").toLowerCase();
        if (typeLower.includes("federal")) federalDnc++;
        else if (typeLower.includes("state")) stateDnc++;
        else if (typeLower.includes("invalid") || typeLower.includes("bad")) badPhone++;
        else blacklist++;
        return {
          ...r,
          dnc_type: info.type || "DNC",
          reason: info.reason || "Blacklist Alliance Match"
        };
      });
      finalGoodRows = allRows.filter((r) => !badPhoneSet.has(normalizePhone(r.phone)));
    }

    const parserGood = new Parser({ fields: CSV_GOOD_FIELDS });
    const parserBad = new Parser({ fields: CSV_BAD_FIELDS });

    const goodCsv = finalGoodRows.length > 0 ? parserGood.parse(finalGoodRows) : "";
    const badCsv = finalBadRows.length > 0 ? parserBad.parse(finalBadRows) : "";
    
    const summary = {
      fileName: `approved_mixed_${id}.csv`,
      scrubDate: new Date().toLocaleString(),
      total: allRows.length,
      blacklist, suppress: 0, stateDnc, federalDnc, wireless: 0, landline: 0,
      good: finalGoodRows.length, errors: 0, badPhone
    };

    const payloadObj = {
      isScrubbed: true,
      goodCsv,
      badCsv,
      summary
    };

    const csvDataString = JSON.stringify(payloadObj);

    await client.query(
      `UPDATE mixed_download_requests SET status = 'accepted', reviewed_at = NOW(), reviewed_by = $1, csv_data = $2 WHERE id = $3`,
      [req.user.id, csvDataString, id]
    );

    // Save download log
    await client.query(
      `INSERT INTO mixed_download_logs (user_id, quantity, states, min_age, max_age, csv_payload) VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        dlReq.admin_id,
        finalGoodRows.length,
        dlReq.states ? (typeof dlReq.states === 'string' ? dlReq.states : JSON.stringify(dlReq.states)) : null,
        dlReq.min_age || null,
        dlReq.max_age || null,
        csvDataString,
        
      ]
    );

    await client.query("COMMIT");
    client.release();

    await createNotification(dlReq.admin_id, "download_request_accepted", "✅ Download Request Approved", `Your mixed download request has been approved.`, id);

    return res.status(200).json({ message: `Request approved. ${finalGoodRows.length} leads are ready for the admin to download.`, lead_count: finalGoodRows.length });
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    client.release();
    console.error("Review Mixed Request Error:", err);
    return res.status(500).json({ message: "Server error reviewing request" });
  }
};

const executeApprovedDownload = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query(`SELECT * FROM mixed_download_requests WHERE id=$1 AND admin_id=$2`, [id, req.user.id]);
    if (result.rows.length === 0) return res.status(404).json({ message: "Request not found." });
    
    const dlReq = result.rows[0];
    if (dlReq.status !== "accepted") return res.status(400).json({ message: `Request is ${dlReq.status}` });
    if (!dlReq.csv_data) return res.status(400).json({ message: "CSV data not available." });

    if (typeof dlReq.csv_data === 'string' && dlReq.csv_data.trim().startsWith("{")) {
        return res.status(200).json(JSON.parse(dlReq.csv_data));
    } else if (typeof dlReq.csv_data === 'object') {
        return res.status(200).json(dlReq.csv_data);
    }
    
    return res.status(400).json({ message: "Invalid CSV payload." });
  } catch (err) {
    console.error("Execute Approved Download Error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

module.exports = {
  downloadMixedData,
  getAlreadyDownloaded,
  getDownloadFile,
  createMixedDownloadRequest,
  getDownloadRequests,
  getMyDownloadRequests,
  reviewDownloadRequest,
  executeApprovedDownload
};
