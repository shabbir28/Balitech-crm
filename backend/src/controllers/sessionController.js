const db = require('../config/db');

const createSession = async (req, res) => {
    try {
        const { vendor_id, campaign_type } = req.body;
        
        if (!vendor_id || !campaign_type) {
            return res.status(400).json({ message: 'Vendor ID and Campaign Type are required' });
        }

        const validTypes = ['ACA', 'MEDICARE', 'MED ALERT', 'Final Expense'];
        if (!validTypes.includes(campaign_type)) {
            return res.status(400).json({ message: 'Invalid campaign type' });
        }

        const vendorCheck = await db.query('SELECT vendor_id FROM vendors WHERE vendor_id = $1', [vendor_id]);
        if (vendorCheck.rows.length === 0) {
            return res.status(404).json({ message: 'Vendor not found' });
        }

        const result = await db.query(`
            INSERT INTO upload_sessions (vendor_id, campaign_type)
            VALUES ($1, $2)
            RETURNING *
        `, [vendor_id, campaign_type]);

        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error('Create Session Error:', err);
        res.status(500).json({ message: 'Server error creating session' });
    }
};

const getSession = async (req, res) => {
    try {
        const { id } = req.params;

        const sessionResult = await db.query(`
            SELECT s.*, v.name as vendor_name, v.company as vendor_company
            FROM upload_sessions s
            JOIN vendors v ON s.vendor_id = v.vendor_id
            WHERE s.id = $1
        `, [id]);

        if (sessionResult.rows.length === 0) {
            return res.status(404).json({ message: 'Session not found' });
        }

        const jobsResult = await db.query(`
            SELECT * FROM upload_jobs
            WHERE session_id = $1
            ORDER BY created_at ASC
        `, [id]);

        const session = sessionResult.rows[0];
        session.jobs = jobsResult.rows;

        res.json(session);
    } catch (err) {
        console.error('Get Session Error:', err);
        res.status(500).json({ message: 'Server error fetching session' });
    }
};

module.exports = {
    createSession,
    getSession
};
