const express = require('express');
const router = express.Router();
const { createVendor, getVendors, updateVendor, deleteVendor } = require('../controllers/vendorController');
const auth = require('../middleware/auth');
const authorizeRole = require('../middleware/role');

// All vendor routes require authentication
router.use(auth);

// super_admin, admin, data_entry can view vendors (data_entry needs it for vendor add)
router.get('/', authorizeRole(['super_admin', 'admin', 'data_entry']), getVendors);

// super_admin, admin, and data_entry can create vendors
router.post('/', authorizeRole(['super_admin', 'admin', 'data_entry']), createVendor);

// Only super_admin and admin can update/delete vendors
router.put('/:id', authorizeRole(['super_admin', 'admin']), updateVendor);
router.delete('/:id', authorizeRole(['super_admin', 'admin']), deleteVendor);

module.exports = router;
