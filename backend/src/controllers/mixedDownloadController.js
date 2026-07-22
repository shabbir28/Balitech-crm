const db = require("../config/db");
const fs = require("fs");
const path = require("path");
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
  { label: 'Age', value: 'age' },
  { label: 'Source', value: 'source_module' } // added source to identify where it came from
];

const CSV_BAD_FIELDS = [
  ...CSV_GOOD_FIELDS,
  { label: 'DNC Type', value: 'dnc_type' },
  { label: 'Reason', value: 'reason' }
];

const DNC_UPSERT_BATCH_SIZE = 3000;

const MIXED_EXPORT_DIR = path.join(__dirname, "../../exports/mixed-downloads");

function ensureMixedExportDir() {
  fs.mkdirSync(MIXED_EXPORT_DIR, { recursive: true });
}

function safeFileName(name) {
  return String(name || "").replace(/[^a-zA-Z0-9._-]/g, "_");
}

function mixedDownloadUrl(fileName) {
  return `/api/mixed-download/files/${encodeURIComponent(fileName)}`;
}

const upsertDeadNumbersBatched = async ({ queryFn, badItems }) => {
  if (!Array.isArray(badItems) || badItems.length === 0) return;

  for (let i = 0; i < badItems.length; i += DNC_UPSERT_BATCH_SIZE) {
    const chunk = badItems.slice(i, i + DNC_UPSERT_BATCH_SIZE);
    const valueStrings = [];
    const insertValues = [];
    let idx = 1;

    for (const badItem of chunk) {
      valueStrings.push(`($${idx}, $${idx + 1})`);
      insertValues.push(badItem.phone, 'Mixed Download BLA Scrub');
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

function isUuid(value) {
  return typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function buildFilters(tableName, { data_campaign, states, min_age, max_age, include_downloaded, vendor_id, quality }) {
  const filters = include_downloaded 
    ? ["status IN ('available', 'downloaded')"] 
    : ["status = 'available'"];
  
  filters.push(`NOT EXISTS (SELECT 1 FROM dnc_numbers d WHERE d.phone = ${tableName}.phone)`);
  filters.push(`NOT EXISTS (SELECT 1 FROM refine_dnc_numbers d WHERE d.phone = ${tableName}.phone)`);
  filters.push(`NOT EXISTS (SELECT 1 FROM premium_dnc_numbers d WHERE d.phone = ${tableName}.phone)`);
  filters.push(`NOT EXISTS (SELECT 1 FROM dead_numbers dn WHERE dn.phone = ${tableName}.phone)`);
  filters.push(`NOT EXISTS (SELECT 1 FROM separation_data sd WHERE sd.phone = ${tableName}.phone)`);
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

  if (quality && quality !== "All" && (tableName === "refine_data" || tableName === "premium_data")) {
    filters.push(`quality = $${idx++}`);
    params.push(quality);
  }

  if (data_campaign && data_campaign !== "all") {
    if (tableName === "van_data") {
      // Van campaign_type is numeric/inconsistent in van_sessions, so skip Van campaign filter.
      // Vendor filter is already applied for Van data.
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
  return result.rows.map(r => ({ ...r, source_module: tableName.replace('_data', '') }));
}

const downloadMixedData = async (req, res) => {
  const client = await db.getClient();
  try {
    const { 
      quantity, van_percentage = 50, refine_percentage = 30, premium_percentage = 20, 
      states, min_age, max_age, include_downloaded,
      van_vendor, refine_vendor, premium_vendor, quality,
      van_campaign, refine_campaign, premium_campaign
    } = req.body;
    
    if (!quantity || quantity <= 0) return res.status(400).json({ message: "Valid quantity is required" });
    if (van_percentage + refine_percentage + premium_percentage !== 100) {
      return res.status(400).json({ message: "Percentages must sum up to 100." });
    }

    const van_qty = Math.floor(quantity * (van_percentage / 100));
    const refine_qty = Math.floor(quantity * (refine_percentage / 100));
    const premium_qty = quantity - van_qty - refine_qty; // remaining

    await client.query("BEGIN");

    const vanFilters = buildFilters("van_data", { data_campaign: van_campaign, states, min_age, max_age, include_downloaded, vendor_id: van_vendor, quality });
    const refineFilters = buildFilters("refine_data", { data_campaign: refine_campaign, states, min_age, max_age, include_downloaded, vendor_id: refine_vendor, quality });
    const premiumFilters = buildFilters("premium_data", { data_campaign: premium_campaign, states, min_age, max_age, include_downloaded, vendor_id: premium_vendor, quality });

    const vanRows = await fetchFromTable(client, "van_data", van_qty, vanFilters);
    const refineRows = await fetchFromTable(client, "refine_data", refine_qty, refineFilters);
    const premiumRows = await fetchFromTable(client, "premium_data", premium_qty, premiumFilters);

    await client.query("COMMIT");

    const allLeads = [...vanRows, ...refineRows, ...premiumRows];

    if (allLeads.length === 0) {
      return res.status(404).json({ message: "No available mixed data found matching criteria" });
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
        else if (typeLower.includes("invalid") || typeLower.includes("bad")) badPhoneCount++;
        else blacklistCount++;
      }

      if (scrubResult.bad.length > 0) {
        const badPhones = scrubResult.bad.map((b) => b.phone);
        const badPhoneSet = new Set(badPhones);
        const isBadPhone = (rowPhone) => badPhoneSet.has(normalizePhone(rowPhone));
        const scrubInfoByPhone = new Map(scrubResult.bad.map((b) => [b.phone, b]));

          // Do not block the download response while marking DNC rows.
          // Large mixed exports can have 10k+ bad numbers; update them in background.
          const badVan = vanRows.filter(r => isBadPhone(r.phone)).map(r => r.phone);
          const badRefine = refineRows.filter(r => isBadPhone(r.phone)).map(r => r.phone);
          const badPremium = premiumRows.filter(r => isBadPhone(r.phone)).map(r => r.phone);

          console.log(`[Mixed Download] Queuing background DNC updates: van=${badVan.length}, refine=${badRefine.length}, premium=${badPremium.length}, dead=${scrubResult.bad.length}`);

          setImmediate(() => {
            (async () => {
              let bgClient;
              try {
                bgClient = await db.getClient();
                await bgClient.query("BEGIN");

                if (badVan.length > 0) {
                  await bgClient.query(`UPDATE van_data SET status='DNC', downloaded_at=null WHERE phone = ANY($1::varchar[])`, [badVan]);
                }

                if (badRefine.length > 0) {
                  await bgClient.query(`UPDATE refine_data SET status='DNC', downloaded_at=null WHERE phone = ANY($1::varchar[])`, [badRefine]);
                }

                if (badPremium.length > 0) {
                  await bgClient.query(`UPDATE premium_data SET status='DNC', downloaded_at=null WHERE phone = ANY($1::varchar[])`, [badPremium]);
                }

                await upsertDeadNumbersBatched({
                  queryFn: bgClient.query.bind(bgClient),
                  badItems: scrubResult.bad
                });

                await bgClient.query("COMMIT");
                console.log(`[Mixed Download] Background DNC updates completed: totalBad=${scrubResult.bad.length}`);
              } catch (bgErr) {
                if (bgClient) await bgClient.query("ROLLBACK").catch(() => {});
                console.error("[Mixed Download] Background DNC update failed:", bgErr.message);
              } finally {
                if (bgClient) bgClient.release();
              }
            })();
          });

        const badLeads = allLeads.filter((r) => isBadPhone(r.phone));
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

        finalRows = allLeads.filter((r) => !isBadPhone(r.phone));
      } else {
        finalRows = allLeads;
      }
    } catch (scrubErr) {
      console.error("[Blacklist Alliance] Scrubbing failed. Proceeding without BLA scrub.", scrubErr.message);
      scrubErrors = allLeads.length;
      finalRows = allLeads;
    }

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
      ]
    );
    const logId = logRes.rows[0]?.id;

    const summaryData = {
        total: rowsWithState.length + badRowsWithState.length,
        requested: Number(quantity),
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
      scrubFailed: scrubErrors > 0 && finalRows.length === allLeads.length
    };

      ensureMixedExportDir();

      const safeGoodFile = safeFileName(fileName);
      const badFileName = safeGoodFile.replace(/\.csv$/i, "_bad_dnc.csv");

      const goodPath = path.join(MIXED_EXPORT_DIR, safeGoodFile);
      const badPath = path.join(MIXED_EXPORT_DIR, badFileName);

      const hasGoodCsv = csv && String(csv).trim();
      const hasBadCsv = badCsv && String(badCsv).trim();

      if (hasGoodCsv) {
        fs.writeFileSync(goodPath, csv, "utf8");
      }

      if (hasBadCsv) {
        fs.writeFileSync(badPath, badCsv, "utf8");
      }

      const responseBody = {
        fileName: safeGoodFile,
        logId,
        count: rowsWithState.length,
        downloadUrl: hasGoodCsv ? mixedDownloadUrl(safeGoodFile) : null,
        badFileName: hasBadCsv ? badFileName : null,
        badDownloadUrl: hasBadCsv ? mixedDownloadUrl(badFileName) : null,
        summary: summaryData,
      };

      if (logId) {
        db.query("UPDATE mixed_download_logs SET csv_payload=$1 WHERE id=$2", [
          JSON.stringify(responseBody),
          logId,
        ]).catch((e) => console.error("[Mixed Download] log payload update failed:", e.message));
      }

      console.log(`[Mixed Download] Sending response: count=${responseBody.count}, downloadUrl=${responseBody.downloadUrl}, badDownloadUrl=${responseBody.badDownloadUrl}`);
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
          const payload = typeof row.csv_payload === "string"
            ? JSON.parse(row.csv_payload)
            : row.csv_payload;
          canRedownload = Boolean(payload.csv || payload.downloadUrl || payload.badDownloadUrl);
          fileName = payload.fileName || fileName;
        } catch (_) {}
      }
      const name = [row.user_first_name, row.user_last_name].filter(Boolean).join(" ") || row.username || "—";
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

    res.json({ data, total: countResult.rows[0]?.count || 0, page: pageNum, limit: limitNum });
  } catch (err) {
    console.error("Mixed Already Downloaded Error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

const getDownloadFile = async (req, res) => {
  const { id } = req.params;

  try {
    const result = await db.query("SELECT csv_payload FROM mixed_download_logs WHERE id=$1", [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Record not found" });
    }

    if (!result.rows[0].csv_payload) {
      return res.status(404).json({ message: "No stored file" });
    }

    const payload = typeof result.rows[0].csv_payload === "string"
      ? JSON.parse(result.rows[0].csv_payload)
      : result.rows[0].csv_payload;

    const fileNameFromUrl = (url) => {
      if (!url) return "";
      const clean = String(url).split("?")[0];
      return decodeURIComponent(clean.substring(clean.lastIndexOf("/") + 1));
    };

    const readExportFile = (url, fallbackFileName) => {
      const name = safeFileName(fileNameFromUrl(url) || fallbackFileName || "");
      if (!name) return "";

      const filePath = path.join(MIXED_EXPORT_DIR, name);

      if (!fs.existsSync(filePath)) {
        console.error("[Mixed Download] stored export file missing:", filePath);
        return "";
      }

      return fs.readFileSync(filePath, "utf8");
    };

    const csv = payload.csv || readExportFile(payload.downloadUrl, payload.fileName);
    const badCsv = payload.badCsv || readExportFile(payload.badDownloadUrl, payload.badFileName);

    if (!csv && !badCsv) {
      return res.status(404).json({ message: "File data not found or expired." });
    }

    return res.json({
      ...payload,
      csv,
      badCsv
    });
  } catch (err) {
    console.error("Mixed getDownloadFile error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

const downloadMixedExportFile = async (req, res) => {
  try {
    const requested = safeFileName(req.params.fileName);
    const filePath = path.join(MIXED_EXPORT_DIR, requested);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: "File not found" });
    }

    return res.download(filePath, requested);
  } catch (err) {
    console.error("Mixed export file download error:", err);
    return res.status(500).json({ message: "Server error downloading file" });
  }
};

module.exports = {
  downloadMixedData,
  downloadMixedExportFile,
  getAlreadyDownloaded,
  getDownloadFile
};
