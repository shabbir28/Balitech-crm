const db = require("./src/config/db");

(async () => {
  const queries = [
    // 1. premium_data
    `ALTER TABLE premium_data ADD COLUMN IF NOT EXISTS disposition VARCHAR(255);`,
    `ALTER TABLE premium_data ADD COLUMN IF NOT EXISTS dob VARCHAR(255);`,
    `ALTER TABLE premium_data ADD COLUMN IF NOT EXISTS zipcode VARCHAR(255);`,
    `ALTER TABLE premium_data ADD COLUMN IF NOT EXISTS jornaya_lead_id VARCHAR(255);`,
    `ALTER TABLE premium_data ADD COLUMN IF NOT EXISTS state VARCHAR(255);`,
    `ALTER TABLE premium_data ADD COLUMN IF NOT EXISTS caller_id VARCHAR(255);`,
    `ALTER TABLE premium_data ADD COLUMN IF NOT EXISTS duration INTEGER;`,

    // 2. premium_download_requests
    `ALTER TABLE premium_download_requests ADD COLUMN IF NOT EXISTS min_duration INTEGER;`,
    `ALTER TABLE premium_download_requests ADD COLUMN IF NOT EXISTS max_duration INTEGER;`,

    // 3. premium_download_logs
    `ALTER TABLE premium_download_logs ADD COLUMN IF NOT EXISTS min_duration INTEGER;`,
    `ALTER TABLE premium_download_logs ADD COLUMN IF NOT EXISTS max_duration INTEGER;`,

    // 4. premium_vendors (Just in case these are missing too)
    `ALTER TABLE premium_vendors ADD COLUMN IF NOT EXISTS phone VARCHAR(50);`,
    `ALTER TABLE premium_vendors ADD COLUMN IF NOT EXISTS comment TEXT;`,
    `ALTER TABLE premium_vendors ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'Active';`
  ];

  console.log("Applying updates to existing Premium Data tables...");

  for (let q of queries) {
    try {
      await db.query(q);
      console.log(`✅ Successfully applied: ${q.substring(0, 70)}...`);
    } catch (e) {
      console.error(`❌ Failed to apply query: ${q}`);
      console.error("Error:", e.message);
    }
  }
  
  console.log("🎉 Database Update Complete!");
  process.exit(0);
})();
