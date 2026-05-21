-- Migration 16: Ensure all upload_jobs columns exist (safe re-run)
-- Run this on server if migration 11 was never applied

ALTER TABLE upload_jobs
    ADD COLUMN IF NOT EXISTS fresh_count        INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS existing_count     INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS duplicates_in_file INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS dnc_skipped        INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS dnc_skipped_dnc    INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS dnc_skipped_sale   INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS inserted           INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS updated            INTEGER DEFAULT 0;

-- Verify: show current upload_jobs columns
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'upload_jobs'
ORDER BY ordinal_position;
