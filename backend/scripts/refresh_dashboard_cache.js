require("dotenv").config();
const db = require("../src/config/db");

async function q(sql, params = []) {
  const result = await db.query(sql, params);
  return result.rows;
}

async function main() {
  console.time("refresh_dashboard_cache");

  const [
    leadsStatsRows,
    otherRows,
    vendorRows,
    campaignRows,
    dncRows,
    recentRows,
    refineStatsRows,
    refineCampaignRows,
    premiumStatsRows,
    premiumCampaignRows,
    deadRows,
    vanStatsRows,
    vanCampaignRows,
    separationStatsRows,
    separationCampaignRows,
    wcStatsRows,
    wcCampaignRows,
  ] = await Promise.all([
    q(`
      SELECT
        COUNT(*)::int AS total_contacts,
        COUNT(*) FILTER (WHERE status = 'downloaded')::int AS total_downloaded,
        COUNT(*) FILTER (WHERE status = 'available')::int AS remaining_leads
      FROM leads
    `),

    q(`
      SELECT
        (SELECT COUNT(*) FROM vendors)::int AS total_vendors,
        (SELECT COUNT(*) FROM campaigns WHERE status = 'Active')::int AS active_campaigns,
        (SELECT COUNT(*) FROM dnc_numbers WHERE dnc_type = 'DNC')::int AS dnc_count,
        (SELECT COUNT(*) FROM dnc_numbers WHERE dnc_type = 'SALE')::int AS sale_count,
        (SELECT COUNT(*) FROM upload_sessions)::int AS total_sessions
    `),

    q(`
      SELECT v.name, COUNT(l.id)::int AS count
      FROM vendors v
      LEFT JOIN leads l ON v.vendor_id = l.vendor_id
      GROUP BY v.vendor_id, v.name
      ORDER BY count DESC
      LIMIT 8
    `),

    q(`
      SELECT campaign_type AS name, COUNT(*)::int AS count
      FROM leads
      WHERE campaign_type IS NOT NULL AND campaign_type <> ''
      GROUP BY campaign_type
      ORDER BY count DESC
      LIMIT 6
    `),

    q(`
      SELECT
        COALESCE(c.name, 'Untagged') AS campaign,
        SUM(CASE WHEN d.dnc_type = 'DNC' THEN 1 ELSE 0 END)::int AS dnc_count,
        SUM(CASE WHEN d.dnc_type = 'SALE' THEN 1 ELSE 0 END)::int AS sale_count
      FROM dnc_numbers d
      LEFT JOIN campaigns c ON d.campaign_id = c.campaign_id
      GROUP BY COALESCE(c.name, 'Untagged')
      ORDER BY (
        SUM(CASE WHEN d.dnc_type = 'DNC' THEN 1 ELSE 0 END) +
        SUM(CASE WHEN d.dnc_type = 'SALE' THEN 1 ELSE 0 END)
      ) DESC
      LIMIT 6
    `),

    q(`
      SELECT
        s.id,
        s.campaign_type,
        v.name AS vendor_name,
        COUNT(j.id)::int AS job_count,
        s.created_at
      FROM upload_sessions s
      LEFT JOIN vendors v ON s.vendor_id = v.vendor_id
      LEFT JOIN upload_jobs j ON j.session_id = s.id
      GROUP BY s.id, s.campaign_type, v.name, s.created_at
      ORDER BY s.created_at DESC
      LIMIT 6
    `),

    q(`
      SELECT
        COUNT(*)::int AS total_refine_data,
        COUNT(*) FILTER (WHERE quality = 'Good')::int AS good_refine_data,
        COUNT(*) FILTER (WHERE quality = 'Bad')::int AS bad_refine_data
      FROM refine_data
    `),

    q(`
      SELECT
        campaign_type AS name,
        COUNT(*)::int AS count,
        COUNT(*) FILTER (WHERE quality = 'Good')::int AS good_count,
        COUNT(*) FILTER (WHERE quality = 'Bad')::int AS bad_count
      FROM refine_data
      WHERE campaign_type IS NOT NULL AND TRIM(campaign_type) <> ''
      GROUP BY campaign_type
      ORDER BY count DESC
    `),

    q(`
      SELECT
        COUNT(*)::int AS total_premium_data,
        COUNT(*) FILTER (WHERE status = 'available')::int AS total_premium_available,
        COUNT(*) FILTER (WHERE status = 'downloaded')::int AS total_premium_downloaded
      FROM premium_data
    `),

    q(`
      SELECT
        campaign_type AS name,
        COUNT(*)::int AS count,
        COUNT(*) FILTER (WHERE status = 'available')::int AS available_count,
        COUNT(*) FILTER (WHERE status = 'downloaded')::int AS downloaded_count
      FROM premium_data
      WHERE campaign_type IS NOT NULL AND TRIM(campaign_type) <> ''
      GROUP BY campaign_type
      ORDER BY count DESC
    `),

    q(`
      SELECT
        (SELECT COUNT(*)::int FROM dead_numbers) AS total_dead_numbers,
        (SELECT COALESCE(total_downloaded, 0)::int FROM dead_numbers_stats WHERE id = 1) AS total_dead_numbers_downloaded
    `),

    q(`
      SELECT
        COUNT(*)::int AS total_van_data,
        COUNT(*) FILTER (WHERE status = 'available')::int AS total_van_available,
        COUNT(*) FILTER (WHERE status = 'downloaded')::int AS total_van_downloaded
      FROM van_data
    `),

    q(`
      SELECT
        COALESCE(c.name, s.campaign_type, 'Untagged') AS name,
        COUNT(*)::int AS count,
        COUNT(*) FILTER (WHERE d.status = 'available')::int AS available_count,
        COUNT(*) FILTER (WHERE d.status = 'downloaded')::int AS downloaded_count
      FROM van_data d
      LEFT JOIN van_sessions s ON d.session_id = s.id
      LEFT JOIN van_campaigns c ON
        (s.campaign_type ~ '^[0-9]+$' AND c.campaign_id = NULLIF(s.campaign_type, '')::int)
        OR (s.campaign_type !~ '^[0-9]+$' AND c.name ILIKE s.campaign_type)
      WHERE s.campaign_type IS NOT NULL AND TRIM(s.campaign_type) <> ''
      GROUP BY COALESCE(c.name, s.campaign_type, 'Untagged')
      ORDER BY count DESC
    `),

    q(`
      SELECT
        COUNT(*)::int AS total_separation_data,
        COUNT(*) FILTER (WHERE status = 'available')::int AS total_separation_available,
        COUNT(*) FILTER (WHERE status = 'downloaded')::int AS total_separation_downloaded
      FROM separation_data
    `),

    q(`
      SELECT
        COALESCE(c.name, 'Untagged') AS name,
        COUNT(*)::int AS count,
        COUNT(*) FILTER (WHERE d.status = 'available')::int AS available_count,
        COUNT(*) FILTER (WHERE d.status = 'downloaded')::int AS downloaded_count
      FROM separation_data d
      LEFT JOIN campaigns c ON d.campaign_id = c.campaign_id
      GROUP BY COALESCE(c.name, 'Untagged')
      ORDER BY count DESC
    `),

    q(`
      SELECT
        COUNT(*)::int AS total_wc_db_data,
        COUNT(*) FILTER (WHERE status = 'available')::int AS total_wc_db_available,
        COUNT(*) FILTER (WHERE status = 'downloaded')::int AS total_wc_db_downloaded
      FROM wc_db_data
    `),

    q(`
      SELECT
        COALESCE(c.name, s.campaign_type, 'Untagged') AS name,
        COUNT(*)::int AS count,
        COUNT(*) FILTER (WHERE d.status = 'available')::int AS available_count,
        COUNT(*) FILTER (WHERE d.status = 'downloaded')::int AS downloaded_count
      FROM wc_db_data d
      LEFT JOIN wc_db_sessions s ON d.session_id = s.id
      LEFT JOIN wc_db_campaigns c ON
        (s.campaign_type ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' AND c.campaign_id = NULLIF(s.campaign_type, '')::uuid)
        OR (s.campaign_type !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' AND c.name ILIKE s.campaign_type)
      WHERE s.campaign_type IS NOT NULL AND TRIM(s.campaign_type) <> ''
      GROUP BY COALESCE(c.name, s.campaign_type, 'Untagged')
      ORDER BY count DESC
    `),
  ]);

  const leadsStats = leadsStatsRows[0] || {};
  const otherStats = otherRows[0] || {};
  const refineStats = refineStatsRows[0] || {};
  const premiumStats = premiumStatsRows[0] || {};
  const deadStats = deadRows[0] || {};
  const vanStats = vanStatsRows[0] || {};
  const separationStats = separationStatsRows[0] || {};
  const wcStats = wcStatsRows[0] || {};

  const data = {
    totals: {
      ...leadsStats,
      ...otherStats,
      ...refineStats,
      ...premiumStats,
      ...deadStats,
      ...vanStats,
      ...separationStats,
      ...wcStats,
    },
    vendorDistribution: vendorRows,
    campaignStats: campaignRows,
    dncStats: dncRows,
    leadStatusBreakdown: [
      { status: "available", count: leadsStats.remaining_leads || 0 },
      { status: "downloaded", count: leadsStats.total_downloaded || 0 },
    ],
    recentSessions: recentRows,
    refineCampaignStats: refineCampaignRows,
    premiumCampaignStats: premiumCampaignRows,
    vanCampaignStats: vanCampaignRows,
    separationCampaignStats: separationCampaignRows,
    wcDbCampaignStats: wcCampaignRows,
    cachedAt: new Date().toISOString(),
  };

  await db.query(
    `
    INSERT INTO dashboard_stats_cache(cache_key, data, updated_at)
    VALUES ('dashboard_stats', $1::jsonb, now())
    ON CONFLICT (cache_key)
    DO UPDATE SET data = EXCLUDED.data, updated_at = now()
    `,
    [JSON.stringify(data)]
  );

  console.log("Dashboard cache refreshed.");
  console.timeEnd("refresh_dashboard_cache");

  if (db.end) await db.end();
}

main().catch(async (err) => {
  console.error("refresh_dashboard_cache failed:", err);
  if (db.end) await db.end().catch(() => {});
  process.exit(1);
});
