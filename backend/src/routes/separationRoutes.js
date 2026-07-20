const express = require('express');
const router = express.Router();
const separationController = require('../controllers/separationController');
const verifyToken = require('../middleware/auth');
const upload = require('../middleware/upload');

// Create session (which binds campaign and client)
router.post('/sessions', verifyToken, separationController.createSession);
router.get('/sessions', verifyToken, separationController.getSessions);

// Upload job for separation
router.post('/upload', verifyToken, upload.single('file'), separationController.uploadFile);
router.get('/jobs/:jobId/status', verifyToken, separationController.getJobStatus);

// Data viewing, deletion, and download
router.get('/', verifyToken, separationController.getData);
router.delete('/:id', verifyToken, separationController.deleteData);
router.get('/export-count', verifyToken, separationController.getExportCount);
router.post('/download', verifyToken, separationController.downloadData);

module.exports = router;
