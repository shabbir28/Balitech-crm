const db = require('./src/config/db');
db.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'dnc_single_checks'")
  .then(res => { console.log(res.rows); process.exit(0); })
  .catch(err => { console.error(err); process.exit(1); });
