const path = require("path");
const db = require("../config/db");
const { processFileBuffer } = require("../utils/fileProcessor");
const { parsePhone } = require("../utils/phoneParser");
const { cleanupFile } = require("../middleware/upload");
const {
  withSessionUploadLock,
  isRetryableDbError,
} = require("../utils/dbHelpers");
const {
  insertPremiumLeadsBatches,
} = require("../utils/premiumLeadBulkInsert");

const truncate = (val, max) => {
  if (typeof val !== "string") return val;
  return val.length > max ? val.substring(0, max) : val;
};

const safeFileName = (originalName) => {
  const base = path.basename(String(originalName || "upload"));
  return truncate(base, 255);
};

const dedupeAndNormalizeRecords = (records) => {
  const deduped = new Map();
  for (const record of records) {
    const { phone, countryCode, areaCode } = parsePhone(record.phone);
    if (!phone) continue;
    
    const existing = deduped.get(phone);
    
    let currentDuration = parseInt(record.duration, 10);
    if (isNaN(currentDuration)) currentDuration = 0;
    
    if (existing) {
      let existingDuration = parseInt(existing.duration, 10);
      if (isNaN(existingDuration)) existingDuration = 0;
      
      if (currentDuration <= existingDuration) {
        continue;
      }
    }

    deduped.set(phone, {
      ...record,
      phone,
      countryCode,
      areaCode,
    });
  }
  return Array.from(deduped.values());
};

const createJob = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const { session_id } = req.body;
    if (!session_id) {
      return res.status(400).json({ message: "Session ID is required" });
    }

    const sessionCheck = await db.query(
      "SELECT * FROM premium_sessions WHERE id = $1",
      [session_id],
    );
    if (sessionCheck.rows.length === 0) {
      return res.status(404).json({ message: "Session not found" });
    }
    const session = sessionCheck.rows[0];

    const importType = req.file.originalname.toLowerCase().endsWith(".csv")
      ? "CSV"
      : req.file.originalname.toLowerCase().endsWith(".txt")
        ? "TXT"
        : "Excel";

    const jobResult = await db.query(
      `
            INSERT INTO premium_jobs (session_id, file_name, file_size, import_type, start_time, status)
            VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, 'Processing')
            RETURNING *
        `,
      [session_id, safeFileName(req.file.originalname), req.file.size, importType],
    );
    const job = jobResult.rows[0];

    const records = await processFileBuffer(
      req.file.path,
      req.file.mimetype,
      req.file.originalname,
    );
    cleanupFile(req.file.path);

    const validRecords = records.filter((r) => r.name || r.phone || r.email);

    if (validRecords.length === 0) {
      await db.query(
        `UPDATE premium_jobs SET status = 'Failed', error_message = 'No valid records found', end_time = CURRENT_TIMESTAMP WHERE id = $1`,
        [job.id],
      );
      return res.status(400).json({
        message: "No valid records found in file (all empty or invalid format)",
      });
    }

    const uniqueRecords = dedupeAndNormalizeRecords(validRecords);

    let insertedCount = 0;

    try {
      await withSessionUploadLock(db, session_id, async (exec) => {
        insertedCount = await insertPremiumLeadsBatches(exec, {
          records: uniqueRecords,
          session,
          truncate,
          job_id: job.id,
        });
      });

      await db.query(
        `
                UPDATE premium_jobs 
                SET status = 'Completed', total_rows = $1, inserted = $2, end_time = CURRENT_TIMESTAMP 
                WHERE id = $3
            `,
        [validRecords.length, insertedCount, job.id],
      );

      res.json({
        message: "Job processed successfully",
        total_processed: validRecords.length,
        inserted: insertedCount,
        updated: 0,
        dnc_skipped: 0,
        dnc_skipped_dnc: 0,
        dnc_skipped_sale: 0,
        duplicates_skipped: validRecords.length - insertedCount,
      });
    } catch (err) {
      await db.query(
        `UPDATE premium_jobs SET status = 'Failed', error_message = $1, end_time = CURRENT_TIMESTAMP WHERE id = $2`,
        [err.message, job.id],
      );
      throw err;
    }
  } catch (err) {
    const status = isRetryableDbError(err) ? 503 : 500;
    res.status(status).json({
      message: isRetryableDbError(err)
        ? "Database busy (deadlock). Please retry this file."
        : "Server error during job processing",
      error: err.message,
      retryable: isRetryableDbError(err),
    });
  }
};

const compareJob = async (req, res) => {
  // Compare is mostly for normal uploads, but we can provide a dummy or basic comparison
  // Since we insert all, fresh count = all valid.
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const records = await processFileBuffer(
      req.file.path,
      req.file.mimetype,
      req.file.originalname,
    );
    cleanupFile(req.file.path);

    const validRecords = records.filter((r) => r.name || r.phone || r.email);
    if (validRecords.length === 0) {
      return res.status(400).json({ message: "No valid records found in file" });
    }

    const uniqueRecords = dedupeAndNormalizeRecords(validRecords);
    const duplicatesInFile = validRecords.length - uniqueRecords.length;

    const phones = uniqueRecords.map(r => String(r.phone));
    let existingCount = 0;
    const existingBreakdown = {};
    if (phones.length > 0) {
      const existingResult = await db.query(
        `SELECT p.phone, v.name as vendor_name 
         FROM premium_data p
         LEFT JOIN premium_vendors v ON p.vendor_id = v.vendor_id
         WHERE p.phone = ANY($1::varchar[])`,
        [phones]
      );
      existingCount = existingResult.rows.length;
      for (const row of existingResult.rows) {
        const vName = row.vendor_name || 'Unknown Vendor';
        existingBreakdown[vName] = (existingBreakdown[vName] || 0) + 1;
      }
    }

    const freshCount = uniqueRecords.length - existingCount;

    return res.json({
      message: "Compare completed",
      total_processed: validRecords.length,
      total_unique_phones: uniqueRecords.length,
      duplicates_in_file: duplicatesInFile,
      fresh_count: freshCount,
      existing_count: existingCount,
      dnc_skipped: 0,
      dnc_skipped_dnc: 0,
      dnc_skipped_sale: 0,
      fresh_sample: uniqueRecords.slice(0, 25).map(r => ({ phone: r.phone, name: r.name })),
      existing_breakdown: existingBreakdown,
    });
  } catch (err) {
    return res.status(500).json({
      message: "Server error during compare",
      error: err.message,
    });
  }
};

const getJobStatus = async (req, res) => {
  try {
    const { jobId } = req.params;
    const result = await db.query(
      `SELECT id, status, error_message, total_rows, fresh_count, existing_count,
              duplicates_in_file, dnc_skipped, dnc_skipped_dnc, dnc_skipped_sale,
              inserted, updated, start_time, end_time
       FROM premium_jobs WHERE id = $1`,
      [jobId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Job not found" });
    }
    return res.json(result.rows[0]);
  } catch (err) {
    return res.status(500).json({ message: "Error fetching job status" });
  }
};

const uploadFreshJob = async (req, res) => {
  let job = null;
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const { session_id } = req.body;
    if (!session_id) {
      return res.status(400).json({ message: "Session ID is required" });
    }

    const sessionCheck = await db.query(
      "SELECT * FROM premium_sessions WHERE id = $1",
      [session_id],
    );
    if (sessionCheck.rows.length === 0) {
      return res.status(404).json({ message: "Session not found" });
    }

    const session = sessionCheck.rows[0];

    const jobResult = await db.query(
      `
            INSERT INTO premium_jobs (session_id, file_name, file_size, import_type, start_time, status)
            VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, 'Processing')
            RETURNING *
        `,
      [
        session_id,
        safeFileName(req.file.originalname),
        req.file.size,
        req.file.originalname.toLowerCase().endsWith(".csv")
          ? "CSV"
          : req.file.originalname.toLowerCase().endsWith(".txt")
            ? "TXT"
            : "Excel",
      ],
    );
    job = jobResult.rows[0];

    const records = await processFileBuffer(
      req.file.path,
      req.file.mimetype,
      req.file.originalname,
    );
    const validRecords = records.filter((r) => r.name || r.phone || r.email);
    cleanupFile(req.file.path);

    if (validRecords.length === 0) {
      await db.query(
        `UPDATE premium_jobs SET status = 'Failed', error_message = 'No valid records found', end_time = CURRENT_TIMESTAMP WHERE id = $1`,
        [job.id],
      );
      return res.status(400).json({ message: "No valid records found in file" });
    }

    const uniqueRecords = dedupeAndNormalizeRecords(validRecords);
    if (uniqueRecords.length === 0) {
      await db.query(
        `UPDATE premium_jobs SET status = 'Failed', error_message = 'No valid phone numbers found in file', end_time = CURRENT_TIMESTAMP WHERE id = $1`,
        [job.id],
      );
      return res.status(400).json({ message: "No valid phone numbers found in file" });
    }

    const duplicatesInFile = validRecords.length - uniqueRecords.length;

    res.status(202).json({
      message: "Upload accepted — processing in background",
      job_id: job.id,
      status: "Processing",
    });

    setImmediate(async () => {
      let insertedCount = 0;
      let existingCount = 0;
      try {
        const phones = uniqueRecords.map(r => String(r.phone));
        if (phones.length > 0) {
          const existingResult = await db.query(
            `SELECT phone FROM premium_data WHERE phone = ANY($1::varchar[])`,
            [phones]
          );
          existingCount = existingResult.rows.length;
        }

        await withSessionUploadLock(db, session_id, async (exec) => {
          insertedCount = await insertPremiumLeadsBatches(exec, {
            records: uniqueRecords,
            session,
            truncate,
            job_id: job.id,
          });
        });

        await db.query(
          `UPDATE premium_jobs
           SET status = 'Completed',
               total_rows         = $1,
               end_time           = CURRENT_TIMESTAMP,
               fresh_count        = $3,
               existing_count     = $4,
               duplicates_in_file = $5,
               dnc_skipped        = 0,
               dnc_skipped_dnc    = 0,
               dnc_skipped_sale   = 0,
               inserted           = $6,
               updated            = 0
           WHERE id = $2`,
          [
            validRecords.length,
            job.id,
            uniqueRecords.length - existingCount,
            existingCount,
            duplicatesInFile,
            insertedCount,
          ]
        );
      } catch (err) {
        await db.query(
          `UPDATE premium_jobs SET status = 'Failed', error_message = $1, end_time = CURRENT_TIMESTAMP WHERE id = $2`,
          [err.message, job.id]
        ).catch(() => {});
      }
    });

  } catch (err) {
    if (job?.id) {
      await db.query(
        `UPDATE premium_jobs SET status = 'Failed', error_message = $1, end_time = CURRENT_TIMESTAMP WHERE id = $2`,
        [err.message, job.id],
      ).catch(() => {});
    }
    if (!res.headersSent) {
      const status = isRetryableDbError(err) ? 503 : 500;
      return res.status(status).json({
        message: isRetryableDbError(err)
          ? "Database busy. Please retry this file."
          : "Server error during fresh upload",
        error: err.message,
        retryable: isRetryableDbError(err),
      });
    }
  }
};

module.exports = {
  createJob,
  compareJob,
  uploadFreshJob,
  getJobStatus,
};
