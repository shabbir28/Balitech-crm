const express = require('express');
const router = express.Router();
const { createSession, getSession } = require('../controllers/sessionController');
const auth = require('../middleware/auth');
const authorizeRole = require('../middleware/role');

router.post('/', auth, authorizeRole(['admin']), createSession);
router.get('/:id', auth, authorizeRole(['admin']), getSession);

module.exports = router;
