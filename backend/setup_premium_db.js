const db = require("./src/config/db");

(async () => {
  const queries = [
    // 1. Vendors
    `CREATE TABLE IF NOT EXISTS premium_vendors (
        vendor_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(150) NOT NULL,
        company VARCHAR(150),
        email VARCHAR(150),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );`,
    
    // 2. Campaigns
    `CREATE TABLE IF NOT EXISTS premium_campaigns (
        campaign_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(200) NOT NULL,
        start_date DATE,
        comments TEXT,
        attachment_url VARCHAR(500),
        attachment_name VARCHAR(255),
        status VARCHAR(20) DEFAULT 'Active',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );`,

    // 3. Sessions
    `CREATE TABLE IF NOT EXISTS premium_sessions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        vendor_id UUID REFERENCES premium_vendors(vendor_id) ON DELETE CASCADE,
        campaign_type VARCHAR(50),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        created_by INTEGER
    );`,

    // 4. Jobs
    `CREATE TABLE IF NOT EXISTS premium_jobs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        session_id UUID REFERENCES premium_sessions(id) ON DELETE CASCADE,
        file_name VARCHAR(255) NOT NULL,
        file_size INTEGER NOT NULL,
        import_type VARCHAR(50) NOT NULL,
        total_rows INTEGER DEFAULT 0,
        status VARCHAR(50) DEFAULT 'Pending',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        start_time TIMESTAMP WITH TIME ZONE,
        end_time TIMESTAMP WITH TIME ZONE,
        error_message TEXT,
        fresh_count INTEGER DEFAULT 0,
        existing_count INTEGER DEFAULT 0,
        duplicates_in_file INTEGER DEFAULT 0,
        dnc_skipped INTEGER DEFAULT 0,
        dnc_skipped_dnc INTEGER DEFAULT 0,
        dnc_skipped_sale INTEGER DEFAULT 0,
        inserted INTEGER DEFAULT 0,
        updated INTEGER DEFAULT 0
    );`,

    // 5. Data (Leads)
    `CREATE TABLE IF NOT EXISTS premium_data (
        id BIGSERIAL PRIMARY KEY,
        name VARCHAR(150),
        phone VARCHAR(50) NOT NULL,
        email VARCHAR(150),
        country_code VARCHAR(10),
        area_code VARCHAR(10),
        vendor_id UUID REFERENCES premium_vendors(vendor_id) ON DELETE CASCADE,
        status VARCHAR(20) DEFAULT 'available',
        uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        downloaded_at TIMESTAMP WITH TIME ZONE,
        age INTEGER,
        campaign_type VARCHAR(50),
        job_id UUID REFERENCES premium_jobs(id) ON DELETE SET NULL,
        quality VARCHAR(10) DEFAULT 'Good',
        disposition VARCHAR(255),
        dob VARCHAR(255),
        zipcode VARCHAR(255),
        jornaya_lead_id VARCHAR(255),
        state VARCHAR(255),
        caller_id VARCHAR(255),
        duration INTEGER
    );`,

    // 6. DNC Numbers
    `CREATE TABLE IF NOT EXISTS premium_dnc_numbers (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        phone VARCHAR(50) NOT NULL,
        vendor_id UUID REFERENCES premium_vendors(vendor_id) ON DELETE CASCADE,
        dnc_type VARCHAR(20) NOT NULL,
        upload_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        campaign_id UUID REFERENCES premium_campaigns(campaign_id) ON DELETE SET NULL
    );`,

    // 7. Download Requests
    `CREATE TABLE IF NOT EXISTS premium_download_requests (
        id SERIAL PRIMARY KEY,
        admin_id INTEGER,
        vendor_id UUID REFERENCES premium_vendors(vendor_id) ON DELETE CASCADE,
        campaign_id UUID REFERENCES premium_campaigns(campaign_id) ON DELETE SET NULL,
        quantity INTEGER NOT NULL,
        states TEXT[],
        status VARCHAR(20) DEFAULT 'Pending',
        rejection_reason TEXT,
        csv_data TEXT,
        requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        reviewed_at TIMESTAMP,
        reviewed_by INTEGER,
        min_age INTEGER,
        max_age INTEGER,
        workspace VARCHAR(255),
        job_id UUID REFERENCES premium_jobs(id) ON DELETE SET NULL,
        include_downloaded BOOLEAN DEFAULT FALSE,
        min_duration INTEGER,
        max_duration INTEGER
    );`,

    // 8. Download Logs
    `CREATE TABLE IF NOT EXISTS premium_download_logs (
        id SERIAL PRIMARY KEY,
        user_id INTEGER,
        vendor_id UUID,
        country_code VARCHAR(10),
        area_code VARCHAR(10),
        quantity INTEGER NOT NULL,
        download_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        approved_by INTEGER,
        campaign_id UUID,
        states TEXT[],
        min_age INTEGER,
        max_age INTEGER,
        csv_payload TEXT,
        min_duration INTEGER,
        max_duration INTEGER
    );`,

    // Indexes
    `CREATE INDEX IF NOT EXISTS idx_premium_data_phone ON premium_data(phone);`,
    `CREATE INDEX IF NOT EXISTS idx_premium_data_country_code ON premium_data(country_code);`,
    `CREATE INDEX IF NOT EXISTS idx_premium_data_area_code ON premium_data(area_code);`,
    `CREATE INDEX IF NOT EXISTS idx_premium_data_status ON premium_data(status);`,
    `CREATE INDEX IF NOT EXISTS idx_premium_data_compound_filter ON premium_data(country_code, area_code, status);`
  ];

  console.log("Setting up Premium Data Module Database on Live Server...");

  for (let q of queries) {
    try {
      await db.query(q);
      const tableNameMatch = q.match(/CREATE TABLE IF NOT EXISTS (\w+)/);
      const indexNameMatch = q.match(/CREATE INDEX IF NOT EXISTS (\w+)/);
      if (tableNameMatch) {
          console.log(`✅ Table checked/created: ${tableNameMatch[1]}`);
      } else if (indexNameMatch) {
          console.log(`✅ Index checked/created: ${indexNameMatch[1]}`);
      }
    } catch (e) {
      console.error("❌ Failed to execute query:", e.message);
    }
  }
  
  console.log("🎉 Database Setup Complete!");
  process.exit(0);
})();
