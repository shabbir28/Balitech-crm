require('dotenv').config();
const db = require('./src/config/db');

db.query('SELECT phone FROM leads LIMIT 15')
  .then(res => console.log('Phones:', res.rows))
  .catch(err => console.error('ERROR:', err))
  .finally(() => process.exit(0));
