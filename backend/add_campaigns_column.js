const db = require("./src/config/db");

(async () => {
  try {
    await db.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS accessible_campaigns JSONB DEFAULT '[]'::jsonb;`);
    console.log("Added accessible_campaigns column to users table");
  } catch (err) {
    console.error(err);
  } finally {
    process.exit();
  }
})();
