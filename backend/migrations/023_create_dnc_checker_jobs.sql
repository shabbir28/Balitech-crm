-- Migration: Create dnc_checker_jobs table
-- Run: psql -U postgres -d crm-database -f migrations/023_create_dnc_checker_jobs.sql

CREATE TABLE IF NOT EXISTS dnc_checker_jobs (
    id               BIGSERIAL PRIMARY KEY,
    campaign         VARCHAR(100)  NOT NULL,
    file_name        VARCHAR(255)  NOT NULL,
    original_file_name VARCHAR(255),
    total_rows       INTEGER       DEFAULT 0,
    matched          INTEGER       DEFAULT 0,
    clean            INTEGER       DEFAULT 0,
    invalid          INTEGER       DEFAULT 0,
    duplicates       INTEGER       DEFAULT 0,
    status           VARCHAR(50)   DEFAULT 'completed',
    source           VARCHAR(100)  DEFAULT 'checkdncnumber.com',
    clean_file_url   TEXT,
    matched_file_url TEXT,
    report_file_url  TEXT,
    checked_at       TIMESTAMPTZ   DEFAULT CURRENT_TIMESTAMP,
    created_at       TIMESTAMPTZ   DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_dnc_checker_jobs_campaign   ON dnc_checker_jobs (campaign);
CREATE INDEX IF NOT EXISTS idx_dnc_checker_jobs_checked_at ON dnc_checker_jobs (checked_at DESC);

-- Done
SELECT 'dnc_checker_jobs table created successfully.' AS result;
