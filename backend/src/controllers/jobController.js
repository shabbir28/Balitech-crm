const db = require('../config/db');
const { processFileBuffer } = require('../utils/fileProcessor');
const { parsePhone } = require('../utils/phoneParser');

const createJob = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }
        
        const { session_id } = req.body;
        if (!session_id) {
            return res.status(400).json({ message: 'Session ID is required' });
        }

        // Fetch session to get vendor_id
        const sessionCheck = await db.query('SELECT * FROM upload_sessions WHERE id = $1', [session_id]);
        if (sessionCheck.rows.length === 0) {
            return res.status(404).json({ message: 'Session not found' });
        }
        const session = sessionCheck.rows[0];

        // Create initial job record
        const jobResult = await db.query(`
            INSERT INTO upload_jobs (session_id, file_name, file_size, import_type, start_time, status)
            VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, 'Processing')
            RETURNING *
        `, [session_id, req.file.originalname, req.file.size, req.file.mimetype === 'text/csv' ? 'CSV' : 'Excel']);
        const job = jobResult.rows[0];

        // Process file
        // The processFileBuffer automatically removes fully empty rows. 
        // We will pass the buffer to it.
        const records = await processFileBuffer(req.file.buffer, req.file.mimetype, req.file.originalname);
        
        // Remove empty rows specifically (though fileProcessor does this, we double check as requested)
        const validRecords = records.filter(r => r.name || r.phone || r.email);

        if (validRecords.length === 0) {
            await db.query(`UPDATE upload_jobs SET status = 'Failed', error_message = 'No valid records found', end_time = CURRENT_TIMESTAMP WHERE id = $1`, [job.id]);
            return res.status(400).json({ message: 'No valid records found in file (all empty or invalid format)' });
        }

        const client = await db.getClient();
        let insertedCount = 0;
        let duplicateCount = 0;

        try {
            await client.query('BEGIN');

            const BATCH_SIZE = 1000;
            for (let i = 0; i < validRecords.length; i += BATCH_SIZE) {
                const batch = validRecords.slice(i, i + BATCH_SIZE);
                
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
                        session.vendor_id
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
                    duplicateCount += (batch.length - result.rowCount);
                }
            }

            await client.query('COMMIT');

            // Update job status
            await db.query(`
                UPDATE upload_jobs 
                SET status = 'Completed', total_rows = $1, end_time = CURRENT_TIMESTAMP 
                WHERE id = $2
            `, [validRecords.length, job.id]);
            
            res.json({
                message: 'Job processed successfully',
                total_processed: validRecords.length,
                inserted: insertedCount,
                duplicates_skipped: duplicateCount
            });

        } catch (err) {
            await client.query('ROLLBACK');
            await db.query(`UPDATE upload_jobs SET status = 'Failed', error_message = $1, end_time = CURRENT_TIMESTAMP WHERE id = $2`, [err.message, job.id]);
            throw err;
        } finally {
            client.release();
        }

    } catch (err) {
        console.error('Job Create Error:', err);
        res.status(500).json({ message: 'Server error during job processing' });
    }
};

module.exports = {
    createJob
};
