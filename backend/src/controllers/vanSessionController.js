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
    const result = await db.query(`
      SELECT s.*, v.name as vendor_name,
             COUNT(j.id)::int as job_count,
             COALESCE(SUM(j.total_rows),0)::int as total_rows
      FROM van_sessions s
      LEFT JOIN van_vendors v ON s.vendor_id = v.vendor_id
      LEFT JOIN van_jobs j ON j.session_id = s.id
      GROUP BY s.id, v.name
      ORDER BY s.created_at DESC
    `);
    res.json(result.rows);
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
