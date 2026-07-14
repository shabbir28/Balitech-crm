const express = require('express');
const router = express.Router();
const { createSession, getSessions, getSession } = require('../controllers/vanSessionController');
const auth = require('../middleware/auth');
const authorizeRole = require('../middleware/role');

router.use(auth);
router.get('/', authorizeRole(['super_admin', 'admin']), getSessions);
router.get('/:id', authorizeRole(['super_admin', 'admin', 'data_entry']), getSession);
router.post('/', authorizeRole(['super_admin', 'admin', 'data_entry']), createSession);

module.exports = router;
