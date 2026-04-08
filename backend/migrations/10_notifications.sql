-- Migration 10: Notification System
-- Stores in-app notifications for users

CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,          -- 'download_request_new' | 'download_request_accepted' | 'download_request_rejected'
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    reference_id INTEGER,               -- download_request id
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, is_read, created_at DESC);
