/**
 * Migration runner: Creates the dnc_single_checks table.
 * Run: node run_dnc_single_migration.js
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
CREATE TABLE IF NOT EXISTS dnc_single_checks (
    id                 BIGSERIAL PRIMARY KEY,
    phone_number       VARCHAR(50)   NOT NULL,
    dnc_status         VARCHAR(50)   NOT NULL,
    line_type          VARCHAR(50),
    source             VARCHAR(100)  DEFAULT 'checkdncnumber.com',
    checked_at         TIMESTAMPTZ   DEFAULT CURRENT_TIMESTAMP,
    created_at         TIMESTAMPTZ   DEFAULT CURRENT_TIMESTAMP
);

-- In case table already exists without line_type, ip_address, is_already_present, we can safely attempt to add them
ALTER TABLE dnc_single_checks ADD COLUMN IF NOT EXISTS line_type VARCHAR(50);
ALTER TABLE dnc_single_checks ADD COLUMN IF NOT EXISTS ip_address VARCHAR(45);
ALTER TABLE dnc_single_checks ADD COLUMN IF NOT EXISTS is_already_present BOOLEAN DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_dnc_single_checks_phone_number ON dnc_single_checks (phone_number);
CREATE INDEX IF NOT EXISTS idx_dnc_single_checks_checked_at ON dnc_single_checks (checked_at DESC);
`;

(async () => {
    const client = await pool.connect();
    try {
        console.log('Running DNC Single Checker migration...');
        await client.query(sql);
        console.log('✅ dnc_single_checks table created (or already exists).');
        console.log('✅ Indexes created.');
    } catch (err) {
        console.error('❌ Migration failed:', err.message);
        process.exit(1);
    } finally {
        client.release();
        await pool.end();
    }
})();
