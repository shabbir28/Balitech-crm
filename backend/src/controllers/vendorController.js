const db = require("../config/db");

// POST /api/vendors
const createVendor = async (req, res) => {
  const { name, company, email, phone, comment, status } = req.body;
  try {
    const result = await db.query(
      "INSERT INTO vendors (name, company, email, phone, comment, status) VALUES ($1, $2, $3, $4, $5, COALESCE($6, 'Active')) RETURNING *",
      [name, company, email, phone, comment, status],
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("Error creating vendor:", err);
    res.status(500).json({ message: "Server error creating vendor" });
  }
};

// GET /api/vendors
const getVendors = async (req, res) => {
  try {
    const result = await db.query(`
            SELECT v.*, 
                   COUNT(l.id) as total_leads,
                   COUNT(CASE WHEN l.status = 'available' THEN 1 END) as available_leads,
                   COUNT(CASE WHEN l.status = 'downloaded' THEN 1 END) as downloaded_leads
            FROM vendors v
            LEFT JOIN leads l ON v.vendor_id = l.vendor_id
            GROUP BY v.vendor_id
            ORDER BY v.created_at DESC
        `);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// PUT /api/vendors/:id
const updateVendor = async (req, res) => {
  const { id } = req.params;
  const { name, company, email, phone, comment, status } = req.body;
  try {
    const result = await db.query(
      `UPDATE vendors 
             SET name = $1, company = $2, email = $3, phone = $4, comment = $5, status = COALESCE($6, status) 
             WHERE vendor_id = $7 RETURNING *`,
      [name, company, email, phone, comment, status, id],
    );
    if (result.rows.length === 0)
      return res.status(404).json({ message: "Vendor not found" });
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error updating vendor:", err);
    res.status(500).json({ message: "Server error updating vendor" });
  }
};

// DELETE /api/vendors/:id
const deleteVendor = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await db.query(
      "DELETE FROM vendors WHERE vendor_id = $1 RETURNING *",
      [id],
    );
    if (result.rows.length === 0)
      return res.status(404).json({ message: "Vendor not found" });
    res.json({ message: "Vendor deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = {
  createVendor,
  getVendors,
  updateVendor,
  deleteVendor,
};
