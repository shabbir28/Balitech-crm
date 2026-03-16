const express = require('express');
const router = express.Router();
const { uploadLeads, getLeads } = require('../controllers/leadController');
const upload = require('../middleware/upload');
const auth = require('../middleware/auth');
const authorizeRole = require('../middleware/role');

// Admin only functionalities
router.post('/upload', auth, authorizeRole(['admin']), upload.single('file'), uploadLeads);

// Internal query for admins
router.get('/', auth, authorizeRole(['admin']), getLeads);

module.exports = router;
