const db = require('./src/config/db');
db.query('TRUNCATE TABLE premium_data RESTART IDENTITY CASCADE;')
  .then(() => {
    console.log('Deleted all premium data');
    process.exit(0);
  })
  .catch(e => {
    console.error(e);
    process.exit(1);
  });
