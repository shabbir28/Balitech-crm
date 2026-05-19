-- Store full download history for re-download and vendor download counts
ALTER TABLE download_logs ADD COLUMN IF NOT EXISTS campaign_id UUID REFERENCES campaigns(campaign_id) ON DELETE SET NULL;
ALTER TABLE download_logs ADD COLUMN IF NOT EXISTS states TEXT[];
ALTER TABLE download_logs ADD COLUMN IF NOT EXISTS min_age INTEGER;
ALTER TABLE download_logs ADD COLUMN IF NOT EXISTS max_age INTEGER;
ALTER TABLE download_logs ADD COLUMN IF NOT EXISTS csv_payload TEXT;

CREATE INDEX IF NOT EXISTS idx_download_logs_vendor_date ON download_logs(vendor_id, download_date DESC);
