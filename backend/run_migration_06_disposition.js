const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL
});

const runMigration = async () => {
    try {
        console.log('Adding disposition column to leads table...');
        await pool.query('ALTER TABLE leads ADD COLUMN IF NOT EXISTS disposition VARCHAR(255);');
        console.log('Migration completed successfully.');
    } catch (err) {
        console.error('Migration failed:', err);
    } finally {
        await pool.end();
    }
};

runMigration();
