const db = require('./src/config/db');

async function run() {
  try {
    const res = await db.query("SELECT * FROM refine_data LIMIT 5");
    console.log("Records:", res.rows);
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}
run();
