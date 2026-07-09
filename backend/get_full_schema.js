const db = require('./src/config/db');
async function run() {
  const tables = [
    'premium_vendors', 'premium_campaigns', 'premium_sessions',
    'premium_jobs', 'premium_data', 'premium_dnc_numbers',
    'premium_download_requests', 'premium_download_logs'
  ];
  let result = {};
  for (const t of tables) {
    const res = await db.query(`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = '${t}'`);
    result[t] = res.rows;
  }
  console.log(JSON.stringify(result, null, 2));
  process.exit(0);
}
run();
