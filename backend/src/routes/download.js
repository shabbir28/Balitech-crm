const express = require('express');
const router = express.Router();
const {
    downloadLeads,
    createDownloadRequest,
    getDownloadRequests,
    getMyDownloadRequests,
    reviewDownloadRequest,
    executeApprovedDownload,
    getDownloadLogs
} = require('../controllers/downloadController');
const auth = require('../middleware/auth');
const authorizeRole = require('../middleware/role');

// ── SuperAdmin direct download (existing) ────────────────────
router.post('/', auth, authorizeRole(['super_admin']), downloadLeads);

// ── Admin: submit a download request ─────────────────────────
router.post('/request', auth, authorizeRole(['admin']), createDownloadRequest);

// ── Admin: view own requests ──────────────────────────────────
router.get('/requests/mine', auth, authorizeRole(['admin']), getMyDownloadRequests);

// ── SuperAdmin: view ALL requests ────────────────────────────
router.get('/requests', auth, authorizeRole(['super_admin']), getDownloadRequests);

// ── SuperAdmin: accept or reject a request ───────────────────
router.patch('/requests/:id', auth, authorizeRole(['super_admin']), reviewDownloadRequest);

// ── Admin: download CSV for an accepted request ───────────────
router.get('/requests/:id/file', auth, authorizeRole(['admin']), executeApprovedDownload);

// ── Both: view download logs ──────────────────────────────────
router.get('/logs', auth, authorizeRole(['super_admin', 'admin']), getDownloadLogs);

module.exports = router;
