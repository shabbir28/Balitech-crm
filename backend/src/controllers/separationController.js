const db = require('../config/db');
const { processFileBuffer } = require("../utils/fileProcessor");
const { cleanupFile } = require("../middleware/upload");

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
                const validRecords = records.filter((r) => r.phone);
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
        res.json({ data: result.rows });
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
        const { campaign_id, client_id } = req.query;
        let query = 'SELECT COUNT(*) as count FROM separation_data WHERE 1=1';
        const params = [];

        if (campaign_id && campaign_id !== 'all') {
            params.push(campaign_id);
            query += ` AND campaign_id = $${params.length}`;
        } else if (campaign_id === 'unassigned') {
            query += ' AND campaign_id IS NULL';
        }

        if (client_id && client_id !== 'all') {
            params.push(client_id);
            query += ` AND client_id = $${params.length}`;
        } else if (client_id === 'unassigned') {
            query += ' AND client_id IS NULL';
        }

        const result = await db.query(query, params);
        res.json({ count: parseInt(result.rows[0].count, 10) });
    } catch (err) {
        console.error('Error fetching export count:', err);
        res.status(500).json({ message: 'Error fetching export count' });
    }
};

exports.downloadData = async (req, res) => {
    try {
        const { campaign_id, client_id, quantity } = req.body;
        let query = `
            SELECT sd.phone, sd.name, sd.email, c.name as campaign_name, cl.name as client_name, sd.uploaded_at as created_at
            FROM separation_data sd
            LEFT JOIN campaigns c ON sd.campaign_id = c.campaign_id
            LEFT JOIN clients cl ON sd.client_id = cl.id
            WHERE 1=1
        `;
        const params = [];

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

        query += ' ORDER BY sd.uploaded_at DESC';

        if (quantity) {
            params.push(quantity);
            query += ` LIMIT $${params.length}`;
        }

        const result = await db.query(query, params);
        const data = result.rows;

        if (data.length === 0) {
            return res.status(404).json({ message: 'No data found' });
        }

        const { parse } = require('json2csv');
        const csv = parse(data);
        res.json({
            csv,
            fileName: `separation_data_${Date.now()}.csv`,
            count: data.length
        });
    } catch (err) {
        console.error('Error downloading data:', err);
        res.status(500).json({ message: 'Error downloading data' });
    }
};
