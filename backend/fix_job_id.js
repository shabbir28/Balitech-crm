const db = require('./src/config/db.js');
async function run() {
    const tables = ['download_requests', 'premium_download_requests', 'refine_download_requests', 'van_download_requests'];
    for (const table of tables) {
        try {
            await db.query(`ALTER TABLE ${table} DROP CONSTRAINT IF EXISTS ${table}_job_id_fkey`);
            await db.query(`ALTER TABLE ${table} ALTER COLUMN job_id TYPE uuid[] USING CASE WHEN job_id IS NULL THEN NULL ELSE ARRAY[job_id] END`);
            console.log(`Fixed ${table}`);
        } catch (e) {
            console.log(`Error on ${table}: ${e.message}`);
        }
    }
    process.exit(0);
}
run();
