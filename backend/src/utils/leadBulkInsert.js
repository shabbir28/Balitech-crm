const { withDeadlockRetry } = require("./dbHelpers");

const DEFAULT_BATCH = 500;

const sortByPhone = (records) =>
  [...records].sort((a, b) => String(a.phone).localeCompare(String(b.phone)));

/**
 * Insert only new leads (fresh upload). Each batch is its own statement — no long transaction.
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
        `($${paramIndex}, $${paramIndex + 1}, $${paramIndex + 2}, $${paramIndex + 3}, $${paramIndex + 4}, $${paramIndex + 5}, $${paramIndex + 6}, $${paramIndex + 7}, $${paramIndex + 8}, $${paramIndex + 9})`,
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
      );
      paramIndex += 10;
    }

    if (valueStrings.length === 0) continue;

    const query = `
      INSERT INTO leads (name, phone, email, country_code, area_code, vendor_id, disposition, campaign_type, age, job_id)
      VALUES ${valueStrings.join(",")}
      ON CONFLICT (phone, workspace) DO UPDATE SET
        campaign_type = CASE
          WHEN leads.campaign_type IS NULL OR leads.campaign_type = '' THEN EXCLUDED.campaign_type
          WHEN position(EXCLUDED.campaign_type in leads.campaign_type) = 0 
          THEN leads.campaign_type || ', ' || EXCLUDED.campaign_type
          ELSE leads.campaign_type
        END,
        job_id = COALESCE(EXCLUDED.job_id, leads.job_id),
        uploaded_at = CURRENT_TIMESTAMP
      RETURNING (xmax = 0) AS inserted
    `;

    const result = await withDeadlockRetry(() => exec.query(query, values));
    const insertedInBatch = result.rows.reduce(
      (acc, r) => acc + (r.inserted ? 1 : 0),
      0,
    );
    // Even if it was updated (campaign appended), it counts as a fresh addition to this campaign.
    // So we just add the batch length or result.rowCount. We'll use result.rowCount.
    insertedCount += result.rowCount;
  }

  return insertedCount;
};

/**
 * Standard session upload: upsert leads, DNC filtered by caller.
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
        `($${paramIndex}, $${paramIndex + 1}, $${paramIndex + 2}, $${paramIndex + 3}, $${paramIndex + 4}, $${paramIndex + 5}, $${paramIndex + 6}, $${paramIndex + 7}, $${paramIndex + 8}, $${paramIndex + 9})`,
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
      );
      paramIndex += 10;
    }

    if (valueStrings.length === 0) continue;

    const query = `
      INSERT INTO leads (name, phone, email, country_code, area_code, vendor_id, disposition, campaign_type, age, job_id)
      VALUES ${valueStrings.join(",")}
      ON CONFLICT (phone, workspace) DO UPDATE SET
        disposition = CASE
          WHEN EXCLUDED.disposition IS NOT NULL AND EXCLUDED.disposition <> '' THEN EXCLUDED.disposition
          ELSE leads.disposition
        END,
        name = CASE
          WHEN EXCLUDED.name IS NOT NULL AND EXCLUDED.name <> '' THEN EXCLUDED.name
          ELSE leads.name
        END,
        email = CASE
          WHEN EXCLUDED.email IS NOT NULL AND EXCLUDED.email <> '' THEN EXCLUDED.email
          ELSE leads.email
        END,
        age = CASE
          WHEN EXCLUDED.age IS NOT NULL THEN EXCLUDED.age
          ELSE leads.age
        END,
        campaign_type = CASE
          WHEN leads.campaign_type IS NULL OR leads.campaign_type = '' THEN EXCLUDED.campaign_type
          WHEN position(EXCLUDED.campaign_type in leads.campaign_type) = 0 
          THEN leads.campaign_type || ', ' || EXCLUDED.campaign_type
          ELSE leads.campaign_type
        END,
        job_id = COALESCE(EXCLUDED.job_id, leads.job_id),
        uploaded_at = CURRENT_TIMESTAMP
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
