const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool({
  user: process.env.DB_USER || "postgres",
  host: process.env.DB_HOST || "localhost",
  database: process.env.DB_NAME || "bpo_crm",
  password: String(process.env.DB_PASSWORD || "postgres"),
  port: Number(process.env.DB_PORT || 5432),
});

const resetData = async () => {
  try {
    console.log("Starting full database reset (preserving super_admin)...");

    // 1. Clear all data tables using TRUNCATE CASCADE
    // This handles foreign key constraints automatically.
    await pool.query(`
      TRUNCATE TABLE
        leads,
        download_logs,
        upload_jobs,
        upload_sessions,
        campaigns,
        vendors,
        dnc_numbers
      RESTART IDENTITY
      CASCADE;
    `);

    console.log("Data tables cleared.");

    // 2. Clear users except super_admin
    const result = await pool.query(`
      DELETE FROM users
      WHERE role != 'super_admin';
    `);

    console.log(`Deleted ${result.rowCount} non-admin users.`);
    console.log("Database reset successfully.");

  } catch (err) {
    console.error("Failed to reset database:", err);
  } finally {
    await pool.end();
  }
};

resetData();
