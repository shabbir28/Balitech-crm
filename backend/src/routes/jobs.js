const express = require('express');
const router = express.Router();
const { createJob } = require('../controllers/jobController');
const upload = require('../middleware/upload');
const auth = require('../middleware/auth');
const authorizeRole = require('../middleware/role');

router.post('/', auth, authorizeRole(['super_admin', 'admin']), upload.single('file'), createJob);

module.exports = router;
