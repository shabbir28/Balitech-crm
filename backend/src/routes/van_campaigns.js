const express = require('express');
const router = express.Router();
const { createCampaign, getCampaigns, getCampaign, updateCampaign, deleteCampaign } = require('../controllers/vanCampaignController');
const auth = require('../middleware/auth');
const authorizeRole = require('../middleware/role');

router.use(auth);
router.get('/', authorizeRole(['super_admin', 'admin']), getCampaigns);
router.get('/:id', authorizeRole(['super_admin', 'admin']), getCampaign);
router.post('/', authorizeRole(['super_admin', 'admin']), createCampaign);
router.put('/:id', authorizeRole(['super_admin', 'admin']), updateCampaign);
router.delete('/:id', authorizeRole(['super_admin', 'admin']), deleteCampaign);

module.exports = router;
