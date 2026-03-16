const express = require('express');
const router = express.Router();
const { getStats } = require('../controllers/dashboardController');
const auth = require('../middleware/auth');
const authorizeRole = require('../middleware/role');

// Admin only functionalities
router.get('/stats', auth, authorizeRole(['admin']), getStats);

module.exports = router;
