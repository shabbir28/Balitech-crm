-- Migration 03: Users Module with new roles and extended fields

-- Step 1: Drop existing role check constraint and recreate with new roles
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check 
  CHECK (role IN ('super_admin', 'admin', 'data_entry'));

-- Step 2: Update existing 'admin' role user to 'super_admin'
UPDATE users SET role = 'super_admin' WHERE role = 'admin';

-- Step 3: Add new columns to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS first_name VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_name VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS email VARCHAR(150) UNIQUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(50);
ALTER TABLE users ADD COLUMN IF NOT EXISTS date_of_birth DATE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_picture VARCHAR(500);
ALTER TABLE users ADD COLUMN IF NOT EXISTS status VARCHAR(20) CHECK (status IN ('active', 'inactive')) DEFAULT 'active';
ALTER TABLE users ADD COLUMN IF NOT EXISTS created_by INTEGER REFERENCES users(id) ON DELETE SET NULL;

-- Step 4: Update username column to be used as display (make nullable)
-- We keep username as the login field, populate first_name from username for existing users
UPDATE users SET first_name = username WHERE first_name IS NULL;
