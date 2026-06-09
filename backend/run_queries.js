const db = require("./src/config/db");

(async () => {
  const queries = [
    `CREATE TABLE IF NOT EXISTS refine_vendors (
        vendor_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(150) NOT NULL,
        company VARCHAR(150),
        email VARCHAR(150),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS refine_campaigns (
        campaign_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(200) NOT NULL,
        start_date DATE,
        comments TEXT,
        attachment_url VARCHAR(500),
        attachment_name VARCHAR(255),
        status VARCHAR(20) CHECK (status IN ('Active', 'Inactive')) DEFAULT 'Active',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )`,
    `ALTER TABLE refine_sessions DROP CONSTRAINT IF EXISTS refine_sessions_vendor_id_fkey`,
    `ALTER TABLE refine_sessions ADD CONSTRAINT refine_sessions_vendor_id_fkey FOREIGN KEY (vendor_id) REFERENCES refine_vendors(vendor_id) ON DELETE CASCADE`,
    
    `ALTER TABLE refine_data DROP CONSTRAINT IF EXISTS refine_data_vendor_id_fkey`,
    `ALTER TABLE refine_data ADD CONSTRAINT refine_data_vendor_id_fkey FOREIGN KEY (vendor_id) REFERENCES refine_vendors(vendor_id) ON DELETE CASCADE`,
    
    `ALTER TABLE refine_dnc_numbers DROP CONSTRAINT IF EXISTS refine_dnc_numbers_vendor_id_fkey`,
    `ALTER TABLE refine_dnc_numbers ADD CONSTRAINT refine_dnc_numbers_vendor_id_fkey FOREIGN KEY (vendor_id) REFERENCES refine_vendors(vendor_id) ON DELETE CASCADE`,
    
    `ALTER TABLE refine_dnc_numbers DROP CONSTRAINT IF EXISTS refine_dnc_numbers_campaign_id_fkey`,
    `ALTER TABLE refine_dnc_numbers ADD CONSTRAINT refine_dnc_numbers_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES refine_campaigns(campaign_id) ON DELETE SET NULL`,
    
    `ALTER TABLE refine_download_requests DROP CONSTRAINT IF EXISTS refine_download_requests_vendor_id_fkey`,
    `ALTER TABLE refine_download_requests ADD CONSTRAINT refine_download_requests_vendor_id_fkey FOREIGN KEY (vendor_id) REFERENCES refine_vendors(vendor_id) ON DELETE CASCADE`,
    
    `ALTER TABLE refine_download_logs DROP CONSTRAINT IF EXISTS refine_download_logs_vendor_id_fkey`,
    `ALTER TABLE refine_download_logs ADD CONSTRAINT refine_download_logs_vendor_id_fkey FOREIGN KEY (vendor_id) REFERENCES refine_vendors(vendor_id) ON DELETE SET NULL`,
    
    `ALTER TABLE refine_download_logs DROP CONSTRAINT IF EXISTS refine_download_logs_campaign_id_fkey`,
    `ALTER TABLE refine_download_logs ADD CONSTRAINT refine_download_logs_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES refine_campaigns(campaign_id) ON DELETE SET NULL`,
    
    `ALTER TABLE refine_data ADD COLUMN IF NOT EXISTS quality VARCHAR(10) DEFAULT 'Good'`
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
