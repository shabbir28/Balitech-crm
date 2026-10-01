const db = require("../config/db");
const { getUserCampaignAccess } = require("../utils/campaignAccess");

const createVendor = async (req, res) => {
  const { name, company, email, phone, comment, status } = req.body;
  try {
    const result = await db.query(
      "INSERT INTO safe_quote_vendors (name, company, email, phone, comment, status) VALUES ($1, $2, $3, $4, $5, COALESCE($6, 'Active')) RETURNING *",
      [name, company, email, phone, comment, status]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("Error creating safe_quote vendor:", err);
    res.status(500).json({ message: "Server error creating vendor" });
  }
};

const getVendors = async (req, res) => {
  const includeCounts = req.query.counts === "true";
  const campaignId = req.query.campaign_id;
  const onlyWithData = req.query.only_with_data === "true";
  try {
    let query;
    if (includeCounts) {
      const access = await getUserCampaignAccess(req.user, 'safe_quote_campaigns');

      if (campaignId && campaignId !== "all") {
        const campRes = await db.query(
          "SELECT campaign_id, name FROM safe_quote_campaigns WHERE campaign_id::text = $1 OR LOWER(name) = LOWER($1)",
          [campaignId]
        );
        if (campRes.rows.length === 0) {
          return res.json([]);
        }
        const cId = String(campRes.rows[0].campaign_id);
        const cName = campRes.rows[0].name.toLowerCase();
        if (access.isRestricted && !access.campaignNamesLower.includes(cName) && !access.rawCampaignIds.includes(cId)) {
          return res.json([]);
        }

        query = `
          WITH filtered_leads AS (
            SELECT d.id, d.vendor_id, d.status
            FROM safe_quote_data d
            JOIN safe_quote_sessions s ON d.session_id = s.id
            LEFT JOIN safe_quote_campaigns vc ON vc.campaign_id::text = s.campaign_type::text
            WHERE vc.campaign_id::text = $1
               OR s.campaign_type::text = $1
               OR LOWER(BTRIM(COALESCE(vc.name, ''))) = $2
               OR LOWER(BTRIM(COALESCE(s.campaign_type, ''))) = $2
          ),
          vendor_stats AS (
            SELECT fl.vendor_id,
                   COUNT(fl.id)::bigint AS total_leads,
                   COUNT(CASE WHEN fl.status = 'available' THEN 1 END)::bigint AS available_leads,
                   COUNT(CASE WHEN fl.status = 'DNC' THEN 1 END)::bigint AS dnc_leads
            FROM filtered_leads fl
            GROUP BY fl.vendor_id
          ),
          vendor_downloads AS (
            SELECT vendor_id::text AS vendor_id,
                   COALESCE(SUM(quantity), 0)::bigint AS downloaded_leads
            FROM safe_quote_download_logs
            WHERE COALESCE(csv_payload, '') !~ '"scrubPending"\\s*:\\s*true'
               OR COALESCE(csv_payload, '') ~ '"scrubCompleted"\\s*:\\s*true'
            GROUP BY vendor_id
          )
          SELECT v.*,
                 COALESCE(vs.total_leads, 0)::bigint AS total_leads,
                 COALESCE(vs.available_leads, 0)::bigint AS available_leads,
                 COALESCE(vd.downloaded_leads, 0)::bigint AS downloaded_leads,
                 COALESCE(vs.dnc_leads, 0)::bigint AS dnc_leads
          FROM safe_quote_vendors v
          ${onlyWithData ? "INNER JOIN" : "LEFT JOIN"} vendor_stats vs ON v.vendor_id::text = vs.vendor_id::text
          LEFT JOIN vendor_downloads vd ON vd.vendor_id = v.vendor_id::text
          ${onlyWithData ? "WHERE vs.total_leads > 0" : ""}
          ORDER BY v.created_at DESC
        `;
        const result = await db.query(query, [cId, cName]);
        return res.json(result.rows);
      }

      if (access.isRestricted) {
        if (access.campaignNamesLower.length === 0 && (!access.rawCampaignIds || access.rawCampaignIds.length === 0)) {
          query = `
            SELECT v.*, 0::bigint AS total_leads, 0::bigint AS available_leads, 0::bigint AS downloaded_leads
            FROM safe_quote_vendors v
            ORDER BY v.created_at DESC
          `;
          const result = await db.query(query);
          return res.json(result.rows);
        }
        query = `
          WITH filtered_leads AS (
            SELECT d.id, d.vendor_id, d.status
            FROM safe_quote_data d
            JOIN safe_quote_sessions s ON d.session_id = s.id
            LEFT JOIN safe_quote_campaigns vc ON vc.campaign_id::text = s.campaign_type::text
            WHERE LOWER(BTRIM(COALESCE(vc.name, s.campaign_type))) = ANY($1)
               OR vc.campaign_id::text = ANY($2)
               OR s.campaign_type::text = ANY($2)
          ),
          vendor_stats AS (
            SELECT fl.vendor_id,
                   COUNT(fl.id)::bigint AS total_leads,
                   COUNT(CASE WHEN fl.status = 'available' THEN 1 END)::bigint AS available_leads,
                   COUNT(CASE WHEN fl.status = 'DNC' THEN 1 END)::bigint AS dnc_leads
            FROM filtered_leads fl
            GROUP BY fl.vendor_id
          ),
          vendor_downloads AS (
            SELECT vendor_id::text AS vendor_id,
                   COALESCE(SUM(quantity), 0)::bigint AS downloaded_leads
            FROM safe_quote_download_logs
            WHERE COALESCE(csv_payload, '') !~ '"scrubPending"\\s*:\\s*true'
               OR COALESCE(csv_payload, '') ~ '"scrubCompleted"\\s*:\\s*true'
            GROUP BY vendor_id
          )
          SELECT v.*,
                 COALESCE(vs.total_leads, 0)::bigint AS total_leads,
                 COALESCE(vs.available_leads, 0)::bigint AS available_leads,
                 COALESCE(vd.downloaded_leads, 0)::bigint AS downloaded_leads,
                 COALESCE(vs.dnc_leads, 0)::bigint AS dnc_leads
          FROM safe_quote_vendors v
          ${onlyWithData ? "INNER JOIN" : "LEFT JOIN"} vendor_stats vs ON v.vendor_id::text = vs.vendor_id::text
          LEFT JOIN vendor_downloads vd ON vd.vendor_id = v.vendor_id::text
          ${onlyWithData ? "WHERE vs.total_leads > 0" : ""}
          ORDER BY v.created_at DESC
        `;
        const result = await db.query(query, [access.campaignNamesLower, access.rawCampaignIds || []]);
        return res.json(result.rows);
      }

      query = `
        SELECT
          v.*,
          COALESCE(ls.total_leads, 0)::bigint AS total_leads,
          COALESCE(ls.available_leads, 0)::bigint AS available_leads,
          COALESCE(vd.downloaded_leads, 0)::bigint AS downloaded_leads,
          COALESCE(ls.dnc_leads, 0)::bigint AS dnc_leads
        FROM safe_quote_vendors v
        LEFT JOIN (
          SELECT vendor_id,
                 COUNT(*)::bigint AS total_leads,
                 COUNT(*) FILTER (WHERE status = 'available')::bigint AS available_leads,
                 COUNT(*) FILTER (WHERE status = 'DNC')::bigint AS dnc_leads
          FROM safe_quote_data
          GROUP BY vendor_id
        ) ls ON ls.vendor_id = v.vendor_id
        LEFT JOIN (
          SELECT vendor_id,
                 COALESCE(SUM(quantity), 0)::bigint AS downloaded_leads
          FROM safe_quote_download_logs
          WHERE COALESCE(csv_payload, '') !~ '"scrubPending"\\s*:\\s*true'
             OR COALESCE(csv_payload, '') ~ '"scrubCompleted"\\s*:\\s*true'
          GROUP BY vendor_id
        ) vd ON vd.vendor_id = v.vendor_id
        ORDER BY v.created_at DESC
      `;
    } else {
      query = "SELECT * FROM safe_quote_vendors ORDER BY created_at DESC";
    }

    const result = await db.query(query);
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching safe_quote_vendors:", err);
    res.status(500).json({ message: "Server error" });
  }
};

const updateVendor = async (req, res) => {
  const { id } = req.params;
  const { name, company, email, phone, comment, status } = req.body;
  try {
    const result = await db.query(
      `UPDATE safe_quote_vendors SET name=$1, company=$2, email=$3, phone=$4, comment=$5, status=COALESCE($6,status) WHERE vendor_id=$7 RETURNING *`,
      [name, company, email, phone, comment, status, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: "Vendor not found" });
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error updating safe_quote vendor:", err);
    res.status(500).json({ message: "Server error updating vendor" });
  }
};

const deleteVendor = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await db.query("DELETE FROM safe_quote_vendors WHERE vendor_id=$1 RETURNING *", [id]);
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
    const access = await getUserCampaignAccess(req.user, 'safe_quote_campaigns');
    let query = `
      SELECT j.id, j.file_name, j.created_at, j.total_rows, j.status, s.campaign_type
      FROM safe_quote_jobs j
      JOIN safe_quote_sessions s ON j.session_id = s.id
      WHERE s.vendor_id = $1
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
    console.error("Error fetching safe_quote vendor files:", err);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = { createVendor, getVendors, updateVendor, deleteVendor, getVendorFiles };
