-- Add age filters to download_requests table
ALTER TABLE download_requests ADD COLUMN IF NOT EXISTS min_age INTEGER;
ALTER TABLE download_requests ADD COLUMN IF NOT EXISTS max_age INTEGER;
