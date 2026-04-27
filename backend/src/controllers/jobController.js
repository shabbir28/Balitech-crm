const db = require('../config/db');
const { processFileBuffer } = require('../utils/fileProcessor');
const { parsePhone } = require('../utils/phoneParser');

const chunkArray = (arr, size) => {
    if (!Array.isArray(arr) || arr.length === 0) return [];
    const out = [];
    for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
    return out;
};

const dedupeAndNormalizeRecords = (records) => {
    // Deduplicate within the file by normalized phone.
    const deduped = new Map(); // phone -> record
    for (const record of records) {
        const { phone, countryCode, areaCode } = parsePhone(record.phone);
        if (!phone) continue;
        deduped.set(phone, {
            ...record,
            phone,
            countryCode,
            areaCode,
        });
    }
    return Array.from(deduped.values());
};

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
        let dncSkippedDnc = 0;
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
                    if (row.dnc_type === 'DNC') dncSkippedDnc += 1;
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
                dnc_skipped_dnc: dncSkippedDnc,
                dnc_skipped_sale: dncSkippedSale,
                duplicates_skipped: validRecords.length - insertedCount - updatedCount - dncSkipped
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

const compareJob = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        const { session_id } = req.body;
        if (!session_id) {
            return res.status(400).json({ message: 'Session ID is required' });
        }

        const sessionCheck = await db.query('SELECT id FROM upload_sessions WHERE id = $1', [session_id]);
        if (sessionCheck.rows.length === 0) {
            return res.status(404).json({ message: 'Session not found' });
        }

        const records = await processFileBuffer(req.file.buffer, req.file.mimetype, req.file.originalname);

        // Match existing behavior: allow rows where at least one of these has data.
        const validRecords = records.filter(r => r.name || r.phone || r.email);
        if (validRecords.length === 0) {
            return res.status(400).json({ message: 'No valid records found in file (all empty or invalid format)' });
        }

        const uniqueRecords = dedupeAndNormalizeRecords(validRecords);
        const uniquePhones = uniqueRecords.map(r => r.phone);

        if (uniquePhones.length === 0) {
            return res.status(400).json({ message: 'No valid phone numbers found in file' });
        }

        // 1) DNC classification
        const dncSet = new Set();
        let dncSkippedDnc = 0;
        let dncSkippedSale = 0;

        for (const chunk of chunkArray(uniquePhones, 5000)) {
            const dncRes = await db.query(
                "SELECT phone, dnc_type FROM dnc_numbers WHERE phone = ANY($1::text[])",
                [chunk]
            );

            for (const row of dncRes.rows) {
                // dnc_numbers.phone is UNIQUE, so these counts are accurate per phone.
                dncSet.add(row.phone);
                if (row.dnc_type === 'DNC') dncSkippedDnc += 1;
                if (row.dnc_type === 'SALE') dncSkippedSale += 1;
            }
        }

        const dncSkipped = dncSet.size;

        // 2) Existing leads classification (only for non-DNC numbers)
        const phonesNotDnc = uniquePhones.filter(p => !dncSet.has(p));
        const existingSet = new Set();

        const existingBreakdown = {};
        for (const chunk of chunkArray(phonesNotDnc, 5000)) {
            const existingRes = await db.query(
                "SELECT phone, COALESCE(campaign_type, 'Unknown Campaign') as vendor_name FROM leads WHERE phone = ANY($1::text[])",
                [chunk]
            );

            for (const row of existingRes.rows) {
                if (!existingSet.has(row.phone)) {
                    existingSet.add(row.phone);
                    const vName = row.vendor_name || 'Unknown Campaign';
                    existingBreakdown[vName] = (existingBreakdown[vName] || 0) + 1;
                }
            }
        }

        const existingCount = existingSet.size;
        const freshCount = phonesNotDnc.length - existingCount;

        const duplicatesInFile = validRecords.length - uniqueRecords.length;

        const freshSet = new Set();
        for (const p of phonesNotDnc) {
            if (!existingSet.has(p)) freshSet.add(p);
        }

        const freshSample = uniqueRecords
            .filter(r => freshSet.has(r.phone))
            .slice(0, 25)
            .map(r => ({
                phone: r.phone,
                name: r.name || null,
                disposition: r.disposition || null,
            }));

        return res.json({
            message: 'Compare completed',
            total_processed: validRecords.length,
            total_unique_phones: uniqueRecords.length,
            duplicates_in_file: duplicatesInFile,
            fresh_count: freshCount,
            existing_count: existingCount,
            dnc_skipped: dncSkipped,
            dnc_skipped_dnc: dncSkippedDnc,
            dnc_skipped_sale: dncSkippedSale,
            fresh_sample: freshSample,
            existing_breakdown: existingBreakdown,
        });
    } catch (err) {
        console.error('Compare Job Error:', err);
        return res.status(500).json({
            message: 'Server error during compare',
            error: err.message,
        });
    }
};

const uploadFreshJob = async (req, res) => {
    let job = null;
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        const { session_id } = req.body;
        if (!session_id) {
            return res.status(400).json({ message: 'Session ID is required' });
        }

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
        `, [
            session_id,
            req.file.originalname,
            req.file.size,
            req.file.mimetype === 'text/csv' ? 'CSV' : 'Excel'
        ]);
        job = jobResult.rows[0];

        const records = await processFileBuffer(req.file.buffer, req.file.mimetype, req.file.originalname);
        const validRecords = records.filter(r => r.name || r.phone || r.email);

        if (validRecords.length === 0) {
            await db.query(`
                UPDATE upload_jobs
                SET status = 'Failed',
                    error_message = 'No valid records found',
                    end_time = CURRENT_TIMESTAMP
                WHERE id = $1
            `, [job.id]);
            return res.status(400).json({ message: 'No valid records found in file (all empty or invalid format)' });
        }

        const uniqueRecords = dedupeAndNormalizeRecords(validRecords);
        if (uniqueRecords.length === 0) {
            await db.query(`
                UPDATE upload_jobs
                SET status = 'Failed',
                    error_message = 'No valid phone numbers found in file',
                    end_time = CURRENT_TIMESTAMP
                WHERE id = $1
            `, [job.id]);
            return res.status(400).json({ message: 'No valid phone numbers found in file' });
        }

        const uniquePhones = uniqueRecords.map(r => r.phone);
        const duplicatesInFile = validRecords.length - uniqueRecords.length;

        const BATCH_SIZE = 1000;
        const client = await db.getClient();

        let insertedCount = 0;
        let dncSkippedDnc = 0;
        let dncSkippedSale = 0;
        const dncSet = new Set();
        const existingSet = new Set();

        try {
            await client.query('BEGIN');

            // DNC lookup (chunked to avoid very large params)
            for (const chunk of chunkArray(uniquePhones, 5000)) {
                const dncRes = await client.query(
                    "SELECT phone, dnc_type FROM dnc_numbers WHERE phone = ANY($1::text[])",
                    [chunk]
                );

                for (const row of dncRes.rows) {
                    dncSet.add(row.phone);
                    if (row.dnc_type === 'DNC') dncSkippedDnc += 1;
                    if (row.dnc_type === 'SALE') dncSkippedSale += 1;
                }
            }

            const dncSkipped = dncSet.size;
            const phonesNotDnc = uniquePhones.filter(p => !dncSet.has(p));

            const existingBreakdown = {};
            // Existing leads lookup (only for non-DNC phones)
            for (const chunk of chunkArray(phonesNotDnc, 5000)) {
                const existingRes = await client.query(
                    "SELECT phone, COALESCE(campaign_type, 'Unknown Campaign') as vendor_name FROM leads WHERE phone = ANY($1::text[])",
                    [chunk]
                );

                for (const row of existingRes.rows) {
                    if (!existingSet.has(row.phone)) {
                        existingSet.add(row.phone);
                        const vName = row.vendor_name || 'Unknown Campaign';
                        existingBreakdown[vName] = (existingBreakdown[vName] || 0) + 1;
                    }
                }
            }

            const existingCount = existingSet.size;
            const freshCount = phonesNotDnc.length - existingCount;

            const freshPhonesSet = new Set();
            for (const p of phonesNotDnc) {
                if (!existingSet.has(p)) freshPhonesSet.add(p);
            }

            const freshRecords = uniqueRecords.filter(r => freshPhonesSet.has(r.phone));

            // Insert only fresh records. Use DO NOTHING to avoid race-condition conflicts.
            for (let i = 0; i < freshRecords.length; i += BATCH_SIZE) {
                const batch = freshRecords.slice(i, i + BATCH_SIZE);
                const valueStrings = [];
                const values = [];
                let paramIndex = 1;

                for (const record of batch) {
                    valueStrings.push(`($${paramIndex}, $${paramIndex + 1}, $${paramIndex + 2}, $${paramIndex + 3}, $${paramIndex + 4}, $${paramIndex + 5}, $${paramIndex + 6}, $${paramIndex + 7})`);
                    values.push(
                        record.name || null,
                        record.phone,
                        record.email || null,
                        record.countryCode,
                        record.areaCode,
                        session.vendor_id,
                        record.disposition || null,
                        session.campaign_type
                    );
                    paramIndex += 8;
                }

                const query = `
                    INSERT INTO leads (name, phone, email, country_code, area_code, vendor_id, disposition, campaign_type)
                    VALUES ${valueStrings.join(',')}
                    ON CONFLICT (phone) DO NOTHING
                    RETURNING phone
                `;

                const result = await client.query(query, values);
                insertedCount += result.rows.length;
            }

            await client.query('COMMIT');

            await db.query(`
                UPDATE upload_jobs
                SET status = 'Completed',
                    total_rows          = $1,
                    end_time            = CURRENT_TIMESTAMP,
                    fresh_count         = $3,
                    existing_count      = $4,
                    duplicates_in_file  = $5,
                    dnc_skipped         = $6,
                    dnc_skipped_dnc     = $7,
                    dnc_skipped_sale    = $8,
                    inserted            = $9,
                    updated             = 0
                WHERE id = $2
            `, [
                validRecords.length,
                job.id,
                freshCount,
                existingCount,
                duplicatesInFile,
                dncSet.size,
                dncSkippedDnc,
                dncSkippedSale,
                insertedCount,
            ]);

            return res.json({
                message: 'Fresh upload completed',
                total_processed: validRecords.length,
                total_unique_phones: uniqueRecords.length,
                duplicates_in_file: duplicatesInFile,
                fresh_count: freshCount,
                existing_count: existingCount,
                dnc_skipped: dncSkipped,
                dnc_skipped_dnc: dncSkippedDnc,
                dnc_skipped_sale: dncSkippedSale,
                inserted: insertedCount,
                updated: 0,
                duplicates_skipped: freshCount - insertedCount,
                existing_breakdown: existingBreakdown,
            });
        } catch (err) {
            console.error('Inner Fresh Upload Error:', err);
            await client.query('ROLLBACK');
            await db.query(
                `UPDATE upload_jobs SET status = 'Failed', error_message = $1, end_time = CURRENT_TIMESTAMP WHERE id = $2`,
                [err.message, job.id]
            );
            return res.status(500).json({ message: 'Server error during fresh upload', error: err.message });
        } finally {
            client.release();
        }
    } catch (err) {
        console.error('Fresh Upload Error (Full Stack):', err);
        if (job?.id) {
            await db.query(
                `UPDATE upload_jobs SET status = 'Failed', error_message = $1, end_time = CURRENT_TIMESTAMP WHERE id = $2`,
                [err.message, job.id]
            ).catch(() => {});
        }
        return res.status(500).json({ message: 'Server error during fresh upload', error: err.message });
    }
};

module.exports = {
    createJob,
    compareJob,
    uploadFreshJob,
};
