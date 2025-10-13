-- =====================================================
-- DROP AND RECREATE USERS TABLE
-- ⚠️ WARNING: This will delete ALL user data!
-- =====================================================

-- =====================================================
-- STEP 1: BACKUP EXISTING DATA (OPTIONAL BUT RECOMMENDED)
-- =====================================================

-- Uncomment to create backup table before dropping
-- CREATE TABLE users_backup AS SELECT * FROM users;

-- =====================================================
-- STEP 2: DROP EXISTING TABLES IN CORRECT ORDER
-- =====================================================

-- Drop tables that reference users table first (to avoid foreign key errors)
DROP TABLE IF EXISTS role_permissions CASCADE;
DROP TABLE IF EXISTS payslips CASCADE;
DROP TABLE IF EXISTS finance_records CASCADE;
DROP TABLE IF EXISTS bookings CASCADE;
DROP TABLE IF EXISTS drivers CASCADE;
DROP TABLE IF EXISTS vehicles CASCADE;
DROP TABLE IF EXISTS analytics CASCADE;
DROP TABLE IF EXISTS comments CASCADE;
DROP TABLE IF EXISTS posts CASCADE;
DROP TABLE IF EXISTS post_categories CASCADE;

-- Drop users table
DROP TABLE IF EXISTS users CASCADE;

-- Drop roles table
DROP TABLE IF EXISTS roles CASCADE;

-- Drop any leftover triggers or functions
DROP TRIGGER IF EXISTS update_users_updated_at_trigger ON users;
DROP FUNCTION IF EXISTS update_users_updated_at() CASCADE;

-- =====================================================
-- STEP 3: RECREATE TABLES
-- =====================================================

-- Now run the users.sql file to recreate everything
-- This file contains all the table creation, indexes, triggers, etc.

\i database/users.sql

-- =====================================================
-- VERIFICATION
-- =====================================================

-- Check if tables were created successfully
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('users', 'roles')
ORDER BY table_name;

-- Check if sample data was inserted
SELECT u.username, u.email, r.name as role 
FROM users u
LEFT JOIN roles r ON u.role_id = r.id;

-- =====================================================
-- RESTORE DATA FROM BACKUP (IF BACKUP WAS CREATED)
-- =====================================================

-- If you created a backup, uncomment these lines to restore:
-- INSERT INTO users (id, name, username, email, password_hash, user_dob, user_contact_num, role_id, is_active, last_login, refresh_token, join_date, created_at, updated_at)
-- SELECT id, name, username, email, password_hash, user_dob, user_contact_num, role_id, is_active, last_login, refresh_token, join_date, created_at, updated_at
-- FROM users_backup
-- ON CONFLICT (username) DO NOTHING;

-- Reset sequence to avoid ID conflicts
-- SELECT setval('users_id_seq', (SELECT MAX(id) FROM users));

-- Drop backup table after restore
-- DROP TABLE users_backup;

-- =====================================================
-- END
-- =====================================================

