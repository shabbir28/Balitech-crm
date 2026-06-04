const db = require("./src/config/db");

async function checkCols() {
  try {
    const res = await db.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'leads';
    `);
    console.table(res.rows);
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}

checkCols();
