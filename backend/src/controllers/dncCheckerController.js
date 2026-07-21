const db   = require('../config/db');
const https = require('https');
const http = require('http');
const { lookupExistingLeads } = require('../utils/dbHelpers');
const path = require('path');

const ALLOWED_CAMPAIGNS = ['Medicare', 'ACA', 'FE', 'Home Improvement', 'Solar', 'Hospital Indemnity'];

/**
 * POST /api/dnc-checker/results
 * Receive DNC job result from external DNC Checker website.
 * Protected by dncSyncAuth middleware (static Bearer token).
 */
const createDncResult = async (req, res) => {
    try {
        const {
            campaign,
            fileName,
            originalFileName,
            totalRows,
            matched,
            clean,
            invalid,
            duplicates,
            status,
            source,
            cleanFileUrl,
            matchedFileUrl,
            reportFileUrl,
            checkedAt,
        } = req.body;

        // --- Validate required fields ---
        if (!campaign || typeof campaign !== 'string' || !campaign.trim()) {
            return res.status(400).json({ success: false, message: 'campaign is required.' });
        }
        if (!fileName || typeof fileName !== 'string' || !fileName.trim()) {
            return res.status(400).json({ success: false, message: 'fileName is required.' });
        }

        // --- Validate campaign value ---
        const normalizedCampaign = campaign.trim();
        if (!ALLOWED_CAMPAIGNS.includes(normalizedCampaign)) {
            return res.status(400).json({
                success: false,
                message: `Invalid campaign. Allowed values: ${ALLOWED_CAMPAIGNS.join(', ')}.`,
            });
        }

        // --- Safe integer conversion ---
        const safeInt = (val, fallback = 0) => {
            const n = parseInt(val, 10);
            return Number.isFinite(n) && n >= 0 ? n : fallback;
        };

        const params = [
            normalizedCampaign,                              // $1
            fileName.trim(),                                 // $2
            originalFileName ? originalFileName.trim() : fileName.trim(), // $3
            safeInt(totalRows),                              // $4
            safeInt(matched),                                // $5
            safeInt(clean),                                  // $6
            safeInt(invalid),                                // $7
            safeInt(duplicates),                             // $8
            status ? String(status).trim() : 'completed',   // $9
            source ? String(source).trim() : 'checkdncnumber.com', // $10
            cleanFileUrl   || null,                          // $11
            matchedFileUrl || null,                          // $12
            reportFileUrl  || null,                          // $13
            checkedAt ? new Date(checkedAt) : new Date(),   // $14
        ];

        const sql = `
            INSERT INTO dnc_checker_jobs
                (campaign, file_name, original_file_name, total_rows, matched, clean, invalid,
                 duplicates, status, source, clean_file_url, matched_file_url, report_file_url, checked_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
            RETURNING *
        `;

        const result = await db.query(sql, params);
        const inserted = result.rows[0];

        return res.status(201).json({
            success: true,
            message: 'DNC result saved successfully.',
            data: inserted,
        });
    } catch (err) {
        console.error('createDncResult error:', err);
        return res.status(500).json({ success: false, message: 'Internal server error.' });
    }
};

/**
 * POST /api/dnc-checker/single-result
 * Receive a single DNC check result from external DNC Checker website.
 * Protected by dncSyncAuth middleware (static Bearer token).
 */
const createSingleDncResult = async (req, res) => {
    try {
        const {
            phoneNumber,
            dncStatus,
            source,
            checkedAt,
            lineType,
            ipAddress,
        } = req.body;

        if (!phoneNumber || typeof phoneNumber !== 'string' || !phoneNumber.trim()) {
            return res.status(400).json({ success: false, message: 'phoneNumber is required.' });
        }
        if (!dncStatus || typeof dncStatus !== 'string' || !dncStatus.trim()) {
            return res.status(400).json({ success: false, message: 'dncStatus is required.' });
        }

        const cleanPhone = phoneNumber.trim();

        // Check if phone exists in any of the CRM data tables
        const existingCheck = await db.query(`
            SELECT 1 FROM leads WHERE phone = $1
            UNION ALL
            SELECT 1 FROM van_data WHERE phone = $1
            UNION ALL
            SELECT 1 FROM refine_data WHERE phone = $1
            UNION ALL
            SELECT 1 FROM premium_data WHERE phone = $1
            LIMIT 1
        `, [cleanPhone]);

        const isAlreadyPresent = existingCheck.rows.length > 0;

        const params = [
            cleanPhone,                                      // $1
            dncStatus.trim(),                                // $2
            source ? String(source).trim() : 'checkdncnumber.com', // $3
            checkedAt ? new Date(checkedAt) : new Date(),   // $4
            lineType ? String(lineType).trim() : null,       // $5
            ipAddress ? String(ipAddress).trim() : null,     // $6
            isAlreadyPresent,                                // $7
        ];

        const sql = `
            INSERT INTO dnc_single_checks
                (phone_number, dnc_status, source, checked_at, line_type, ip_address, is_already_present)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING *
        `;

        const result = await db.query(sql, params);
        const inserted = result.rows[0];

        return res.status(201).json({
            success: true,
            message: 'Single DNC result saved successfully.',
            data: inserted,
        });
    } catch (err) {
        console.error('createSingleDncResult error:', err);
        return res.status(500).json({ success: false, message: 'Internal server error.' });
    }
};

/**
 * GET /api/dnc-checker/uploaded-files
 * Return paginated list of DNC jobs with optional filters.
 */
const getUploadedFiles = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 20,
            search = '',
            campaign = '',
            status = '',
            startDate = '',
            endDate = '',
        } = req.query;

        const pageNum  = Math.max(1, parseInt(page, 10) || 1);
        const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
        const offset   = (pageNum - 1) * limitNum;

        const conditions = [];
        const params     = [];
        let   p          = 1;

        if (search && search.trim()) {
            conditions.push(`(file_name ILIKE $${p} OR original_file_name ILIKE $${p})`);
            params.push(`%${search.trim()}%`);
            p++;
        }
        if (campaign && campaign.trim()) {
            conditions.push(`campaign = $${p}`);
            params.push(campaign.trim());
            p++;
        }
        if (status && status.trim()) {
            conditions.push(`status = $${p}`);
            params.push(status.trim());
            p++;
        }
        if (startDate) {
            conditions.push(`checked_at >= $${p}`);
            params.push(new Date(startDate));
            p++;
        }
        if (endDate) {
            // Include full end day
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            conditions.push(`checked_at <= $${p}`);
            params.push(end);
            p++;
        }

        const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

        const countResult = await db.query(
            `SELECT COUNT(*) AS total FROM dnc_checker_jobs ${where}`,
            params
        );
        const total      = parseInt(countResult.rows[0].total, 10);
        const totalPages = Math.ceil(total / limitNum);

        const dataResult = await db.query(
            `SELECT * FROM dnc_checker_jobs ${where} ORDER BY checked_at DESC LIMIT $${p} OFFSET $${p + 1}`,
            [...params, limitNum, offset]
        );

        return res.json({
            success: true,
            data: dataResult.rows,
            pagination: { page: pageNum, limit: limitNum, total, totalPages },
        });
    } catch (err) {
        console.error('getUploadedFiles error:', err);
        return res.status(500).json({ success: false, message: 'Internal server error.' });
    }
};

/**
 * GET /api/dnc-checker/single-lookups
 * Return paginated list of single DNC checks with optional filters.
 */
const getSingleChecks = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 20,
            search = '',
            status = '',
            startDate = '',
            endDate = '',
            presenceFilter = '',
        } = req.query;

        const pageNum  = Math.max(1, parseInt(page, 10) || 1);
        const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
        const offset   = (pageNum - 1) * limitNum;

        const conditions = [];
        const params     = [];
        let   p          = 1;

        if (search && search.trim()) {
            conditions.push(`phone_number ILIKE $${p}`);
            params.push(`%${search.trim()}%`);
            p++;
        }
        if (status && status.trim()) {
            conditions.push(`dnc_status = $${p}`);
            params.push(status.trim());
            p++;
        }
        if (startDate) {
            conditions.push(`checked_at >= $${p}`);
            params.push(new Date(startDate));
            p++;
        }
        if (endDate) {
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            conditions.push(`checked_at <= $${p}`);
            params.push(end);
            p++;
        }
        if (presenceFilter === 'already_present') {
            conditions.push(`is_already_present = true`);
        } else if (presenceFilter === 'fresh') {
            conditions.push(`is_already_present = false`);
        }

        const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

        const countResult = await db.query(
            `SELECT 
                COUNT(*) AS total,
                COALESCE(SUM(CASE WHEN is_already_present = true THEN 1 ELSE 0 END), 0) AS already_present_count,
                COALESCE(SUM(CASE WHEN is_already_present = false THEN 1 ELSE 0 END), 0) AS fresh_count
             FROM dnc_single_checks ${where}`,
            params
        );
        const total      = parseInt(countResult.rows[0].total, 10);
        const alreadyPresent = parseInt(countResult.rows[0].already_present_count, 10);
        const fresh = parseInt(countResult.rows[0].fresh_count, 10);
        const totalPages = Math.ceil(total / limitNum);

        const dataResult = await db.query(
            `SELECT * FROM dnc_single_checks ${where} ORDER BY checked_at DESC LIMIT $${p} OFFSET $${p + 1}`,
            [...params, limitNum, offset]
        );

        return res.json({
            success: true,
            data: dataResult.rows,
            pagination: { page: pageNum, limit: limitNum, total, totalPages, alreadyPresent, fresh },
        });
    } catch (err) {
        console.error('getSingleChecks error:', err);
        return res.status(500).json({ success: false, message: 'Internal server error.' });
    }
};

/**
 * GET /api/dnc-checker/uploaded-files/:id
 * Return a single DNC job by id.
 */
const getDncJobById = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await db.query('SELECT * FROM dnc_checker_jobs WHERE id = $1', [id]);
        if (!result.rows.length) {
            return res.status(404).json({ success: false, message: 'Record not found.' });
        }
        return res.json({ success: true, data: result.rows[0] });
    } catch (err) {
        console.error('getDncJobById error:', err);
        return res.status(500).json({ success: false, message: 'Internal server error.' });
    }
};

/**
 * GET /api/dnc-checker/campaigns
 * Return aggregate summary per campaign.
 */
const getCampaignSummary = async (req, res) => {
    try {
        const sql = `
            SELECT
                campaign,
                COUNT(*)::INTEGER              AS total_files,
                SUM(total_rows)::INTEGER       AS total_rows,
                SUM(matched)::INTEGER          AS total_matched,
                SUM(clean)::INTEGER            AS total_clean,
                SUM(invalid)::INTEGER          AS total_invalid,
                SUM(duplicates)::INTEGER       AS total_duplicates,
                MAX(checked_at)                AS last_checked_at
            FROM dnc_checker_jobs
            GROUP BY campaign
            ORDER BY campaign
        `;
        const result = await db.query(sql);

        // Ensure all allowed campaigns appear (even with zero data)
        const rowMap = {};
        result.rows.forEach(r => { rowMap[r.campaign] = r; });

        const data = ALLOWED_CAMPAIGNS.map(c => rowMap[c] || {
            campaign: c,
            total_files: 0,
            total_rows: 0,
            total_matched: 0,
            total_clean: 0,
            total_invalid: 0,
            total_duplicates: 0,
            last_checked_at: null,
        });

        return res.json({ success: true, data });
    } catch (err) {
        console.error('getCampaignSummary error:', err);
        return res.status(500).json({ success: false, message: 'Internal server error.' });
    }
};

/**
 * POST /api/dnc-checker/analyze-file
 * Analyzes a specific job's clean file against the local DB.
 */
const analyzeCleanFile = async (req, res) => {
    try {
        const { jobId } = req.body;
        if (!jobId) return res.status(400).json({ success: false, message: 'jobId is required' });

        const result = await db.query('SELECT * FROM dnc_checker_jobs WHERE id = $1', [jobId]);
        if (!result.rows.length) {
            return res.status(404).json({ success: false, message: 'Record not found.' });
        }
        
        const job = result.rows[0];
        const cleanUrl = job.clean_file_url;
        
        if (!cleanUrl) {
            return res.status(400).json({ success: false, message: 'No clean file URL available for this record.' });
        }

        // Fetch file content
        const protocol = cleanUrl.startsWith('https') ? https : http;
        
        const fileContent = await new Promise((resolve, reject) => {
            protocol.get(cleanUrl, (response) => {
                let data = '';
                response.on('data', chunk => data += chunk);
                response.on('end', () => resolve(data));
            }).on('error', reject);
        });

        // Extract phone numbers (10 digits)
        const phonesSet = new Set();
        const matches = fileContent.match(/\b\d{10}\b/g) || [];
        matches.forEach(p => phonesSet.add(p));

        const phonesArray = Array.from(phonesSet);
        const totalInFile = phonesArray.length;

        if (totalInFile === 0) {
            return res.json({ success: true, total: 0, existing: 0, newLeads: 0 });
        }

        // Compare with local DB using dbHelpers
        const exec = { query: (text, params) => db.query(text, params) };
        const { existingSet, existingBreakdown } = await lookupExistingLeads(exec, phonesArray);

        const existingCount = existingSet.size;
        const newLeadsCount = totalInFile - existingCount;
        
        const freshNumbers = phonesArray.filter(p => !existingSet.has(p));

        return res.json({
            success: true,
            total: totalInFile,
            existing: existingCount,
            newLeads: newLeadsCount,
            existingBreakdown: existingBreakdown || {},
            freshNumbers: freshNumbers
        });

    } catch (err) {
        console.error('analyzeCleanFile error:', err);
        return res.status(500).json({ success: false, message: 'Failed to analyze file.' });
    }
};

module.exports = { createDncResult, createSingleDncResult, getUploadedFiles, getSingleChecks, getDncJobById, getCampaignSummary, analyzeCleanFile };
