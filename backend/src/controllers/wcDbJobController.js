const path = require("path");
const db = require("../config/db");
const { processFileBuffer } = require("../utils/fileProcessor");
const { cleanupFile } = require("../middleware/upload");
const { lookupDncPhones, lookupDeadPhones, lookupSeparationPhones } = require("../utils/dbHelpers");
const { areaCodesMap } = require("../utils/areaCodes");

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

// Deduplicate by phone within the uploaded file
const dedupeRecords = (records) => {
  const seen = new Map();
  for (const rec of records) {
    const phone = normalizePhone(rec.phone);
    if (!phone || phone.length < 7) continue;
    seen.set(phone, { ...rec, phone });
  }
  return Array.from(seen.values());
};

const INSERT_BATCH = 500;

const insertWcDbDataBatches = async (exec, { records, session, job_id }) => {
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
      `INSERT INTO wc_db_data (
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

// POST /api/wc-db-jobs — main upload handler
const createJob = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });

    const { session_id } = req.body;
    if (!session_id) return res.status(400).json({ message: "Session ID is required" });

    const sessionCheck = await db.query("SELECT * FROM wc_db_sessions WHERE id=$1", [session_id]);
    if (sessionCheck.rows.length === 0) return res.status(404).json({ message: "Session not found" });
    const session = sessionCheck.rows[0];

    const importType = req.file.originalname.toLowerCase().endsWith(".csv")
      ? "CSV"
      : req.file.originalname.toLowerCase().endsWith(".txt")
        ? "TXT"
        : "Excel";

    const jobResult = await db.query(
      `INSERT INTO wc_db_jobs (session_id, file_name, file_size, import_type, start_time, status)
       VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, 'Processing') RETURNING *`,
      [session_id, safeFileName(req.file.originalname), req.file.size, importType]
    );
    const job = jobResult.rows[0];

    // Return 202 immediately — process async
    res.status(202).json({ message: "Processing started", job_id: job.id });

    // --- Async Processing ---
    (async () => {
      try {
        const records = await processFileBuffer(req.file.path, req.file.mimetype, req.file.originalname);
        cleanupFile(req.file.path);

        const validRecords = records.filter((r) => r.name || r.phone);
        if (validRecords.length === 0) {
          await db.query(
            "UPDATE wc_db_jobs SET status='Failed', error_message='No valid records', end_time=CURRENT_TIMESTAMP WHERE id=$1",
            [job.id]
          );
          return;
        }

        // 1. Dedupe within file
        const uniqueRecords = dedupeRecords(validRecords);
        const duplicatesInFile = validRecords.length - uniqueRecords.length;
        const uniquePhones = uniqueRecords.map((r) => r.phone);

        // 2. Skip exclusions
        const { dncSet, dncSkippedDnc, dncSkippedSale } = await lookupDncPhones(db, uniquePhones);
        const deadSet = await lookupDeadPhones(db, uniquePhones);
        const sepSet = await lookupSeparationPhones(db, uniquePhones);

        // Filter out exclusions
        const recordsToInsert = uniqueRecords.filter(
          (r) => !deadSet.has(r.phone) && !dncSet.has(r.phone) && !sepSet.has(r.phone)
        );
        const deadSkipped = deadSet.size;
        const dncSkipped = dncSkippedDnc;
        const salesSkipped = dncSkippedSale;
        const sepSkipped = sepSet.size;

        // 4. Insert — ON CONFLICT (phone) DO NOTHING skips phones already in wc_db_data
        const { insertedCount, skippedExisting } = await insertWcDbDataBatches(db.query.bind(db), {
          records: recordsToInsert,
          session,
          job_id: job.id,
        });

        const freshCount = insertedCount;
        const existingCount = skippedExisting;

        // Overlaps calculation
        let premiumOverlap = 0;
        let refineOverlap = 0;
        let vanDeskOverlap = 0;
        let rawOverlap = 0;

        if (uniquePhones.length > 0) {
          const [premRes, refRes, vanRes, rawRes] = await Promise.all([
            db.query("SELECT COUNT(DISTINCT phone) as count FROM premium_data WHERE phone = ANY($1::text[])", [uniquePhones]),
            db.query("SELECT COUNT(DISTINCT phone) as count FROM refine_data WHERE phone = ANY($1::text[])", [uniquePhones]),
            db.query("SELECT COUNT(DISTINCT phone) as count FROM van_data WHERE phone = ANY($1::text[])", [uniquePhones]),
            db.query("SELECT COUNT(DISTINCT phone) as count FROM leads WHERE phone = ANY($1::text[])", [uniquePhones])
          ]);
          premiumOverlap = parseInt(premRes.rows[0].count) || 0;
          refineOverlap = parseInt(refRes.rows[0].count) || 0;
          vanDeskOverlap = parseInt(vanRes.rows[0].count) || 0;
          rawOverlap = parseInt(rawRes.rows[0].count) || 0;
        }

        await db.query(
          `UPDATE wc_db_jobs SET
            status='Completed',
            total_rows=$1,
            end_time=CURRENT_TIMESTAMP,
            inserted=$2,
            existing_count=$3,
            duplicates_in_file=$4,
            dead_skipped=$5,
            dnc_skipped=$6,
            fresh_count=$7,
            premium_overlap=$8,
            refine_overlap=$9,
            van_desk_overlap=$10,
            raw_overlap=$11,
            sales_skipped=$13,
            separation_skipped=$14
          WHERE id=$12`,
          [validRecords.length, insertedCount, existingCount, duplicatesInFile, deadSkipped, dncSkipped, freshCount, premiumOverlap, refineOverlap, vanDeskOverlap, rawOverlap, job.id, salesSkipped, sepSkipped]
        );

      } catch (err) {
        console.error("WC DB Async Job Error:", err);
        await db.query(
          `UPDATE wc_db_jobs SET status='Failed', error_message=$1, end_time=CURRENT_TIMESTAMP WHERE id=$2`,
          [err.message, job.id]
        );
      }
    })();
  } catch (err) {
    console.error("WC DB Job Create Error:", err);
    res.status(500).json({ message: "Server error during processing", error: err.message });
  }
};

// GET /api/wc-db-jobs/:jobId/status
const getJobStatus = async (req, res) => {
  const { jobId } = req.params;
  try {
    const result = await db.query("SELECT * FROM wc_db_jobs WHERE id=$1", [jobId]);
    if (result.rows.length === 0) return res.status(404).json({ message: "Job not found" });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// POST /api/wc-db-jobs/compare — preview stats before actual upload
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

    // Check existing in wc_db_data only (isolated)
    const existingRes = await db.query(
      "SELECT phone FROM wc_db_data WHERE phone = ANY($1::text[])",
      [uniquePhones]
    );
    const existingSet = new Set(existingRes.rows.map((r) => r.phone));

    // Exclusions
    const { dncSet, dncSkippedDnc, dncSkippedSale } = await lookupDncPhones(db, uniquePhones);
    const deadSet = await lookupDeadPhones(db, uniquePhones);
    const sepSet = await lookupSeparationPhones(db, uniquePhones);

    const deadCount = deadSet.size;
    const dncCount = dncSkippedDnc;
    const salesCount = dncSkippedSale;
    const sepCount = sepSet.size;
    const existingCount = uniqueRecords.filter(
      (r) => existingSet.has(r.phone) && !deadSet.has(r.phone) && !dncSet.has(r.phone) && !sepSet.has(r.phone)
    ).length;
    const freshCount = uniqueRecords.length - deadCount - dncCount - salesCount - sepCount - existingCount;

    let premiumOverlap = 0;
    let refineOverlap = 0;
    let vanDeskOverlap = 0;
    let rawOverlap = 0;

    if (uniquePhones.length > 0) {
      const [premRes, refRes, vanRes, rawRes] = await Promise.all([
        db.query("SELECT COUNT(DISTINCT phone) as count FROM premium_data WHERE phone = ANY($1::text[])", [uniquePhones]),
        db.query("SELECT COUNT(DISTINCT phone) as count FROM refine_data WHERE phone = ANY($1::text[])", [uniquePhones]),
        db.query("SELECT COUNT(DISTINCT phone) as count FROM van_data WHERE phone = ANY($1::text[])", [uniquePhones]),
        db.query("SELECT COUNT(DISTINCT phone) as count FROM leads WHERE phone = ANY($1::text[])", [uniquePhones])
      ]);
      premiumOverlap = parseInt(premRes.rows[0].count) || 0;
      refineOverlap = parseInt(refRes.rows[0].count) || 0;
      vanDeskOverlap = parseInt(vanRes.rows[0].count) || 0;
      rawOverlap = parseInt(rawRes.rows[0].count) || 0;
    }

    res.json({
      total_processed: validRecords.length,
      total_unique_phones: uniqueRecords.length,
      duplicates_in_file: validRecords.length - uniqueRecords.length,
      existing_count: existingCount,
      dead_skipped: deadCount,
      dnc_skipped: dncCount,
      sales_skipped: salesCount,
      separation_skipped: sepCount,
      fresh_count: Math.max(0, freshCount),
      premium_overlap: premiumOverlap,
      refine_overlap: refineOverlap,
      van_desk_overlap: vanDeskOverlap,
      raw_overlap: rawOverlap
    });
  } catch (err) {
    console.error("WC DB Compare Error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

module.exports = { createJob, getJobStatus, compareJob };
