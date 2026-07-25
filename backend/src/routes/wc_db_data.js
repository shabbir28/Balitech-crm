const express = require('express');
const router = express.Router();
const { getWcDbData } = require('../controllers/wcDbDataController');
const auth = require('../middleware/auth');
const authorizeRole = require('../middleware/role');

router.use(auth);
router.get('/', authorizeRole(['super_admin', 'admin']), getWcDbData);

module.exports = router;
