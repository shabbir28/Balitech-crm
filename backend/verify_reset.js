const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: String(process.env.DB_PASSWORD),
  port: Number(process.env.DB_PORT),
});

const verify = async () => {
  const tables = [
    "leads",
    "vendors",
    "users",
    "download_logs",
    "upload_sessions",
    "upload_jobs",
    "campaigns",
    "dnc_numbers"
  ];

  for (const table of tables) {
    try {
      const res = await pool.query(`SELECT COUNT(*) FROM ${table}`);
      console.log(`Table ${table}: ${res.rows[0].count} records`);
    } catch (err) {
      console.error(`Error checking ${table}: ${err.message}`);
    }
  }
  await pool.end();
};

verify();
