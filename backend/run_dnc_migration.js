/**
 * Migration runner: Creates the dnc_checker_jobs table.
 * Run: node run_dnc_migration.js
 */
require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    user:     process.env.DB_USER     || 'postgres',
    host:     process.env.DB_HOST     || 'localhost',
    database: process.env.DB_NAME     || 'crm-database',
    password: process.env.DB_PASSWORD || 'postgres',
    port:     parseInt(process.env.DB_PORT, 10) || 5432,
});

const sql = `
CREATE TABLE IF NOT EXISTS dnc_checker_jobs (
    id                 BIGSERIAL PRIMARY KEY,
    campaign           VARCHAR(100)  NOT NULL,
    file_name          VARCHAR(255)  NOT NULL,
    original_file_name VARCHAR(255),
    total_rows         INTEGER       DEFAULT 0,
    matched            INTEGER       DEFAULT 0,
    clean              INTEGER       DEFAULT 0,
    invalid            INTEGER       DEFAULT 0,
    duplicates         INTEGER       DEFAULT 0,
    status             VARCHAR(50)   DEFAULT 'completed',
    source             VARCHAR(100)  DEFAULT 'checkdncnumber.com',
    clean_file_url     TEXT,
    matched_file_url   TEXT,
    report_file_url    TEXT,
    checked_at         TIMESTAMPTZ   DEFAULT CURRENT_TIMESTAMP,
    created_at         TIMESTAMPTZ   DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_dnc_checker_jobs_campaign   ON dnc_checker_jobs (campaign);
CREATE INDEX IF NOT EXISTS idx_dnc_checker_jobs_checked_at ON dnc_checker_jobs (checked_at DESC);
`;

(async () => {
    const client = await pool.connect();
    try {
        console.log('Running DNC Checker migration...');
        await client.query(sql);
        console.log('✅ dnc_checker_jobs table created (or already exists).');
        console.log('✅ Indexes created.');
    } catch (err) {
        console.error('❌ Migration failed:', err.message);
        process.exit(1);
    } finally {
        client.release();
        await pool.end();
    }
})();
