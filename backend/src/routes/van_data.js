const express = require('express');
const router = express.Router();
const { getVanData } = require('../controllers/vanDataController');
const auth = require('../middleware/auth');
const authorizeRole = require('../middleware/role');

router.use(auth);
router.get('/', authorizeRole(['super_admin', 'admin']), getVanData);

module.exports = router;
