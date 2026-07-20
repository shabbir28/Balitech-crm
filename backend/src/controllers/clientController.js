const db = require('../config/db');

exports.addClient = async (req, res) => {
    try {
        const { name, did, campaign_id } = req.body;
        const userId = req.user.id; // From authMiddleware

        if (!name) {
            return res.status(400).json({ message: 'Name is required' });
        }

        const result = await db.query(
            `INSERT INTO clients (name, did, campaign_id, created_by) 
             VALUES ($1, $2, $3, $4) 
             RETURNING *`,
            [name, did || null, campaign_id || null, userId]
        );

        res.status(201).json({ message: 'Client added successfully', client: result.rows[0] });
    } catch (error) {
        console.error('Error adding client:', error);
        res.status(500).json({ message: 'Error adding client', error: error.message });
    }
};

exports.getClients = async (req, res) => {
    try {
        const result = await db.query(
            `SELECT c.*, u.username as created_by_name, camp.name as campaign_name
             FROM clients c 
             LEFT JOIN users u ON c.created_by = u.id
             LEFT JOIN campaigns camp ON c.campaign_id = camp.campaign_id
             ORDER BY c.created_at DESC`
        );
        res.status(200).json({ clients: result.rows });
    } catch (error) {
        console.error('Error fetching clients:', error);
        res.status(500).json({ message: 'Error fetching clients', error: error.message });
    }
};

exports.updateClient = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, did, campaign_id } = req.body;

        if (!name) {
            return res.status(400).json({ message: 'Name is required' });
        }

        const result = await db.query(
            `UPDATE clients
             SET name = $1, did = $2, campaign_id = $3
             WHERE id = $4
             RETURNING *`,
            [name, did || null, campaign_id || null, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Client not found' });
        }

        res.status(200).json({ message: 'Client updated successfully', client: result.rows[0] });
    } catch (error) {
        console.error('Error updating client:', error);
        res.status(500).json({ message: 'Error updating client', error: error.message });
    }
};

exports.deleteClient = async (req, res) => {
    try {
        const { id } = req.params;

        const result = await db.query(
            `DELETE FROM clients WHERE id = $1 RETURNING *`,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Client not found' });
        }

        res.status(200).json({ message: 'Client deleted successfully' });
    } catch (error) {
        console.error('Error deleting client:', error);
        res.status(500).json({ message: 'Error deleting client', error: error.message });
    }
};
