require("dotenv").config();
const db = require("../src/config/db");

const modules = [
  { module: "van", table: "van_data" },
  { module: "wc_db", table: "wc_db_data" },
  { module: "refine", table: "refine_data" },
  { module: "premium", table: "premium_data" },
];

async function refreshModule(item) {
  console.time(`refresh_${item.module}`);

  await db.query("DELETE FROM vendor_counts_cache WHERE module = $1", [item.module]);

  await db.query(
    `
    INSERT INTO vendor_counts_cache (
      module,
      vendor_id,
      total_leads,
      available_leads,
      downloaded_leads,
      updated_at
    )
    SELECT
      $1 AS module,
      vendor_id::text AS vendor_id,
      COUNT(*)::bigint AS total_leads,
      COUNT(*) FILTER (WHERE status = 'available')::bigint AS available_leads,
      COUNT(*) FILTER (WHERE status = 'downloaded')::bigint AS downloaded_leads,
      now() AS updated_at
    FROM ${item.table}
    WHERE vendor_id IS NOT NULL
    GROUP BY vendor_id
    `,
    [item.module]
  );

  console.timeEnd(`refresh_${item.module}`);
}

async function main() {
  console.time("refresh_vendor_counts_cache");

  for (const item of modules) {
    await refreshModule(item);
  }

  const summary = await db.query(`
    SELECT
      module,
      COUNT(*)::int AS vendors_cached,
      SUM(total_leads)::bigint AS total_leads,
      SUM(available_leads)::bigint AS available_leads,
      SUM(downloaded_leads)::bigint AS downloaded_leads,
      MAX(updated_at) AS updated_at
    FROM vendor_counts_cache
    GROUP BY module
    ORDER BY module
  `);

  console.table(summary.rows);
  console.log("Vendor counts cache refreshed.");
  console.timeEnd("refresh_vendor_counts_cache");

  if (db.end) await db.end();
}

main().catch(async (err) => {
  console.error("refresh_vendor_counts_cache failed:", err);
  if (db.end) await db.end().catch(() => {});
  process.exit(1);
});
