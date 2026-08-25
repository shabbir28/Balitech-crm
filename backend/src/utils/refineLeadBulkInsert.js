const { withDeadlockRetry } = require("./dbHelpers");

const DEFAULT_BATCH = 500;

const sortByPhone = (records) =>
  [...records].sort((a, b) => String(a.phone).localeCompare(String(b.phone)));

const getQuality = (disposition) => {
  if (!disposition) return 'Good';
  const badStatuses = new Set(['A', 'AA', 'AB', 'ADC', 'DAIR', 'DC', 'DROP', 'N', 'NA', 'PDROP', 'PU']);
  return badStatuses.has(String(disposition).toUpperCase().trim()) ? 'Bad' : 'Good';
};

// Normalize VICIdial / Excel call dates before sending them to PostgreSQL.
// PostgreSQL rejects MySQL zero dates such as "0000-00-00 00:00:00".
// Excel may also provide serial date/time values such as "46205.7795717593".
const normalizeCallDate = (value) => {
  if (value === null || value === undefined) return null;

  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null;
    return value.toISOString().slice(0, 19).replace('T', ' ');
  }

  const raw = String(value).trim();
  if (!raw) return null;

  // MySQL/VICIdial zero-date values
  if (
    /^0000-00-00(?:[ T]00:00:00(?:\.0+)?)?$/.test(raw) ||
    /^0000-00-00/.test(raw)
  ) {
    return null;
  }

  // Excel serial date/time.
  // Excel/LibreOffice compatible epoch: 1899-12-30.
  if (/^\d+(?:\.\d+)?$/.test(raw)) {
    const serial = Number(raw);

    // Restrict conversion to a realistic Excel serial range so ordinary
    // numeric garbage is not accidentally treated as a date.
    if (Number.isFinite(serial) && serial >= 1 && serial < 100000) {
      const milliseconds = Math.round((serial - 25569) * 86400000);
      const d = new Date(milliseconds);

      if (!Number.isNaN(d.getTime())) {
        return d.toISOString().slice(0, 19).replace('T', ' ');
      }
    }

    return null;
  }

  // Keep normal SQL-style dates unchanged after basic validation.
  // Examples:
  // 2026-08-08
  // 2026-08-08 12:34:56
  // 2026-08-08T12:34:56
  if (
    /^\d{4}-\d{2}-\d{2}(?:[ T]\d{2}:\d{2}:\d{2}(?:\.\d+)?)?$/.test(raw)
  ) {
    const test = new Date(raw.replace(' ', 'T') + (
      /^\d{4}-\d{2}-\d{2}$/.test(raw) ? 'T00:00:00Z' : 'Z'
    ));

    if (!Number.isNaN(test.getTime())) {
      return raw.replace('T', ' ');
    }

    return null;
  }

  // Unknown/unusable date format: do not let one bad value fail the batch.
  return null;
};

/**
 * Insert only new refine_data (fresh upload). Each batch is its own statement — no long transaction.
 */
const insertFreshLeadsBatches = async (
  exec,
  { records, session, truncate, batchSize = DEFAULT_BATCH, job_id },
) => {
  const sorted = sortByPhone(records);
  let insertedCount = 0;

  for (let i = 0; i < sorted.length; i += batchSize) {
    if (i > 0 && i % 2500 === 0) {
      await new Promise((resolve) => setImmediate(resolve));
    }

    const batch = sorted.slice(i, i + batchSize);
    const valueStrings = [];
    const values = [];
    let paramIndex = 1;

    for (const record of batch) {
      valueStrings.push(
        `($${paramIndex}, $${paramIndex + 1}, $${paramIndex + 2}, $${paramIndex + 3}, $${paramIndex + 4}, $${paramIndex + 5}, $${paramIndex + 6}, $${paramIndex + 7}, $${paramIndex + 8}, $${paramIndex + 9}, $${paramIndex + 10}, $${paramIndex + 11}, $${paramIndex + 12})`,
      );
      values.push(
        truncate(record.name, 150) || null,
        record.phone,
        truncate(record.email, 150) || null,
        record.countryCode,
        record.areaCode,
        session.vendor_id,
        truncate(record.disposition, 100) || null,
        truncate(session.campaign_type, 50),
        record.age || null,
        job_id || null,
        getQuality(record.disposition),
        normalizeCallDate(record.call_date),
        record.duration || null,
      );
      paramIndex += 13;
    }

    if (valueStrings.length === 0) continue;

    const query = `
      INSERT INTO refine_data (name, phone, email, country_code, area_code, vendor_id, disposition, campaign_type, age, job_id, quality, call_date, duration)
      VALUES ${valueStrings.join(",")}
      ON CONFLICT (phone) DO UPDATE SET 
        call_count = COALESCE(refine_data.call_count, 1) + 1, 
        uploaded_at = CURRENT_TIMESTAMP,
        campaign_type = CASE 
          WHEN refine_data.campaign_type IS NULL OR refine_data.campaign_type = '' THEN EXCLUDED.campaign_type
          WHEN refine_data.campaign_type ILIKE '%' || EXCLUDED.campaign_type || '%' THEN refine_data.campaign_type
          ELSE refine_data.campaign_type || ', ' || EXCLUDED.campaign_type
        END
      RETURNING (xmax = 0) AS inserted
    `;

    const result = await withDeadlockRetry(() => exec.query(query, values));
    const insertedInBatch = result.rows.reduce(
      (acc, r) => acc + (r.inserted ? 1 : 0),
      0,
    );
    insertedCount += insertedInBatch;
  }

  return insertedCount;
};

/**
 * Standard session upload: upsert refine_data, DNC filtered by caller.
 */
const insertLeadsUpsertBatches = async (
  exec,
  { records, session, truncate, batchSize = DEFAULT_BATCH, job_id },
) => {
  const sorted = sortByPhone(records);
  let insertedCount = 0;
  let updatedCount = 0;

  for (let i = 0; i < sorted.length; i += batchSize) {
    if (i > 0 && i % 2500 === 0) {
      await new Promise((resolve) => setImmediate(resolve));
    }

    const batch = sorted.slice(i, i + batchSize);
    const valueStrings = [];
    const values = [];
    let paramIndex = 1;

    for (const record of batch) {
      valueStrings.push(
        `($${paramIndex}, $${paramIndex + 1}, $${paramIndex + 2}, $${paramIndex + 3}, $${paramIndex + 4}, $${paramIndex + 5}, $${paramIndex + 6}, $${paramIndex + 7}, $${paramIndex + 8}, $${paramIndex + 9}, $${paramIndex + 10}, $${paramIndex + 11}, $${paramIndex + 12})`,
      );
      values.push(
        truncate(record.name, 150) || null,
        record.phone,
        truncate(record.email, 150) || null,
        record.countryCode,
        record.areaCode,
        session.vendor_id,
        truncate(record.disposition, 100) || null,
        truncate(session.campaign_type, 50),
        record.age || null,
        job_id || null,
        getQuality(record.disposition),
        normalizeCallDate(record.call_date),
        record.duration || null,
      );
      paramIndex += 13;
    }

    if (valueStrings.length === 0) continue;

    const query = `
      INSERT INTO refine_data (name, phone, email, country_code, area_code, vendor_id, disposition, campaign_type, age, job_id, quality, call_date, duration)
      VALUES ${valueStrings.join(",")}
      ON CONFLICT (phone) DO UPDATE SET
        disposition = CASE
          WHEN EXCLUDED.disposition IS NOT NULL AND EXCLUDED.disposition <> '' THEN EXCLUDED.disposition
          ELSE refine_data.disposition
        END,
        name = CASE
          WHEN EXCLUDED.name IS NOT NULL AND EXCLUDED.name <> '' THEN EXCLUDED.name
          ELSE refine_data.name
        END,
        email = CASE
          WHEN EXCLUDED.email IS NOT NULL AND EXCLUDED.email <> '' THEN EXCLUDED.email
          ELSE refine_data.email
        END,
        age = CASE
          WHEN EXCLUDED.age IS NOT NULL THEN EXCLUDED.age
          ELSE refine_data.age
        END,
        quality = CASE
          WHEN EXCLUDED.quality IS NOT NULL THEN EXCLUDED.quality
          ELSE refine_data.quality
        END,
        job_id = COALESCE(EXCLUDED.job_id, refine_data.job_id),
        call_count = COALESCE(refine_data.call_count, 1) + 1,
        uploaded_at = CURRENT_TIMESTAMP,
        campaign_type = CASE 
          WHEN refine_data.campaign_type IS NULL OR refine_data.campaign_type = '' THEN EXCLUDED.campaign_type
          WHEN refine_data.campaign_type ILIKE '%' || EXCLUDED.campaign_type || '%' THEN refine_data.campaign_type
          ELSE refine_data.campaign_type || ', ' || EXCLUDED.campaign_type
        END
      RETURNING (xmax = 0) AS inserted
    `;

    const result = await withDeadlockRetry(() => exec.query(query, values));
    const insertedInBatch = result.rows.reduce(
      (acc, r) => acc + (r.inserted ? 1 : 0),
      0,
    );
    insertedCount += insertedInBatch;
    updatedCount += result.rowCount - insertedInBatch;
  }

  return { insertedCount, updatedCount };
};

module.exports = {
  insertFreshLeadsBatches,
  insertLeadsUpsertBatches,
  sortByPhone,
};
