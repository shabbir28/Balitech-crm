const db = require("../config/db");

const createCampaign = async (req, res) => {
  const { name, description, status } = req.body;
  try {
    const result = await db.query(
      "INSERT INTO van_campaigns (name, description, status) VALUES ($1, $2, COALESCE($3,'Active')) RETURNING *",
      [name, description, status]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === "23505") return res.status(409).json({ message: "Campaign name already exists" });
    console.error("Error creating van campaign:", err);
    res.status(500).json({ message: "Server error" });
  }
};

const getCampaigns = async (req, res) => {
  try {
    let result;
    if (req.user && req.user.role === 'dialer_agent') {
        const accessible = req.user.accessible_campaigns || [];
        if (accessible.length === 0) {
            return res.json([]);
        }
        result = await db.query(
            `SELECT * FROM van_campaigns WHERE campaign_id = ANY($1::uuid[]) ORDER BY created_at DESC`,
            [accessible]
        );
    } else {
        result = await db.query(
            `SELECT * FROM van_campaigns ORDER BY created_at DESC`
        );
    }
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching van_campaigns:", err);
    res.status(500).json({ message: "Server error fetching van_campaigns" });
  }
};

const getCampaign = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await db.query("SELECT * FROM van_campaigns WHERE campaign_id=$1", [id]);
    if (result.rows.length === 0) return res.status(404).json({ message: "Campaign not found" });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

const updateCampaign = async (req, res) => {
  const { id } = req.params;
  const { name, description, status } = req.body;
  try {
    const result = await db.query(
      "UPDATE van_campaigns SET name=$1, description=$2, status=COALESCE($3,status) WHERE campaign_id=$4 RETURNING *",
      [name, description, status, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: "Campaign not found" });
    res.json(result.rows[0]);
  } catch (err) {
    if (err.code === "23505") return res.status(409).json({ message: "Campaign name already exists" });
    console.error("Error updating van campaign:", err);
    res.status(500).json({ message: "Server error" });
  }
};

const deleteCampaign = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await db.query("DELETE FROM van_campaigns WHERE campaign_id=$1 RETURNING *", [id]);
    if (result.rows.length === 0) return res.status(404).json({ message: "Campaign not found" });
    res.json({ message: "Campaign deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

module.exports = { createCampaign, getCampaigns, getCampaign, updateCampaign, deleteCampaign };
