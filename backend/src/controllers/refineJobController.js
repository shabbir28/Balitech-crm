const path = require("path");
const db = require("../config/db");
const { processFileBuffer } = require("../utils/fileProcessor");
const { parsePhone } = require("../utils/phoneParser");
const { cleanupFile } = require("../middleware/upload");
const {
  lookupDncPhones,
  lookupExistingLeads,
  withSessionUploadLock,
  isRetryableDbError,
} = require("../utils/refineDbHelpers");
const {
  insertFreshLeadsBatches,
  insertLeadsUpsertBatches,
} = require("../utils/refineLeadBulkInsert");

const truncate = (val, max) => {
  if (typeof val !== "string") return val;
  return val.length > max ? val.substring(0, max) : val;
};

/** refine_jobs.file_name is VARCHAR(255); Windows paths can exceed that */
const safeFileName = (originalName) => {
  const base = path.basename(String(originalName || "upload"));
  return truncate(base, 255);
};

const dedupeAndNormalizeRecords = (records) => {
  // Deduplicate within the file by normalized phone.
  const deduped = new Map(); // phone -> record
  for (const record of records) {
    const { phone, countryCode, areaCode } = parsePhone(record.phone);
    if (!phone) continue;
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
    console.log("--- CREATE JOB START ---");
    console.log("Session ID:", session_id);

    // Fetch session to get vendor_id
    const sessionCheck = await db.query(
      "SELECT * FROM refine_sessions WHERE id = $1",
      [session_id],
    );
    if (sessionCheck.rows.length === 0) {
      console.log("Session not found");
      return res.status(404).json({ message: "Session not found" });
    }
    const session = sessionCheck.rows[0];
    console.log("Session Vendor ID:", session.vendor_id);

    // Create initial job record
    console.log("Inserting into refine_jobs...");
    const importType = req.file.originalname.toLowerCase().endsWith(".csv")
      ? "CSV"
      : req.file.originalname.toLowerCase().endsWith(".txt")
        ? "TXT"
        : "Excel";

    const jobResult = await db.query(
      `
            INSERT INTO refine_jobs (session_id, file_name, file_size, import_type, start_time, status)
            VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, 'Processing')
            RETURNING *
        `,
      [session_id, safeFileName(req.file.originalname), req.file.size, importType],
    );
    const job = jobResult.rows[0];
    console.log("Job created with ID:", job.id);

    // Process file (disk se read karega — RAM safe)
    console.log("Starting file processing...", req.file.mimetype);
    const records = await processFileBuffer(
      req.file.path,
      req.file.mimetype,
      req.file.originalname,
    );
    console.log("File processing complete, records:", records.length);
    cleanupFile(req.file.path); // Temp file delete karo

    // Remove empty rows specifically
    const validRecords = records.filter((r) => r.name || r.phone || r.email);

    if (validRecords.length === 0) {
      console.log("No valid records found in file");
      await db.query(
        `UPDATE refine_jobs SET status = 'Failed', error_message = 'No valid records found', end_time = CURRENT_TIMESTAMP WHERE id = $1`,
        [job.id],
      );
      return res
        .status(400)
        .json({
          message:
            "No valid records found in file (all empty or invalid format)",
        });
    }

    const uniqueRecords = dedupeAndNormalizeRecords(validRecords);
    const uniquePhones = uniqueRecords.map((r) => r.phone);

    const { dncSet, dncSkippedDnc, dncSkippedSale } = await lookupDncPhones(
      db,
      uniquePhones,
    );
    const recordsToInsert = uniqueRecords.filter((r) => !dncSet.has(r.phone));
    const dncSkipped = uniqueRecords.length - recordsToInsert.length;

    let insertedCount = 0;
    let updatedCount = 0;

    try {
      await withSessionUploadLock(db, session_id, async (exec) => {
        const counts = await insertLeadsUpsertBatches(exec, {
          records: recordsToInsert,
          session,
          truncate,
          job_id: job.id,
        });
        insertedCount = counts.insertedCount;
        updatedCount = counts.updatedCount;
      });

      await db.query(
        `
                UPDATE refine_jobs 
                SET status = 'Completed', total_rows = $1, end_time = CURRENT_TIMESTAMP 
                WHERE id = $2
            `,
        [validRecords.length, job.id],
      );

      res.json({
        message: "Job processed successfully",
        total_processed: validRecords.length,
        inserted: insertedCount,
        updated: updatedCount,
        dnc_skipped: dncSkipped,
        dnc_skipped_dnc: dncSkippedDnc,
        dnc_skipped_sale: dncSkippedSale,
        duplicates_skipped:
          validRecords.length - insertedCount - updatedCount - dncSkipped,
      });
    } catch (err) {
      console.error("Inner Job Processing Error:", err);
      await db.query(
        `UPDATE refine_jobs SET status = 'Failed', error_message = $1, end_time = CURRENT_TIMESTAMP WHERE id = $2`,
        [err.message, job.id],
      );
      throw err;
    }
  } catch (err) {
    console.error("Job Create Error (Full Stack):", err);
    const status = isRetryableDbError(err) ? 503 : 500;
    res.status(status).json({
      message: isRetryableDbError(err)
        ? "Database busy (deadlock). Please retry this file."
        : "Server error during job processing",
      error: err.message,
      retryable: isRetryableDbError(err),
      stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
    });
  }
};

const compareJob = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const { session_id } = req.body;
    if (!session_id) {
      return res.status(400).json({ message: "Session ID is required" });
    }

    const sessionCheck = await db.query(
      "SELECT id FROM refine_sessions WHERE id = $1",
      [session_id],
    );
    if (sessionCheck.rows.length === 0) {
      return res.status(404).json({ message: "Session not found" });
    }

    const records = await processFileBuffer(
      req.file.path,
      req.file.mimetype,
      req.file.originalname,
    );
    cleanupFile(req.file.path); // Temp file delete karo

    // Match existing behavior: allow rows where at least one of these has data.
    const validRecords = records.filter((r) => r.name || r.phone || r.email);
    if (validRecords.length === 0) {
      return res
        .status(400)
        .json({
          message:
            "No valid records found in file (all empty or invalid format)",
        });
    }

    const uniqueRecords = dedupeAndNormalizeRecords(validRecords);
    const uniquePhones = uniqueRecords.map((r) => r.phone);

    if (uniquePhones.length === 0) {
      return res
        .status(400)
        .json({ message: "No valid phone numbers found in file" });
    }

    const { dncSet, dncSkippedDnc, dncSkippedSale } = await lookupDncPhones(
      db,
      uniquePhones,
    );
    const dncSkipped = dncSet.size;

    const phonesNotDnc = uniquePhones.filter((p) => !dncSet.has(p));
    const { existingSet, existingBreakdown } = await lookupExistingLeads(
      db,
      phonesNotDnc,
    );

    const existingCount = existingSet.size;
    const freshCount = phonesNotDnc.length - existingCount;

    const duplicatesInFile = validRecords.length - uniqueRecords.length;

    const freshSet = new Set();
    for (const p of phonesNotDnc) {
      if (!existingSet.has(p)) freshSet.add(p);
    }

    const freshSample = uniqueRecords
      .filter((r) => freshSet.has(r.phone))
      .slice(0, 25)
      .map((r) => ({
        phone: r.phone,
        name: r.name || null,
        disposition: r.disposition || null,
      }));

    return res.json({
      message: "Compare completed",
      total_processed: validRecords.length,
      total_unique_phones: uniqueRecords.length,
      duplicates_in_file: duplicatesInFile,
      fresh_count: freshCount,
      existing_count: existingCount,
      dnc_skipped: dncSkipped,
      dnc_skipped_dnc: dncSkippedDnc,
      dnc_skipped_sale: dncSkippedSale,
      fresh_sample: freshSample,
      existing_breakdown: existingBreakdown,
    });
  } catch (err) {
    console.error("Compare Job Error:", err);
    return res.status(500).json({
      message: "Server error during compare",
      error: err.message,
    });
  }
};

/**
 * Returns job status for polling (frontend polls this after 202 response)
 */
const getJobStatus = async (req, res) => {
  try {
    const { jobId } = req.params;
    const result = await db.query(
      `SELECT id, status, error_message, total_rows, fresh_count, existing_count,
              duplicates_in_file, dnc_skipped, dnc_skipped_dnc, dnc_skipped_sale,
              inserted, updated, start_time, end_time
       FROM refine_jobs WHERE id = $1`,
      [jobId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Job not found" });
    }
    return res.json(result.rows[0]);
  } catch (err) {
    console.error("getJobStatus error:", err);
    return res.status(500).json({ message: "Error fetching job status" });
  }
};

/**
 * ASYNC upload: immediately returns 202 + job_id, processes in background.
 * This prevents 504 Gateway Timeout for large files.
 */
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
      "SELECT * FROM refine_sessions WHERE id = $1",
      [session_id],
    );
    if (sessionCheck.rows.length === 0) {
      return res.status(404).json({ message: "Session not found" });
    }

    const session = sessionCheck.rows[0];

    // Create initial job record
    const jobResult = await db.query(
      `
            INSERT INTO refine_jobs (session_id, file_name, file_size, import_type, start_time, status)
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
    cleanupFile(req.file.path); // Temp file delete karo

    if (validRecords.length === 0) {
      await db.query(
        `
                UPDATE refine_jobs
                SET status = 'Failed',
                    error_message = 'No valid records found',
                    end_time = CURRENT_TIMESTAMP
                WHERE id = $1
            `,
        [job.id],
      );
      return res
        .status(400)
        .json({
          message:
            "No valid records found in file (all empty or invalid format)",
        });
    }

    const uniqueRecords = dedupeAndNormalizeRecords(validRecords);
    if (uniqueRecords.length === 0) {
      await db.query(
        `
                UPDATE refine_jobs
                SET status = 'Failed',
                    error_message = 'No valid phone numbers found in file',
                    end_time = CURRENT_TIMESTAMP
                WHERE id = $1
            `,
        [job.id],
      );
      return res
        .status(400)
        .json({ message: "No valid phone numbers found in file" });
    }

    const uniquePhones = uniqueRecords.map((r) => r.phone);
    const duplicatesInFile = validRecords.length - uniqueRecords.length;

    // ── IMMEDIATELY respond with 202 so Nginx/proxy does NOT timeout ──────
    res.status(202).json({
      message: "Upload accepted — processing in background",
      job_id: job.id,
      status: "Processing",
    });

    // ── Process in background (non-blocking) ──────────────────────────────
    setImmediate(async () => {
      let insertedCount = 0;
      const updatedCount = 0;
      try {
        const stats = await withSessionUploadLock(db, session_id, async (exec) => {
          const { dncSet, dncSkippedDnc, dncSkippedSale } = await lookupDncPhones(
            exec,
            uniquePhones,
          );
          const phonesNotDnc = uniquePhones.filter((p) => !dncSet.has(p));
          const { existingSet, existingBreakdown } = await lookupExistingLeads(
            exec,
            phonesNotDnc,
          );

          const existingCount = existingSet.size;
          const freshCount = phonesNotDnc.length - existingCount;
          const freshRecords = uniqueRecords.filter(
            (r) => !dncSet.has(r.phone) && !existingSet.has(r.phone),
          );

          const inserted = await insertFreshLeadsBatches(exec, {
            records: freshRecords,
            session,
            truncate,
            job_id: job.id,
          });

          return {
            dncSet,
            dncSkippedDnc,
            dncSkippedSale,
            existingCount,
            freshCount,
            existingBreakdown,
            inserted,
          };
        });

        insertedCount = stats.inserted;

        await db.query(
          `UPDATE refine_jobs
           SET status = 'Completed',
               total_rows         = $1,
               end_time           = CURRENT_TIMESTAMP,
               fresh_count        = $3,
               existing_count     = $4,
               duplicates_in_file = $5,
               dnc_skipped        = $6,
               dnc_skipped_dnc    = $7,
               dnc_skipped_sale   = $8,
               inserted           = $9,
               updated            = $10
           WHERE id = $2`,
          [
            validRecords.length,
            job.id,
            stats.freshCount,
            stats.existingCount,
            duplicatesInFile,
            stats.dncSet.size,
            stats.dncSkippedDnc,
            stats.dncSkippedSale,
            insertedCount,
            updatedCount,
          ]
        );
        console.log(`[Job ${job.id}] Background processing complete. Inserted: ${insertedCount}`);
      } catch (err) {
        console.error(`[Job ${job.id}] Background processing failed:`, err);
        await db.query(
          `UPDATE refine_jobs SET status = 'Failed', error_message = $1, end_time = CURRENT_TIMESTAMP WHERE id = $2`,
          [err.message, job.id]
        ).catch(() => {});
      }
    });

  } catch (err) {
    console.error("Fresh Upload Error (Full Stack):", err);
    if (job?.id) {
      await db
        .query(
          `UPDATE refine_jobs SET status = 'Failed', error_message = $1, end_time = CURRENT_TIMESTAMP WHERE id = $2`,
          [err.message, job.id],
        )
        .catch(() => {});
    }
    // Only send error if response not already sent
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
