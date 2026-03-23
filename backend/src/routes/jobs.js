const express = require('express');
const router = express.Router();
const { createJob, compareJob, uploadFreshJob } = require('../controllers/jobController');
const upload = require('../middleware/upload');
const auth = require('../middleware/auth');
const authorizeRole = require('../middleware/role');

router.post('/', auth, authorizeRole(['super_admin', 'admin']), upload.single('file'), createJob);
router.post(
  '/compare',
  auth,
  authorizeRole(['super_admin', 'admin']),
  upload.single('file'),
  compareJob
);

router.post(
  '/upload-fresh',
  auth,
  authorizeRole(['super_admin', 'admin']),
  upload.single('file'),
  uploadFreshJob
);

module.exports = router;
