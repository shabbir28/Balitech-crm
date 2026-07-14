const express = require('express');
const router = express.Router();
const { downloadVanData, getStateCounts, getAlreadyDownloaded, getDownloadFile } = require('../controllers/vanDownloadController');
const auth = require('../middleware/auth');
const authorizeRole = require('../middleware/role');

router.use(auth);
router.post('/', authorizeRole(['super_admin', 'admin']), downloadVanData);
router.post('/state-counts', authorizeRole(['super_admin', 'admin']), getStateCounts);
router.get('/already-downloaded', authorizeRole(['super_admin', 'admin']), getAlreadyDownloaded);
router.get('/logs/:id/file', authorizeRole(['super_admin', 'admin']), getDownloadFile);

module.exports = router;
