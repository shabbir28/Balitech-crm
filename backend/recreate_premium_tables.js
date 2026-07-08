const db = require("./src/config/db");

(async () => {
  const queries = [
    `DROP TABLE IF EXISTS premium_download_logs CASCADE;`,
    `DROP TABLE IF EXISTS premium_download_requests CASCADE;`,
    `DROP TABLE IF EXISTS premium_dnc_numbers CASCADE;`,
    `DROP TABLE IF EXISTS premium_data CASCADE;`,
    `DROP TABLE IF EXISTS premium_jobs CASCADE;`,
    `DROP TABLE IF EXISTS premium_sessions CASCADE;`,
    `DROP TABLE IF EXISTS premium_vendors CASCADE;`,
    `DROP TABLE IF EXISTS premium_campaigns CASCADE;`,
    
    `CREATE TABLE premium_vendors (
        vendor_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(150) NOT NULL,
        company VARCHAR(150),
        email VARCHAR(150),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );`,
    
    `CREATE TABLE premium_campaigns (
        campaign_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(200) NOT NULL,
        start_date DATE,
        comments TEXT,
        attachment_url VARCHAR(500),
        attachment_name VARCHAR(255),
        status VARCHAR(20) CHECK (status IN ('Active', 'Inactive')) DEFAULT 'Active',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );`,

    `CREATE TABLE premium_sessions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        vendor_id UUID REFERENCES premium_vendors(vendor_id) ON DELETE CASCADE,
        campaign_type VARCHAR(50) NOT NULL CHECK (campaign_type IN ('ACA', 'MEDICARE', 'MED ALERT', 'Final Expense')),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        created_by INTEGER REFERENCES users(id) ON DELETE SET NULL
    );`,

    `CREATE TABLE premium_jobs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        session_id UUID REFERENCES premium_sessions(id) ON DELETE CASCADE,
        file_name VARCHAR(255) NOT NULL,
        file_size INTEGER NOT NULL,
        import_type VARCHAR(50) NOT NULL,
        total_rows INTEGER DEFAULT 0,
        status VARCHAR(50) DEFAULT 'Pending' CHECK (status IN ('Pending', 'Processing', 'Completed', 'Failed')),
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

    `CREATE TABLE premium_data (
        id BIGSERIAL PRIMARY KEY,
        name VARCHAR(150),
        phone VARCHAR(50) NOT NULL,
        email VARCHAR(150),
        country_code VARCHAR(10),
        area_code VARCHAR(10),
        vendor_id UUID REFERENCES premium_vendors(vendor_id) ON DELETE CASCADE,
        status VARCHAR(20) CHECK (status IN ('available', 'downloaded')) DEFAULT 'available',
        uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        downloaded_at TIMESTAMP WITH TIME ZONE,
        age INTEGER,
        campaign_type VARCHAR(50),
        job_id UUID REFERENCES premium_jobs(id) ON DELETE SET NULL,
        quality VARCHAR(10) DEFAULT 'Good'
    );`,

    `CREATE TABLE premium_dnc_numbers (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        phone VARCHAR(50) NOT NULL,
        vendor_id UUID REFERENCES premium_vendors(vendor_id) ON DELETE CASCADE,
        dnc_type VARCHAR(20) CHECK (dnc_type IN ('DNC', 'SALE')) NOT NULL,
        upload_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        campaign_id UUID REFERENCES premium_campaigns(campaign_id) ON DELETE SET NULL
    );`,

    `CREATE TABLE premium_download_requests (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        vendor_id UUID REFERENCES premium_vendors(vendor_id) ON DELETE CASCADE,
        campaign_type VARCHAR(50),
        requested_quantity INTEGER NOT NULL,
        status VARCHAR(20) CHECK (status IN ('Pending', 'Processing', 'Completed', 'Failed')) DEFAULT 'Pending',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        completed_at TIMESTAMP WITH TIME ZONE,
        file_url VARCHAR(500),
        error_message TEXT,
        min_age INTEGER,
        max_age INTEGER,
        include_downloaded BOOLEAN DEFAULT FALSE
    );`,

    `CREATE TABLE premium_download_logs (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        vendor_id UUID REFERENCES premium_vendors(vendor_id) ON DELETE SET NULL,
        country_code VARCHAR(10),
        area_code VARCHAR(10),
        quantity INTEGER NOT NULL,
        download_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        campaign_id UUID REFERENCES premium_campaigns(campaign_id) ON DELETE SET NULL,
        states TEXT[],
        min_age INTEGER,
        max_age INTEGER,
        csv_payload TEXT
    );`,

    `CREATE INDEX IF NOT EXISTS idx_premium_data_phone ON premium_data(phone);`,
    `CREATE INDEX IF NOT EXISTS idx_premium_data_country_code ON premium_data(country_code);`,
    `CREATE INDEX IF NOT EXISTS idx_premium_data_area_code ON premium_data(area_code);`,
    `CREATE INDEX IF NOT EXISTS idx_premium_data_status ON premium_data(status);`,
    `CREATE INDEX IF NOT EXISTS idx_premium_data_compound_filter ON premium_data(country_code, area_code, status);`
  ];

  for (let q of queries) {
    try {
      await db.query(q);
      console.log("Success:", q.substring(0, 50));
    } catch (e) {
      console.error("Failed:", q.substring(0, 50), e.message);
    }
  }
  process.exit();
})();
