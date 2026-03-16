const db = require('../config/db');
const { processFileBuffer } = require('../utils/fileProcessor');
const { parsePhone } = require('../utils/phoneParser');

// POST /api/leads/upload
const uploadLeads = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }
        
        const { vendor_id } = req.body;
        if (!vendor_id) {
            return res.status(400).json({ message: 'Vendor ID is required' });
        }

        // Check if vendor exists
        const vendorCheck = await db.query('SELECT vendor_id FROM vendors WHERE vendor_id = $1', [vendor_id]);
        if (vendorCheck.rows.length === 0) {
            return res.status(404).json({ message: 'Vendor not found' });
        }

        // Process file
        const records = await processFileBuffer(req.file.buffer, req.file.mimetype, req.file.originalname);
        
        if (records.length === 0) {
            return res.status(400).json({ message: 'No valid records found in file' });
        }

        const client = await db.getClient();
        let insertedCount = 0;
        let duplicateCount = 0;

        try {
            await client.query('BEGIN');

            // Bulk insert strategy. For millions of rows, we'd use pg-copy-streams.
            // For standard chunked uploads, batching parameterization works well.
            // BATCH_SIZE = 1000 to avoid query parameter limit (65535)
            const BATCH_SIZE = 1000;
            
            for (let i = 0; i < records.length; i += BATCH_SIZE) {
                const batch = records.slice(i, i + BATCH_SIZE);
                
                const valueStrings = [];
                const values = [];
                let paramIndex = 1;

                batch.forEach(record => {
                    const { phone, countryCode, areaCode } = parsePhone(record.phone);
                    
                    if (!phone) return; // Skip invalid phones

                    valueStrings.push(`($${paramIndex}, $${paramIndex+1}, $${paramIndex+2}, $${paramIndex+3}, $${paramIndex+4}, $${paramIndex+5})`);
                    values.push(
                        record.name || null,
                        phone,
                        record.email || null,
                        countryCode,
                        areaCode,
                        vendor_id
                    );
                    paramIndex += 6;
                });

                if (values.length > 0) {
                    const query = `
                        INSERT INTO leads (name, phone, email, country_code, area_code, vendor_id)
                        VALUES ${valueStrings.join(',')}
                        ON CONFLICT (phone) DO NOTHING
                        RETURNING id
                    `;
                    const result = await client.query(query, values);
                    insertedCount += result.rowCount;
                    // Duplicates = total attempted minus actually inserted
                    duplicateCount += (batch.length - result.rowCount);
                }
            }

            await client.query('COMMIT');
            
            res.json({
                message: 'Upload processed successfully',
                total_processed: records.length,
                inserted: insertedCount,
                duplicates_skipped: duplicateCount
            });

        } catch (err) {
            await client.query('ROLLBACK');
            throw err;
        } finally {
            client.release();
        }

    } catch (err) {
        console.error('Upload Error:', err);
        res.status(500).json({ message: 'Server error during upload processing' });
    }
};

// GET /api/leads
const getLeads = async (req, res) => {
    try {
        const { page = 1, limit = 50, vendor_id, status } = req.query;
        const offset = (page - 1) * limit;

        let query = 'SELECT * FROM leads WHERE 1=1';
        const params = [];

        if (vendor_id) {
            params.push(vendor_id);
            query += ` AND vendor_id = $${params.length}`;
        }
        if (status) {
            params.push(status);
            query += ` AND status = $${params.length}`;
        }

        const countQuery = query.replace('SELECT *', 'SELECT COUNT(*)');
        
        query += ` ORDER BY uploaded_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
        
        const [leadsResult, countResult] = await Promise.all([
            db.query(query, [...params, limit, offset]),
            db.query(countQuery, params)
        ]);

        res.json({
            data: leadsResult.rows,
            total: parseInt(countResult.rows[0].count),
            page: parseInt(page),
            limit: parseInt(limit)
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};

module.exports = {
    uploadLeads,
    getLeads
};
