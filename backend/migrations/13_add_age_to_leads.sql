-- Add age column to leads table
ALTER TABLE leads ADD COLUMN IF NOT EXISTS age INTEGER;

-- Add index for performance on age filtering
CREATE INDEX IF NOT EXISTS idx_leads_age ON leads(age);
