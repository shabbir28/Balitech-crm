const express = require('express');
const router = express.Router();
const { createSession, getSessions, getSession, deleteSession } = require('../controllers/wcDbSessionController');
const auth = require('../middleware/auth');
const authorizeRole = require('../middleware/role');

router.use(auth);
router.get('/', authorizeRole(['super_admin', 'admin']), getSessions);
router.get('/:id', authorizeRole(['super_admin', 'admin', 'data_entry', 'dialer_agent']), getSession);
router.post('/', authorizeRole(['super_admin', 'admin', 'data_entry', 'dialer_agent']), createSession);
router.delete('/:id', authorizeRole(['super_admin', 'admin']), deleteSession);

module.exports = router;
