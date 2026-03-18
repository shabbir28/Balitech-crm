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
        console.log('--- CREATE JOB START ---');
        console.log('Session ID:', session_id);
        
        // Fetch session to get vendor_id
        const sessionCheck = await db.query('SELECT * FROM upload_sessions WHERE id = $1', [session_id]);
        if (sessionCheck.rows.length === 0) {
            console.log('Session not found');
            return res.status(404).json({ message: 'Session not found' });
        }
        const session = sessionCheck.rows[0];
        console.log('Session Vendor ID:', session.vendor_id);

        // Create initial job record
        console.log('Inserting into upload_jobs...');
        const jobResult = await db.query(`
            INSERT INTO upload_jobs (session_id, file_name, file_size, import_type, start_time, status)
            VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, 'Processing')
            RETURNING *
        `, [session_id, req.file.originalname, req.file.size, req.file.mimetype === 'text/csv' ? 'CSV' : 'Excel']);
        const job = jobResult.rows[0];
        console.log('Job created with ID:', job.id);

        // Process file
        console.log('Starting file processing...', req.file.mimetype);
        const records = await processFileBuffer(req.file.buffer, req.file.mimetype, req.file.originalname);
        console.log('File processing complete, records:', records.length);
        
        // Remove empty rows specifically
        const validRecords = records.filter(r => r.name || r.phone || r.email);

        if (validRecords.length === 0) {
            console.log('No valid records found in file');
            await db.query(`UPDATE upload_jobs SET status = 'Failed', error_message = 'No valid records found', end_time = CURRENT_TIMESTAMP WHERE id = $1`, [job.id]);
            return res.status(400).json({ message: 'No valid records found in file (all empty or invalid format)' });
        }

        console.log('Starting DB transaction for', validRecords.length, 'records');
        const client = await db.getClient();
        let insertedCount = 0;
        let updatedCount = 0;
        let duplicateCount = 0;
        let dncSkipped = 0;
        let dncSkippedBla = 0;
        let dncSkippedSale = 0;

        try {
            await client.query('BEGIN');

            const BATCH_SIZE = 1000;
            for (let i = 0; i < validRecords.length; i += BATCH_SIZE) {
                const batch = validRecords.slice(i, i + BATCH_SIZE);
                
                const valueStrings = [];
                const values = [];
                let paramIndex = 1;

                // De-dupe within a single INSERT statement, otherwise Postgres throws:
                // "ON CONFLICT DO UPDATE command cannot affect row a second time"
                const deduped = new Map(); // phone -> record
                batch.forEach((record) => {
                    const { phone, countryCode, areaCode } = parsePhone(record.phone);
                    
                    if (!phone) return; // Skip invalid phones

                    deduped.set(phone, {
                      ...record,
                      phone,
                      countryCode,
                      areaCode,
                    });
                });

                const uniqueRecords = Array.from(deduped.values());
                const uniquePhones = uniqueRecords.map((r) => r.phone);

                // Skip DNC numbers
                if (uniquePhones.length > 0) {
                  const dncRes = await client.query(
                    "SELECT phone, dnc_type FROM dnc_numbers WHERE phone = ANY($1::text[])",
                    [uniquePhones],
                  );
                  const dncSet = new Set(dncRes.rows.map((r) => r.phone));
                  for (const row of dncRes.rows) {
                    if (row.dnc_type === 'BLA') dncSkippedBla += 1;
                    if (row.dnc_type === 'SALE') dncSkippedSale += 1;
                  }

                  const filtered = uniqueRecords.filter((r) => !dncSet.has(r.phone));
                  dncSkipped += uniqueRecords.length - filtered.length;

                  filtered.forEach(record => {

                    valueStrings.push(`($${paramIndex}, $${paramIndex+1}, $${paramIndex+2}, $${paramIndex+3}, $${paramIndex+4}, $${paramIndex+5}, $${paramIndex+6})`);
                    values.push(
                        record.name || null,
                        record.phone,
                        record.email || null,
                        record.countryCode,
                        record.areaCode,
                        session.vendor_id,
                        record.disposition || null
                    );
                    paramIndex += 7;
                  });
                }

                if (values.length > 0) {
                    const query = `
                        INSERT INTO leads (name, phone, email, country_code, area_code, vendor_id, disposition)
                        VALUES ${valueStrings.join(',')}
                        ON CONFLICT (phone) DO UPDATE
                        SET disposition = CASE
                          WHEN EXCLUDED.disposition IS NOT NULL AND EXCLUDED.disposition <> '' THEN EXCLUDED.disposition
                          ELSE leads.disposition
                        END
                        RETURNING (xmax = 0) AS inserted
                    `;
                    const result = await client.query(query, values);
                    const insertedInBatch = result.rows.reduce(
                      (acc, r) => acc + (r.inserted ? 1 : 0),
                      0
                    );
                    insertedCount += insertedInBatch;
                    updatedCount += result.rowCount - insertedInBatch;

                    const attempted = valueStrings.length;
                    duplicateCount += (attempted - result.rowCount);
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
                updated: updatedCount,
                dnc_skipped: dncSkipped,
                dnc_skipped_bla: dncSkippedBla,
                dnc_skipped_sale: dncSkippedSale,
                duplicates_skipped: duplicateCount
            });

        } catch (err) {
            console.error('Inner Job Processing Error:', err);
            await client.query('ROLLBACK');
            await db.query(`UPDATE upload_jobs SET status = 'Failed', error_message = $1, end_time = CURRENT_TIMESTAMP WHERE id = $2`, [err.message, job.id]);
            throw err;
        } finally {
            client.release();
        }

    } catch (err) {
        console.error('Job Create Error (Full Stack):', err);
        res.status(500).json({ 
            message: 'Server error during job processing', 
            error: err.message,
            stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
        });
    }
};

module.exports = {
    createJob
};
