const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL
});

const clearLeads = async () => {
    try {
        console.log('Clearing old leads to allow testing of the new file parser...');
        // Truncate leads table to clear existing rows safely
        await pool.query('TRUNCATE TABLE leads RESTART IDENTITY CASCADE;');
        console.log('Leads table cleared successfully.');
    } catch (err) {
        console.error('Failed to clear leads:', err);
    } finally {
        await pool.end();
    }
};

clearLeads();
