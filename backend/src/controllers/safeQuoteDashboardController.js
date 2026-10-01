const db = require("../config/db");

const getStats = async (req, res) => {
  try {
    const [totalsRes, statusRes, campaignRes, vendorRes, recentSessionsRes] = await Promise.all([
      db.query(`
        SELECT
          (SELECT COUNT(*)::int FROM safe_quote_data) AS total_contacts,
          (SELECT COUNT(*)::int FROM safe_quote_data
            WHERE status = 'available'
              AND NOT EXISTS (SELECT 1 FROM safe_quote_dnc_numbers n WHERE n.phone = safe_quote_data.phone)
              AND NOT EXISTS (SELECT 1 FROM safe_quote_separation_data sep WHERE sep.phone = safe_quote_data.phone)
          ) AS remaining_leads,
          (SELECT COALESCE(SUM(quantity), 0)::int
            FROM safe_quote_download_logs
            WHERE COALESCE(csv_payload, '') !~ '"scrubPending"\\s*:\\s*true'
               OR COALESCE(csv_payload, '') ~ '"scrubCompleted"\\s*:\\s*true'
          ) AS total_downloaded,
          (SELECT COUNT(*)::int FROM safe_quote_data WHERE status = 'DNC') AS dnc_count,
          (SELECT COUNT(*)::int FROM safe_quote_dnc_numbers WHERE dnc_type = 'DNC') AS sq_dnc_count,
          (SELECT COUNT(*)::int FROM safe_quote_dnc_numbers WHERE dnc_type = 'SALE') AS sq_sale_count,
          (SELECT COUNT(*)::int FROM (
            SELECT phone FROM safe_quote_dnc_numbers WHERE dnc_type = 'SEPARATION'
            UNION
            SELECT phone FROM safe_quote_separation_data
          ) sep) AS sq_separation_count,
          (SELECT COUNT(*)::int FROM safe_quote_vendors) AS total_vendors,
          (SELECT COUNT(*)::int FROM safe_quote_vendors WHERE status = 'Active') AS active_vendors,
          (SELECT COUNT(*)::int FROM safe_quote_campaigns) AS total_campaigns,
          (SELECT COUNT(*)::int FROM safe_quote_campaigns WHERE status = 'Active') AS active_campaigns,
          (SELECT COUNT(*)::int FROM safe_quote_sessions) AS total_sessions,
          (SELECT COUNT(*)::int FROM safe_quote_jobs) AS total_jobs
      `),
      db.query(`
        SELECT COALESCE(NULLIF(TRIM(status), ''), 'unknown') AS status, COUNT(*)::int AS count
        FROM safe_quote_data
        GROUP BY 1
        ORDER BY count DESC
      `),
      db.query(`
        SELECT
          COALESCE(NULLIF(TRIM(s.campaign_type), ''), 'Untagged') AS name,
          COUNT(d.id)::int AS count,
          COUNT(d.id) FILTER (
            WHERE d.status = 'available'
              AND NOT EXISTS (SELECT 1 FROM safe_quote_dnc_numbers n WHERE n.phone = d.phone)
              AND NOT EXISTS (SELECT 1 FROM safe_quote_separation_data sep WHERE sep.phone = d.phone)
          )::int AS available_count,
          COUNT(d.id) FILTER (WHERE d.status = 'downloaded')::int AS downloaded_count,
          COUNT(d.id) FILTER (WHERE d.status = 'DNC')::int AS dnc_count,
          COUNT(d.id) FILTER (WHERE d.status = 'SALE')::int AS sale_count,
          COUNT(d.id) FILTER (WHERE d.status = 'SEPARATION')::int AS separation_count
        FROM safe_quote_data d
        LEFT JOIN safe_quote_sessions s ON d.session_id = s.id
        GROUP BY 1
        ORDER BY available_count DESC, count DESC
      `),
      db.query(`
        SELECT v.name,
          COUNT(d.id) FILTER (
            WHERE d.status = 'available'
              AND NOT EXISTS (SELECT 1 FROM safe_quote_dnc_numbers n WHERE n.phone = d.phone)
              AND NOT EXISTS (SELECT 1 FROM safe_quote_separation_data sep WHERE sep.phone = d.phone)
          )::int AS count
        FROM safe_quote_vendors v
        LEFT JOIN safe_quote_data d ON d.vendor_id = v.vendor_id
        GROUP BY v.vendor_id, v.name
        ORDER BY count DESC, v.name ASC
        LIMIT 12
      `),
      db.query(`
        SELECT s.id, s.created_at,
               COALESCE(v.name, 'Unknown vendor') AS vendor_name,
               COALESCE(c.name, NULLIF(TRIM(s.campaign_type), ''), 'No campaign') AS campaign_type,
               COUNT(j.id)::int AS job_count
        FROM safe_quote_sessions s
        LEFT JOIN safe_quote_vendors v ON s.vendor_id = v.vendor_id
        LEFT JOIN safe_quote_campaigns c ON
          c.campaign_id::text = s.campaign_type
          OR LOWER(c.name) = LOWER(s.campaign_type)
        LEFT JOIN safe_quote_jobs j ON j.session_id = s.id
        GROUP BY s.id, v.name, c.name
        ORDER BY s.created_at DESC
        LIMIT 8
      `),
    ]);

    const totals = totalsRes.rows[0] || {};

    res.json({
      totals,
      leadStatusBreakdown: statusRes.rows,
      campaignStats: campaignRes.rows,
      vendorDistribution: vendorRes.rows,
      recentSessions: recentSessionsRes.rows,
    });
  } catch (err) {
    console.error("Safe Quote Dashboard Stats Error:", err);
    res.status(500).json({ message: "Server error fetching Safe Quote dashboard stats", error: err.message });
  }
};

module.exports = { getStats };
