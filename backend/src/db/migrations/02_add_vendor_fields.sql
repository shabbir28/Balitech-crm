-- Migration 02: Add fields to vendors table for upgraded module
ALTER TABLE vendors 
ADD COLUMN IF NOT EXISTS phone VARCHAR(50),
ADD COLUMN IF NOT EXISTS comment TEXT,
ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'Active';
