const db = require('./src/config/db');

async function run() {
    const tables = ['download_requests', 'premium_download_requests', 'refine_download_requests', 'van_download_requests'];
    for (const t of tables) {
        const res = await db.query(`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = '${t}'`);
        console.log(t, ':', res.rows.map(r => r.column_name));
    }
    process.exit(0);
}

run();
