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
        WITH vendor_stats AS (
          SELECT d.vendor_id,
                 COUNT(d.id)::int as total_leads,
                 COUNT(CASE WHEN d.status = 'available' THEN 1 END)::int as available_leads,
                 COUNT(CASE WHEN d.status = 'downloaded' THEN 1 END)::int as downloaded_leads
          FROM van_data d
          GROUP BY d.vendor_id
        )
        SELECT v.*,
               COALESCE(vs.total_leads, 0) as total_leads,
               COALESCE(vs.available_leads, 0) as available_leads,
               COALESCE(vs.downloaded_leads, 0) as downloaded_leads
        FROM van_vendors v
        LEFT JOIN vendor_stats vs ON v.vendor_id = vs.vendor_id
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

module.exports = { createVendor, getVendors, updateVendor, deleteVendor };
