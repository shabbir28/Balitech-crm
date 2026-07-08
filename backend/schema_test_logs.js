const db = require('./src/config/db');
db.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'download_logs'").then(res => console.log(res.rows)).catch(console.error).finally(() => process.exit());
