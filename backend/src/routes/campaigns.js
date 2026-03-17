const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { 
    createCampaign, 
    getCampaigns, 
    getCampaignById, 
    updateCampaign, 
    deleteCampaign 
} = require('../controllers/campaignController');
const auth = require('../middleware/auth');
const authorizeRole = require('../middleware/role');

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, '../../uploads/campaigns');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer config
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname));
    }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
    fileFilter: function (req, file, cb) {
        const allowedTypes = /jpeg|jpg|png|pdf/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);

        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error('Only standard image files and PDFs are allowed!'));
        }
    }
});

router.use(auth);

// super_admin, admin, data_entry can view campaigns (needed for data entry when uploading leads)
router.get('/', authorizeRole(['super_admin', 'admin', 'data_entry']), getCampaigns);
router.get('/:id', authorizeRole(['super_admin', 'admin', 'data_entry']), getCampaignById);

// Only super_admin and admin can create/update/delete campaigns
router.post('/', authorizeRole(['super_admin', 'admin']), upload.single('attachment'), createCampaign);
router.put('/:id', authorizeRole(['super_admin', 'admin']), upload.single('attachment'), updateCampaign);
router.delete('/:id', authorizeRole(['super_admin', 'admin']), deleteCampaign);

module.exports = router;
