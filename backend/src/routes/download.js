const express = require('express');
const router = express.Router();
const { downloadLeads, getDownloadLogs } = require('../controllers/downloadController');
const auth = require('../middleware/auth');
const authorizeRole = require('../middleware/role');

// Agent and Admin can download
router.post('/', auth, authorizeRole(['admin', 'agent']), downloadLeads);

// Admin only can view logs
router.get('/logs', auth, authorizeRole(['admin']), getDownloadLogs);

module.exports = router;
