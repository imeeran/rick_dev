-- =====================================================
-- USERS TABLE SCHEMA & QUERIES
-- Rick Backend Application
-- =====================================================

-- =====================================================
-- 1. TABLE CREATION
-- =====================================================

-- Create roles table (required for users)
CREATE TABLE IF NOT EXISTS roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create users table with complete schema
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100),
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    user_dob DATE,
    user_contact_num VARCHAR(20),
    role_id INTEGER REFERENCES roles(id) ON DELETE SET NULL,
    is_active BOOLEAN DEFAULT true,
    last_login TIMESTAMP WITH TIME ZONE,
    refresh_token TEXT,
    join_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- 2. INDEXES FOR PERFORMANCE
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role_id ON users(role_id);
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);
CREATE INDEX IF NOT EXISTS idx_users_last_login ON users(last_login);
CREATE INDEX IF NOT EXISTS idx_users_join_date ON users(join_date);

-- =====================================================
-- 3. TRIGGERS FOR AUTO-UPDATE
-- =====================================================

-- Create trigger function for updating updated_at timestamp
CREATE OR REPLACE FUNCTION update_users_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger
DROP TRIGGER IF EXISTS update_users_updated_at_trigger ON users;
CREATE TRIGGER update_users_updated_at_trigger
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_users_updated_at();

-- =====================================================
-- 4. INSERT DEFAULT ROLES
-- =====================================================

INSERT INTO roles (name, description) VALUES 
    ('superadmin', 'Super Administrator with full system access'),
    ('admin', 'Administrator with management access'),
    ('manager', 'Manager with operational access'),
    ('employee', 'Employee with limited access'),
    ('driver', 'Driver with driver-specific access')
ON CONFLICT (name) DO NOTHING;

-- =====================================================
-- 5. COMMON QUERIES
-- =====================================================

-- Get all users with their roles
-- SELECT u.id, u.name, u.username, u.email, u.user_contact_num, u.join_date, 
--        u.last_login, u.is_active, r.name as role_name
-- FROM users u
-- LEFT JOIN roles r ON u.role_id = r.id
-- ORDER BY u.created_at DESC;

-- Get user by ID with role
-- SELECT u.id, u.name, u.username, u.email, u.user_dob, u.user_contact_num, 
--        u.role_id, r.name as role_name, u.last_login, u.join_date, u.is_active
-- FROM users u
-- LEFT JOIN roles r ON u.role_id = r.id
-- WHERE u.id = $1;

-- Get user by username or email (for login)
-- SELECT u.id, u.name, u.username, u.email, u.password_hash, 
--        u.role_id, r.name as role_name
-- FROM users u
-- LEFT JOIN roles r ON u.role_id = r.id
-- WHERE u.username = $1 OR u.email = $1;

-- Get users by role
-- SELECT u.id, u.name, u.username, u.email, u.user_contact_num, 
--        u.join_date, u.last_login, u.is_active
-- FROM users u
-- JOIN roles r ON u.role_id = r.id
-- WHERE r.name = $1
-- ORDER BY u.name;

-- Get active users only
-- SELECT u.id, u.name, u.username, u.email, u.user_contact_num, 
--        r.name as role_name
-- FROM users u
-- LEFT JOIN roles r ON u.role_id = r.id
-- WHERE u.is_active = true
-- ORDER BY u.join_date DESC;

-- Search users by name, username or email
-- SELECT u.id, u.name, u.username, u.email, u.user_contact_num, 
--        r.name as role_name, u.is_active
-- FROM users u
-- LEFT JOIN roles r ON u.role_id = r.id
-- WHERE u.name ILIKE '%' || $1 || '%'
--    OR u.username ILIKE '%' || $1 || '%'
--    OR u.email ILIKE '%' || $1 || '%'
-- ORDER BY u.name;

-- =====================================================
-- 6. INSERT/UPDATE/DELETE QUERIES
-- =====================================================

-- Create new user
-- INSERT INTO users (name, username, email, password_hash, user_dob, user_contact_num, role_id, join_date)
-- VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_DATE)
-- RETURNING id, name, username, email, user_dob, user_contact_num, role_id, join_date;

-- Update user details
-- UPDATE users 
-- SET name = $1, email = $2, user_dob = $3, user_contact_num = $4, updated_at = CURRENT_TIMESTAMP
-- WHERE id = $5
-- RETURNING id, name, username, email, user_dob, user_contact_num;

-- Update user role
-- UPDATE users 
-- SET role_id = $1, updated_at = CURRENT_TIMESTAMP
-- WHERE id = $2;

-- Update user password
-- UPDATE users 
-- SET password_hash = $1, updated_at = CURRENT_TIMESTAMP
-- WHERE id = $2;

-- Update last login timestamp
-- UPDATE users 
-- SET last_login = CURRENT_TIMESTAMP
-- WHERE id = $1;

-- Update refresh token (for authentication)
-- UPDATE users 
-- SET refresh_token = $1, updated_at = CURRENT_TIMESTAMP
-- WHERE id = $2;

-- Clear refresh token (for logout)
-- UPDATE users 
-- SET refresh_token = NULL
-- WHERE id = $1;

-- Activate/Deactivate user
-- UPDATE users 
-- SET is_active = $1, updated_at = CURRENT_TIMESTAMP
-- WHERE id = $2;

-- Delete user (soft delete by deactivating)
-- UPDATE users 
-- SET is_active = false, updated_at = CURRENT_TIMESTAMP
-- WHERE id = $1;

-- Delete user (hard delete)
-- DELETE FROM users WHERE id = $1;

-- Bulk delete users
-- DELETE FROM users WHERE id = ANY($1::int[]);

-- =====================================================
-- 7. USER STATISTICS QUERIES
-- =====================================================

-- Get total user count
-- SELECT COUNT(*) as total_users FROM users WHERE is_active = true;

-- Get user count by role
-- SELECT r.name as role_name, COUNT(u.id) as user_count
-- FROM roles r
-- LEFT JOIN users u ON r.id = u.role_id AND u.is_active = true
-- GROUP BY r.id, r.name
-- ORDER BY user_count DESC;

-- Get recently joined users (last 30 days)
-- SELECT u.id, u.name, u.username, u.email, r.name as role_name, u.join_date
-- FROM users u
-- LEFT JOIN roles r ON u.role_id = r.id
-- WHERE u.join_date >= CURRENT_DATE - INTERVAL '30 days'
-- ORDER BY u.join_date DESC;

-- Get users with recent activity (last 7 days)
-- SELECT u.id, u.name, u.username, u.email, u.last_login, r.name as role_name
-- FROM users u
-- LEFT JOIN roles r ON u.role_id = r.id
-- WHERE u.last_login >= CURRENT_TIMESTAMP - INTERVAL '7 days'
-- ORDER BY u.last_login DESC;

-- Get inactive users (not logged in for 90 days)
-- SELECT u.id, u.name, u.username, u.email, u.last_login, r.name as role_name
-- FROM users u
-- LEFT JOIN roles r ON u.role_id = r.id
-- WHERE u.last_login < CURRENT_TIMESTAMP - INTERVAL '90 days'
--    OR u.last_login IS NULL
-- ORDER BY u.last_login NULLS LAST;

-- =====================================================
-- 8. USER SUMMARY FOR DASHBOARD
-- =====================================================

-- SELECT 
--     COUNT(*) FILTER (WHERE is_active = true) as total_active_users,
--     COUNT(*) FILTER (WHERE is_active = false) as total_inactive_users,
--     COUNT(*) FILTER (WHERE join_date >= CURRENT_DATE - INTERVAL '30 days') as new_users_this_month,
--     COUNT(*) FILTER (WHERE last_login >= CURRENT_TIMESTAMP - INTERVAL '24 hours') as active_today,
--     COUNT(*) FILTER (WHERE last_login >= CURRENT_TIMESTAMP - INTERVAL '7 days') as active_this_week
-- FROM users;

-- =====================================================
-- 9. AUTHENTICATION QUERIES
-- =====================================================

-- Verify user credentials (used in login)
-- SELECT u.id, u.name, u.username, u.email, u.password_hash, 
--        u.role_id, r.name as role_name, u.is_active
-- FROM users u
-- LEFT JOIN roles r ON u.role_id = r.id
-- WHERE (u.username = $1 OR u.email = $1)
--   AND u.is_active = true;

-- Get user for token refresh
-- SELECT u.id, u.username, u.email, u.refresh_token, r.name as role_name
-- FROM users u
-- LEFT JOIN roles r ON u.role_id = r.id
-- WHERE u.id = $1 AND u.is_active = true;

-- Check if username exists
-- SELECT EXISTS(SELECT 1 FROM users WHERE username = $1) as exists;

-- Check if email exists
-- SELECT EXISTS(SELECT 1 FROM users WHERE email = $1) as exists;

-- =====================================================
-- 10. USER VALIDATION
-- =====================================================

-- Validate username availability (excluding current user)
-- SELECT EXISTS(
--     SELECT 1 FROM users 
--     WHERE username = $1 
--     AND id != $2
-- ) as exists;

-- Validate email availability (excluding current user)
-- SELECT EXISTS(
--     SELECT 1 FROM users 
--     WHERE email = $1 
--     AND id != $2
-- ) as exists;

-- =====================================================
-- 11. SAMPLE DATA INSERTION
-- =====================================================

-- Note: Use the hashPassword.js script to generate password hashes
-- Example: node scripts/hashPassword.js yourpassword

-- Insert sample admin user (default password: admin123)
-- Password hash for 'admin123': $2a$10$8YYZQkM8p0FXQfj0V5qG0eZF7YBvXzGxFJn5mQUGZQxKGQJqxGqN6
INSERT INTO users (name, username, email, password_hash, user_dob, user_contact_num, role_id, join_date)
SELECT 
    'Admin User',
    'admin',
    'admin@rick.com',
    '$2a$10$8YYZQkM8p0FXQfj0V5qG0eZF7YBvXzGxFJn5mQUGZQxKGQJqxGqN6',
    '1990-01-01',
    '+1234567890',
    r.id,
    CURRENT_DATE
FROM roles r
WHERE r.name = 'superadmin'
ON CONFLICT (username) DO NOTHING;

-- Insert sample manager user (default password: manager123)
INSERT INTO users (name, username, email, password_hash, user_dob, user_contact_num, role_id, join_date)
SELECT 
    'Manager User',
    'manager',
    'manager@rick.com',
    '$2a$10$8YYZQkM8p0FXQfj0V5qG0eZF7YBvXzGxFJn5mQUGZQxKGQJqxGqN6',
    '1992-05-15',
    '+1234567891',
    r.id,
    CURRENT_DATE
FROM roles r
WHERE r.name = 'manager'
ON CONFLICT (username) DO NOTHING;

-- Insert sample employee user (default password: employee123)
INSERT INTO users (name, username, email, password_hash, user_dob, user_contact_num, role_id, join_date)
SELECT 
    'Employee User',
    'employee',
    'employee@rick.com',
    '$2a$10$8YYZQkM8p0FXQfj0V5qG0eZF7YBvXzGxFJn5mQUGZQxKGQJqxGqN6',
    '1995-08-20',
    '+1234567892',
    r.id,
    CURRENT_DATE
FROM roles r
WHERE r.name = 'employee'
ON CONFLICT (username) DO NOTHING;

-- =====================================================
-- END OF USERS.SQL
-- =====================================================

