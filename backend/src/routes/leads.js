const express = require('express');
const router = express.Router();
const { uploadLeads, getLeads } = require('../controllers/leadController');
const upload = require('../middleware/upload');
const auth = require('../middleware/auth');
const authorizeRole = require('../middleware/role');

// super_admin, admin, and data_entry can upload leads
router.post('/upload', auth, authorizeRole(['super_admin', 'admin', 'data_entry']), upload.single('file'), uploadLeads);

// super_admin and admin can view all leads
router.get('/', auth, authorizeRole(['super_admin', 'admin']), getLeads);

module.exports = router;
