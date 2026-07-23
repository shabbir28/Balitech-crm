const express = require('express');
const router = express.Router();
const {
    downloadLeads,
    createDownloadRequest,
    getDownloadRequests,
    getMyDownloadRequests,
    reviewDownloadRequest,
    executeApprovedDownload,
    getDownloadLogs,
    getAlreadyDownloadedSummary,
    getAlreadyDownloadedList,
    getVendorDownloadHistory,
    getDownloadLogFile,
    getDownloadLogSummary,
    getStateCounts,
    downloadJobFile,
    getJobStats,
} = require('../controllers/premiumDownloadController');
const auth = require('../middleware/auth');
const authorizeRole = require('../middleware/role');

// ── SuperAdmin direct download (existing) ────────────────────
router.post('/', auth, authorizeRole(['super_admin']), downloadLeads);

// ── Admin & Data Entry: submit a download request ─────────────────────────
router.post('/request', auth, authorizeRole(['admin', 'data_entry', 'dialer_agent']), createDownloadRequest);

// ── Admin & Data Entry: view own requests ──────────────────────────────────
router.get('/requests/mine', auth, authorizeRole(['admin', 'data_entry', 'dialer_agent']), getMyDownloadRequests);

// ── SuperAdmin: view ALL requests ────────────────────────────
router.get('/requests', auth, authorizeRole(['super_admin']), getDownloadRequests);

// ── SuperAdmin: accept or reject a request ───────────────────
router.patch('/requests/:id', auth, authorizeRole(['super_admin']), reviewDownloadRequest);

// ── Admin & Data Entry: download CSV for an accepted request ───────────────
router.get('/requests/:id/file', auth, authorizeRole(['admin', 'data_entry', 'dialer_agent']), executeApprovedDownload);

// ── Both: view download logs ──────────────────────────────────
router.get('/logs', auth, authorizeRole(['super_admin', 'admin', 'data_entry', 'dialer_agent']), getDownloadLogs);

// ── Already Downloaded module ─────────────────────────────────
router.get(
  '/already-downloaded/list',
  auth,
  authorizeRole(['super_admin', 'admin', 'data_entry', 'dialer_agent']),
  getAlreadyDownloadedList,
);
router.get(
  '/already-downloaded',
  auth,
  authorizeRole(['super_admin', 'admin', 'data_entry', 'dialer_agent']),
  getAlreadyDownloadedSummary,
);
router.get(
  '/already-downloaded/:vendorId/history',
  auth,
  authorizeRole(['super_admin', 'admin', 'data_entry', 'dialer_agent']),
  getVendorDownloadHistory,
);
router.get(
  '/logs/:id/summary',
  auth,
  authorizeRole(['super_admin', 'admin', 'data_entry', 'dialer_agent']),
  getDownloadLogSummary,
);
router.get(
  '/logs/:id/file',
  auth,
  authorizeRole(['super_admin', 'admin', 'data_entry', 'dialer_agent']),
  getDownloadLogFile,
);

// ── Get state counts ────────────────────────────────────
router.post(
  '/state-counts',
  auth,
  authorizeRole(['super_admin', 'admin', 'data_entry', 'dialer_agent']),
  getStateCounts,
);

// ── Both: Download premium_data from a specific upload job/file ────────
router.get(
  '/job/:jobId/file',
  auth,
  authorizeRole(['super_admin', 'admin', 'data_entry', 'dialer_agent']),
  downloadJobFile,
);

// ── Get stats for a specific upload job/file ─────────────────
router.get(
  '/job/:jobId/stats',
  auth,
  authorizeRole(['super_admin', 'admin', 'data_entry', 'dialer_agent']),
  getJobStats,
);

module.exports = router;
