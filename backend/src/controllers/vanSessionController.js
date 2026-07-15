const db = require("../config/db");

const createSession = async (req, res) => {
  const { vendor_id, campaign_type } = req.body;
  try {
    if (!vendor_id) return res.status(400).json({ message: "vendor_id is required" });
    const result = await db.query(
      "INSERT INTO van_sessions (vendor_id, campaign_type) VALUES ($1, $2) RETURNING *",
      [vendor_id, campaign_type || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("Error creating van session:", err);
    res.status(500).json({ message: "Server error" });
  }
};

const getSessions = async (req, res) => {
  try {
    let { page = 1, limit = 20, search = '', from = '', to = '' } = req.query;
    page = parseInt(page);
    limit = parseInt(limit);
    const offset = (page - 1) * limit;

    let whereClause = "WHERE 1=1";
    let params = [];
    let paramCount = 1;

    if (search) {
      whereClause += ` AND (v.name ILIKE $${paramCount} OR v.company ILIKE $${paramCount} OR s.id::text ILIKE $${paramCount})`;
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

    const countRes = await db.query(`
      SELECT COUNT(DISTINCT s.id) as total
      FROM van_sessions s
      LEFT JOIN van_vendors v ON s.vendor_id = v.vendor_id
      ${whereClause}
    `, params);
    
    const total = parseInt(countRes.rows[0].total);

    const result = await db.query(`
      SELECT s.id, s.campaign_type, s.created_at, v.name as vendor_name,
             'System' as created_by_username,
             COUNT(j.id)::int as total_jobs,
             COUNT(*) FILTER (WHERE j.status = 'Processing')::int AS processing_jobs,
             COUNT(*) FILTER (WHERE j.status = 'Failed')::int AS failed_jobs,
             COUNT(*) FILTER (WHERE j.status = 'Completed')::int AS completed_jobs,
             COALESCE(SUM(j.total_rows), 0)::int AS total_rows,
             COALESCE(SUM(CASE WHEN j.status = 'Completed' THEN j.total_rows ELSE 0 END), 0)::int AS processed_rows,
             MAX(j.end_time) AS end_time,
             ARRAY_AGG(DISTINCT j.file_name) FILTER (WHERE j.file_name IS NOT NULL) AS uploaded_files,
             JSON_AGG(
               json_build_object(
                 'file_name',         j.file_name,
                 'file_size',         j.file_size,
                 'status',            j.status,
                 'total_rows',        j.total_rows,
                 'fresh_count',       j.fresh_count,
                 'existing_count',    j.existing_count,
                 'duplicates_in_file',j.duplicates_in_file,
                 'dnc_skipped',       j.dnc_skipped,
                 'inserted',          j.inserted
               )
             ) FILTER (WHERE j.file_name IS NOT NULL) AS jobs_data,
             CASE
               WHEN COUNT(j.id) = 0 THEN 'Pending'
               WHEN COUNT(*) FILTER (WHERE j.status = 'Processing') > 0 THEN 'Processing'
               WHEN COUNT(*) FILTER (WHERE j.status = 'Failed') > 0 THEN 'Failed'
               WHEN COUNT(*) FILTER (WHERE j.status = 'Completed') = COUNT(j.id) THEN 'Completed'
               ELSE 'Pending'
             END AS status
      FROM van_sessions s
      LEFT JOIN van_vendors v ON s.vendor_id = v.vendor_id
      LEFT JOIN van_jobs j ON j.session_id = s.id
      ${whereClause}
      GROUP BY s.id, v.name
      ORDER BY s.created_at DESC
      LIMIT $${paramCount} OFFSET $${paramCount + 1}
    `, [...params, limit, offset]);

    res.json({
      data: result.rows,
      total,
      page,
      limit
    });
  } catch (err) {
    console.error("Error fetching van_sessions:", err);
    res.status(500).json({ message: "Server error" });
  }
};

const getSession = async (req, res) => {
  const { id } = req.params;
  try {
    const sessionRes = await db.query(`
      SELECT s.*, v.name as vendor_name, v.company as vendor_company
      FROM van_sessions s
      LEFT JOIN van_vendors v ON s.vendor_id = v.vendor_id
      WHERE s.id = $1
    `, [id]);
    if (sessionRes.rows.length === 0) return res.status(404).json({ message: "Session not found" });

    const jobsRes = await db.query(
      "SELECT * FROM van_jobs WHERE session_id=$1 ORDER BY created_at DESC",
      [id]
    );
    res.json({ ...sessionRes.rows[0], jobs: jobsRes.rows });
  } catch (err) {
    console.error("Error fetching van session:", err);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = { createSession, getSessions, getSession };
