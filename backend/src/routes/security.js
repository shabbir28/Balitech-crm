const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/auth');
const checkRole = require('../middleware/role');
const {
    getWhitelistedIPs,
    addWhitelistedIP,
    updateWhitelistedIP,
    deleteWhitelistedIP
} = require('../controllers/securityController');

// Only Super Admins can manage the security/whitelist settings
router.use(verifyToken);
router.use(checkRole(['super_admin']));

router.get('/', getWhitelistedIPs);
router.post('/', addWhitelistedIP);
router.put('/:id', updateWhitelistedIP);
router.delete('/:id', deleteWhitelistedIP);

module.exports = router;
