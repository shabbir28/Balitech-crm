-- Migration: Add per-file processing stats to upload_jobs
ALTER TABLE upload_jobs
    ADD COLUMN IF NOT EXISTS fresh_count       INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS existing_count    INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS duplicates_in_file INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS dnc_skipped       INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS dnc_skipped_dnc   INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS dnc_skipped_sale  INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS inserted          INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS updated           INTEGER DEFAULT 0;
