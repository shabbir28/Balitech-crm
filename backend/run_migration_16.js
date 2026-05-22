/**
 * Run migration 16 (download performance indexes).
 * Usage: node run_migration_16.js
 *
 * Creates indexes on the leads table to speed up large downloads (100k+ rows).
 * Safe to run multiple times (IF NOT EXISTS).
 */
const fs = require("fs");
const path = require("path");
const db = require("./src/config/db");

(async () => {
  const sqlPath = path.join(__dirname, "migrations", "16_download_perf_indexes.sql");
  const sql = fs.readFileSync(sqlPath, "utf8");

  console.log("Running migration 16 — download performance indexes...");
  console.log("This may take a few minutes on a large `leads` table.\n");

  try {
    await db.query(sql);
    console.log("Migration 16 applied successfully.");
    process.exit(0);
  } catch (err) {
    console.error("Migration 16 failed:", err.message);
    process.exit(1);
  }
})();
