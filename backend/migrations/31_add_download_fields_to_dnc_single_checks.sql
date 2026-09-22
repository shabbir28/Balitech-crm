-- Migration: 31_add_download_fields_to_dnc_single_checks.sql
-- Description: Add is_downloaded and downloaded_at fields to dnc_single_checks table

ALTER TABLE dnc_single_checks 
    ADD COLUMN IF NOT EXISTS is_downloaded BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS downloaded_at TIMESTAMPTZ NULL;

CREATE INDEX IF NOT EXISTS idx_dnc_single_checks_is_downloaded 
    ON dnc_single_checks (is_downloaded);

CREATE INDEX IF NOT EXISTS idx_dnc_single_checks_downloaded_at 
    ON dnc_single_checks (downloaded_at);
