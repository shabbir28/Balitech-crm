const db = require('./src/config/db');
db.query("SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'leads'").then(res => console.log(res.rows)).catch(console.error).finally(() => process.exit());
