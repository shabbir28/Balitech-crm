const express = require('express');
const router = express.Router();
const { createVendor, getVendors, updateVendor, deleteVendor, getVendorFiles } = require('../controllers/premiumVendorController');
const auth = require('../middleware/auth');
const authorizeRole = require('../middleware/role');

// All vendor routes require authentication
router.use(auth);

// super_admin, admin, data_entry can view premium_vendors (data_entry needs it for vendor add)
router.get('/', authorizeRole(['super_admin', 'admin', 'data_entry', 'dialer_agent']), getVendors);

// Get vendor files list
router.get('/:id/files', authorizeRole(['super_admin', 'admin', 'data_entry', 'dialer_agent']), getVendorFiles);

// super_admin, admin, and data_entry can create premium_vendors
router.post('/', authorizeRole(['super_admin', 'admin', 'data_entry', 'dialer_agent']), createVendor);

// Only super_admin and admin can update/delete premium_vendors
router.put('/:id', authorizeRole(['super_admin', 'admin']), updateVendor);
router.delete('/:id', authorizeRole(['super_admin', 'admin']), deleteVendor);

module.exports = router;
