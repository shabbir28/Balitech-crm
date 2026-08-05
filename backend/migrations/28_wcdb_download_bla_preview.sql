-- Migration 28: Add BLA preview summary to wc_db_download_requests
ALTER TABLE wc_db_download_requests ADD COLUMN IF NOT EXISTS bla_summary JSONB;
ALTER TABLE wc_db_download_requests ADD COLUMN IF NOT EXISTS disposition TEXT[];
