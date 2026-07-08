const express = require('express');
const router = express.Router();
const { createSession, getSession, listSessions, deleteSession } = require('../controllers/premiumSessionController');
const auth = require('../middleware/auth');
const authorizeRole = require('../middleware/role');

router.post('/', auth, authorizeRole(['super_admin', 'admin', 'data_entry']), createSession);
router.get('/', auth, authorizeRole(['super_admin', 'admin', 'data_entry']), listSessions);
router.get('/:id', auth, authorizeRole(['super_admin', 'admin', 'data_entry']), getSession);
router.delete('/:id', auth, authorizeRole(['super_admin', 'admin']), deleteSession);

module.exports = router;
