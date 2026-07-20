-- Client Module Schema
CREATE TABLE IF NOT EXISTS clients (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    did VARCHAR(150),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL
);

-- Separation Data Module Schema
CREATE TABLE IF NOT EXISTS separation_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID REFERENCES campaigns(campaign_id) ON DELETE CASCADE,
    client_id INTEGER REFERENCES clients(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS separation_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES separation_sessions(id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    file_size INTEGER NOT NULL,
    import_type VARCHAR(50) NOT NULL,
    total_rows INTEGER DEFAULT 0,
    status VARCHAR(50) DEFAULT 'Pending' CHECK (status IN ('Pending', 'Processing', 'Completed', 'Failed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    start_time TIMESTAMP WITH TIME ZONE,
    end_time TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    fresh_count INTEGER DEFAULT 0,
    existing_count INTEGER DEFAULT 0,
    duplicates_in_file INTEGER DEFAULT 0,
    dnc_skipped INTEGER DEFAULT 0,
    inserted INTEGER DEFAULT 0,
    updated INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS separation_data (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(150),
    phone VARCHAR(50) NOT NULL,
    email VARCHAR(150),
    country_code VARCHAR(10),
    area_code VARCHAR(10),
    client_id INTEGER REFERENCES clients(id) ON DELETE CASCADE,
    campaign_id UUID REFERENCES campaigns(campaign_id) ON DELETE CASCADE,
    status VARCHAR(20) CHECK (status IN ('available', 'downloaded')) DEFAULT 'available',
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    downloaded_at TIMESTAMP WITH TIME ZONE,
    age INTEGER,
    job_id UUID REFERENCES separation_jobs(id) ON DELETE SET NULL,
    UNIQUE (phone, campaign_id)
);

CREATE INDEX IF NOT EXISTS idx_separation_data_country_code ON separation_data(country_code);
CREATE INDEX IF NOT EXISTS idx_separation_data_area_code ON separation_data(area_code);
CREATE INDEX IF NOT EXISTS idx_separation_data_status ON separation_data(status);
CREATE INDEX IF NOT EXISTS idx_separation_data_compound_filter ON separation_data(country_code, area_code, status);
