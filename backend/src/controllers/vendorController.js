const db = require("../config/db");
const { getUserCampaignAccess } = require("../utils/campaignAccess");

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
  const includeCounts = req.query.counts === "true";

  try {
    let query;
    const params = [];
    if (includeCounts) {
      const access = await getUserCampaignAccess(req.user, 'campaigns');
      let leadFilter = "";
      if (access.isRestricted) {
        if (access.campaignNamesLower.length === 0) {
          leadFilter = "WHERE 1=0";
        } else {
          leadFilter = `WHERE EXISTS (
            SELECT 1
            FROM unnest(string_to_array(COALESCE(l.campaign_type, ''), ',')) AS ct(v)
            WHERE LOWER(BTRIM(ct.v)) = ANY($1)
          )`;
          params.push(access.campaignNamesLower);
        }
      }

      query = `
        WITH filtered_leads AS (
            SELECT l.id, l.vendor_id, l.status, l.disposition, l.phone
            FROM leads l
            ${leadFilter}
        ),
        vendor_stats AS (
            SELECT fl.vendor_id,
                   COUNT(fl.id)::int as total_leads,
                   COUNT(CASE WHEN fl.status = 'available' AND COALESCE(fl.disposition, '') <> 'DNC' AND d.phone IS NULL THEN 1 END)::int as available_leads,
                   COUNT(CASE WHEN fl.status = 'downloaded' THEN 1 END)::int as downloaded_leads,
                   COUNT(CASE WHEN COALESCE(fl.disposition, '') = 'DNC' OR d.phone IS NOT NULL THEN 1 END)::int as dnc_leads
            FROM filtered_leads fl
            LEFT JOIN dnc_numbers d ON fl.phone = d.phone
            GROUP BY fl.vendor_id
        )
        SELECT v.*, 
               COALESCE(vs.total_leads, 0) as total_leads,
               COALESCE(vs.available_leads, 0) as available_leads,
               COALESCE(vs.downloaded_leads, 0) as downloaded_leads,
               COALESCE(vs.dnc_leads, 0) as dnc_leads
        FROM vendors v
        LEFT JOIN vendor_stats vs ON v.vendor_id = vs.vendor_id
        ORDER BY v.created_at DESC
      `;
    } else {
      query = `
                SELECT * FROM vendors 
                ORDER BY created_at DESC
            `;
    }

    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching vendors:", err);
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

// GET /api/vendors/:id/files
const getVendorFiles = async (req, res) => {
  const { id } = req.params;
  try {
    const access = await getUserCampaignAccess(req.user, 'campaigns');
    let query = `
      SELECT j.id, j.file_name, j.total_rows, j.created_at, j.status, s.campaign_type
      FROM upload_jobs j
      JOIN upload_sessions s ON j.session_id = s.id
      WHERE s.vendor_id = $1 AND j.status = 'Completed'
    `;
    const params = [id];
    if (access.isRestricted) {
      if (access.campaignNamesLower.length === 0) {
        return res.json([]);
      }
      query += ` AND EXISTS (
        SELECT 1
        FROM unnest(string_to_array(COALESCE(s.campaign_type, ''), ',')) AS ct(v)
        WHERE LOWER(BTRIM(ct.v)) = ANY($2)
      )`;
      params.push(access.campaignNamesLower);
    }
    query += ` ORDER BY j.created_at DESC`;

    const result = await db.query(query, params);
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