-- Performance indexes for the download query.
-- Big downloads (100k rows, many states) used to do sequential scans on `leads`
-- because no index matched: status + area_code IN (...) + ORDER BY uploaded_at.
-- These indexes let the planner do an index range scan, dramatically faster.

-- Composite index covering filter + sort order
CREATE INDEX IF NOT EXISTS idx_leads_status_area_uploaded
    ON leads (status, area_code, uploaded_at);

-- Helps the "available only" filter when no state filter applied
CREATE INDEX IF NOT EXISTS idx_leads_status_uploaded
    ON leads (status, uploaded_at)
    WHERE status = 'available';

-- Vendor + status (per-vendor downloads)
CREATE INDEX IF NOT EXISTS idx_leads_vendor_status
    ON leads (vendor_id, status);

-- Helps the NOT EXISTS subquery against dnc_numbers.phone
-- (UNIQUE already provides this on dnc_numbers; this is informational comment.)
