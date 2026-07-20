const db = require("../config/db");

const getStats = async (req, res) => {
  try {
    const [
      leadsStatsResult,
      otherTotalsResult,
      vendorWiseResult,
      campaignStatsResult,
      dncStatsResult,
      recentSessionsResult,
      refineStatsResult,
      refineCampaignStatsResult,
      premiumStatsResult,
      premiumCampaignStatsResult,
      deadNumbersStatsResult,
      vanStatsResult,
      vanCampaignStatsResult,
      separationStatsResult,
      separationCampaignStatsResult,
    ] = await Promise.all([
      // 1. Leads Overall Stats (Single Scan)
      db.query(`
                SELECT
                    COUNT(*)::int AS total_contacts,
                    COUNT(CASE WHEN status = 'downloaded' THEN 1 END)::int AS total_downloaded,
                    COUNT(CASE WHEN status = 'available' THEN 1 END)::int AS remaining_leads
                FROM leads
            `),

      // 2. Other Totals
      db.query(`
                SELECT
                    (SELECT COUNT(*) FROM vendors)::int                              AS total_vendors,
                    (SELECT COUNT(*) FROM campaigns WHERE status = 'Active')::int    AS active_campaigns,
                    (SELECT COUNT(*) FROM dnc_numbers WHERE dnc_type = 'DNC')::int   AS dnc_count,
                    (SELECT COUNT(*) FROM dnc_numbers WHERE dnc_type = 'SALE')::int  AS sale_count,
                    (SELECT COUNT(*) FROM upload_sessions)::int                      AS total_sessions
            `),

      // 3. Vendor-wise lead counts (Optimized with index)
      db.query(`
                SELECT v.name, COUNT(l.id)::int AS count
                FROM vendors v
                LEFT JOIN leads l ON v.vendor_id = l.vendor_id
                GROUP BY v.vendor_id, v.name
                ORDER BY count DESC
                LIMIT 8
            `),

      // 4. Campaign-wise lead counts (Optimized with index)
      db.query(`
                SELECT campaign_type AS name, COUNT(*)::int AS count
                FROM leads
                WHERE campaign_type IS NOT NULL AND campaign_type <> ''
                GROUP BY campaign_type
                ORDER BY count DESC
                LIMIT 6
            `),

      // 5. DNC vs SALE breakdown per campaign
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

      // 6. Recent upload sessions
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

      // 7. Refine Stats
      db.query(`
                SELECT 
                    COUNT(*)::int AS total_refine_data,
                    COUNT(CASE WHEN quality = 'Good' THEN 1 END)::int AS good_refine_data,
                    COUNT(CASE WHEN quality = 'Bad' THEN 1 END)::int AS bad_refine_data
                FROM refine_data
            `),

      // 8. Refine data per campaign (ACA, MEDICARE, etc.)
      db.query(`
                SELECT
                    campaign_type AS name,
                    COUNT(*)::int AS count,
                    COUNT(CASE WHEN quality = 'Good' THEN 1 END)::int AS good_count,
                    COUNT(CASE WHEN quality = 'Bad' THEN 1 END)::int AS bad_count
                FROM refine_data
                WHERE campaign_type IS NOT NULL AND TRIM(campaign_type) <> ''
                GROUP BY campaign_type
                ORDER BY count DESC
            `),

      // 9. Premium Data Total Stats
      db.query(`
                SELECT 
                    COUNT(*)::int AS total_premium_data,
                    COUNT(CASE WHEN status = 'available' THEN 1 END)::int AS total_premium_available,
                    COUNT(CASE WHEN status = 'downloaded' THEN 1 END)::int AS total_premium_downloaded
                FROM premium_data
            `),

      // 10. Premium Data per campaign
      db.query(`
                SELECT 
                    campaign_type AS name, 
                    COUNT(*)::int AS count,
                    COUNT(CASE WHEN status = 'available' THEN 1 END)::int AS available_count,
                    COUNT(CASE WHEN status = 'downloaded' THEN 1 END)::int AS downloaded_count
                FROM premium_data
                WHERE campaign_type IS NOT NULL AND TRIM(campaign_type) <> ''
                GROUP BY campaign_type
                ORDER BY count DESC
            `),

      // 11. Dead Numbers
      db.query(`
                SELECT 
                    (SELECT COUNT(*)::int FROM dead_numbers) AS total_dead_numbers,
                    (SELECT COALESCE(total_downloaded, 0)::int FROM dead_numbers_stats WHERE id = 1) AS total_dead_numbers_downloaded
            `),
      // 12. Van Data
      db.query(`
                SELECT 
                    COUNT(*)::int AS total_van_data,
                    COUNT(CASE WHEN status = 'available' THEN 1 END)::int AS total_van_available,
                    COUNT(CASE WHEN status = 'downloaded' THEN 1 END)::int AS total_van_downloaded
                FROM van_data
            `),

      // 13. Van Data per campaign
      db.query(`
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
            `),
            
      // 14. Separation Data Total Stats
      db.query(`
                SELECT 
                    COUNT(*)::int AS total_separation_data,
                    COUNT(CASE WHEN status = 'available' THEN 1 END)::int AS total_separation_available,
                    COUNT(CASE WHEN status = 'downloaded' THEN 1 END)::int AS total_separation_downloaded
                FROM separation_data
            `),

      // 15. Separation Data per campaign
      db.query(`
                SELECT
                    COALESCE(c.name, 'Untagged') AS name,
                    COUNT(*)::int AS count,
                    COUNT(CASE WHEN d.status = 'available' THEN 1 END)::int AS available_count,
                    COUNT(CASE WHEN d.status = 'downloaded' THEN 1 END)::int AS downloaded_count
                FROM separation_data d
                LEFT JOIN campaigns c ON d.campaign_id = c.campaign_id
                GROUP BY COALESCE(c.name, 'Untagged')
                ORDER BY count DESC
            `),
    ]);

    // Construct totals object
    const leadsStats = leadsStatsResult.rows[0];
    const otherStats = otherTotalsResult.rows[0];
    const refineStats = refineStatsResult.rows[0];
    const premiumStats = premiumStatsResult.rows[0];
    const deadNumbersStats = deadNumbersStatsResult.rows[0] || { total_dead_numbers: 0 };
    const vanStats = vanStatsResult.rows[0] || { total_van_data: 0 };
    const separationStats = separationStatsResult.rows[0] || { total_separation_data: 0 };
    
    const totals = {
      ...leadsStats,
      ...otherStats,
      ...refineStats,
      ...premiumStats,
      ...deadNumbersStats,
      ...vanStats,
      ...separationStats
    };

    // Construct lead status breakdown from leadsStats
    const leadStatusBreakdown = [
      { status: 'available', count: leadsStats.remaining_leads },
      { status: 'downloaded', count: leadsStats.total_downloaded }
    ];

    res.json({
      totals,
      vendorDistribution: vendorWiseResult.rows,
      campaignStats: campaignStatsResult.rows,
      dncStats: dncStatsResult.rows,
      leadStatusBreakdown,
      recentSessions: recentSessionsResult.rows,
      refineCampaignStats: refineCampaignStatsResult.rows,
      premiumCampaignStats: premiumCampaignStatsResult.rows,
      vanCampaignStats: vanCampaignStatsResult.rows,
      separationCampaignStats: separationCampaignStatsResult.rows,
    });
  } catch (err) {
    console.error("Dashboard Stats Error:", err);
    res
      .status(500)
      .json({ message: "Server error fetching stats", error: err.message });
  }
};

module.exports = { getStats };
