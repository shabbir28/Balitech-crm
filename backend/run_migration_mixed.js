const { Client } = require("pg");
require("dotenv").config();

const db = new Client({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

async function runMigration() {
  try {
    await db.connect();
    console.log("Connected to database.");
    
    await db.query(`
      CREATE TABLE IF NOT EXISTS mixed_download_logs (
          id SERIAL PRIMARY KEY,
          user_id INT REFERENCES users(id) ON DELETE SET NULL,
          quantity INT NOT NULL,
          van_percentage INT,
          refine_percentage INT,
          premium_percentage INT,
          states JSONB,
          min_age INT,
          max_age INT,
          csv_payload JSONB,
          download_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log("Created mixed_download_logs table.");

    await db.query(`
      CREATE TABLE IF NOT EXISTS mixed_download_requests (
          id SERIAL PRIMARY KEY,
          admin_id INT REFERENCES users(id) ON DELETE CASCADE,
          campaign_id UUID,
          quantity INT NOT NULL,
          van_percentage INT,
          refine_percentage INT,
          premium_percentage INT,
          states JSONB,
          min_age INT,
          max_age INT,
          min_duration INT,
          max_duration INT,
          include_downloaded BOOLEAN DEFAULT false,
          status VARCHAR(50) DEFAULT 'pending',
          rejection_reason TEXT,
          csv_data JSONB,
          requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          reviewed_at TIMESTAMP,
          reviewed_by INT REFERENCES users(id) ON DELETE SET NULL
      );
    `);
    console.log("Created mixed_download_requests table.");
    
  } catch (err) {
    console.error("Migration failed:", err);
  } finally {
    await db.end();
  }
}

runMigration();
