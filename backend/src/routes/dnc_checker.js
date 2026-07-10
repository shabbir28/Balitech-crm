const express = require('express');
const router  = express.Router();

const {
    createDncResult,
    getUploadedFiles,
    getDncJobById,
    getCampaignSummary,
    analyzeCleanFile,
    createSingleDncResult,
    getSingleChecks,
} = require('../controllers/dncCheckerController');

const verifyToken   = require('../middleware/auth');
const authorizeRole = require('../middleware/role');
const dncSyncAuth   = require('../middleware/dncSyncAuth');

// ─── Server-to-server integration route (static Bearer token) ──────────────
// POST /api/dnc-checker/results
router.post('/results', dncSyncAuth, createDncResult);

// POST /api/dnc-checker/single-result
router.post('/single-result', dncSyncAuth, createSingleDncResult);

// ─── CRM user routes (JWT auth + role check) ────────────────────────────────
router.use(verifyToken);
router.use(authorizeRole(['super_admin', 'admin']));

// GET /api/dnc-checker/uploaded-files
router.get('/uploaded-files', getUploadedFiles);

// GET /api/dnc-checker/single-lookups
router.get('/single-lookups', getSingleChecks);

// GET /api/dnc-checker/uploaded-files/:id
router.get('/uploaded-files/:id', getDncJobById);

// GET /api/dnc-checker/campaigns
router.get('/campaigns', getCampaignSummary);

// POST /api/dnc-checker/analyze-file
router.post('/analyze-file', analyzeCleanFile);

module.exports = router;
