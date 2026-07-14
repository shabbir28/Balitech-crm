require('dotenv').config();
const db = require('./src/config/db');

db.query('UPDATE van_campaigns SET name=$1, description=$2, status=COALESCE($3,status) WHERE campaign_id=$4 RETURNING *', ['test', 'desc', 'Active', 1])
  .then(res => console.log('success:', res.rows))
  .catch(err => console.error('ERROR:', err.message))
  .finally(() => process.exit(0));
