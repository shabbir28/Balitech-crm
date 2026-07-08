const db = require('./src/config/db');

async function deployPremiumSchema() {
    try {
        console.log("Starting Premium Data Module DB Migration...");

        await db.query(`
            -- 1. premium_vendors
            CREATE TABLE IF NOT EXISTS premium_vendors (
                vendor_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                name VARCHAR(150) NOT NULL,
                company VARCHAR(150),
                email VARCHAR(150),
                phone VARCHAR(150),
                comment TEXT,
                status VARCHAR(20) DEFAULT 'Active',
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );

            -- 2. premium_campaigns
            CREATE TABLE IF NOT EXISTS premium_campaigns (
                campaign_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                name VARCHAR(200) NOT NULL,
                start_date DATE,
                comments TEXT,
                attachment_url VARCHAR(500),
                attachment_name VARCHAR(255),
                status VARCHAR(20) CHECK (status IN ('Active', 'Inactive')) DEFAULT 'Active',
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );

            -- 3. premium_sessions
            CREATE TABLE IF NOT EXISTS premium_sessions (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                vendor_id UUID REFERENCES premium_vendors(vendor_id) ON DELETE CASCADE,
                campaign_type VARCHAR(50) NOT NULL CHECK (campaign_type IN ('ACA', 'MEDICARE', 'MED ALERT', 'Final Expense')),
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                created_by INTEGER REFERENCES users(id) ON DELETE SET NULL
            );

            -- 4. premium_jobs
            CREATE TABLE IF NOT EXISTS premium_jobs (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                session_id UUID REFERENCES premium_sessions(id) ON DELETE CASCADE,
                file_name VARCHAR(255) NOT NULL,
                file_size BIGINT,
                status VARCHAR(20) CHECK (status IN ('Processing', 'Completed', 'Failed')) DEFAULT 'Processing',
                total_rows INTEGER DEFAULT 0,
                start_time TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
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
            );

            -- 5. premium_data
            CREATE TABLE IF NOT EXISTS premium_data (
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
                quality VARCHAR(10) DEFAULT 'Good',
                disposition VARCHAR(50)
            );

            -- 6. premium_dnc_numbers
            CREATE TABLE IF NOT EXISTS premium_dnc_numbers (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                phone VARCHAR(50) NOT NULL,
                vendor_id UUID REFERENCES premium_vendors(vendor_id) ON DELETE CASCADE,
                dnc_type VARCHAR(20) CHECK (dnc_type IN ('DNC', 'SALE')) NOT NULL,
                upload_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                campaign_id UUID REFERENCES premium_campaigns(campaign_id) ON DELETE SET NULL
            );

            -- 7. premium_download_requests
            CREATE TABLE IF NOT EXISTS premium_download_requests (
                id SERIAL PRIMARY KEY,
                admin_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
                vendor_id UUID REFERENCES premium_vendors(vendor_id) ON DELETE CASCADE,
                campaign_id UUID REFERENCES premium_campaigns(campaign_id) ON DELETE CASCADE,
                quantity INTEGER,
                states TEXT[],
                status VARCHAR(50) DEFAULT 'pending',
                rejection_reason TEXT,
                csv_data TEXT,
                requested_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                reviewed_at TIMESTAMP WITHOUT TIME ZONE,
                reviewed_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
                min_age INTEGER,
                max_age INTEGER,
                workspace VARCHAR(255),
                job_id UUID REFERENCES premium_jobs(id) ON DELETE CASCADE,
                include_downloaded BOOLEAN DEFAULT FALSE
            );

            -- 8. premium_download_logs
            CREATE TABLE IF NOT EXISTS premium_download_logs (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
                vendor_id UUID REFERENCES premium_vendors(vendor_id) ON DELETE SET NULL,
                country_code VARCHAR(10),
                area_code VARCHAR(10),
                quantity INTEGER,
                download_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                approved_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
                campaign_id UUID REFERENCES premium_campaigns(campaign_id) ON DELETE SET NULL,
                states TEXT[],
                min_age INTEGER,
                max_age INTEGER,
                csv_payload TEXT
            );

            -- Indexes for premium_data
            CREATE INDEX IF NOT EXISTS idx_premium_data_phone ON premium_data(phone);
            CREATE INDEX IF NOT EXISTS idx_premium_data_country_code ON premium_data(country_code);
            CREATE INDEX IF NOT EXISTS idx_premium_data_area_code ON premium_data(area_code);
            CREATE INDEX IF NOT EXISTS idx_premium_data_status ON premium_data(status);
            CREATE INDEX IF NOT EXISTS idx_premium_data_compound_filter ON premium_data(country_code, area_code, status);

        `);

        // To handle the case if tables were created previously without columns:
        try { await db.query("ALTER TABLE premium_vendors ADD COLUMN IF NOT EXISTS phone VARCHAR(150);"); } catch(e) {}
        try { await db.query("ALTER TABLE premium_vendors ADD COLUMN IF NOT EXISTS comment TEXT;"); } catch(e) {}
        try { await db.query("ALTER TABLE premium_vendors ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'Active';"); } catch(e) {}
        try { await db.query("ALTER TABLE premium_data ADD COLUMN IF NOT EXISTS disposition VARCHAR(50);"); } catch(e) {}

        console.log("✅ Premium Data Module DB Migration completed successfully!");
    } catch(err) {
        console.error("❌ Error during migration:", err);
    } finally {
        process.exit(0);
    }
}

deployPremiumSchema();
