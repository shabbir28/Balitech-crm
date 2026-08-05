-- Migration 25: Add BLA preview summary + duration filters to refine_download_requests
-- This enables the new 2-step flow: Preview BLA → then request download

-- Add bla_summary to store the BLA scrub result so approval is instant
ALTER TABLE refine_download_requests ADD COLUMN IF NOT EXISTS bla_summary JSONB;

-- Add min_duration / max_duration that were missing from the table
ALTER TABLE refine_download_requests ADD COLUMN IF NOT EXISTS min_duration INTEGER;
ALTER TABLE refine_download_requests ADD COLUMN IF NOT EXISTS max_duration INTEGER;

-- Add quality filter column
ALTER TABLE refine_download_requests ADD COLUMN IF NOT EXISTS quality VARCHAR(20) DEFAULT 'All';

-- Add disposition filter column  
ALTER TABLE refine_download_requests ADD COLUMN IF NOT EXISTS disposition TEXT[];
