const express = require('express');
const router = express.Router();
const { createJob, compareJob, uploadFreshJob, getJobStatus } = require('../controllers/jobController');
const upload = require('../middleware/upload');
const auth = require('../middleware/auth');
const authorizeRole = require('../middleware/role');

router.post('/', auth, authorizeRole(['super_admin', 'admin', 'data_entry', 'dialer_agent']), upload.single('file'), createJob);
router.post(
  '/compare',
  auth,
  authorizeRole(['super_admin', 'admin', 'data_entry', 'dialer_agent']),
  upload.single('file'),
  compareJob
);

router.post(
  '/upload-fresh',
  auth,
  authorizeRole(['super_admin', 'admin', 'data_entry', 'dialer_agent']),
  upload.single('file'),
  uploadFreshJob
);

// Polling endpoint: frontend calls this every 2s after getting 202
router.get('/:jobId/status', auth, getJobStatus);

module.exports = router;
