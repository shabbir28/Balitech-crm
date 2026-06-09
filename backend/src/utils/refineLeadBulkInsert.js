const { withDeadlockRetry } = require("./dbHelpers");

const DEFAULT_BATCH = 500;

const sortByPhone = (records) =>
  [...records].sort((a, b) => String(a.phone).localeCompare(String(b.phone)));

const getQuality = (disposition) => {
  if (!disposition) return 'Good';
  const badStatuses = new Set(['A', 'AA', 'AB', 'ADC', 'DAIR', 'DC', 'DROP', 'N', 'NA', 'PDROP', 'PU']);
  return badStatuses.has(String(disposition).toUpperCase().trim()) ? 'Bad' : 'Good';
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
        `($${paramIndex}, $${paramIndex + 1}, $${paramIndex + 2}, $${paramIndex + 3}, $${paramIndex + 4}, $${paramIndex + 5}, $${paramIndex + 6}, $${paramIndex + 7}, $${paramIndex + 8}, $${paramIndex + 9}, $${paramIndex + 10})`,
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
      );
      paramIndex += 11;
    }

    if (valueStrings.length === 0) continue;

    const query = `
      INSERT INTO refine_data (name, phone, email, country_code, area_code, vendor_id, disposition, campaign_type, age, job_id, quality)
      VALUES ${valueStrings.join(",")}
      ON CONFLICT (phone) DO NOTHING
    `;

    const result = await withDeadlockRetry(() => exec.query(query, values));
    insertedCount += result.rowCount;
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
        `($${paramIndex}, $${paramIndex + 1}, $${paramIndex + 2}, $${paramIndex + 3}, $${paramIndex + 4}, $${paramIndex + 5}, $${paramIndex + 6}, $${paramIndex + 7}, $${paramIndex + 8}, $${paramIndex + 9}, $${paramIndex + 10})`,
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
      );
      paramIndex += 11;
    }

    if (valueStrings.length === 0) continue;

    const query = `
      INSERT INTO refine_data (name, phone, email, country_code, area_code, vendor_id, disposition, campaign_type, age, job_id, quality)
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
        job_id = COALESCE(EXCLUDED.job_id, refine_data.job_id)
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
