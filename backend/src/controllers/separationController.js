const db = require('../config/db');
const { scrubPhones, normalizePhone } = require('../utils/blacklistAlliance');
const { areaCodesMap } = require('../utils/areaCodes');
const { processFileBuffer } = require("../utils/fileProcessor");
const { cleanupFile } = require("../middleware/upload");
const { lookupDncPhones, lookupDeadPhones } = require("../utils/dbHelpers");

const sepCleanPhoneForChecks = (phone) => {
    const clean = typeof normalizePhone === 'function'
        ? normalizePhone(phone)
        : String(phone || '').replace(/\D/g, '');

    if (!clean) return '';
    if (clean.length === 11 && clean.startsWith('1')) return clean.substring(1);
    return clean;
};

const sepUpsertDeadNumbersFromBla = async (badItems) => {
    if (!Array.isArray(badItems) || badItems.length === 0) return;

    const phones = [...new Set(
        badItems
            .map(item => sepCleanPhoneForChecks(item.phone))
            .filter(Boolean)
    )];

    const BATCH = 3000;

    for (let i = 0; i < phones.length; i += BATCH) {
        const chunk = phones.slice(i, i + BATCH);
        const values = [];
        const placeholders = [];
        let idx = 1;

        for (const phone of chunk) {
            placeholders.push(`($${idx++}, $${idx++})`);
            values.push(phone, 'Separation Download BLA Scrub');
        }

        if (placeholders.length === 0) continue;

        await db.query(
            `
            INSERT INTO dead_numbers (phone, source)
            VALUES ${placeholders.join(',')}
            ON CONFLICT (phone) DO NOTHING
            `,
            values
        );
    }
};

const sepAreaCodeFromPhone = (phone) => {
    const clean = String(phone || '').replace(/\D/g, '');
    if (clean.length >= 11 && clean.startsWith('1')) return clean.substring(1, 4);
    if (clean.length >= 10) return clean.substring(0, 3);
    return '';
};

const sepAttachLocation = (row) => {
    const area_code = row.area_code || sepAreaCodeFromPhone(row.phone);
    return {
        ...row,
        area_code,
        state: area_code ? (areaCodesMap[area_code] || 'Unknown') : 'Unknown',
    };
};

const sepNormalizeList = (value) => {
    if (!value) return [];
    const arr = Array.isArray(value) ? value : String(value).split(',');
    return arr.map(v => String(v || '').trim()).filter(Boolean);
};

const sepAreaCodeSql = (alias = 'sd') => `
    CASE
      WHEN LENGTH(REGEXP_REPLACE(${alias}.phone, '[^0-9]', '', 'g')) >= 11
           AND REGEXP_REPLACE(${alias}.phone, '[^0-9]', '', 'g') LIKE '1%'
        THEN SUBSTRING(REGEXP_REPLACE(${alias}.phone, '[^0-9]', '', 'g') FROM 2 FOR 3)
      WHEN LENGTH(REGEXP_REPLACE(${alias}.phone, '[^0-9]', '', 'g')) >= 10
        THEN SUBSTRING(REGEXP_REPLACE(${alias}.phone, '[^0-9]', '', 'g') FROM 1 FOR 3)
      ELSE NULL
    END
`;

const sepAreaCodesForFilter = ({ state, states, area_code, area_codes }) => {
    const manualCodes = [
        ...sepNormalizeList(area_code),
        ...sepNormalizeList(area_codes),
    ]
        .map(v => v.replace(/\D/g, ''))
        .filter(v => v.length === 3);

    if (manualCodes.length > 0) return [...new Set(manualCodes)];

    const selectedStates = [
        ...sepNormalizeList(state),
        ...sepNormalizeList(states),
    ]
        .map(v => v.toUpperCase())
        .filter(v => v && v !== 'ALL');

    if (selectedStates.length === 0) return [];

    return [...new Set(
        Object.entries(areaCodesMap)
            .filter(([, st]) => selectedStates.includes(String(st || '').toUpperCase()))
            .map(([code]) => code)
    )];
};

const sepAppendLocationFilter = (query, params, filters, alias = 'sd') => {
    const areaCodes = sepAreaCodesForFilter(filters);
    if (areaCodes.length > 0) {
        params.push(areaCodes);
        query += ` AND (${sepAreaCodeSql(alias)}) = ANY($${params.length}::text[])`;
    }
    return query;
};

exports.createSession = async (req, res) => {
    try {
        const { campaign_id, client_id } = req.body;
        const userId = req.user.id;

        if (!campaign_id || !client_id) {
            return res.status(400).json({ message: 'Campaign and Client are required' });
        }

        const result = await db.query(
            `INSERT INTO separation_sessions (campaign_id, client_id, created_by) 
             VALUES ($1, $2, $3) 
             RETURNING *`,
            [campaign_id, client_id, userId]
        );

        res.status(201).json({ message: 'Session created successfully', session: result.rows[0] });
    } catch (error) {
        console.error('Error creating separation session:', error);
        res.status(500).json({ message: 'Error creating session', error: error.message });
    }
};

exports.getSessions = async (req, res) => {
    try {
        const result = await db.query(
            `SELECT s.*, c.name as campaign_name, cl.name as client_name, u.username as created_by_name
             FROM separation_sessions s
             LEFT JOIN campaigns c ON s.campaign_id = c.campaign_id
             LEFT JOIN clients cl ON s.client_id = cl.id
             LEFT JOIN users u ON s.created_by = u.id
             ORDER BY s.created_at DESC`
        );
        res.status(200).json({ sessions: result.rows });
    } catch (error) {
        console.error('Error fetching separation sessions:', error);
        res.status(500).json({ message: 'Error fetching sessions', error: error.message });
    }
};

exports.uploadFile = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: "No file uploaded" });
        }

        const { session_id } = req.body;
        if (!session_id) {
            return res.status(400).json({ message: "Session ID is required" });
        }

        const sessionCheck = await db.query(
            "SELECT * FROM separation_sessions WHERE id = $1",
            [session_id]
        );
        if (sessionCheck.rows.length === 0) {
            return res.status(404).json({ message: "Session not found" });
        }
        const session = sessionCheck.rows[0];

        // Create initial job record
        const importType = req.file.originalname.toLowerCase().endsWith(".csv")
            ? "CSV"
            : req.file.originalname.toLowerCase().endsWith(".txt") ? "TXT" : "Excel";

        const jobResult = await db.query(
            `INSERT INTO separation_jobs (session_id, file_name, file_size, import_type, start_time, status)
             VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, 'Processing')
             RETURNING *`,
            [session_id, req.file.originalname.substring(0, 255), req.file.size, importType]
        );
        const job = jobResult.rows[0];

        // Background processing
        res.status(202).json({
            message: "Upload accepted — processing in background",
            job_id: job.id,
            status: "Processing",
        });

        setImmediate(async () => {
            try {
                const records = await processFileBuffer(
                    req.file.path,
                    req.file.mimetype,
                    req.file.originalname
                );
                const validRecords = records
                    .map(r => ({ ...r, phone: normalizePhone(r.phone) }))
                    .filter(r => r.phone && r.phone.length === 10);
                cleanupFile(req.file.path);

                if (validRecords.length === 0) {
                    await db.query(
                        `UPDATE separation_jobs SET status = 'Failed', error_message = 'No valid phone records found', end_time = CURRENT_TIMESTAMP WHERE id = $1`,
                        [job.id]
                    );
                    return;
                }

                let inserted = 0;
                const BATCH_SIZE = 1000;

                for (let i = 0; i < validRecords.length; i += BATCH_SIZE) {
                    const chunk = validRecords.slice(i, i + BATCH_SIZE);
                    const values = [];
                    const placeholders = [];
                    let paramIdx = 1;

                    for (const r of chunk) {
                        placeholders.push(`($${paramIdx++}, $${paramIdx++}, $${paramIdx++}, $${paramIdx++}, $${paramIdx++}, $${paramIdx++})`);
                        values.push(r.name || null, r.phone, r.email || null, session.client_id, session.campaign_id, job.id);
                    }

                    try {
                        const res = await db.query(
                            `INSERT INTO separation_data (name, phone, email, client_id, campaign_id, job_id)
                             VALUES ${placeholders.join(', ')}
                             ON CONFLICT (phone, campaign_id) DO NOTHING`,
                            values
                        );
                        if (res.rowCount > 0) {
                            inserted += res.rowCount;
                        }
                    } catch (e) {
                        console.error("Separation Batch Insert Error:", e.message);
                    }
                }

                await db.query(
                    `UPDATE separation_jobs
                     SET status = 'Completed', total_rows = $1, inserted = $2, end_time = CURRENT_TIMESTAMP
                     WHERE id = $3`,
                    [validRecords.length, inserted, job.id]
                );
            } catch (err) {
                console.error("Separation Upload Error:", err);
                await db.query(
                    `UPDATE separation_jobs SET status = 'Failed', error_message = $1, end_time = CURRENT_TIMESTAMP WHERE id = $2`,
                    [err.message, job.id]
                );
            }
        });

    } catch (err) {
        console.error("Separation Upload Route Error:", err);
        if (!res.headersSent) {
            res.status(500).json({ message: "Server error", error: err.message });
        }
    }
};

exports.getJobStatus = async (req, res) => {
    try {
        const { jobId } = req.params;
        const result = await db.query(
            `SELECT * FROM separation_jobs WHERE id = $1`,
            [jobId]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ message: "Job not found" });
        }
        return res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ message: "Error fetching job status" });
    }
};

exports.getData = async (req, res) => {
    try {
        const page = parseInt(req.query.page, 10) || 1;
        const limit = parseInt(req.query.limit, 10) || 50;
        const search = req.query.search || '';
        const offset = (page - 1) * limit;

        let query = `
            SELECT sd.*, c.name as campaign_name, cl.name as client_name
            FROM separation_data sd
            LEFT JOIN campaigns c ON sd.campaign_id = c.campaign_id
            LEFT JOIN clients cl ON sd.client_id = cl.id
            WHERE 1=1
        `;
        const params = [];

        if (search) {
            params.push(`%${search}%`);
            query += ` AND (sd.phone ILIKE $${params.length} OR sd.name ILIKE $${params.length} OR sd.email ILIKE $${params.length})`;
        }

        query += ` ORDER BY sd.uploaded_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
        params.push(limit, offset);

        const result = await db.query(query, params);
        res.json({ data: result.rows.map(sepAttachLocation) });
    } catch (err) {
        console.error('Error fetching separation data:', err);
        res.status(500).json({ message: 'Error fetching data', error: err.message, stack: err.stack });
    }
};

exports.deleteData = async (req, res) => {
    try {
        const { id } = req.params;
        await db.query('DELETE FROM separation_data WHERE id = $1', [id]);
        res.json({ message: 'Record deleted successfully' });
    } catch (err) {
        console.error('Error deleting record:', err);
        res.status(500).json({ message: 'Error deleting record' });
    }
};

exports.getExportCount = async (req, res) => {
    try {
        const { campaign_id, client_id, state, states, area_code, area_codes, include_downloaded } = req.query;
        let baseQuery = 'FROM separation_data sd WHERE 1=1';
        const params = [];

        if (campaign_id && campaign_id !== 'all') {
            params.push(campaign_id);
            baseQuery += ` AND sd.campaign_id = $${params.length}`;
        } else if (campaign_id === 'unassigned') {
            baseQuery += ' AND sd.campaign_id IS NULL';
        }

        if (client_id && client_id !== 'all') {
            params.push(client_id);
            baseQuery += ` AND sd.client_id = $${params.length}`;
        } else if (client_id === 'unassigned') {
            baseQuery += ' AND sd.client_id IS NULL';
        }

        baseQuery = sepAppendLocationFilter(baseQuery, params, { state, states, area_code, area_codes }, 'sd');

        const query = `
            SELECT 
                SUM(CASE WHEN NOT EXISTS (
                    SELECT 1 FROM separation_data downloaded_sd
                    WHERE downloaded_sd.phone = sd.phone AND downloaded_sd.downloaded_at IS NOT NULL
                ) THEN 1 ELSE 0 END) as count,
                SUM(CASE WHEN EXISTS (
                    SELECT 1 FROM separation_data downloaded_sd
                    WHERE downloaded_sd.phone = sd.phone AND downloaded_sd.downloaded_at IS NOT NULL
                ) THEN 1 ELSE 0 END) as downloaded_count
            ${baseQuery}
        `;

        const result = await db.query(query, params);
        
        let count = parseInt(result.rows[0].count, 10) || 0;
        const downloadedCount = parseInt(result.rows[0].downloaded_count, 10) || 0;

        const includeDownloaded =
            include_downloaded === true ||
            String(include_downloaded || '').toLowerCase() === 'true';

        if (includeDownloaded) {
            count = count + downloadedCount;
        }

        res.json({ count, downloadedCount });
    } catch (err) {
        console.error('Error fetching export count:', err);
        res.status(500).json({ message: 'Error fetching export count' });
    }
};

exports.downloadData = async (req, res) => {
    try {
        const { campaign_id, client_id, quantity, state, states, area_code, area_codes, include_downloaded } = req.body;

        const requestedQty = parseInt(quantity, 10);
        if (!requestedQty || requestedQty <= 0) {
            return res.status(400).json({ message: 'Valid quantity is required' });
        }

        let query = `
            SELECT sd.phone, sd.name, sd.email, c.name as campaign_name, cl.name as client_name, sd.uploaded_at as created_at
            FROM separation_data sd
            LEFT JOIN campaigns c ON sd.campaign_id = c.campaign_id
            LEFT JOIN clients cl ON sd.client_id = cl.id
            WHERE 1=1
        `;
        const params = [];

        const includeDownloaded =
            include_downloaded === true ||
            String(include_downloaded || '').toLowerCase() === 'true';

        if (!includeDownloaded) {
            query += `
                AND NOT EXISTS (
                    SELECT 1
                    FROM separation_data downloaded_sd
                    WHERE downloaded_sd.phone = sd.phone
                      AND downloaded_sd.downloaded_at IS NOT NULL
                )
            `;
        }

        if (campaign_id && campaign_id !== 'all') {
            params.push(campaign_id);
            query += ` AND sd.campaign_id = $${params.length}`;
        } else if (campaign_id === 'unassigned') {
            query += ' AND sd.campaign_id IS NULL';
        }

        if (client_id && client_id !== 'all') {
            params.push(client_id);
            query += ` AND sd.client_id = $${params.length}`;
        } else if (client_id === 'unassigned') {
            query += ' AND sd.client_id IS NULL';
        }

        if (typeof sepAppendLocationFilter === 'function') {
            query = sepAppendLocationFilter(query, params, { state, states, area_code, area_codes }, 'sd');
        }

        // Extra pull sirf DNC/Sale/Dead remove karne ke liye.
        // BLA par sirf requested quantity jayegi.
        const fetchLimit = Math.min(Math.max(requestedQty * 6, requestedQty + 5000), 250000);
        params.push(fetchLimit);
        query += ` ORDER BY sd.uploaded_at DESC LIMIT $${params.length}`;

        const result = await db.query(query, params);
        const candidateRows = result.rows.map(row => {
            if (typeof sepAttachLocation === 'function') return sepAttachLocation(row);
            return row;
        });

        if (candidateRows.length === 0) {
            return res.status(404).json({ message: 'No data found' });
        }

        const phoneKeys = [...new Set(
            candidateRows
                .map(r => sepCleanPhoneForChecks(r.phone))
                .filter(Boolean)
        )];

        const { dncSet, dncSkippedDnc = 0, dncSkippedSale = 0 } = await lookupDncPhones(db, phoneKeys);
        const deadSet = await lookupDeadPhones(db, phoneKeys);

        const afterLocalClean = candidateRows.filter((r) => {
            const phone = sepCleanPhoneForChecks(r.phone);
            return phone && !dncSet.has(phone) && !deadSet.has(phone);
        });

        // IMPORTANT:
        // BLA API par sirf requested quantity bhejni hai.
        const blaRows = afterLocalClean.slice(0, requestedQty);
        const blaPhones = [...new Set(
            blaRows.map(r => sepCleanPhoneForChecks(r.phone)).filter(Boolean)
        )];

        if (blaRows.length === 0 || blaPhones.length === 0) {
            return res.status(404).json({
                message: 'No clean data found after DNC/Sale/Dead filtering.',
            });
        }

        let finalRows = blaRows;
        let blaBad = 0;
        let blacklist = 0;
        let stateDnc = 0;
        let federalDnc = 0;
        let badPhone = 0;
        let errors = 0;

        try {
            const scrubResult = await scrubPhones(blaPhones);
            const badItems = Array.isArray(scrubResult.bad) ? scrubResult.bad : [];
            blaBad = badItems.length;

            for (const item of badItems) {
                const typeLower = String(item.type || '').toLowerCase();
                if (typeLower.includes('federal')) federalDnc++;
                else if (typeLower.includes('state')) stateDnc++;
                else if (typeLower.includes('invalid') || typeLower.includes('bad')) badPhone++;
                else blacklist++;
            }

            if (badItems.length > 0) {
                const badPhoneSet = new Set(
                    badItems.map(b => sepCleanPhoneForChecks(b.phone)).filter(Boolean)
                );

                await sepUpsertDeadNumbersFromBla(badItems);

                finalRows = blaRows.filter(
                    r => !badPhoneSet.has(sepCleanPhoneForChecks(r.phone))
                );
            }
        } catch (scrubErr) {
            console.error('[Separation Download] BLA scrub failed:', scrubErr);
            errors = blaRows.length;
            return res.status(502).json({
                message: 'BLA scrub failed. Download stopped so unsafe numbers are not exported.',
                error: scrubErr.message,
            });
        }

        if (finalRows.length === 0) {
            return res.status(404).json({
                message: 'No good leads found after BLA scrub.',
            });
        }

        const { parse } = require('json2csv');
        const csv = parse(finalRows, {
            fields: ['phone', 'area_code', 'state', 'name', 'email', 'campaign_name', 'client_name', 'created_at']
        });

        const downloadedPhones = [...new Set(
            finalRows
                .map(row => String(row.phone || '').trim())
                .filter(Boolean)
        )];

        if (downloadedPhones.length > 0) {
            await db.query(
                `UPDATE separation_data
                 SET downloaded_at = COALESCE(downloaded_at, CURRENT_TIMESTAMP)
                 WHERE phone = ANY($1::varchar[])`,
                [downloadedPhones]
            );
        }

        const summary = {
            requested: requestedQty,
            total: blaRows.length,
            good: finalRows.length,
            clean: finalRows.length,
            blaChecked: blaRows.length,
            sourceCheckedBeforeDncDead: candidateRows.length,

            excludedDnc: dncSkippedDnc,
            excludedSale: dncSkippedSale,
            excludedDead: deadSet.size,

            blaBad,
            blacklist,
            stateDnc,
            federalDnc,
            badPhone,
            errors,
            suppress: 0,
            scrubCompleted: true,
            scrubFailed: false,
        };

        res.json({
            csv,
            fileName: `separation_clean_bla_${Date.now()}.csv`,
            count: finalRows.length,
            summary,
        });
    } catch (err) {
        console.error('Error downloading clean BLA separation data:', err);
        res.status(500).json({ message: 'Error downloading clean BLA separation data' });
    }
};

