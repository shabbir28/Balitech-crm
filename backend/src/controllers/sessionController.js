const db = require("../config/db");

const createSession = async (req, res) => {
  try {
    const { vendor_id, campaign_type } = req.body;

    if (!vendor_id || !campaign_type) {
      return res
        .status(400)
        .json({ message: "Vendor ID and Campaign Type are required" });
    }

    const vendorCheck = await db.query(
      "SELECT vendor_id FROM vendors WHERE vendor_id = $1",
      [vendor_id],
    );
    if (vendorCheck.rows.length === 0) {
      return res.status(404).json({ message: "Vendor not found" });
    }

    const result = await db.query(
      `
            INSERT INTO upload_sessions (vendor_id, campaign_type, created_by)
            VALUES ($1, $2, $3)
            RETURNING *
        `,
      [vendor_id, campaign_type, req.user?.id || null],
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("Create Session Error:", err);
    res.status(500).json({ message: "Server error creating session" });
  }
};

const getSession = async (req, res) => {
  try {
    const { id } = req.params;

    const sessionResult = await db.query(
      `
            SELECT s.*, v.name as vendor_name, v.company as vendor_company, u.username as created_by_username
            FROM upload_sessions s
            JOIN vendors v ON s.vendor_id = v.vendor_id
            LEFT JOIN users u ON s.created_by = u.id
            WHERE s.id = $1
        `,
      [id],
    );

    if (sessionResult.rows.length === 0) {
      return res.status(404).json({ message: "Session not found" });
    }

    const jobsResult = await db.query(
      `
            SELECT * FROM upload_jobs
            WHERE session_id = $1
            ORDER BY created_at ASC
        `,
      [id],
    );

    const session = sessionResult.rows[0];
    session.jobs = jobsResult.rows;

    res.json(session);
  } catch (err) {
    console.error("Get Session Error:", err);
    res.status(500).json({ message: "Server error fetching session" });
  }
};

// GET /api/sessions
// Returns paginated list for "Session List" screen
const listSessions = async (req, res) => {
  try {
    const { page = 1, limit = 20, search, status, from, to } = req.query;
    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 20;
    const offset = (pageNum - 1) * limitNum;

    const params = [];
    let where = "WHERE 1=1";

    if (search) {
      params.push(`%${search}%`);
      where += ` AND (
        s.id::text ILIKE $${params.length}
        OR v.name ILIKE $${params.length}
        OR s.campaign_type ILIKE $${params.length}
      )`;
    }

    // Optional date range filters (on session created_at)
    if (from) {
      params.push(from);
      where += ` AND s.created_at >= $${params.length}::timestamptz`;
    }
    if (to) {
      params.push(to);
      where += ` AND s.created_at <= $${params.length}::timestamptz`;
    }

    const statusFilter = status && status !== "All" ? String(status) : null;
    const statusWhere = statusFilter
      ? `WHERE t.status = $${params.length + 1}`
      : "";

    const dataQuery = `
      WITH t AS (
        SELECT
          s.id,
          s.campaign_type,
          s.created_at,
          v.name AS vendor_name,
          u.username AS created_by_username,
          COUNT(j.id) AS total_jobs,
          COUNT(*) FILTER (WHERE j.status = 'Processing') AS processing_jobs,
          COUNT(*) FILTER (WHERE j.status = 'Failed') AS failed_jobs,
          COUNT(*) FILTER (WHERE j.status = 'Completed') AS completed_jobs,
          COALESCE(SUM(j.total_rows), 0) AS total_rows,
          COALESCE(SUM(CASE WHEN j.status = 'Completed' THEN j.total_rows ELSE 0 END), 0) AS processed_rows,
          MAX(j.end_time) AS end_time,
          ARRAY_AGG(DISTINCT j.file_name) FILTER (WHERE j.file_name IS NOT NULL) AS uploaded_files,
          CASE
            WHEN COUNT(j.id) = 0 THEN 'Pending'
            WHEN COUNT(*) FILTER (WHERE j.status = 'Processing') > 0 THEN 'Processing'
            WHEN COUNT(*) FILTER (WHERE j.status = 'Failed') > 0 THEN 'Failed'
            WHEN COUNT(*) FILTER (WHERE j.status = 'Completed') = COUNT(j.id) THEN 'Completed'
            ELSE 'Pending'
          END AS status
        FROM upload_sessions s
        JOIN vendors v ON s.vendor_id = v.vendor_id
        LEFT JOIN users u ON s.created_by = u.id
        LEFT JOIN upload_jobs j ON j.session_id = s.id
        ${where}
        GROUP BY s.id, v.name, u.username
      )
      SELECT *
      FROM t
      ${statusWhere}
      ORDER BY created_at DESC
      LIMIT $${params.length + (statusFilter ? 2 : 1)}
      OFFSET $${params.length + (statusFilter ? 3 : 2)};
    `;

    const countQuery = `
      SELECT COUNT(*) AS count
      FROM upload_sessions s
      JOIN vendors v ON s.vendor_id = v.vendor_id
      ${where};
    `;

    const dataParams = statusFilter
      ? [...params, statusFilter, limitNum, offset]
      : [...params, limitNum, offset];

    const [dataResult, countResult] = await Promise.all([
      db.query(dataQuery, dataParams),
      db.query(countQuery, params),
    ]);

    res.json({
      data: dataResult.rows,
      total: parseInt(countResult.rows[0].count, 10),
      page: pageNum,
      limit: limitNum,
    });
  } catch (err) {
    console.error("List Sessions Error:", err);
    res.status(500).json({ message: "Server error fetching sessions" });
  }
};

// DELETE /api/sessions/:id
const deleteSession = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await db.query(
      "DELETE FROM upload_sessions WHERE id = $1 RETURNING id",
      [id],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Session not found" });
    }

    res.json({ message: "Session deleted", id: result.rows[0].id });
  } catch (err) {
    console.error("Delete Session Error:", err);
    res.status(500).json({ message: "Server error deleting session" });
  }
};

module.exports = {
  createSession,
  getSession,
  listSessions,
  deleteSession,
};
