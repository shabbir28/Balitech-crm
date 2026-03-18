const express = require('express');
const router = express.Router();
const { createSession, getSession, listSessions, deleteSession } = require('../controllers/sessionController');
const auth = require('../middleware/auth');
const authorizeRole = require('../middleware/role');

router.post('/', auth, authorizeRole(['super_admin', 'admin']), createSession);
router.get('/', auth, authorizeRole(['super_admin', 'admin']), listSessions);
router.get('/:id', auth, authorizeRole(['super_admin', 'admin']), getSession);
router.delete('/:id', auth, authorizeRole(['super_admin', 'admin']), deleteSession);

module.exports = router;
