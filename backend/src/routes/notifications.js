const express = require('express');
const router = express.Router();
const {
    getNotifications,
    getUnreadCount,
    markAsRead,
    markAllAsRead
} = require('../controllers/notificationController');
const auth = require('../middleware/auth');

router.get('/', auth, getNotifications);
router.get('/unread-count', auth, getUnreadCount);
router.patch('/read-all', auth, markAllAsRead);
router.patch('/:id/read', auth, markAsRead);

module.exports = router;
