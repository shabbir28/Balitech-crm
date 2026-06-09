-- Refine campaigns are user-defined in refine_campaigns; drop legacy fixed enum check.
ALTER TABLE refine_sessions DROP CONSTRAINT IF EXISTS refine_sessions_campaign_type_check;

-- Allow longer campaign names (match refine_campaigns.name)
ALTER TABLE refine_sessions ALTER COLUMN campaign_type TYPE VARCHAR(200);
