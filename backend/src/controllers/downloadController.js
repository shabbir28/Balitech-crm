const db = require('../config/db');
const { Parser } = require('json2csv');
const { areaCodesMap } = require('../utils/areaCodes');

// POST /api/leads/download
const downloadLeads = async (req, res) => {
    const client = await db.getClient();
    try {
        const { vendor_id, quantity, states, campaign_id } = req.body;
        
        if (!quantity || quantity <= 0) {
            return res.status(400).json({ message: 'Valid quantity is required' });
        }

        await client.query('BEGIN');

        // Build the dynamic WHERE clause
        const filters = ["status = 'available'"];
        const params = [];
        let paramIdx = 1;

        if (vendor_id) {
            filters.push(`vendor_id = $${paramIdx++}`);
            params.push(vendor_id);
        }

        if (campaign_id) {
            const campRes = await client.query('SELECT name FROM campaigns WHERE campaign_id = $1', [campaign_id]);
            if (campRes.rows.length > 0) {
                const cName = campRes.rows[0].name;
                filters.push(`(campaign = $${paramIdx} OR campaign_type = $${paramIdx + 1})`);
                params.push(campaign_id, cName);
                paramIdx += 2;
            } else {
                filters.push(`1 = 0`);
            }
        }

        if (states && Array.isArray(states) && states.length > 0) {
            const matchingCodes = [];
            for (const [code, state] of Object.entries(areaCodesMap)) {
                if (states.includes(state)) {
                    matchingCodes.push(code);
                }
            }
            if (matchingCodes.length > 0) {
                const placeholders = matchingCodes.map(() => `$${paramIdx++}`).join(',');
                filters.push(`area_code IN (${placeholders})`);
                params.push(...matchingCodes);
            } else {
                filters.push(`1 = 0`);
            }
        }

        const whereClause = filters.join(' AND ');
        
        // Use CTE to safely lock and update rows concurrently
        // LIMIT applied inside the CTE
        const updateQuery = `
            WITH selected_leads AS (
                SELECT id 
                FROM leads 
                WHERE ${whereClause} 
                  AND NOT EXISTS (
                    SELECT 1 FROM dnc_numbers d
                    WHERE d.phone = leads.phone
                  )
                ORDER BY uploaded_at ASC
                FOR UPDATE SKIP LOCKED
                LIMIT $${paramIdx}
            )
            UPDATE leads l
            SET status = 'downloaded', downloaded_at = CURRENT_TIMESTAMP
            FROM selected_leads sl
            WHERE l.id = sl.id
            RETURNING l.name, l.phone, l.email, l.country_code, l.area_code, l.disposition
        `;

        params.push(quantity);

        const result = await client.query(updateQuery, params);

        if (result.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ message: 'No available leads found matching criteria' });
        }

        // Log the download
        const logQuery = `
            INSERT INTO download_logs (user_id, vendor_id, country_code, area_code, quantity)
            VALUES ($1, $2, $3, $4, $5)
        `;
        await client.query(logQuery, [
            req.user.id,
            vendor_id || null,
            null, // Removed country code
            null, // Removed area code
            result.rows.length
        ]);

        await client.query('COMMIT');

        // Generate CSV
        const fields = ['name', 'phone', 'email', 'country_code', 'area_code', 'disposition'];
        const json2csvParser = new Parser({ fields });
        const csv = json2csvParser.parse(result.rows);

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="leads_download_${Date.now()}.csv"`);
        
        res.status(200).send(csv);

    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Download Error:', err);
        res.status(500).json({ message: 'Server error processing download' });
    } finally {
        client.release();
    }
};

// GET /api/download/logs
const getDownloadLogs = async (req, res) => {
    try {
        const result = await db.query(`
            SELECT dl.*, u.username, v.name as vendor_name 
            FROM download_logs dl
            LEFT JOIN users u ON dl.user_id = u.id
            LEFT JOIN vendors v ON dl.vendor_id = v.vendor_id
            ORDER BY dl.download_date DESC
            LIMIT 100
        `);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};

module.exports = {
    downloadLeads,
    getDownloadLogs
};
