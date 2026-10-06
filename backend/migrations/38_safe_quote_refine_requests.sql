CREATE TABLE IF NOT EXISTS safe_quote_refine_download_requests (
  id SERIAL PRIMARY KEY,
  admin_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  vendor_id UUID,
  campaign_type TEXT,
  quantity INT NOT NULL,
  states TEXT[],
  min_duration INT,
  max_duration INT,
  status TEXT DEFAULT 'pending',
  rejection_reason TEXT,
  bla_summary JSONB,
  csv_data TEXT,
  file_name TEXT,
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by INTEGER REFERENCES users(id) ON DELETE SET NULL
);

SELECT 'Safe Quote Refine download requests ready' AS result;
