const express = require('express');
const router = express.Router();
const { 
  downloadVanData, 
  getStateCounts, 
  getAlreadyDownloaded, 
  getDownloadFile,
  createDownloadRequest,
  getDownloadRequests,
  getMyDownloadRequests,
  reviewDownloadRequest,
  executeApprovedDownload
} = require('../controllers/vanDownloadController');
const auth = require('../middleware/auth');
const authorizeRole = require('../middleware/role');

router.use(auth);

// SuperAdmin direct download
router.post('/', authorizeRole(['super_admin']), downloadVanData);

// Admin & Data Entry request flow
router.post('/request', authorizeRole(['admin', 'data_entry']), createDownloadRequest);
router.get('/requests/mine', authorizeRole(['admin', 'data_entry']), getMyDownloadRequests);
router.get('/requests', authorizeRole(['super_admin']), getDownloadRequests);
router.patch('/requests/:id', authorizeRole(['super_admin']), reviewDownloadRequest);
router.get('/requests/:id/file', authorizeRole(['admin', 'data_entry']), executeApprovedDownload);

// Common
router.post('/state-counts', authorizeRole(['super_admin', 'admin', 'data_entry']), getStateCounts);
router.get('/already-downloaded', authorizeRole(['super_admin', 'admin', 'data_entry']), getAlreadyDownloaded);
router.get('/logs/:id/file', authorizeRole(['super_admin', 'admin', 'data_entry']), getDownloadFile);

module.exports = router;
