-- Migration to rename BLA to DNC in dnc_numbers table

-- 1. Remove old constraint
ALTER TABLE dnc_numbers DROP CONSTRAINT IF EXISTS dnc_numbers_dnc_type_check;

-- 2. Update existing data
UPDATE dnc_numbers SET dnc_type = 'DNC' WHERE dnc_type = 'BLA';

-- 3. Add new constraint
ALTER TABLE dnc_numbers ADD CONSTRAINT dnc_numbers_dnc_type_check CHECK (dnc_type IN ('DNC', 'SALE'));
