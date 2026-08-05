-- Migration 29: Add BLA preview summary to mixed_download_requests
ALTER TABLE mixed_download_requests ADD COLUMN IF NOT EXISTS bla_summary JSONB;
ALTER TABLE mixed_download_requests ADD COLUMN IF NOT EXISTS disposition TEXT[];
