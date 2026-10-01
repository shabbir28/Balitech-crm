const path = require("path");
const db = require("../config/db");
const { processFileBuffer } = require("../utils/fileProcessor");
const { cleanupFile } = require("../middleware/upload");

const truncate = (val, max) => {
  if (typeof val !== "string") return val;
  return val.length > max ? val.substring(0, max) : val;
};

const safeFileName = (originalName) => {
  const base = path.basename(String(originalName || "upload"));
  return truncate(base, 255);
};

const normalizePhone = (phone) => {
  if (!phone) return "";
  const digits = String(phone).replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("1")) return digits.substring(1);
  return digits;
};

const getAreaCodeFromPhone = (phone) => {
  const digits = normalizePhone(phone);
  if (digits.length === 10) return digits.substring(0, 3);
  return null;
};

const dedupeRecords = (records) => {
  const seen = new Map();
  for (const rec of records) {
    const phone = normalizePhone(rec.phone);
    if (!phone || phone.length < 7) continue;
    seen.set(phone, { ...rec, phone });
  }
  return Array.from(seen.values());
};

const lookupSafeQuoteBlocks = async (phones) => {
  const dncSet = new Set();
  const saleSet = new Set();
  const sepSet = new Set();
  if (!phones.length) return { dncSet, saleSet, sepSet };

  const [dncRes, sepRes] = await Promise.all([
    db.query(
      "SELECT phone, dnc_type FROM safe_quote_dnc_numbers WHERE phone = ANY($1::text[])",
      [phones]
    ),
    db.query(
      "SELECT phone FROM safe_quote_separation_data WHERE phone = ANY($1::text[])",
      [phones]
    ),
  ]);

  for (const row of dncRes.rows) {
    const kind = String(row.dnc_type || "").toUpperCase();
    if (kind === "SALE") saleSet.add(row.phone);
    else if (kind === "SEPARATION") sepSet.add(row.phone);
    else dncSet.add(row.phone);
  }
  for (const row of sepRes.rows) sepSet.add(row.phone);
  return { dncSet, saleSet, sepSet };
};

const INSERT_BATCH = 500;

const insertSafeQuoteDataBatches = async (exec, { records, session, job_id }) => {
  let insertedCount = 0;
  let skippedExisting = 0;

  for (let i = 0; i < records.length; i += INSERT_BATCH) {
    const chunk = records.slice(i, i + INSERT_BATCH);
    const values = [];
    const params = [];
    let idx = 1;

    for (const record of chunk) {
      const areaCode = getAreaCodeFromPhone(record.phone);
      const r = record.raw || {};

      const firstname = r.firstname || record.name?.split(/\s+/)[0] || null;
      const lastname = r.lastname || (record.name?.split(/\s+/).length > 1 ? record.name.split(/\s+/).slice(1).join(" ") : null);

      values.push(
        `($${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++})`
      );
      params.push(
        session.vendor_id, session.id, job_id, areaCode, record.phone,
        truncate(firstname, 255), truncate(r.middlename, 255), truncate(lastname, 255),
        truncate(r.address, 255), truncate(r.address2, 255), truncate(r.city, 255),
        truncate(r.state || record.state, 50), truncate(r.zip || record.zipcode, 20), truncate(r.zip4, 20),
        truncate(r.county, 255), truncate(r.land_line, 50), truncate(r.cell, 50),
        truncate(r.homeownerrenter, 100), truncate(r.homevalue, 100), truncate(r.householdincome, 100),
        truncate(r.creditrating, 100), truncate(r.age || record.age, 10), truncate(r.gender, 50),
        truncate(r.maritalstats, 100), truncate(r.dpv_indicator, 50), truncate(r.dnc_flag, 50)
      );
    }

    const result = await exec(
      `INSERT INTO safe_quote_data (
        vendor_id, session_id, job_id, area_code, phone,
        firstname, middlename, lastname,
        address, address2, city, state, zip, zip4, county,
        land_line, cell, homeownerrenter, homevalue, householdincome,
        creditrating, age, gender, maritalstats, dpv_indicator, dnc_flag
       )
       VALUES ${values.join(",")}
       ON CONFLICT (phone) DO NOTHING
       RETURNING id`,
      params
    );

    const actualInserted = result.rows.length;
    insertedCount += actualInserted;
    skippedExisting += chunk.length - actualInserted;
  }

  return { insertedCount, skippedExisting };
};

const createJob = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });

    const { session_id } = req.body;
    if (!session_id) return res.status(400).json({ message: "Session ID is required" });

    const sessionCheck = await db.query("SELECT * FROM safe_quote_sessions WHERE id=$1", [session_id]);
    if (sessionCheck.rows.length === 0) return res.status(404).json({ message: "Session not found" });
    const session = sessionCheck.rows[0];

    const importType = req.file.originalname.toLowerCase().endsWith(".csv")
      ? "CSV"
      : req.file.originalname.toLowerCase().endsWith(".txt")
        ? "TXT"
        : "Excel";

    const jobResult = await db.query(
      `INSERT INTO safe_quote_jobs (session_id, file_name, file_size, import_type, start_time, status)
       VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, 'Processing') RETURNING *`,
      [session_id, safeFileName(req.file.originalname), req.file.size, importType]
    );
    const job = jobResult.rows[0];

    res.status(202).json({ message: "Processing started", job_id: job.id });

    (async () => {
      try {
        const records = await processFileBuffer(req.file.path, req.file.mimetype, req.file.originalname);
        cleanupFile(req.file.path);

        const validRecords = records.filter((r) => r.name || r.phone);
        if (validRecords.length === 0) {
          await db.query(
            "UPDATE safe_quote_jobs SET status='Failed', error_message='No valid records', end_time=CURRENT_TIMESTAMP WHERE id=$1",
            [job.id]
          );
          return;
        }

        const uniqueRecords = dedupeRecords(validRecords);
        const duplicatesInFile = validRecords.length - uniqueRecords.length;
        const uniquePhones = uniqueRecords.map((r) => r.phone);
        const { dncSet, saleSet, sepSet } = await lookupSafeQuoteBlocks(uniquePhones);
        const recordsToInsert = uniqueRecords.filter(
          (r) => !dncSet.has(r.phone) && !saleSet.has(r.phone) && !sepSet.has(r.phone)
        );

        const { insertedCount, skippedExisting } = await insertSafeQuoteDataBatches(db.query.bind(db), {
          records: recordsToInsert,
          session,
          job_id: job.id,
        });

        await db.query(
          `UPDATE safe_quote_jobs SET
            status='Completed',
            total_rows=$1,
            end_time=CURRENT_TIMESTAMP,
            inserted=$2,
            existing_count=$3,
            duplicates_in_file=$4,
            fresh_count=$2,
            dead_skipped=0,
            dnc_skipped=$6,
            sales_skipped=$7,
            separation_skipped=$8,
            premium_overlap=0,
            refine_overlap=0,
            van_desk_overlap=0,
            raw_overlap=0
          WHERE id=$5`,
          [validRecords.length, insertedCount, skippedExisting, duplicatesInFile, job.id, dncSet.size, saleSet.size, sepSet.size]
        );
      } catch (err) {
        console.error("Safe Quote Async Job Error:", err);
        await db.query(
          `UPDATE safe_quote_jobs SET status='Failed', error_message=$1, end_time=CURRENT_TIMESTAMP WHERE id=$2`,
          [err.message, job.id]
        );
      }
    })();
  } catch (err) {
    console.error("Safe Quote Job Create Error:", err);
    res.status(500).json({ message: "Server error during processing", error: err.message });
  }
};

const getJobStatus = async (req, res) => {
  const { jobId } = req.params;
  try {
    const result = await db.query("SELECT * FROM safe_quote_jobs WHERE id=$1", [jobId]);
    if (result.rows.length === 0) return res.status(404).json({ message: "Job not found" });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

const compareJob = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });
    const { session_id } = req.body;
    if (!session_id) return res.status(400).json({ message: "Session ID is required" });

    const records = await processFileBuffer(req.file.path, req.file.mimetype, req.file.originalname);
    cleanupFile(req.file.path);

    const validRecords = records.filter((r) => r.name || r.phone);
    const uniqueRecords = dedupeRecords(validRecords);
    const uniquePhones = uniqueRecords.map((r) => r.phone);

    const { dncSet, saleSet, sepSet } = await lookupSafeQuoteBlocks(uniquePhones);
    const existingRes = uniquePhones.length
      ? await db.query("SELECT phone FROM safe_quote_data WHERE phone = ANY($1::text[])", [uniquePhones])
      : { rows: [] };
    const existingSet = new Set(existingRes.rows.map((r) => r.phone));
    const existingCount = uniqueRecords.filter(
      (r) => existingSet.has(r.phone) && !dncSet.has(r.phone) && !saleSet.has(r.phone) && !sepSet.has(r.phone)
    ).length;
    const freshCount = uniqueRecords.length - dncSet.size - saleSet.size - sepSet.size - existingCount;

    res.json({
      total_processed: validRecords.length,
      total_unique_phones: uniqueRecords.length,
      duplicates_in_file: validRecords.length - uniqueRecords.length,
      existing_count: existingCount,
      dead_skipped: 0,
      dnc_skipped: dncSet.size,
      sales_skipped: saleSet.size,
      separation_skipped: sepSet.size,
      fresh_count: Math.max(0, freshCount),
      premium_overlap: 0,
      refine_overlap: 0,
      van_desk_overlap: 0,
      raw_overlap: 0,
    });
  } catch (err) {
    console.error("Safe Quote Compare Error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

module.exports = { createJob, getJobStatus, compareJob };
