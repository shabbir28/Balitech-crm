const db = require('../config/db');
const path = require('path');
const fs = require('fs');

// POST /api/campaigns
const createCampaign = async (req, res) => {
    const { name, start_date, comments, status } = req.body;
    const attachment_url = req.file ? `/uploads/campaigns/${req.file.filename}` : null;
    const attachment_name = req.file ? req.file.originalname : null;

    if (!name) {
        return res.status(400).json({ message: 'Campaign name is required' });
    }

    try {
        const result = await db.query(
            `INSERT INTO campaigns (name, start_date, comments, attachment_url, attachment_name, status)
             VALUES ($1, $2, $3, $4, $5, COALESCE($6, 'Active')) RETURNING *`,
            [name, start_date || null, comments || null, attachment_url, attachment_name, status]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error('Error creating campaign:', err);
        res.status(500).json({ message: 'Server error creating campaign' });
    }
};

// GET /api/campaigns
const getCampaigns = async (req, res) => {
    try {
        const result = await db.query(
            `SELECT * FROM campaigns ORDER BY created_at DESC`
        );
        res.json(result.rows);
    } catch (err) {
        console.error('Error fetching campaigns:', err);
        res.status(500).json({ message: 'Server error fetching campaigns' });
    }
};

// GET /api/campaigns/:id
const getCampaignById = async (req, res) => {
    const { id } = req.params;
    try {
        const result = await db.query(
            `SELECT * FROM campaigns WHERE campaign_id = $1`,
            [id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Campaign not found' });
        }
        res.json(result.rows[0]);
    } catch (err) {
        console.error('Error fetching campaign:', err);
        res.status(500).json({ message: 'Server error fetching campaign' });
    }
};

// PUT /api/campaigns/:id
const updateCampaign = async (req, res) => {
    const { id } = req.params;
    const { name, start_date, comments, status } = req.body;

    try {
        // If a new file was uploaded, delete the old one
        let attachment_url = undefined;
        let attachment_name = undefined;

        if (req.file) {
            attachment_url = `/uploads/campaigns/${req.file.filename}`;
            attachment_name = req.file.originalname;

            // Get old file and delete it
            const old = await db.query(`SELECT attachment_url FROM campaigns WHERE campaign_id = $1`, [id]);
            if (old.rows[0]?.attachment_url) {
                const oldPath = path.join(__dirname, '../../', old.rows[0].attachment_url);
                if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
            }
        }

        const result = await db.query(
            `UPDATE campaigns 
             SET name = COALESCE($1, name),
                 start_date = COALESCE($2, start_date),
                 comments = COALESCE($3, comments),
                 attachment_url = COALESCE($4, attachment_url),
                 attachment_name = COALESCE($5, attachment_name),
                 status = COALESCE($6, status),
                 updated_at = CURRENT_TIMESTAMP
             WHERE campaign_id = $7 RETURNING *`,
            [name, start_date || null, comments || null, attachment_url || null, attachment_name || null, status, id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Campaign not found' });
        }
        res.json(result.rows[0]);
    } catch (err) {
        console.error('Error updating campaign:', err);
        res.status(500).json({ message: 'Server error updating campaign' });
    }
};

// DELETE /api/campaigns/:id
const deleteCampaign = async (req, res) => {
    const { id } = req.params;
    try {
        // Delete attachment file if exists
        const old = await db.query(`SELECT attachment_url FROM campaigns WHERE campaign_id = $1`, [id]);
        if (old.rows[0]?.attachment_url) {
            const oldPath = path.join(__dirname, '../../', old.rows[0].attachment_url);
            if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
        }

        const result = await db.query(
            `DELETE FROM campaigns WHERE campaign_id = $1 RETURNING *`,
            [id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Campaign not found' });
        }
        res.json({ message: 'Campaign deleted successfully' });
    } catch (err) {
        console.error('Error deleting campaign:', err);
        res.status(500).json({ message: 'Server error deleting campaign' });
    }
};

module.exports = {
    createCampaign,
    getCampaigns,
    getCampaignById,
    updateCampaign,
    deleteCampaign
};
