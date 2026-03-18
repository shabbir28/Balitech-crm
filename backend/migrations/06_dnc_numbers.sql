CREATE TABLE IF NOT EXISTS dnc_numbers (
  id BIGSERIAL PRIMARY KEY,
  phone VARCHAR(50) UNIQUE NOT NULL,
  dnc_type VARCHAR(10) NOT NULL CHECK (dnc_type IN ('BLA', 'SALE')),
  source VARCHAR(255),
  notes TEXT,
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_dnc_numbers_type ON dnc_numbers(dnc_type);
CREATE INDEX IF NOT EXISTS idx_dnc_numbers_created_at ON dnc_numbers(created_at);

