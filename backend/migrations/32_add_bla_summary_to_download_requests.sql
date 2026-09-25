-- Migration 32: Add bla_summary and requested_quantity to download_requests
ALTER TABLE download_requests ADD COLUMN IF NOT EXISTS bla_summary JSONB;
ALTER TABLE download_requests ADD COLUMN IF NOT EXISTS requested_quantity INTEGER;
