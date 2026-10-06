const path = require("path");
const db = require("../config/db");
const { processFileBuffer } = require("../utils/fileProcessor");
const { parsePhone } = require("../utils/phoneParser");
const { cleanupFile } = require("../middleware/upload");

const truncate = (val, max) => {
  if (typeof val !== "string") return val;
  return val.length > max ? val.substring(0, max) : val;
};

const safeFileName = (originalName) => {
  const base = path.basename(String(originalName || "upload"));
  return truncate(base, 255);
};

const parseDuration = (value) => {
  const n = parseInt(value, 10);
  return Number.isFinite(n) && n > 0 ? n : 0;
};

const BAD_DISPOSITIONS = new Set(["A", "AA", "AB", "ADC", "DAIR", "DC", "DROP", "N", "NA", "PDROP", "PU"]);

const getQuality = (disposition) => {
  if (!disposition) return "Good";
  return BAD_DISPOSITIONS.has(String(disposition).toUpperCase().trim()) ? "Bad" : "Good";
};

const dedupeByHighestDuration = (records) => {
  const map = new Map();
  let validRows = 0;

  for (const record of records) {
    const parsed = parsePhone(record.phone);
    const phone = parsed?.phone;
    if (!phone || String(phone).length < 7) continue;
    validRows += 1;
    const duration = parseDuration(record.duration);
    const existing = map.get(phone);
    if (!existing || duration > existing.duration) {
      map.set(phone, {
        ...record,
        phone,
        countryCode: parsed.countryCode || null,
        areaCode: parsed.areaCode || null,
        duration,
      });
    }
  }

  return {
    records: Array.from(map.values()),
    duplicatesInFile: Math.max(0, validRows - map.size),
  };
};

const lookupExistingDurations = async (phones) => {
  const maxDuration = new Map();
  const inSafeQuoteRefine = new Set();
  if (!phones.length) return { maxDuration, inSafeQuoteRefine };

  const chunkSize = 4000;

  for (let i = 0; i < phones.length; i += chunkSize) {
    const chunk = phones.slice(i, i + chunkSize);
    const sq = await db.query(
      `SELECT phone, COALESCE(duration, 0)::int AS duration
       FROM safe_quote_refine_data
       WHERE phone = ANY($1::text[])`,
      [chunk]
    );
    for (const row of sq.rows) {
      inSafeQuoteRefine.add(row.phone);
      const duration = parseInt(row.duration, 10) || 0;
      maxDuration.set(row.phone, Math.max(maxDuration.get(row.phone) || 0, duration));
    }
  }

  return { maxDuration, inSafeQuoteRefine };
};

const classifyRecords = (uniqueRecords, maxDuration, inSafeQuoteRefine) => {
  const toWrite = [];
  let durationSkipped = 0;
  let freshCount = 0;
  let updateCount = 0;

  for (const record of uniqueRecords) {
    const existing = maxDuration.has(record.phone) ? maxDuration.get(record.phone) : null;
    if (existing !== null && record.duration <= existing) {
      durationSkipped += 1;
      continue;
    }
    toWrite.push(record);
    if (inSafeQuoteRefine.has(record.phone)) updateCount += 1;
    else freshCount += 1;
  }

  return { toWrite, durationSkipped, freshCount, updateCount };
};

const INSERT_BATCH = 300;

const upsertBatches = async (records, session, jobId) => {
  let insertedCount = 0;
  let updatedCount = 0;

  for (let i = 0; i < records.length; i += INSERT_BATCH) {
    const chunk = records.slice(i, i + INSERT_BATCH);
    const values = [];
    const params = [];
    let idx = 1;

    for (const record of chunk) {
      values.push(
        `($${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++})`
      );
      params.push(
        session.vendor_id,
        session.id,
        jobId,
        record.phone,
        truncate(record.name, 255) || null,
        truncate(record.email, 255) || null,
        record.countryCode || null,
        record.areaCode || null,
        truncate(record.disposition, 100) || null,
        truncate(session.campaign_type, 255) || null,
        record.age ? String(record.age).slice(0, 20) : null,
        getQuality(record.disposition),
        record.call_date ? String(record.call_date).slice(0, 40) : null,
        record.duration || null,
        truncate(record.state, 50) || null
      );
    }

    const result = await db.query(
      `INSERT INTO safe_quote_refine_data (
         vendor_id, session_id, job_id, phone, name, email, country_code, area_code,
         disposition, campaign_type, age, quality, call_date, duration, state
       )
       VALUES ${values.join(",")}
       ON CONFLICT (phone) DO UPDATE SET
         vendor_id = EXCLUDED.vendor_id,
         session_id = EXCLUDED.session_id,
         job_id = EXCLUDED.job_id,
         name = EXCLUDED.name,
         email = EXCLUDED.email,
         country_code = EXCLUDED.country_code,
         area_code = EXCLUDED.area_code,
         disposition = EXCLUDED.disposition,
         campaign_type = EXCLUDED.campaign_type,
         age = EXCLUDED.age,
         quality = EXCLUDED.quality,
         call_date = EXCLUDED.call_date,
         duration = EXCLUDED.duration,
         state = EXCLUDED.state,
         status = 'available',
         downloaded_at = NULL,
         uploaded_at = CURRENT_TIMESTAMP
       WHERE COALESCE(EXCLUDED.duration, 0) > COALESCE(safe_quote_refine_data.duration, 0)
       RETURNING (xmax = 0) AS inserted`,
      params
    );

    for (const row of result.rows) {
      if (row.inserted) insertedCount += 1;
      else updatedCount += 1;
    }
  }

  return { insertedCount, updatedCount };
};

const analyzeFile = async (file) => {
  const records = await processFileBuffer(file.path, file.mimetype, file.originalname);
  cleanupFile(file.path);
  const validRecords = records.filter((r) => r.name || r.phone || r.email);
  const { records: uniqueRecords, duplicatesInFile } = dedupeByHighestDuration(validRecords);
  const phones = uniqueRecords.map((r) => r.phone);
  const { maxDuration, inSafeQuoteRefine } = await lookupExistingDurations(phones);
  const classified = classifyRecords(uniqueRecords, maxDuration, inSafeQuoteRefine);
  return {
    validCount: validRecords.length,
    duplicatesInFile,
    ...classified,
  };
};

const createJob = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });
    const { session_id } = req.body;
    if (!session_id) return res.status(400).json({ message: "Session ID is required" });

    const sessionCheck = await db.query(
      "SELECT * FROM safe_quote_refine_sessions WHERE id = $1",
      [session_id]
    );
    if (sessionCheck.rows.length === 0) return res.status(404).json({ message: "Session not found" });
    const session = sessionCheck.rows[0];

    const importType = req.file.originalname.toLowerCase().endsWith(".csv")
      ? "CSV"
      : req.file.originalname.toLowerCase().endsWith(".txt")
        ? "TXT"
        : "Excel";

    const jobResult = await db.query(
      `INSERT INTO safe_quote_refine_jobs (session_id, file_name, file_size, import_type, start_time, status)
       VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, 'Processing')
       RETURNING *`,
      [session_id, safeFileName(req.file.originalname), req.file.size, importType]
    );
    const job = jobResult.rows[0];
    const file = req.file;

    res.status(202).json({ message: "Processing started", job_id: job.id });

    (async () => {
      try {
        const analysis = await analyzeFile(file);
        if (analysis.validCount === 0) {
          await db.query(
            `UPDATE safe_quote_refine_jobs
             SET status = 'Failed', error_message = 'No valid records', end_time = CURRENT_TIMESTAMP
             WHERE id = $1`,
            [job.id]
          );
          return;
        }

        const { insertedCount, updatedCount } = await upsertBatches(analysis.toWrite, session, job.id);

        await db.query(
          `UPDATE safe_quote_refine_jobs SET
             status = 'Completed',
             total_rows = $1,
             inserted = $2,
             updated_count = $3,
             fresh_count = $2,
             existing_count = $4,
             duplicates_in_file = $5,
             duration_skipped = $4,
             end_time = CURRENT_TIMESTAMP
           WHERE id = $6`,
          [
            analysis.validCount,
            insertedCount,
            updatedCount,
            analysis.durationSkipped,
            analysis.duplicatesInFile,
            job.id,
          ]
        );
      } catch (err) {
        console.error("Safe Quote Refine job error:", err);
        await db.query(
          `UPDATE safe_quote_refine_jobs
           SET status = 'Failed', error_message = $1, end_time = CURRENT_TIMESTAMP
           WHERE id = $2`,
          [String(err.message || err).slice(0, 500), job.id]
        );
      }
    })();
  } catch (err) {
    console.error("Safe Quote Refine job create error:", err);
    res.status(500).json({ message: "Server error during processing", error: err.message });
  }
};

const getJobStatus = async (req, res) => {
  try {
    const result = await db.query(
      "SELECT * FROM safe_quote_refine_jobs WHERE id = $1",
      [req.params.jobId]
    );
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
    if (!req.body.session_id) return res.status(400).json({ message: "Session ID is required" });

    const analysis = await analyzeFile(req.file);
    res.json({
      total_processed: analysis.validCount,
      duplicates_in_file: analysis.duplicatesInFile,
      duration_skipped: analysis.durationSkipped,
      existing_count: analysis.durationSkipped,
      fresh_count: analysis.freshCount,
      updated: analysis.updateCount,
      inserted: analysis.freshCount,
    });
  } catch (err) {
    console.error("Safe Quote Refine compare error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

module.exports = { createJob, getJobStatus, compareJob };
