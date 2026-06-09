const fs = require("fs");
const path = require("path");
const db = require("./src/config/db");

(async () => {
  const migrationsToRun = [
    "20_refine_data_module.sql"
  ];

  console.log("Starting latest migrations...");

  try {
    for (const file of migrationsToRun) {
      const sqlPath = path.join(__dirname, "migrations", file);
      const sql = fs.readFileSync(sqlPath, "utf8");
      
      console.log(`\nRunning migration: ${file}...`);
      await db.query(sql);
      console.log(`✅ ${file} applied successfully.`);
    }
    
    console.log("\n🎉 All latest migrations completed successfully.");
    process.exit(0);
  } catch (err) {
    console.error("\n❌ Migration failed:", err.message);
    process.exit(1);
  }
})();
