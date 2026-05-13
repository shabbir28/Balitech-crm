const db = require('../config/db');
db.query("SELECT tablename, indexname, indexdef FROM pg_indexes WHERE schemaname = 'public';")
  .then(res => { console.table(res.rows); process.exit(0); })
  .catch(err => { console.error(err); process.exit(1); });
