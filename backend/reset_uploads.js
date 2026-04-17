const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool({
  user: process.env.DB_USER || "postgres",
  host: process.env.DB_HOST || "localhost",
  database: process.env.DB_NAME || "bpo_crm",
  password: String(process.env.DB_PASSWORD || "postgres"),
  port: Number(process.env.DB_PORT || 5432),
});

const resetUploads = async () => {
  try {
    console.log("Starting reset of uploaded data only...");

    // Clear only the uploaded data tables
    await pool.query(`
      TRUNCATE TABLE
        leads,
        upload_jobs,
        upload_sessions,
        download_logs
      RESTART IDENTITY
      CASCADE;
    `);

    console.log("Uploaded data tables cleared successfully.");

  } catch (err) {
    console.error("Failed to reset uploaded data:", err);
  } finally {
    await pool.end();
  }
};

resetUploads();
