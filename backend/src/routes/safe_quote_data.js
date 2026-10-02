const express = require('express');
const router = express.Router();
const { getSafeQuoteData } = require('../controllers/safeQuoteDataController');
const auth = require('../middleware/auth');
const authorizeRole = require('../middleware/role');

router.use(auth);
router.get('/', authorizeRole(['super_admin', 'admin', 'data_entry', 'dialer_agent']), getSafeQuoteData);

module.exports = router;
