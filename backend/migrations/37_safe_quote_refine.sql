-- Safe Quote Refine: own sessions, jobs, and leads.
-- Vendors and campaigns stay on safe_quote_vendors / safe_quote_campaigns.

CREATE TABLE IF NOT EXISTS safe_quote_refine_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID REFERENCES safe_quote_vendors(vendor_id) ON DELETE SET NULL,
  campaign_type TEXT,
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS safe_quote_refine_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES safe_quote_refine_sessions(id) ON DELETE CASCADE,
  file_name TEXT,
  file_size BIGINT,
  import_type TEXT,
  status TEXT DEFAULT 'Processing',
  total_rows INT DEFAULT 0,
  inserted INT DEFAULT 0,
  updated_count INT DEFAULT 0,
  fresh_count INT DEFAULT 0,
  existing_count INT DEFAULT 0,
  duplicates_in_file INT DEFAULT 0,
  duration_skipped INT DEFAULT 0,
  error_message TEXT,
  start_time TIMESTAMPTZ,
  end_time TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS safe_quote_refine_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID REFERENCES safe_quote_vendors(vendor_id) ON DELETE SET NULL,
  session_id UUID REFERENCES safe_quote_refine_sessions(id) ON DELETE SET NULL,
  job_id UUID REFERENCES safe_quote_refine_jobs(id) ON DELETE SET NULL,
  phone TEXT UNIQUE,
  name TEXT,
  email TEXT,
  country_code TEXT,
  area_code TEXT,
  disposition TEXT,
  campaign_type TEXT,
  age TEXT,
  quality TEXT,
  call_date TEXT,
  duration INTEGER,
  state TEXT,
  status TEXT DEFAULT 'available',
  downloaded_at TIMESTAMPTZ,
  uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS safe_quote_refine_download_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  vendor_id UUID,
  campaign_type TEXT,
  quantity INT,
  min_duration INT,
  max_duration INT,
  file_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sq_refine_data_phone ON safe_quote_refine_data(phone);
CREATE INDEX IF NOT EXISTS idx_sq_refine_data_status ON safe_quote_refine_data(status);
CREATE INDEX IF NOT EXISTS idx_sq_refine_data_campaign ON safe_quote_refine_data(campaign_type);
CREATE INDEX IF NOT EXISTS idx_sq_refine_data_vendor ON safe_quote_refine_data(vendor_id);
CREATE INDEX IF NOT EXISTS idx_sq_refine_data_duration ON safe_quote_refine_data(duration);
CREATE INDEX IF NOT EXISTS idx_sq_refine_jobs_session ON safe_quote_refine_jobs(session_id);
CREATE INDEX IF NOT EXISTS idx_sq_refine_sessions_vendor ON safe_quote_refine_sessions(vendor_id);

SELECT 'Safe Quote Refine tables created successfully' AS result;
