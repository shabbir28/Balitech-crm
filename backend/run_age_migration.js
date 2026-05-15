const { Pool } = require("pg");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

const pool = new Pool({
  user: process.env.DB_USER || "postgres",
  host: process.env.DB_HOST || "localhost",
  database: process.env.DB_NAME || "bpo_crm",
  password: String(process.env.DB_PASSWORD || "postgres"),
  port: Number(process.env.DB_PORT || 5432),
});

const runMigration = async () => {
  try {
    const sql = fs.readFileSync(path.join(__dirname, "migrations", "13_add_age_to_leads.sql"), "utf8");
    console.log("Running migration...");
    await pool.query(sql);
    console.log("Migration completed successfully.");
  } catch (err) {
    console.error("Migration failed:", err);
  } finally {
    await pool.end();
  }
};

runMigration();
