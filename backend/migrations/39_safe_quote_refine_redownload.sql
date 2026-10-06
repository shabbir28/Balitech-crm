ALTER TABLE safe_quote_refine_download_requests
  ADD COLUMN IF NOT EXISTS include_downloaded BOOLEAN DEFAULT FALSE;
