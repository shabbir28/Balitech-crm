const express = require('express');
const router = express.Router();
const { createVendor, getVendors, updateVendor, deleteVendor } = require('../controllers/vendorController');
const auth = require('../middleware/auth');
const authorizeRole = require('../middleware/role');

// All vendor routes require authentication
router.use(auth);

// Both Admin and Agent need to get vendors to download leads
router.get('/', authorizeRole(['admin', 'agent']), getVendors);

// Only admins can create, update, delete vendors
router.post('/', authorizeRole(['admin']), createVendor);
router.put('/:id', authorizeRole(['admin']), updateVendor);
router.delete('/:id', authorizeRole(['admin']), deleteVendor);

module.exports = router;
