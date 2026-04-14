const db = require("../config/db");

// GET /api/notifications — current user ke notifications
const getNotifications = async (req, res) => {
  try {
    const result = await db.query(
      `SELECT * FROM notifications
             WHERE user_id = $1
             ORDER BY created_at DESC
             LIMIT 50`,
      [req.user.id],
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Get Notifications Error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// GET /api/notifications/unread-count
const getUnreadCount = async (req, res) => {
  try {
    const result = await db.query(
      `SELECT COUNT(*) FROM notifications WHERE user_id=$1 AND is_read=FALSE`,
      [req.user.id],
    );
    res.json({ count: parseInt(result.rows[0].count) });
  } catch (err) {
    console.error("Unread Count Error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// PATCH /api/notifications/:id/read — mark one as read
const markAsRead = async (req, res) => {
  try {
    await db.query(
      `UPDATE notifications SET is_read=TRUE WHERE id=$1 AND user_id=$2`,
      [req.params.id, req.user.id],
    );
    res.json({ message: "Marked as read" });
  } catch (err) {
    console.error("Mark Read Error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// PATCH /api/notifications/read-all — mark all as read
const markAllAsRead = async (req, res) => {
  try {
    await db.query(
      `UPDATE notifications SET is_read=TRUE WHERE user_id=$1 AND is_read=FALSE`,
      [req.user.id],
    );
    res.json({ message: "All marked as read" });
  } catch (err) {
    console.error("Mark All Read Error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ── Internal helper: create a notification (used by other controllers) ──
const createNotification = async (
  user_id,
  type,
  title,
  message,
  reference_id = null,
) => {
  try {
    await db.query(
      `INSERT INTO notifications (user_id, type, title, message, reference_id)
             VALUES ($1, $2, $3, $4, $5)`,
      [user_id, type, title, message, reference_id],
    );
  } catch (err) {
    console.error("Create Notification Error:", err);
  }
};

module.exports = {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  createNotification,
};
