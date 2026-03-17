const express = require('express');
const router = express.Router();
const { downloadLeads, getDownloadLogs } = require('../controllers/downloadController');
const auth = require('../middleware/auth');
const authorizeRole = require('../middleware/role');

// super_admin and Admin can download
router.post('/', auth, authorizeRole(['super_admin', 'admin']), downloadLeads);

// super_admin and Admin can view logs
router.get('/logs', auth, authorizeRole(['super_admin', 'admin']), getDownloadLogs);

module.exports = router;
