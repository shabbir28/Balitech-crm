const db = require('../config/db');

// GET /api/dashboard/stats
const getStats = async (req, res) => {
    try {
        // Run aggregations in parallel
        const [
            totalsResult,
            vendorWiseResult,
            countryWiseResult,
            dailyDownloadsResult
        ] = await Promise.all([
            // Overall Totals
            db.query(`
                SELECT 
                    (SELECT COUNT(*) FROM leads) as total_contacts,
                    (SELECT COUNT(*) FROM vendors) as total_vendors,
                    (SELECT COUNT(*) FROM leads WHERE status = 'downloaded') as total_downloaded,
                    (SELECT COUNT(*) FROM leads WHERE status = 'available') as remaining_leads
            `),
            // Vendor Wise Data
            db.query(`
                SELECT v.name, COUNT(l.id) as count
                FROM vendors v
                LEFT JOIN leads l ON v.vendor_id = l.vendor_id
                GROUP BY v.vendor_id, v.name
            `),
            // Country Wise Distribution
            db.query(`
                SELECT country_code, COUNT(id) as count
                FROM leads
                GROUP BY country_code
                ORDER BY count DESC
                LIMIT 10
            `),
            // Daily Download Activity (last 7 days)
            db.query(`
                SELECT 
                    DATE(download_date) as date, 
                    SUM(quantity) as total_quantity
                FROM download_logs
                WHERE download_date >= NOW() - INTERVAL '7 days'
                GROUP BY DATE(download_date)
                ORDER BY date ASC
            `)
        ]);

        res.json({
            totals: totalsResult.rows[0],
            vendorDistribution: vendorWiseResult.rows,
            countryDistribution: countryWiseResult.rows,
            dailyActivity: dailyDownloadsResult.rows
        });
    } catch (err) {
        console.error('Dashboard Stats Error:', err);
        res.status(500).json({ message: 'Server error fetching stats' });
    }
};

module.exports = {
    getStats
};
