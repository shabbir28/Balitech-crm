const db = require('../config/db');
const { Parser } = require('json2csv');
const { areaCodesMap } = require('../utils/areaCodes');
const { createNotification } = require('./notificationController');

// ─────────────────────────────────────────────────────────────
// HELPER: build WHERE clause from filters (shared logic)
// ─────────────────────────────────────────────────────────────
async function buildFilters(client, { vendor_id, campaign_id, states }) {
    const filters = ["status = 'available'"];
    const params = [];
    let paramIdx = 1;

    if (vendor_id) {
        filters.push(`vendor_id = $${paramIdx++}`);
        params.push(vendor_id);
    }

    if (campaign_id) {
        const campRes = await client.query(
            'SELECT name FROM campaigns WHERE campaign_id = $1',
            [campaign_id]
        );
        if (campRes.rows.length > 0) {
            filters.push(`campaign_type = $${paramIdx++}`);
            params.push(campRes.rows[0].name);
        } else {
            filters.push(`1 = 0`);
        }
    }

    if (states && Array.isArray(states) && states.length > 0) {
        const matchingCodes = [];
        for (const [code, state] of Object.entries(areaCodesMap)) {
            if (states.includes(state)) matchingCodes.push(code);
        }
        if (matchingCodes.length > 0) {
            const placeholders = matchingCodes.map(() => `$${paramIdx++}`).join(',');
            filters.push(`area_code IN (${placeholders})`);
            params.push(...matchingCodes);
        } else {
            filters.push(`1 = 0`);
        }
    }

    return { filters, params, paramIdx };
}

// ─────────────────────────────────────────────────────────────
// HELPER: perform the actual DB download + return CSV rows
// ─────────────────────────────────────────────────────────────
async function executeDownload(client, { vendor_id, campaign_id, states, quantity, user_id, approved_by_id }) {
    const { filters, params, paramIdx } = await buildFilters(client, { vendor_id, campaign_id, states });
    const whereClause = filters.join(' AND ');

    const updateQuery = `
        WITH selected_leads AS (
            SELECT id 
            FROM leads 
            WHERE ${whereClause} 
              AND NOT EXISTS (
                SELECT 1 FROM dnc_numbers d WHERE d.phone = leads.phone
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

    // Log the download — include approved_by if it was a request approval
    await client.query(
        `INSERT INTO download_logs (user_id, vendor_id, country_code, area_code, quantity, approved_by)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [user_id, vendor_id || null, null, null, result.rows.length, approved_by_id || null]
    );

    return result.rows;
}

// ─────────────────────────────────────────────────────────────
// POST /api/download
// SuperAdmin → direct download (existing behaviour preserved)
// Admin      → now blocked; use /api/download/request instead
// ─────────────────────────────────────────────────────────────
const downloadLeads = async (req, res) => {
    // Only super_admin can use the direct download endpoint
    if (req.user.role !== 'super_admin') {
        return res.status(403).json({
            message: 'Admins must submit a download request. Use POST /api/download/request'
        });
    }

    const client = await db.getClient();
    try {
        const { vendor_id, quantity, states, campaign_id } = req.body;
        if (!quantity || quantity <= 0) {
            return res.status(400).json({ message: 'Valid quantity is required' });
        }

        await client.query('BEGIN');
        const rows = await executeDownload(client, {
            vendor_id, campaign_id, states, quantity, user_id: req.user.id
        });

        if (rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ message: 'No available leads found matching criteria' });
        }

        await client.query('COMMIT');

        const fields = ['name', 'phone', 'email', 'country_code', 'area_code', 'disposition'];
        const csv = new Parser({ fields }).parse(rows);
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="leads_download_${Date.now()}.csv"`);
        return res.status(200).send(csv);

    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Direct Download Error:', err);
        return res.status(500).json({ message: 'Server error processing download' });
    } finally {
        client.release();
    }
};

// ─────────────────────────────────────────────────────────────
// POST /api/download/request
// Admin submits a download request → stored as "pending"
// ─────────────────────────────────────────────────────────────
const createDownloadRequest = async (req, res) => {
    try {
        const { vendor_id, quantity, states, campaign_id } = req.body;

        if (!vendor_id) {
            return res.status(400).json({ message: 'Please select a vendor.' });
        }
        if (!quantity || quantity <= 0) {
            return res.status(400).json({ message: 'Valid quantity is required.' });
        }

        const result = await db.query(
            `INSERT INTO download_requests
               (admin_id, vendor_id, campaign_id, quantity, states)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING *`,
            [req.user.id, vendor_id, campaign_id || null, quantity, states && states.length ? states : null]
        );

        const newRequest = result.rows[0];

        // Notify all super_admins
        const superAdmins = await db.query(`SELECT id FROM users WHERE role='super_admin'`);
        const adminDisplayName = req.user.first_name
            ? `${req.user.first_name} ${req.user.last_name || ''}`.trim()
            : req.user.username;

        for (const sa of superAdmins.rows) {
            await createNotification(
                sa.id,
                'download_request_new',
                '📥 New Download Request',
                `${adminDisplayName} has requested to download ${quantity.toLocaleString()} leads from vendor data.`,
                newRequest.id
            );
        }

        return res.status(201).json({
            message: 'Download request submitted successfully. Awaiting SuperAdmin approval.',
            request: newRequest
        });
    } catch (err) {
        console.error('Create Download Request Error:', err);
        return res.status(500).json({ message: 'Server error creating request' });
    }
};

// ─────────────────────────────────────────────────────────────
// GET /api/download/requests
// SuperAdmin → fetch ALL requests (with admin & vendor names)
// ─────────────────────────────────────────────────────────────
const getDownloadRequests = async (req, res) => {
    try {
        const result = await db.query(`
            SELECT
                dr.id,
                dr.quantity,
                dr.states,
                dr.status,
                dr.rejection_reason,
                dr.requested_at,
                dr.reviewed_at,
                u.username  AS admin_username,
                u.first_name AS admin_first_name,
                u.last_name  AS admin_last_name,
                v.name       AS vendor_name,
                c.name       AS campaign_name,
                rv.username  AS reviewed_by_username
            FROM download_requests dr
            LEFT JOIN users u  ON dr.admin_id = u.id
            LEFT JOIN vendors v ON dr.vendor_id = v.vendor_id
            LEFT JOIN campaigns c ON dr.campaign_id = c.campaign_id
            LEFT JOIN users rv ON dr.reviewed_by = rv.id
            ORDER BY
                CASE dr.status WHEN 'pending' THEN 0 ELSE 1 END,
                dr.requested_at DESC
        `);
        return res.json(result.rows);
    } catch (err) {
        console.error('Get Download Requests Error:', err);
        return res.status(500).json({ message: 'Server error' });
    }
};

// ─────────────────────────────────────────────────────────────
// GET /api/download/requests/mine
// Admin → fetch only their own requests
// ─────────────────────────────────────────────────────────────
const getMyDownloadRequests = async (req, res) => {
    try {
        const result = await db.query(`
            SELECT
                dr.id,
                dr.quantity,
                dr.states,
                dr.status,
                dr.rejection_reason,
                dr.requested_at,
                dr.reviewed_at,
                v.name AS vendor_name,
                c.name AS campaign_name
            FROM download_requests dr
            LEFT JOIN vendors v  ON dr.vendor_id  = v.vendor_id
            LEFT JOIN campaigns c ON dr.campaign_id = c.campaign_id
            WHERE dr.admin_id = $1
            ORDER BY dr.requested_at DESC
        `,
        [req.user.id]);
        return res.json(result.rows);
    } catch (err) {
        console.error('Get My Download Requests Error:', err);
        return res.status(500).json({ message: 'Server error' });
    }
};

// ─────────────────────────────────────────────────────────────
// PATCH /api/download/requests/:id
// SuperAdmin → Accept or Reject a pending request
// Body: { action: 'accept' | 'reject', rejection_reason?: string }
// ─────────────────────────────────────────────────────────────
const reviewDownloadRequest = async (req, res) => {
    const { id } = req.params;
    const { action, rejection_reason } = req.body;

    if (!['accept', 'reject'].includes(action)) {
        return res.status(400).json({ message: 'Action must be "accept" or "reject".' });
    }

    const client = await db.getClient();
    let txnStarted = false;
    try {
        // Fetch the request
        const reqRes = await client.query(
            `SELECT * FROM download_requests WHERE id = $1`, [id]
        );
        if (reqRes.rows.length === 0) {
            return res.status(404).json({ message: 'Download request not found.' });
        }
        const dlReq = reqRes.rows[0];
        if (dlReq.status !== 'pending') {
            return res.status(400).json({ message: `Request is already ${dlReq.status}.` });
        }

        if (action === 'reject') {
            await client.query(
                `UPDATE download_requests
                 SET status='rejected', rejection_reason=$1, reviewed_at=NOW(), reviewed_by=$2
                 WHERE id=$3`,
                [rejection_reason || null, req.user.id, id]
            );
            // Notify the admin
            await createNotification(
                dlReq.admin_id,
                'download_request_rejected',
                '❌ Download Request Rejected',
                rejection_reason
                    ? `Your download request for ${dlReq.quantity?.toLocaleString()} leads was rejected. Reason: ${rejection_reason}`
                    : `Your download request for ${dlReq.quantity?.toLocaleString()} leads was rejected by the SuperAdmin.`,
                dlReq.id
            );
            return res.json({ message: 'Request rejected successfully.' });
        }

        // ── Accept ── (BEGIN transaction only for accepts)
        await client.query('BEGIN');
        txnStarted = true;

        const rows = await executeDownload(client, {
            vendor_id:   dlReq.vendor_id,
            campaign_id: dlReq.campaign_id,
            states:      dlReq.states,
            quantity:    dlReq.quantity,
            user_id:     dlReq.admin_id,
            approved_by_id: req.user.id   // ← the super_admin who approved
        });

        if (rows.length === 0) {
            await client.query('ROLLBACK');
            txnStarted = false;
            // Mark as rejected due to no data available
            await db.query(
                `UPDATE download_requests
                 SET status='rejected', rejection_reason='No available leads found matching the criteria at time of approval.',
                     reviewed_at=NOW(), reviewed_by=$1
                 WHERE id=$2`,
                [req.user.id, id]
            );
            return res.status(404).json({
                message: 'No available leads found. Request has been marked as rejected.'
            });
        }

        // Store CSV in the request row so admin can download it later
        const fields = ['name', 'phone', 'email', 'country_code', 'area_code', 'disposition'];
        const csv = new Parser({ fields }).parse(rows);

        await client.query(
            `UPDATE download_requests
             SET status='accepted', reviewed_at=NOW(), reviewed_by=$1, csv_data=$2
             WHERE id=$3`,
            [req.user.id, csv, id]
        );

        await client.query('COMMIT');
        txnStarted = false;

        // Notify the admin that their request was approved
        await createNotification(
            dlReq.admin_id,
            'download_request_accepted',
            '✅ Download Request Approved!',
            `Your download request for ${rows.length.toLocaleString()} leads has been approved. You can now download your CSV file.`,
            dlReq.id
        );

        return res.json({
            message: `Request accepted. ${rows.length} leads are ready for the admin to download.`,
            lead_count: rows.length
        });

    } catch (err) {
        if (txnStarted) await client.query('ROLLBACK').catch(() => {});
        console.error('Review Download Request Error:', err);
        return res.status(500).json({ message: 'Server error processing request' });
    } finally {
        client.release();
    }
};

// ─────────────────────────────────────────────────────────────
// GET /api/download/requests/:id/file
// Admin → download the CSV for an accepted request
// ─────────────────────────────────────────────────────────────
const executeApprovedDownload = async (req, res) => {
    const { id } = req.params;
    try {
        const result = await db.query(
            `SELECT * FROM download_requests WHERE id=$1 AND admin_id=$2`,
            [id, req.user.id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Request not found.' });
        }
        const dlReq = result.rows[0];
        if (dlReq.status !== 'accepted') {
            return res.status(400).json({ message: `Request is ${dlReq.status}, not accepted.` });
        }
        if (!dlReq.csv_data) {
            return res.status(400).json({ message: 'CSV data not available for this request.' });
        }

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="approved_leads_${id}_${Date.now()}.csv"`);
        return res.status(200).send(dlReq.csv_data);

    } catch (err) {
        console.error('Execute Approved Download Error:', err);
        return res.status(500).json({ message: 'Server error' });
    }
};

// ─────────────────────────────────────────────────────────────
// GET /api/download/logs  (existing – unchanged)
// ─────────────────────────────────────────────────────────────
const getDownloadLogs = async (req, res) => {
    try {
        const result = await db.query(`
            SELECT
                dl.*,
                u.username,
                u.first_name  AS user_first_name,
                u.last_name   AS user_last_name,
                v.name        AS vendor_name,
                ap.username   AS approved_by_username,
                ap.first_name AS approved_by_first_name,
                ap.last_name  AS approved_by_last_name
            FROM download_logs dl
            LEFT JOIN users u  ON dl.user_id    = u.id
            LEFT JOIN users ap ON dl.approved_by = ap.id
            LEFT JOIN vendors v ON dl.vendor_id  = v.vendor_id
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
    createDownloadRequest,
    getDownloadRequests,
    getMyDownloadRequests,
    reviewDownloadRequest,
    executeApprovedDownload,
    getDownloadLogs
};
