-- Migration 09: Download Request Approval System
-- When an admin requests a download, it goes to superadmin for approval

CREATE TABLE IF NOT EXISTS download_requests (
    id SERIAL PRIMARY KEY,
    admin_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    vendor_id UUID REFERENCES vendors(vendor_id) ON DELETE SET NULL,
    campaign_id UUID REFERENCES campaigns(campaign_id) ON DELETE SET NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    states TEXT[],                          -- array of state abbreviations e.g. '{CA,TX}'
    status VARCHAR(20) NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'accepted', 'rejected')),
    rejection_reason TEXT,                  -- reason shown to admin when rejected
    csv_data TEXT,                          -- CSV content stored after acceptance for admin to download
    requested_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    reviewed_at TIMESTAMP,
    reviewed_by INTEGER REFERENCES users(id) ON DELETE SET NULL
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_download_requests_admin ON download_requests(admin_id);
CREATE INDEX IF NOT EXISTS idx_download_requests_status ON download_requests(status);
