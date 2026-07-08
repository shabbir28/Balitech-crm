const db = require('./src/config/db');

async function recreateDownloadTables() {
    try {
        await db.query(`
            DROP TABLE IF EXISTS premium_download_logs CASCADE;
            DROP TABLE IF EXISTS premium_download_requests CASCADE;

            CREATE TABLE premium_download_requests (
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

            CREATE TABLE premium_download_logs (
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
        `);
        console.log("Recreated premium download tables with exact schema!");
    } catch(err) {
        console.error(err);
    } finally {
        process.exit(0);
    }
}

recreateDownloadTables();
