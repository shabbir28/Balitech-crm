const db = require('./src/config/db');

async function test() {
  const vanCampaignStatsResult = await db.query(`
    SELECT
        COALESCE(c.name, s.campaign_type, 'Untagged') AS name,
        COUNT(*)::int AS count,
        COUNT(CASE WHEN d.status = 'available' THEN 1 END)::int AS available_count,
        COUNT(CASE WHEN d.status = 'downloaded' THEN 1 END)::int AS downloaded_count
    FROM van_data d
    LEFT JOIN van_sessions s ON d.session_id = s.id
    LEFT JOIN van_campaigns c ON 
        (s.campaign_type ~ '^[0-9]+$' AND c.campaign_id = NULLIF(s.campaign_type, '')::int)
        OR (s.campaign_type !~ '^[0-9]+$' AND c.name ILIKE s.campaign_type)
    WHERE s.campaign_type IS NOT NULL AND TRIM(s.campaign_type) <> ''
    GROUP BY COALESCE(c.name, s.campaign_type, 'Untagged')
    ORDER BY count DESC
  `);
  console.log(vanCampaignStatsResult.rows);
  process.exit(0);
}

test();
