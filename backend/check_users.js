const db = require("./src/config/db");

(async () => {
  try {
    const res = await db.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'users';
    `);
    console.log(res.rows);
  } catch (err) {
    console.error(err);
  } finally {
    process.exit();
  }
})();
