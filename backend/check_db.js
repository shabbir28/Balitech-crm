const db = require("./src/config/db");

async function checkConstraints() {
  try {
    const res = await db.query(`
      SELECT
        tc.constraint_name,
        tc.constraint_type,
        kcu.column_name
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
      WHERE tc.table_name = 'leads' AND tc.constraint_type IN ('UNIQUE', 'PRIMARY KEY');
    `);
    console.log("Constraints on leads table:");
    console.table(res.rows);
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}

checkConstraints();
