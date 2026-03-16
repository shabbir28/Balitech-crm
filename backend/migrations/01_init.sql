-- Database Schema for BPO CRM

CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) CHECK (role IN ('admin', 'agent')) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS vendors (
    vendor_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(150) NOT NULL,
    company VARCHAR(150),
    email VARCHAR(150),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS leads (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(150),
    phone VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(150),
    country_code VARCHAR(10),
    area_code VARCHAR(10),
    vendor_id UUID REFERENCES vendors(vendor_id) ON DELETE CASCADE,
    status VARCHAR(20) CHECK (status IN ('available', 'downloaded')) DEFAULT 'available',
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    downloaded_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS download_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    vendor_id UUID REFERENCES vendors(vendor_id) ON DELETE SET NULL,
    country_code VARCHAR(10),
    area_code VARCHAR(10),
    quantity INTEGER NOT NULL,
    download_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_leads_country_code ON leads(country_code);
CREATE INDEX IF NOT EXISTS idx_leads_area_code ON leads(area_code);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_compound_filter ON leads(country_code, area_code, status);

-- Insert a default admin user (password 'admin123')
-- password_hash generated using: bcryptjs.hashSync('admin123', 10)
INSERT INTO users (username, password_hash, role)
VALUES ('admin', '$2a$10$Z3U650nE06aB/kE82f/kC.P.B7l.i78iN7qI1O8yOqy13XkR8tO1m', 'admin')
ON CONFLICT (username) DO NOTHING;
