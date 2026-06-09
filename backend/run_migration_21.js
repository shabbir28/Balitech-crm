const fs = require("fs");
const path = require("path");
const db = require("./src/config/db");

(async () => {
  const migrationsToRun = [
    "21_refine_vendors_campaigns.sql"
  ];

  console.log("Starting migrations...");

  try {
    for (const file of migrationsToRun) {
      const sqlPath = path.join(__dirname, "migrations", file);
      const sql = fs.readFileSync(sqlPath, "utf8");
      await db.query(sql);
      console.log(`✅ ${file} applied successfully.`);
    }
    process.exit(0);
  } catch (err) {
    console.error("\n❌ Migration failed:", err.message);
    process.exit(1);
  }
})();
