CREATE TABLE IF NOT EXISTS safe_quote_dnc_numbers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone VARCHAR(50) UNIQUE NOT NULL,
  dnc_type VARCHAR(20) NOT NULL CHECK (dnc_type IN ('DNC', 'SALE', 'SEPARATION')),
  campaign_id UUID REFERENCES safe_quote_campaigns(campaign_id) ON DELETE SET NULL,
  upload_date TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_safe_quote_dnc_phone ON safe_quote_dnc_numbers(phone);
CREATE INDEX IF NOT EXISTS idx_safe_quote_dnc_type ON safe_quote_dnc_numbers(dnc_type);

CREATE TABLE IF NOT EXISTS safe_quote_separation_data (
  id BIGSERIAL PRIMARY KEY,
  phone VARCHAR(50) UNIQUE NOT NULL,
  campaign_id UUID REFERENCES safe_quote_campaigns(campaign_id) ON DELETE SET NULL,
  uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_safe_quote_separation_phone ON safe_quote_separation_data(phone);
