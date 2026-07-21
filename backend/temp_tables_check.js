const db = require('./src/config/db');
db.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public'")
  .then(res => { console.log(res.rows); process.exit(0); })
  .catch(err => { console.error(err); process.exit(1); });
