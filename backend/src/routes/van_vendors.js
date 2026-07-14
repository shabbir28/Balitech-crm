const express = require('express');
const router = express.Router();
const { createVendor, getVendors, updateVendor, deleteVendor } = require('../controllers/vanVendorController');
const auth = require('../middleware/auth');
const authorizeRole = require('../middleware/role');

router.use(auth);
router.get('/', authorizeRole(['super_admin', 'admin', 'data_entry']), getVendors);
router.post('/', authorizeRole(['super_admin', 'admin', 'data_entry']), createVendor);
router.put('/:id', authorizeRole(['super_admin', 'admin']), updateVendor);
router.delete('/:id', authorizeRole(['super_admin', 'admin']), deleteVendor);

module.exports = router;
