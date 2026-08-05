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

// Reverse area code map: phone area_code -> state abbr
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

// Deduplicate by phone within file
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

const insertVanDataBatches = async (exec, { records, session, job_id, truncate }) => {
  let insertedCount = 0;
  let updatedCount = 0;

  for (let i = 0; i < records.length; i += INSERT_BATCH) {
    const chunk = records.slice(i, i + INSERT_BATCH);
    const values = [];
    const params = [];
    let idx = 1;

    for (const r of chunk) {
      const areaCode = getAreaCodeFromPhone(r.phone);
      // Split name into first/last if only name available
      let firstName = r.firstName || r.first_name || null;
      let lastName = r.lastName || r.last_name || null;
      if (!firstName && !lastName && r.name) {
        const parts = r.name.trim().split(/\s+/);
        firstName = parts[0] || null;
        lastName = parts.length > 1 ? parts.slice(1).join(" ") : null;
      }

      values.push(
        `($${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++})`
      );
      params.push(
        session.vendor_id,
        session.id,
        job_id,
        truncate(firstName, 255),
        truncate(lastName, 255),
        r.phone,
        r.email ? truncate(r.email, 255) : null,
        areaCode,
        r.age !== undefined && r.age !== null ? parseInt(r.age) || null : null
      );
    }

    const result = await exec(
      `INSERT INTO van_data (vendor_id, session_id, job_id, first_name, last_name, phone, email, area_code, age)
       VALUES ${values.join(",")}
       ON CONFLICT (phone) DO UPDATE SET
         first_name = COALESCE(EXCLUDED.first_name, van_data.first_name),
         last_name = COALESCE(EXCLUDED.last_name, van_data.last_name),
         age = COALESCE(EXCLUDED.age, van_data.age),
         email = COALESCE(EXCLUDED.email, van_data.email)
       RETURNING (xmax = 0) AS inserted`,
      params
    );

    for (const row of result.rows) {
      if (row.inserted) insertedCount++;
      else updatedCount++;
    }
  }

  return { insertedCount, updatedCount };
};

const createJob = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });

    const { session_id } = req.body;
    if (!session_id) return res.status(400).json({ message: "Session ID is required" });

    const sessionCheck = await db.query("SELECT * FROM van_sessions WHERE id=$1", [session_id]);
    if (sessionCheck.rows.length === 0) return res.status(404).json({ message: "Session not found" });
    const session = sessionCheck.rows[0];

    const importType = req.file.originalname.toLowerCase().endsWith(".csv")
      ? "CSV"
      : req.file.originalname.toLowerCase().endsWith(".txt")
        ? "TXT"
        : "Excel";

    const jobResult = await db.query(
      `INSERT INTO van_jobs (session_id, file_name, file_size, import_type, start_time, status)
       VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, 'Processing') RETURNING *`,
      [session_id, safeFileName(req.file.originalname), req.file.size, importType]
    );
    const job = jobResult.rows[0];

    // Parse file
    const records = await processFileBuffer(req.file.path, req.file.mimetype, req.file.originalname);
    cleanupFile(req.file.path);

    const validRecords = records.filter((r) => r.name || r.phone);
    if (validRecords.length === 0) {
      await db.query(
        "UPDATE van_jobs SET status='Failed', error_message='No valid records', end_time=CURRENT_TIMESTAMP WHERE id=$1",
        [job.id]
      );
      return res.status(400).json({ message: "No valid records found in file" });
    }

    const uniqueRecords = dedupeRecords(validRecords);

    // Skip dead, dnc, separation numbers
    const uniquePhones = uniqueRecords.map((r) => String(r.phone));
    
    const { dncSet, dncSkippedDnc, dncSkippedSale } = await lookupDncPhones(db, uniquePhones);
    const deadSet = await lookupDeadPhones(db, uniquePhones);
    const sepSet = await lookupSeparationPhones(db, uniquePhones);
    
    const recordsToInsert = uniqueRecords.filter(
      (r) => !dncSet.has(r.phone) && !deadSet.has(r.phone) && !sepSet.has(r.phone)
    );
    const deadSkipped = deadSet.size;
    const dncSkipped = dncSet.size;
    const sepSkipped = sepSet.size;

    const { insertedCount, updatedCount } = await insertVanDataBatches(db.query.bind(db), {
      records: recordsToInsert,
      session,
      job_id: job.id,
      truncate,
    });

    await db.query(
      `UPDATE van_jobs SET status='Completed', total_rows=$1, end_time=CURRENT_TIMESTAMP, inserted=$2, updated=$3, dead_skipped=$4, dnc_skipped=$5, separation_skipped=$6, dnc_skipped_dnc=$7, dnc_skipped_sale=$8 WHERE id=$9`,
      [validRecords.length, insertedCount, updatedCount, deadSkipped, dncSkipped, sepSkipped, dncSkippedDnc, dncSkippedSale, job.id]
    );

    res.json({
      message: "File processed successfully",
      total_processed: validRecords.length,
      inserted: insertedCount,
      updated: updatedCount,
      dead_skipped: deadSkipped,
      dnc_skipped: dncSkipped,
      separation_skipped: sepSkipped,
      duplicates_skipped: validRecords.length - uniqueRecords.length,
    });
  } catch (err) {
    console.error("Van Job Create Error:", err);
    res.status(500).json({ message: "Server error during processing", error: err.message });
  }
};

const getJobStatus = async (req, res) => {
  const { jobId } = req.params;
  try {
    const result = await db.query("SELECT * FROM van_jobs WHERE id=$1", [jobId]);
    if (result.rows.length === 0) return res.status(404).json({ message: "Job not found" });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};


const compareJob = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

    const { session_id } = req.body;
    if (!session_id) return res.status(400).json({ message: 'Session ID is required' });

    const records = await processFileBuffer(req.file.path, req.file.mimetype, req.file.originalname);
    cleanupFile(req.file.path);

    const validRecords = records.filter(r => r.name || r.phone);
    const uniqueRecords = dedupeRecords(validRecords);
    const uniquePhones = uniqueRecords.map(r => r.phone);

    // Exclusions first — same logic as final uploadFresh
    const { dncSet, dncSkippedDnc, dncSkippedSale } = await lookupDncPhones(db, uniquePhones);
    const deadSet = await lookupDeadPhones(db, uniquePhones);
    const sepSet = await lookupSeparationPhones(db, uniquePhones);

    // Fresh numbers should come AFTER DNC, dead, and separation are removed
    const cleanRecords = uniqueRecords.filter(
      r => !dncSet.has(r.phone) && !deadSet.has(r.phone) && !sepSet.has(r.phone)
    );
    const cleanPhones = cleanRecords.map(r => r.phone);

    // Existing check only from clean uploadable numbers
    const existingRes = cleanPhones.length
      ? await db.query('SELECT phone FROM van_data WHERE phone = ANY($1::text[])', [cleanPhones])
      : { rows: [] };

    const existingSet = new Set(existingRes.rows.map(r => r.phone));
    const existingCount = existingSet.size;

    const freshPhones = cleanPhones.filter(p => !existingSet.has(p));
    const freshCount = freshPhones.length;

    // Main leads overlap only from actually fresh candidates
    const mainLeadsRes = freshPhones.length
      ? await db.query('SELECT phone FROM leads WHERE phone = ANY($1::text[])', [freshPhones])
      : { rows: [] };

    const mainLeadsCount = mainLeadsRes.rows.length;

    res.json({
      total_processed: validRecords.length,
      total_unique_phones: uniqueRecords.length,
      duplicates_in_file: validRecords.length - uniqueRecords.length,
      existing_count: existingCount,
      dead_skipped: deadSet.size,
      fresh_count: Math.max(0, freshCount),
      dnc_skipped: dncSet.size,
      separation_skipped: sepSet.size,
      dnc_skipped_dnc: dncSkippedDnc,
      dnc_skipped_sale: dncSkippedSale,
      main_leads_overlap: mainLeadsCount
    });

  } catch (err) {
    console.error('Van Compare Error:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

const uploadFresh = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
    const { session_id } = req.body;
    if (!session_id) return res.status(400).json({ message: 'Session ID is required' });

    const sessionCheck = await db.query('SELECT * FROM van_sessions WHERE id=$1', [session_id]);
    if (sessionCheck.rows.length === 0) return res.status(404).json({ message: 'Session not found' });
    const session = sessionCheck.rows[0];

    const importType = req.file.originalname.toLowerCase().endsWith('.csv') ? 'CSV' : 'Excel';
    
    const jobResult = await db.query(
      `INSERT INTO van_jobs (session_id, file_name, file_size, import_type, start_time, status)
       VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, 'Processing') RETURNING *`,
      [session_id, safeFileName(req.file.originalname), req.file.size, importType]
    );
    const job = jobResult.rows[0];

    // Return 202 accepted
    res.status(202).json({ message: 'Processing started', job_id: job.id });

    // --- Async Processing ---
    (async () => {
      try {
        const records = await processFileBuffer(req.file.path, req.file.mimetype, req.file.originalname);
        cleanupFile(req.file.path);

        const validRecords = records.filter(r => r.name || r.phone);
        const uniqueRecords = dedupeRecords(validRecords);
        const uniquePhones = uniqueRecords.map(r => r.phone);

        // Fetch main leads overlap to delete
        const mainLeadsRes = await db.query('SELECT phone, name, age FROM leads WHERE phone = ANY($1::text[])', [uniquePhones]);
        const mainLeadsMap = new Map(mainLeadsRes.rows.map(r => [r.phone, r]));

        // Dead, DNC, Sep skip
        const { dncSet, dncSkippedDnc, dncSkippedSale } = await lookupDncPhones(db, uniquePhones);
        const deadSet = await lookupDeadPhones(db, uniquePhones);
        const sepSet = await lookupSeparationPhones(db, uniquePhones);

        const recordsToInsert = uniqueRecords.filter(
          r => !dncSet.has(r.phone) && !deadSet.has(r.phone) && !sepSet.has(r.phone)
        );
        const deadSkipped = deadSet.size;
        const dncSkipped = dncSet.size;
        const sepSkipped = sepSet.size;

        // Perform main leads transfer (delete from main if in this file and file has good info)
        let deletedFromMain = 0;
        const phonesToDeleteFromMain = [];
        for (const r of recordsToInsert) {
           if (mainLeadsMap.has(r.phone)) {
              phonesToDeleteFromMain.push(r.phone);
           }
        }

        if (phonesToDeleteFromMain.length > 0) {
           const delRes = await db.query('DELETE FROM leads WHERE phone = ANY($1::text[])', [phonesToDeleteFromMain]);
           deletedFromMain = delRes.rowCount;
        }

        // Insert into van_data
        const { insertedCount, updatedCount } = await insertVanDataBatches(db.query.bind(db), {
          records: recordsToInsert,
          session,
          job_id: job.id,
          truncate
        });

        await db.query(
          `UPDATE van_jobs SET status='Completed', total_rows=$1, end_time=CURRENT_TIMESTAMP, inserted=$2, updated=$3, dead_skipped=$4, dnc_skipped=$5, separation_skipped=$6, dnc_skipped_dnc=$7, dnc_skipped_sale=$8, main_leads_overlap=$9 WHERE id=$10`,
          [validRecords.length, insertedCount, updatedCount, deadSkipped, dncSkipped, sepSkipped, dncSkippedDnc, dncSkippedSale, deletedFromMain, job.id]
        );

      } catch (err) {
        console.error('Async uploadFresh error:', err);
        await db.query(`UPDATE van_jobs SET status='Failed', error_message=$1, end_time=CURRENT_TIMESTAMP WHERE id=$2`, [err.message, job.id]);
      }
    })();
  } catch (err) {
    console.error('Van uploadFresh init error:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

module.exports = { createJob, getJobStatus, compareJob, uploadFresh };

