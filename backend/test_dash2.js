require('dotenv').config();
const db = require('./src/config/db');

async function test() {
  const tests = [
    ['Totals', `
        SELECT
            (SELECT COUNT(*) FROM leads)                                   AS total_contacts,
            (SELECT COUNT(*) FROM vendors)                                 AS total_vendors,
            (SELECT COUNT(*) FROM leads WHERE status = 'downloaded')       AS total_downloaded,
            (SELECT COUNT(*) FROM leads WHERE status = 'available')        AS remaining_leads,
            (SELECT COUNT(*) FROM campaigns WHERE status = 'Active')       AS active_campaigns,
            (SELECT COUNT(*) FROM dnc_numbers WHERE dnc_type = 'DNC')      AS dnc_count,
            (SELECT COUNT(*) FROM dnc_numbers WHERE dnc_type = 'SALE')     AS sale_count,
            (SELECT COUNT(*) FROM upload_sessions)                         AS total_sessions
    `],
    ['Vendors', `
        SELECT v.name, COUNT(l.id)::int AS count
        FROM vendors v
        LEFT JOIN leads l ON v.vendor_id = l.vendor_id
        GROUP BY v.vendor_id, v.name
        ORDER BY count DESC
        LIMIT 8
    `],
    ['Campaigns', `
        SELECT campaign_type AS name, COUNT(*)::int AS count
        FROM leads
        WHERE campaign_type IS NOT NULL AND campaign_type <> ''
        GROUP BY campaign_type
        ORDER BY count DESC
        LIMIT 6
    `],
    ['DNC SALE', `
        SELECT
            COALESCE(c.name, 'Untagged') AS campaign,
            SUM(CASE WHEN d.dnc_type = 'DNC'  THEN 1 ELSE 0 END)::int AS dnc_count,
            SUM(CASE WHEN d.dnc_type = 'SALE' THEN 1 ELSE 0 END)::int AS sale_count
        FROM dnc_numbers d
        LEFT JOIN campaigns c ON d.campaign_id = c.campaign_id
        GROUP BY COALESCE(c.name, 'Untagged')
        ORDER BY (
            SUM(CASE WHEN d.dnc_type = 'DNC'  THEN 1 ELSE 0 END) +
            SUM(CASE WHEN d.dnc_type = 'SALE' THEN 1 ELSE 0 END)
        ) DESC
        LIMIT 6
    `],
    ['Lead Status', `
        SELECT status, COUNT(*)::int AS count
        FROM leads
        GROUP BY status
        ORDER BY count DESC
    `],
    ['Sessions', `
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
    `]
  ];

  for(const [name, query] of tests) {
    try {
      await db.query(query);
      console.log('✅', name);
    } catch(err) {
      console.error('❌', name, err.message);
    }
  }
  process.exit();
}
test();
