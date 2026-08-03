const db = require("../config/db");

const createVendor = async (req, res) => {
  const { name, company, email, phone, comment, status } = req.body;
  try {
    const result = await db.query(
      "INSERT INTO van_vendors (name, company, email, phone, comment, status) VALUES ($1, $2, $3, $4, $5, COALESCE($6, 'Active')) RETURNING *",
      [name, company, email, phone, comment, status]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("Error creating van vendor:", err);
    res.status(500).json({ message: "Server error creating vendor" });
  }
};

const getVendors = async (req, res) => {
  const includeCounts = req.query.counts === "true";
  try {
    let query;
    if (includeCounts) {
      query = `
        SELECT
          v.*,
          COALESCE(vc.total_leads, 0)::bigint AS total_leads,
          COALESCE(vc.available_leads, 0)::bigint AS available_leads,
          COALESCE(vc.downloaded_leads, 0)::bigint AS downloaded_leads,
          vc.updated_at AS counts_updated_at
        FROM van_vendors v
        LEFT JOIN vendor_counts_cache vc
          ON vc.module = 'van'
         AND vc.vendor_id = v.vendor_id::text
        ORDER BY v.created_at DESC
      `;
    } else {
      query = "SELECT * FROM van_vendors ORDER BY created_at DESC";
    }

    const result = await db.query(query);
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching van_vendors:", err);
    res.status(500).json({ message: "Server error" });
  }
};

const updateVendor = async (req, res) => {
  const { id } = req.params;
  const { name, company, email, phone, comment, status } = req.body;
  try {
    const result = await db.query(
      `UPDATE van_vendors SET name=$1, company=$2, email=$3, phone=$4, comment=$5, status=COALESCE($6,status) WHERE vendor_id=$7 RETURNING *`,
      [name, company, email, phone, comment, status, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: "Vendor not found" });
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error updating van vendor:", err);
    res.status(500).json({ message: "Server error updating vendor" });
  }
};

const deleteVendor = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await db.query("DELETE FROM van_vendors WHERE vendor_id=$1 RETURNING *", [id]);
    if (result.rows.length === 0) return res.status(404).json({ message: "Vendor not found" });
    res.json({ message: "Vendor deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

const getVendorFiles = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await db.query(
      `SELECT j.id, j.file_name, j.created_at, j.total_rows, j.status
       FROM van_jobs j
       JOIN van_sessions s ON j.session_id = s.id
       WHERE s.vendor_id = $1
       ORDER BY j.created_at DESC`,
      [id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching vendor files:", err);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = { createVendor, getVendors, updateVendor, deleteVendor, getVendorFiles };
