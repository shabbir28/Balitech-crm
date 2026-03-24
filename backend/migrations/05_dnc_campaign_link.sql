-- Add campaign_id column to dnc_numbers table
ALTER TABLE dnc_numbers ADD COLUMN IF NOT EXISTS campaign_id UUID REFERENCES campaigns(campaign_id) ON DELETE SET NULL;

-- Optional: Create an index for campaign lookups
CREATE INDEX IF NOT EXISTS idx_dnc_numbers_campaign_id ON dnc_numbers(campaign_id);
