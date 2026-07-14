const db = require('./src/config/db');

async function dump() {
  const res = await db.query("SELECT table_name, column_name, data_type FROM information_schema.columns WHERE table_name LIKE 'van_%' OR table_name = 'dead_numbers'");
  console.log(JSON.stringify(res.rows, null, 2));
  process.exit();
}
dump();
