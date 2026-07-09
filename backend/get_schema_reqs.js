const db = require('./src/config/db');
db.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'premium_download_requests'")
  .then(res => {
    console.table(res.rows);
    process.exit(0);
  })
  .catch(e => {
    console.error(e);
    process.exit(1);
  });
