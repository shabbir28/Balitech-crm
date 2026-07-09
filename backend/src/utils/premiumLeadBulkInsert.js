const { withDeadlockRetry } = require("./dbHelpers");

const DEFAULT_BATCH = 500;

const sortByPhone = (records) =>
  [...records].sort((a, b) => String(a.phone).localeCompare(String(b.phone)));

/**
 * Insert leads for Premium Data. Uses ON CONFLICT to update if new duration is greater.
 */
const insertPremiumLeadsBatches = async (
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
        `($${paramIndex}, $${paramIndex + 1}, $${paramIndex + 2}, $${paramIndex + 3}, $${paramIndex + 4}, $${paramIndex + 5}, $${paramIndex + 6}, $${paramIndex + 7}, $${paramIndex + 8}, $${paramIndex + 9}, $${paramIndex + 10}, $${paramIndex + 11}, $${paramIndex + 12}, $${paramIndex + 13}, $${paramIndex + 14})`,
      );
      values.push(
        truncate(record.name, 150) || null,
        record.phone,
        truncate(record.email, 150) || null,
        record.countryCode,
        record.areaCode,
        session.vendor_id,
        truncate(session.campaign_type, 50) || null,
        record.age || null,
        job_id || null,
        record.dob || null,
        record.zipcode || null,
        record.jornaya_lead_id || null,
        record.state || null,
        record.caller_id || null,
        record.duration || null,
      );
      paramIndex += 15;
    }

    if (valueStrings.length === 0) continue;

    const query = `
      INSERT INTO premium_data (name, phone, email, country_code, area_code, vendor_id, campaign_type, age, job_id, dob, zipcode, jornaya_lead_id, state, caller_id, duration)
      VALUES ${valueStrings.join(",")}
      ON CONFLICT (phone) DO UPDATE SET
        name = EXCLUDED.name,
        email = EXCLUDED.email,
        country_code = EXCLUDED.country_code,
        area_code = EXCLUDED.area_code,
        vendor_id = EXCLUDED.vendor_id,
        campaign_type = EXCLUDED.campaign_type,
        age = EXCLUDED.age,
        job_id = EXCLUDED.job_id,
        dob = EXCLUDED.dob,
        zipcode = EXCLUDED.zipcode,
        jornaya_lead_id = EXCLUDED.jornaya_lead_id,
        state = EXCLUDED.state,
        caller_id = EXCLUDED.caller_id,
        duration = EXCLUDED.duration,
        uploaded_at = CURRENT_TIMESTAMP
      WHERE COALESCE(EXCLUDED.duration, 0) > COALESCE(premium_data.duration, 0)
    `;

    const result = await withDeadlockRetry(() => exec.query(query, values));
    insertedCount += result.rowCount;
  }

  return insertedCount;
};

module.exports = {
  insertPremiumLeadsBatches,
  sortByPhone,
};
