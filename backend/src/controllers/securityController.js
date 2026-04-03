const db = require('../config/db');

const getWhitelistedIPs = async (req, res) => {
    try {
        const { rows } = await db.query('SELECT * FROM ip_whitelist ORDER BY created_at DESC');
        res.json(rows);
    } catch (err) {
        console.error('Error fetching whitelisted IPs:', err);
        res.status(500).json({ error: 'Server error fetching IP whitelist' });
    }
};

const addWhitelistedIP = async (req, res) => {
    try {
        const { ip_address, description, is_whitelisted } = req.body;
        
        if (!ip_address) {
            return res.status(400).json({ error: 'IP address is required' });
        }

        const { rows } = await db.query(
            `INSERT INTO ip_whitelist (ip_address, description, is_whitelisted)
             VALUES ($1, $2, $3) RETURNING *`,
            [ip_address, description, is_whitelisted !== undefined ? is_whitelisted : true]
        );
        res.status(201).json(rows[0]);
    } catch (err) {
        if (err.code === '23505') { // unique violation
            return res.status(400).json({ error: 'IP address already exists in the whitelist' });
        }
        console.error('Error adding whitelisted IP:', err);
        res.status(500).json({ error: 'Server error adding IP' });
    }
};

const updateWhitelistedIP = async (req, res) => {
    try {
        const { id } = req.params;
        const { ip_address, description, is_whitelisted } = req.body;

        const { rows } = await db.query(
            `UPDATE ip_whitelist 
             SET ip_address = COALESCE($1, ip_address),
                 description = COALESCE($2, description),
                 is_whitelisted = COALESCE($3, is_whitelisted)
             WHERE id = $4 RETURNING *`,
            [ip_address, description, is_whitelisted, id]
        );

        if (rows.length === 0) {
            return res.status(404).json({ error: 'IP whitelist entry not found' });
        }
        res.json(rows[0]);
    } catch (err) {
        if (err.code === '23505') { // unique violation
            return res.status(400).json({ error: 'IP address already exists in the whitelist' });
        }
        console.error('Error updating whitelisted IP:', err);
        res.status(500).json({ error: 'Server error updating IP' });
    }
};

const deleteWhitelistedIP = async (req, res) => {
    try {
        const { id } = req.params;
        
        const { rowCount } = await db.query('DELETE FROM ip_whitelist WHERE id = $1', [id]);
        
        if (rowCount === 0) {
            return res.status(404).json({ error: 'IP whitelist entry not found' });
        }
        res.json({ message: 'IP whitelist entry deleted successfully' });
    } catch (err) {
        console.error('Error deleting whitelisted IP:', err);
        res.status(500).json({ error: 'Server error deleting IP' });
    }
};

module.exports = {
    getWhitelistedIPs,
    addWhitelistedIP,
    updateWhitelistedIP,
    deleteWhitelistedIP
};
