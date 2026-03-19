const { Pool } = require("pg");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

const pool = new Pool({
  user: process.env.DB_USER || "postgres",
  host: process.env.DB_HOST || "localhost",
  database: process.env.DB_NAME || "bpo_crm",
  password: process.env.DB_PASSWORD || "postgres",
  port: process.env.DB_PORT || 5432,
});

async function runMigration() {
  const sql = fs.readFileSync(
    path.join(__dirname, "migrations/07_rename_bla_to_dnc.sql"),
    "utf8",
  );
  try {
    await pool.query(sql);
    console.log("✅ Migration 07_rename_bla_to_dnc.sql completed successfully!");
  } catch (err) {
    console.error("❌ Migration error:", err.message);
  } finally {
    await pool.end();
  }
}

runMigration();
