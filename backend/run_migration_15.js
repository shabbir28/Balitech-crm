const fs = require("fs");
const path = require("path");
const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool({
  user: process.env.DB_USER || "postgres",
  host: process.env.DB_HOST || "localhost",
  database: process.env.DB_NAME || "bpo_crm",
  password: process.env.DB_PASSWORD || "postgres",
  port: process.env.DB_PORT || 5432,
});

async function run() {
  const sql = fs.readFileSync(
    path.join(__dirname, "migrations", "15_download_logs_history.sql"),
    "utf8",
  );
  await pool.query(sql);
  console.log("Migration 15 successful: download_logs history columns added.");
  await pool.end();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
