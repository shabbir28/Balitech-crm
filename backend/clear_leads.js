const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool({
  user: process.env.DB_USER || "postgres",
  host: process.env.DB_HOST || "localhost",
  database: process.env.DB_NAME || "bpo_crm",
  password: String(process.env.DB_PASSWORD || "postgres"),
  port: Number(process.env.DB_PORT || 5432),
});

const clearData = async () => {
  try {
    console.log("Clearing CRM data (keeping users)...");

    // Order doesn't matter with TRUNCATE ... CASCADE, but listing explicitly is clearer.
    await pool.query(`
      TRUNCATE TABLE
        leads,
        download_logs,
        upload_jobs,
        upload_sessions,
        campaigns,
        vendors
      RESTART IDENTITY
      CASCADE;
    `);

    console.log("Data cleared successfully.");
  } catch (err) {
    console.error("Failed to clear data:", err);
  } finally {
    await pool.end();
  }
};

clearData();
