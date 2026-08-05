-- Migration 26: Add BLA preview summary to van_download_requests
ALTER TABLE van_download_requests ADD COLUMN IF NOT EXISTS bla_summary JSONB;
ALTER TABLE van_download_requests ADD COLUMN IF NOT EXISTS disposition TEXT[];
