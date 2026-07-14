const db = require('./src/config/db');
db.query("ALTER TABLE dead_numbers ADD CONSTRAINT unique_phone_dead_numbers UNIQUE(phone)")
  .then(r => console.log('Constraint added'))
  .catch(e => console.error(e))
  .finally(() => process.exit());
