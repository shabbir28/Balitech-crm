-- Migration 27: Add BLA preview summary to premium_download_requests
ALTER TABLE premium_download_requests ADD COLUMN IF NOT EXISTS bla_summary JSONB;
ALTER TABLE premium_download_requests ADD COLUMN IF NOT EXISTS disposition TEXT[];
