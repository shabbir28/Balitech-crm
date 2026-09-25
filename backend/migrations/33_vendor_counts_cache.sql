-- Migration 33: Create vendor_counts_cache table
CREATE TABLE IF NOT EXISTS vendor_counts_cache (
    id SERIAL PRIMARY KEY,
    module VARCHAR(50) NOT NULL,
    vendor_id VARCHAR(100) NOT NULL,
    total_leads BIGINT DEFAULT 0,
    available_leads BIGINT DEFAULT 0,
    downloaded_leads BIGINT DEFAULT 0,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_vendor_counts_cache UNIQUE(module, vendor_id)
);

CREATE INDEX IF NOT EXISTS idx_vendor_counts_cache_mod_vend ON vendor_counts_cache(module, vendor_id);
