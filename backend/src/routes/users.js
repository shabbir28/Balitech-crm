const express = require('express');
const router = express.Router();
const { getUsers, getUserById, createUser, updateUser, deleteUser } = require('../controllers/userController');
const auth = require('../middleware/auth');
const authorizeRole = require('../middleware/role');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure upload directory exists
const uploadDir = path.join(__dirname, '../../uploads/profiles');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => {
        const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, unique + path.extname(file.originalname));
    }
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

router.use(auth);

// List users — super_admin and admin
router.get('/', authorizeRole(['super_admin', 'admin']), getUsers);

// Get single user
router.get('/:id', authorizeRole(['super_admin', 'admin']), getUserById);

// Create user — super_admin only
router.post('/', authorizeRole(['super_admin']), upload.single('profile_picture'), createUser);

// Update user — super_admin only
router.put('/:id', authorizeRole(['super_admin']), upload.single('profile_picture'), updateUser);

// Delete (deactivate) user — super_admin only
router.delete('/:id', authorizeRole(['super_admin']), deleteUser);

module.exports = router;
