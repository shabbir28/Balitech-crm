-- Safe Quote Module — isolated lead data module

CREATE TABLE IF NOT EXISTS safe_quote_vendors (
  vendor_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  company TEXT,
  email TEXT,
  phone TEXT,
  comment TEXT,
  status TEXT DEFAULT 'Active',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS safe_quote_campaigns (
  campaign_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  status TEXT DEFAULT 'Active',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS safe_quote_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID REFERENCES safe_quote_vendors(vendor_id) ON DELETE SET NULL,
  campaign_type TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS safe_quote_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES safe_quote_sessions(id) ON DELETE CASCADE,
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
  sales_skipped INT DEFAULT 0,
  separation_skipped INT DEFAULT 0,
  premium_overlap INT DEFAULT 0,
  refine_overlap INT DEFAULT 0,
  van_desk_overlap INT DEFAULT 0,
  raw_overlap INT DEFAULT 0,
  error_message TEXT,
  start_time TIMESTAMPTZ,
  end_time TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS safe_quote_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID,
  session_id UUID,
  job_id UUID,
  area_code TEXT,
  phone TEXT UNIQUE,
  firstname TEXT,
  middlename TEXT,
  lastname TEXT,
  address TEXT,
  address2 TEXT,
  city TEXT,
  state TEXT,
  zip TEXT,
  zip4 TEXT,
  county TEXT,
  land_line TEXT,
  cell TEXT,
  homeownerrenter TEXT,
  homevalue TEXT,
  householdincome TEXT,
  creditrating TEXT,
  age TEXT,
  gender TEXT,
  maritalstats TEXT,
  dpv_indicator TEXT,
  dnc_flag TEXT,
  status TEXT DEFAULT 'available',
  downloaded_at TIMESTAMPTZ,
  uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS safe_quote_download_logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  vendor_id UUID,
  quantity INT,
  states TEXT[],
  min_age INT,
  max_age INT,
  download_date TIMESTAMPTZ DEFAULT NOW(),
  csv_payload TEXT
);

CREATE TABLE IF NOT EXISTS safe_quote_download_requests (
  id SERIAL PRIMARY KEY,
  admin_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
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
  bla_summary JSONB,
  disposition TEXT[],
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by INTEGER REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_safe_quote_data_phone ON safe_quote_data(phone);
CREATE INDEX IF NOT EXISTS idx_safe_quote_data_vendor ON safe_quote_data(vendor_id);
CREATE INDEX IF NOT EXISTS idx_safe_quote_data_status ON safe_quote_data(status);
CREATE INDEX IF NOT EXISTS idx_safe_quote_data_area_code ON safe_quote_data(area_code);
CREATE INDEX IF NOT EXISTS idx_safe_quote_jobs_session ON safe_quote_jobs(session_id);
CREATE INDEX IF NOT EXISTS idx_safe_quote_sessions_vendor ON safe_quote_sessions(vendor_id);

SELECT 'Safe Quote tables created successfully' AS result;
