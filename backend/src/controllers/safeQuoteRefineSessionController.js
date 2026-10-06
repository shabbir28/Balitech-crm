const db = require("../config/db");

const createSession = async (req, res) => {
  const { vendor_id, campaign_type } = req.body;
  try {
    if (!vendor_id || !campaign_type) {
      return res.status(400).json({ message: "Vendor and campaign are required" });
    }

    const vendorCheck = await db.query(
      "SELECT vendor_id FROM safe_quote_vendors WHERE vendor_id = $1",
      [vendor_id]
    );
    if (vendorCheck.rows.length === 0) {
      return res.status(404).json({ message: "Safe Quote vendor not found" });
    }

    const campaignName = String(campaign_type).trim();
    const campaignCheck = await db.query(
      `SELECT name FROM safe_quote_campaigns
       WHERE status = 'Active'
         AND (name = $1 OR campaign_id::text = $1)
       LIMIT 1`,
      [campaignName]
    );
    if (campaignCheck.rows.length === 0) {
      return res.status(400).json({
        message: "Active Safe Quote campaign not found. Create it under Safe Quote Campaigns first.",
      });
    }

    const result = await db.query(
      `INSERT INTO safe_quote_refine_sessions (vendor_id, campaign_type, created_by)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [vendor_id, campaignCheck.rows[0].name, req.user?.id || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("Error creating safe quote refine session:", err);
    res.status(500).json({ message: "Server error" });
  }
};

const getSessions = async (req, res) => {
  try {
    let { page = 1, limit = 20, search = "", from = "", to = "" } = req.query;
    page = parseInt(page, 10) || 1;
    limit = parseInt(limit, 10) || 20;
    const offset = (page - 1) * limit;

    let whereClause = "WHERE 1=1";
    const params = [];
    let paramCount = 1;

    if (search) {
      whereClause += ` AND (v.name ILIKE $${paramCount} OR v.company ILIKE $${paramCount} OR s.id::text ILIKE $${paramCount} OR s.campaign_type ILIKE $${paramCount})`;
      params.push(`%${search}%`);
      paramCount++;
    }
    if (from) {
      whereClause += ` AND s.created_at >= $${paramCount}`;
      params.push(from);
      paramCount++;
    }
    if (to) {
      whereClause += ` AND s.created_at <= $${paramCount}`;
      params.push(to);
      paramCount++;
    }

    const countRes = await db.query(
      `SELECT COUNT(DISTINCT s.id) AS total
       FROM safe_quote_refine_sessions s
       LEFT JOIN safe_quote_vendors v ON s.vendor_id = v.vendor_id
       ${whereClause}`,
      params
    );
    const total = parseInt(countRes.rows[0].total, 10);

    const result = await db.query(
      `SELECT s.id, s.campaign_type, s.created_at, v.name AS vendor_name,
              COALESCE(u.username, 'System') AS created_by_username,
              COUNT(j.id)::int AS total_jobs,
              COUNT(*) FILTER (WHERE j.status = 'Processing')::int AS processing_jobs,
              COUNT(*) FILTER (WHERE j.status = 'Failed')::int AS failed_jobs,
              COUNT(*) FILTER (WHERE j.status = 'Completed')::int AS completed_jobs,
              COALESCE(SUM(j.total_rows), 0)::int AS total_rows,
              COALESCE(SUM(CASE WHEN j.status = 'Completed' THEN j.total_rows ELSE 0 END), 0)::int AS processed_rows,
              MAX(j.end_time) AS end_time,
              ARRAY_AGG(DISTINCT j.file_name) FILTER (WHERE j.file_name IS NOT NULL) AS uploaded_files,
              JSON_AGG(
                json_build_object(
                  'file_name', j.file_name,
                  'file_size', j.file_size,
                  'status', j.status,
                  'total_rows', j.total_rows,
                  'fresh_count', j.fresh_count,
                  'existing_count', j.existing_count,
                  'duplicates_in_file', j.duplicates_in_file,
                  'duration_skipped', j.duration_skipped,
                  'updated_count', j.updated_count,
                  'inserted', j.inserted
                )
              ) FILTER (WHERE j.file_name IS NOT NULL) AS jobs_data,
              CASE
                WHEN COUNT(j.id) = 0 THEN 'Pending'
                WHEN COUNT(*) FILTER (WHERE j.status = 'Processing') > 0 THEN 'Processing'
                WHEN COUNT(*) FILTER (WHERE j.status = 'Failed') > 0 THEN 'Failed'
                WHEN COUNT(*) FILTER (WHERE j.status = 'Completed') = COUNT(j.id) THEN 'Completed'
                ELSE 'Pending'
              END AS status
       FROM safe_quote_refine_sessions s
       LEFT JOIN safe_quote_vendors v ON s.vendor_id = v.vendor_id
       LEFT JOIN users u ON s.created_by = u.id
       LEFT JOIN safe_quote_refine_jobs j ON j.session_id = s.id
       ${whereClause}
       GROUP BY s.id, v.name, u.username
       ORDER BY s.created_at DESC
       LIMIT $${paramCount} OFFSET $${paramCount + 1}`,
      [...params, limit, offset]
    );

    res.json({ data: result.rows, total, page, limit });
  } catch (err) {
    console.error("Error fetching safe quote refine sessions:", err);
    res.status(500).json({ message: "Server error" });
  }
};

const getSession = async (req, res) => {
  const { id } = req.params;
  try {
    const sessionRes = await db.query(
      `SELECT s.*, v.name AS vendor_name, v.company AS vendor_company,
              COALESCE(u.username, 'System') AS created_by_username
       FROM safe_quote_refine_sessions s
       LEFT JOIN safe_quote_vendors v ON s.vendor_id = v.vendor_id
       LEFT JOIN users u ON s.created_by = u.id
       WHERE s.id = $1`,
      [id]
    );
    if (sessionRes.rows.length === 0) return res.status(404).json({ message: "Session not found" });

    const jobsRes = await db.query(
      "SELECT * FROM safe_quote_refine_jobs WHERE session_id = $1 ORDER BY created_at DESC",
      [id]
    );
    res.json({ ...sessionRes.rows[0], jobs: jobsRes.rows });
  } catch (err) {
    console.error("Error fetching safe quote refine session:", err);
    res.status(500).json({ message: "Server error" });
  }
};

const deleteSession = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await db.query(
      "DELETE FROM safe_quote_refine_sessions WHERE id = $1 RETURNING *",
      [id]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: "Session not found" });
    res.json({ message: "Session deleted successfully" });
  } catch (err) {
    console.error("Error deleting safe quote refine session:", err);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = { createSession, getSessions, getSession, deleteSession };
