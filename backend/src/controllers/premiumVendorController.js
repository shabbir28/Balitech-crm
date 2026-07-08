const db = require("../config/db");

// POST /api/premium_vendors
const createVendor = async (req, res) => {
  const { name, company, email, phone, comment, status } = req.body;
  try {
    const result = await db.query(
      "INSERT INTO premium_vendors (name, company, email, phone, comment, status) VALUES ($1, $2, $3, $4, $5, COALESCE($6, 'Active')) RETURNING *",
      [name, company, email, phone, comment, status],
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("Error creating vendor:", err);
    res.status(500).json({ message: "Server error creating vendor" });
  }
};

// GET /api/premium_vendors
const getVendors = async (req, res) => {
  const includeCounts = req.query.counts === "true";

  try {
    let query;
    if (includeCounts) {
      query = `
        WITH vendor_stats AS (
            SELECT l.vendor_id,
                   COUNT(l.id)::int as total_leads,
                   COUNT(CASE WHEN l.status = 'available' AND COALESCE(l.disposition, '') <> 'DNC' AND d.phone IS NULL THEN 1 END)::int as available_leads,
                   COUNT(CASE WHEN l.status = 'downloaded' THEN 1 END)::int as downloaded_leads,
                   COUNT(CASE WHEN COALESCE(l.disposition, '') = 'DNC' OR d.phone IS NOT NULL THEN 1 END)::int as dnc_leads
            FROM premium_data l
            LEFT JOIN premium_dnc_numbers d ON l.phone = d.phone
            GROUP BY l.vendor_id
        )
        SELECT v.*, 
               COALESCE(vs.total_leads, 0) as total_leads,
               COALESCE(vs.available_leads, 0) as available_leads,
               COALESCE(vs.downloaded_leads, 0) as downloaded_leads,
               COALESCE(vs.dnc_leads, 0) as dnc_leads
        FROM premium_vendors v
        LEFT JOIN vendor_stats vs ON v.vendor_id = vs.vendor_id
        ORDER BY v.created_at DESC
      `;
    } else {
      query = `
                SELECT * FROM premium_vendors 
                ORDER BY created_at DESC
            `;
    }

    const result = await db.query(query);
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching premium_vendors:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// PUT /api/premium_vendors/:id
const updateVendor = async (req, res) => {
  const { id } = req.params;
  const { name, company, email, phone, comment, status } = req.body;
  try {
    const result = await db.query(
      `UPDATE premium_vendors 
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

// DELETE /api/premium_vendors/:id
const deleteVendor = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await db.query(
      "DELETE FROM premium_vendors WHERE vendor_id = $1 RETURNING *",
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

// GET /api/premium_vendors/:id/files
const getVendorFiles = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await db.query(
      `SELECT j.id, j.file_name, j.total_rows, j.created_at, j.status, s.campaign_type
       FROM premium_jobs j
       JOIN premium_sessions s ON j.session_id = s.id
       WHERE s.vendor_id = $1 AND j.status = 'Completed'
       ORDER BY j.created_at DESC`,
      [id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching vendor files:", err);
    res.status(500).json({ message: "Server error fetching vendor files" });
  }
};

module.exports = {
  createVendor,
  getVendors,
  updateVendor,
  deleteVendor,
  getVendorFiles,
};