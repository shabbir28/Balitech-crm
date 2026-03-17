-- Migration 05: Add created_by to upload_sessions
ALTER TABLE upload_sessions 
ADD COLUMN IF NOT EXISTS created_by INTEGER REFERENCES users(id) ON DELETE SET NULL;
