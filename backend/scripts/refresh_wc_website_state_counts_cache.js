const db = require('../src/config/db');
const { areaCodesMap } = require('../src/utils/areaCodes');

const ZERO_VENDOR = '00000000-0000-0000-0000-000000000000';
const BATCH_SIZE = 1000;

async function main() {
  console.time('refresh_wc_website_state_counts_cache');

  // Prevent duplicate refresh jobs
  const lock = await db.query("SELECT pg_try_advisory_lock(88005501) AS locked");
  if (!lock.rows[0].locked) {
    console.log('Another WC website state cache refresh is already running. Exiting.');
    process.exit(0);
  }

  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS wc_db_website_state_counts_cache (
        vendor_id uuid NOT NULL,
        state text NOT NULL,
        area_code text NOT NULL,
        age_int integer NOT NULL,
        status text NOT NULL,
        lead_count bigint NOT NULL DEFAULT 0,
        updated_at timestamptz NOT NULL DEFAULT now(),
        PRIMARY KEY (vendor_id, state, area_code, age_int, status)
      );
    `);

    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_wc_website_state_counts_lookup
      ON wc_db_website_state_counts_cache (vendor_id, state, age_int, status);
    `);

    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_wc_website_state_counts_state_lookup
      ON wc_db_website_state_counts_cache (state, age_int, status);
    `);

    console.log('Calculating exact website-logic counts from wc_db_data...');

    const result = await db.query(`
      SELECT
        COALESCE(vendor_id, '${ZERO_VENDOR}'::uuid) AS vendor_id,
        COALESCE(NULLIF(TRIM(area_code), ''), 'Unknown') AS area_code,
        CASE
          WHEN age::text ~ '^[0-9]+$' THEN age::int
          ELSE 0
        END AS age_int,
        status,
        COUNT(id)::bigint AS lead_count
      FROM wc_db_data
      WHERE status IN ('available', 'downloaded')
        AND NOT EXISTS (SELECT 1 FROM dnc_numbers d WHERE d.phone = wc_db_data.phone)
        AND NOT EXISTS (SELECT 1 FROM refine_dnc_numbers d WHERE d.phone = wc_db_data.phone)
        AND NOT EXISTS (SELECT 1 FROM premium_dnc_numbers d WHERE d.phone = wc_db_data.phone)
        AND NOT EXISTS (SELECT 1 FROM dead_numbers d WHERE d.phone = wc_db_data.phone)
        AND NOT EXISTS (SELECT 1 FROM separation_data sd WHERE sd.phone = wc_db_data.phone)
      GROUP BY
        COALESCE(vendor_id, '${ZERO_VENDOR}'::uuid),
        COALESCE(NULLIF(TRIM(area_code), ''), 'Unknown'),
        CASE
          WHEN age::text ~ '^[0-9]+$' THEN age::int
          ELSE 0
        END,
        status
    `);

    console.log(`Grouped rows: ${result.rows.length}`);

    await db.query('BEGIN');
    await db.query('TRUNCATE wc_db_website_state_counts_cache');

    for (let i = 0; i < result.rows.length; i += BATCH_SIZE) {
      const chunk = result.rows.slice(i, i + BATCH_SIZE);
      const values = [];
      const placeholders = [];

      chunk.forEach((row, idx) => {
        const base = idx * 6;
        const code = String(row.area_code || '').trim();
        const state = areaCodesMap[code] || 'Unknown';

        values.push(
          row.vendor_id,
          state,
          code,
          Number(row.age_int || 0),
          row.status,
          row.lead_count
        );

        placeholders.push(
          `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6}, now())`
        );
      });

      await db.query(
        `
          INSERT INTO wc_db_website_state_counts_cache
          (vendor_id, state, area_code, age_int, status, lead_count, updated_at)
          VALUES ${placeholders.join(',')}
        `,
        values
      );

      console.log(`Inserted ${Math.min(i + BATCH_SIZE, result.rows.length)} / ${result.rows.length}`);
    }

    await db.query('COMMIT');

    const summary = await db.query(`
      SELECT
        state,
        SUM(lead_count)::bigint AS count
      FROM wc_db_website_state_counts_cache
      WHERE status = 'available'
      GROUP BY state
      ORDER BY count DESC
      LIMIT 10
    `);

    console.table(summary.rows);
    console.log('WC website state counts cache refreshed successfully.');
  } catch (err) {
    await db.query('ROLLBACK').catch(() => {});
    console.error(err);
    process.exitCode = 1;
  } finally {
    await db.query("SELECT pg_advisory_unlock(88005501)").catch(() => {});
    console.timeEnd('refresh_wc_website_state_counts_cache');
    process.exit(process.exitCode || 0);
  }
}

main();
