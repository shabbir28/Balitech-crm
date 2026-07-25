-- =============================================
-- WC DB MODULE — Database Migration
-- Run this script on your PostgreSQL database
-- =============================================

-- 1. Vendors
CREATE TABLE IF NOT EXISTS wc_db_vendors (
  vendor_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  company TEXT,
  email TEXT,
  phone TEXT,
  comment TEXT,
  status TEXT DEFAULT 'Active',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Campaigns
CREATE TABLE IF NOT EXISTS wc_db_campaigns (
  campaign_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  status TEXT DEFAULT 'Active',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Sessions
CREATE TABLE IF NOT EXISTS wc_db_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID REFERENCES wc_db_vendors(vendor_id) ON DELETE SET NULL,
  campaign_type TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Jobs (upload tracking per file)
CREATE TABLE IF NOT EXISTS wc_db_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES wc_db_sessions(id) ON DELETE CASCADE,
  file_name TEXT,
  file_size BIGINT,
  import_type TEXT,
  status TEXT DEFAULT 'Processing',
  total_rows INT DEFAULT 0,
  inserted INT DEFAULT 0,
  fresh_count INT DEFAULT 0,
  existing_count INT DEFAULT 0,
  duplicates_in_file INT DEFAULT 0,
  dead_skipped INT DEFAULT 0,
  dnc_skipped INT DEFAULT 0,
  error_message TEXT,
  start_time TIMESTAMPTZ,
  end_time TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Data table (phone is UNIQUE within WC DB only)
CREATE TABLE IF NOT EXISTS wc_db_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID,
  session_id UUID,
  job_id UUID,
  first_name TEXT,
  last_name TEXT,
  phone TEXT UNIQUE,
  email TEXT,
  area_code TEXT,
  age INT,
  status TEXT DEFAULT 'available',
  downloaded_at TIMESTAMPTZ,
  uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Download Logs (for re-download)
CREATE TABLE IF NOT EXISTS wc_db_download_logs (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  vendor_id UUID,
  quantity INT,
  states TEXT[],
  min_age INT,
  max_age INT,
  download_date TIMESTAMPTZ DEFAULT NOW(),
  csv_payload TEXT
);

-- 7. Download Requests (admin -> superadmin approval flow)
CREATE TABLE IF NOT EXISTS wc_db_download_requests (
  id SERIAL PRIMARY KEY,
  admin_id UUID REFERENCES users(id) ON DELETE SET NULL,
  vendor_id UUID,
  quantity INT NOT NULL,
  states TEXT[],
  min_age INT,
  max_age INT,
  job_id UUID,
  include_downloaded BOOLEAN DEFAULT FALSE,
  status TEXT DEFAULT 'pending',
  rejection_reason TEXT,
  csv_data TEXT,
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL
);

-- 8. Indexes
CREATE INDEX IF NOT EXISTS idx_wc_db_data_phone ON wc_db_data(phone);
CREATE INDEX IF NOT EXISTS idx_wc_db_data_vendor ON wc_db_data(vendor_id);
CREATE INDEX IF NOT EXISTS idx_wc_db_data_status ON wc_db_data(status);
CREATE INDEX IF NOT EXISTS idx_wc_db_data_area_code ON wc_db_data(area_code);
CREATE INDEX IF NOT EXISTS idx_wc_db_jobs_session ON wc_db_jobs(session_id);
CREATE INDEX IF NOT EXISTS idx_wc_db_sessions_vendor ON wc_db_sessions(vendor_id);

SELECT 'WC DB tables created successfully' AS result;
