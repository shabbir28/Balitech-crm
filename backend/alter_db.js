const db = require('./src/config/db');

async function run() {
  try {
    await db.query('ALTER TABLE refine_data ADD COLUMN IF NOT EXISTS call_date TIMESTAMP, ADD COLUMN IF NOT EXISTS duration INTEGER;');
    console.log("Columns added successfully");
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}
run();
