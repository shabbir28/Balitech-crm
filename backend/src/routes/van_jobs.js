const express = require('express');
const router = express.Router();
const { createJob, getJobStatus, compareJob, uploadFresh } = require('../controllers/vanJobController');
const auth = require('../middleware/auth');
const authorizeRole = require('../middleware/role');
const upload = require('../middleware/upload');

router.use(auth);
router.post('/', authorizeRole(['super_admin', 'admin', 'data_entry', 'dialer_agent']), upload.single('file'), createJob);
router.post('/compare', authorizeRole(['super_admin', 'admin', 'data_entry', 'dialer_agent']), upload.single('file'), compareJob);
router.post('/upload-fresh', authorizeRole(['super_admin', 'admin', 'data_entry', 'dialer_agent']), upload.single('file'), uploadFresh);
router.get('/:jobId/status', authorizeRole(['super_admin', 'admin', 'data_entry', 'dialer_agent']), getJobStatus);

module.exports = router;
