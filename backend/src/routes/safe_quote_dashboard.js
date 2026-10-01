const express = require('express');
const router = express.Router();
const { getStats } = require('../controllers/safeQuoteDashboardController');
const auth = require('../middleware/auth');
const authorizeRole = require('../middleware/role');

router.use(auth);
router.get('/stats', authorizeRole(['super_admin', 'admin', 'data_entry', 'dialer_agent']), getStats);

module.exports = router;
