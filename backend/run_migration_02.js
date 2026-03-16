const db = require('./src/config/db');
const fs = require('fs');
const path = require('path');

async function migrate() {
    try {
        const sql = fs.readFileSync(path.join(__dirname, 'migrations', '02_upload_sessions_jobs.sql'), 'utf8');
        await db.query(sql);
        console.log('Migration successful: Created upload_sessions and upload_jobs tables.');
        process.exit(0);
    } catch (err) {
        console.error('Migration failed:', err);
        process.exit(1);
    }
}
migrate();
