-- =====================================================
-- USERS TABLE MIGRATION SCRIPT
-- This will ALTER the existing users table (NOT drop it)
-- Your data will be preserved!
-- =====================================================

-- =====================================================
-- STEP 1: Create roles table if it doesn't exist
-- =====================================================

CREATE TABLE IF NOT EXISTS roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Insert default roles
INSERT INTO roles (name, description) VALUES 
    ('superadmin', 'Super Administrator with full system access'),
    ('admin', 'Administrator with management access'),
    ('manager', 'Manager with operational access'),
    ('employee', 'Employee with limited access'),
    ('driver', 'Driver with driver-specific access')
ON CONFLICT (name) DO NOTHING;

-- =====================================================
-- STEP 2: Add missing columns to users table
-- =====================================================

-- Add name column if missing
ALTER TABLE users ADD COLUMN IF NOT EXISTS name VARCHAR(100);

-- Add username column if missing
ALTER TABLE users ADD COLUMN IF NOT EXISTS username VARCHAR(50);

-- Add email column if missing
ALTER TABLE users ADD COLUMN IF NOT EXISTS email VARCHAR(100);

-- Add password_hash column if missing
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255);

-- Add user_dob (date of birth) if missing
ALTER TABLE users ADD COLUMN IF NOT EXISTS user_dob DATE;

-- Add user_contact_num if missing
ALTER TABLE users ADD COLUMN IF NOT EXISTS user_contact_num VARCHAR(20);

-- Add role_id column if missing
ALTER TABLE users ADD COLUMN IF NOT EXISTS role_id INTEGER;

-- Add is_active column if missing
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Add last_login column if missing
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login TIMESTAMP WITH TIME ZONE;

-- Add refresh_token column if missing
ALTER TABLE users ADD COLUMN IF NOT EXISTS refresh_token TEXT;

-- Add join_date column if missing
ALTER TABLE users ADD COLUMN IF NOT EXISTS join_date DATE DEFAULT CURRENT_DATE;

-- Add created_at column if missing
ALTER TABLE users ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

-- Add updated_at column if missing
ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

-- =====================================================
-- STEP 3: Modify existing columns (if needed)
-- =====================================================

-- Make username unique (drop existing constraint first if it exists)
DO $$ 
BEGIN
    ALTER TABLE users DROP CONSTRAINT IF EXISTS users_username_key CASCADE;
    ALTER TABLE users ADD CONSTRAINT users_username_key UNIQUE (username);
EXCEPTION
    WHEN others THEN NULL;
END $$;

-- Make email unique (drop existing constraint first if it exists)
DO $$ 
BEGIN
    ALTER TABLE users DROP CONSTRAINT IF EXISTS users_email_key CASCADE;
    ALTER TABLE users ADD CONSTRAINT users_email_key UNIQUE (email);
EXCEPTION
    WHEN others THEN NULL;
END $$;

-- Update column types if needed (be careful with data)
-- ALTER TABLE users ALTER COLUMN username TYPE VARCHAR(50);
-- ALTER TABLE users ALTER COLUMN email TYPE VARCHAR(100);
-- ALTER TABLE users ALTER COLUMN password_hash TYPE VARCHAR(255);

-- =====================================================
-- STEP 4: Add foreign key constraints
-- =====================================================

-- Drop existing foreign key if exists
DO $$ 
BEGIN
    ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_id_fkey CASCADE;
EXCEPTION
    WHEN others THEN NULL;
END $$;

-- Add foreign key to roles table
ALTER TABLE users 
ADD CONSTRAINT users_role_id_fkey 
FOREIGN KEY (role_id) 
REFERENCES roles(id) 
ON DELETE SET NULL;

-- =====================================================
-- STEP 5: Create indexes for performance
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role_id ON users(role_id);
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);
CREATE INDEX IF NOT EXISTS idx_users_last_login ON users(last_login);
CREATE INDEX IF NOT EXISTS idx_users_join_date ON users(join_date);

-- =====================================================
-- STEP 6: Create triggers for auto-updating timestamps
-- =====================================================

-- Create function if it doesn't exist
CREATE OR REPLACE FUNCTION update_users_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS update_users_updated_at_trigger ON users;
CREATE TRIGGER update_users_updated_at_trigger
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_users_updated_at();

-- =====================================================
-- STEP 7: Update existing data (optional)
-- =====================================================

-- Set default values for new columns if they're NULL

-- Set is_active to true for all existing users if NULL
UPDATE users SET is_active = true WHERE is_active IS NULL;

-- Set join_date to created_at or current date if NULL
UPDATE users SET join_date = COALESCE(created_at::date, CURRENT_DATE) WHERE join_date IS NULL;

-- Set created_at for old records if NULL
UPDATE users SET created_at = CURRENT_TIMESTAMP WHERE created_at IS NULL;

-- Set updated_at for old records if NULL
UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE updated_at IS NULL;

-- Generate username from email if username is NULL
UPDATE users 
SET username = LOWER(SPLIT_PART(email, '@', 1)) 
WHERE username IS NULL AND email IS NOT NULL;

-- Set default role (employee) if role_id is NULL
UPDATE users 
SET role_id = (SELECT id FROM roles WHERE name = 'employee' LIMIT 1)
WHERE role_id IS NULL;

-- =====================================================
-- STEP 8: Remove old/unused columns (OPTIONAL - COMMENTED OUT)
-- =====================================================

-- ⚠️ CAUTION: Only uncomment these if you're sure you want to remove these columns!

-- Remove old role column if you had a text-based role column
-- ALTER TABLE users DROP COLUMN IF EXISTS role;

-- Remove other old columns you don't need
-- ALTER TABLE users DROP COLUMN IF EXISTS old_column_name;

-- =====================================================
-- STEP 9: Verify the migration
-- =====================================================

-- Check columns
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'users'
ORDER BY ordinal_position;

-- Check constraints
SELECT constraint_name, constraint_type
FROM information_schema.table_constraints
WHERE table_name = 'users';

-- Check indexes
SELECT indexname FROM pg_indexes WHERE tablename = 'users';

-- Count records
SELECT 
    COUNT(*) as total_users,
    COUNT(*) FILTER (WHERE is_active = true) as active_users,
    COUNT(*) FILTER (WHERE role_id IS NOT NULL) as users_with_roles
FROM users;

-- =====================================================
-- MIGRATION COMPLETE!
-- =====================================================

-- Note: Run this script using:
-- psql -h your_host -U your_user -d your_db -f database/migrate_users_table.sql

