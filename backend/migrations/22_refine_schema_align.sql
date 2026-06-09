-- Align Refine module tables with application code (run after 20 + 21)

-- Leads table: disposition used on upload, download, and All Data filters
ALTER TABLE refine_data ADD COLUMN IF NOT EXISTS disposition VARCHAR(50);

-- Download logs: superadmin approval tracking (same as main download_logs)
ALTER TABLE refine_download_logs ADD COLUMN IF NOT EXISTS approved_by INTEGER REFERENCES users(id) ON DELETE SET NULL;

-- Download requests: migration 20 used a different shape; recreate to match main download_requests
DROP TABLE IF EXISTS refine_download_requests CASCADE;

CREATE TABLE refine_download_requests (
    id SERIAL PRIMARY KEY,
    admin_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    vendor_id UUID REFERENCES refine_vendors(vendor_id) ON DELETE SET NULL,
    campaign_id UUID REFERENCES refine_campaigns(campaign_id) ON DELETE SET NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    states TEXT[],
    status VARCHAR(20) NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'accepted', 'rejected')),
    rejection_reason TEXT,
    csv_data TEXT,
    requested_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    reviewed_at TIMESTAMP,
    reviewed_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    min_age INTEGER,
    max_age INTEGER,
    job_id UUID REFERENCES refine_jobs(id) ON DELETE SET NULL,
    include_downloaded BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_refine_download_requests_admin ON refine_download_requests(admin_id);
CREATE INDEX IF NOT EXISTS idx_refine_download_requests_status ON refine_download_requests(status);
