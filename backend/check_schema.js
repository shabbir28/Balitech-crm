const db = require('./src/config/db');

async function run() {
    const res = await db.query(`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'premium_dnc_numbers'`);
    console.log("premium_dnc_numbers:", res.rows);
    
    const res2 = await db.query(`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'premium_download_logs'`);
    console.log("premium_download_logs:", res2.rows);

    const res3 = await db.query(`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'premium_data'`);
    console.log("premium_data:", res3.rows);

    process.exit(0);
}

run();
