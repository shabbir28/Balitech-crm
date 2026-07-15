const db = require('./src/config/db');
db.query('SELECT * FROM users WHERE email=$1 OR username=$1', ['sad@gmail.com'])
  .then(res => { console.log(res.rows); process.exit(0); })
  .catch(err => { console.error(err); process.exit(1); });
