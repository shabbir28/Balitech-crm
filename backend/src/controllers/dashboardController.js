const db = require('../config/db');

// GET /api/dashboard/stats
const getStats = async (req, res) => {
    try {
        const [
            totalsResult,
            vendorWiseResult,
            campaignStatsResult,
            dncStatsResult,
            leadStatusResult,
            recentSessionsResult,
        ] = await Promise.all([
            // Overall Totals
            db.query(`
                SELECT
                    (SELECT COUNT(*) FROM leads)                                   AS total_contacts,
                    (SELECT COUNT(*) FROM vendors)                                 AS total_vendors,
                    (SELECT COUNT(*) FROM leads WHERE status = 'downloaded')       AS total_downloaded,
                    (SELECT COUNT(*) FROM leads WHERE status = 'available')        AS remaining_leads,
                    (SELECT COUNT(*) FROM campaigns WHERE status = 'Active')       AS active_campaigns,
                    (SELECT COUNT(*) FROM dnc_numbers WHERE dnc_type = 'DNC')      AS dnc_count,
                    (SELECT COUNT(*) FROM dnc_numbers WHERE dnc_type = 'SALE')     AS sale_count,
                    (SELECT COUNT(*) FROM upload_sessions)                         AS total_sessions
            `),

            // Vendor-wise lead counts
            db.query(`
                SELECT v.name, COUNT(l.id)::int AS count
                FROM vendors v
                LEFT JOIN leads l ON v.vendor_id = l.vendor_id
                GROUP BY v.vendor_id, v.name
                ORDER BY count DESC
                LIMIT 8
            `),

            // Campaign-wise lead counts (uses campaign_type column in leads)
            db.query(`
                SELECT campaign_type AS name, COUNT(*)::int AS count
                FROM leads
                WHERE campaign_type IS NOT NULL AND campaign_type <> ''
                GROUP BY campaign_type
                ORDER BY count DESC
                LIMIT 6
            `),

            // DNC vs SALE breakdown per campaign
            db.query(`
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
            `),

            // Lead status breakdown
            db.query(`
                SELECT status, COUNT(*)::int AS count
                FROM leads
                GROUP BY status
                ORDER BY count DESC
            `),

            // Recent upload sessions (using real columns)
            db.query(`
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
        ]);

        res.json({
            totals:             totalsResult.rows[0],
            vendorDistribution: vendorWiseResult.rows,
            campaignStats:      campaignStatsResult.rows,
            dncStats:           dncStatsResult.rows,
            leadStatusBreakdown: leadStatusResult.rows,
            recentSessions:     recentSessionsResult.rows,
        });
    } catch (err) {
        console.error('Dashboard Stats Error:', err);
        res.status(500).json({ message: 'Server error fetching stats', error: err.message });
    }
};

module.exports = { getStats };
