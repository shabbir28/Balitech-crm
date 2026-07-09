const db = require('./src/config/db');

async function test() {
  try {
    const query = `
        WITH vendor_stats AS (
            SELECT l.vendor_id,
                   COUNT(l.id)::int as total_leads,
                   COUNT(CASE WHEN l.status = 'available' AND COALESCE(l.disposition, '') <> 'DNC' AND d.phone IS NULL THEN 1 END)::int as available_leads,
                   COUNT(CASE WHEN l.status = 'downloaded' THEN 1 END)::int as downloaded_leads,
                   COUNT(CASE WHEN COALESCE(l.disposition, '') = 'DNC' OR d.phone IS NOT NULL THEN 1 END)::int as dnc_leads
            FROM premium_data l
            LEFT JOIN premium_dnc_numbers d ON l.phone = d.phone
            GROUP BY l.vendor_id
        )
        SELECT v.*, 
               COALESCE(vs.total_leads, 0) as total_leads,
               COALESCE(vs.available_leads, 0) as available_leads,
               COALESCE(vs.downloaded_leads, 0) as downloaded_leads,
               COALESCE(vs.dnc_leads, 0) as dnc_leads
        FROM premium_vendors v
        LEFT JOIN vendor_stats vs ON v.vendor_id = vs.vendor_id
        ORDER BY v.created_at DESC
    `;
    await db.query(query);
    console.log('SUCCESS');
    process.exit(0);
  } catch(e) {
    console.error('ERROR:', e.message);
    process.exit(1);
  }
}
test();
