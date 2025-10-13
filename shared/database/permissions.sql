-- ============================================
-- RBAC (Role-Based Access Control) SCHEMA
-- Complete SQL script for users, roles, and permissions management
-- ============================================

-- ============================================
-- 1. CREATE ROLES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 2. CREATE/ALTER USERS TABLE
-- ============================================
-- Note: This assumes users table might already exist, so we use ALTER to add columns
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255),
    email VARCHAR(255) UNIQUE,
    password VARCHAR(255),
    role_id INTEGER REFERENCES roles(id)
);

-- Add missing columns to users table if they don't exist
ALTER TABLE users ADD COLUMN IF NOT EXISTS username VARCHAR(50) UNIQUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login TIMESTAMP WITH TIME ZONE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS refresh_token TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

-- Update existing users to have username from name (if username is null)
UPDATE users SET username = LOWER(REPLACE(name, ' ', '_')) WHERE username IS NULL;

-- ============================================
-- 3. CREATE PERMISSIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS permissions (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    resource VARCHAR(50) NOT NULL,
    action VARCHAR(50) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 4. CREATE ROLE_PERMISSIONS JUNCTION TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS role_permissions (
    role_id INTEGER REFERENCES roles(id) ON DELETE CASCADE,
    permission_id INTEGER REFERENCES permissions(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (role_id, permission_id)
);

-- ============================================
-- 5. CREATE INDEXES (for performance)
-- ============================================

-- Users indexes
CREATE INDEX IF NOT EXISTS idx_users_role_id ON users(role_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);
CREATE INDEX IF NOT EXISTS idx_users_name ON users(name);

-- Roles indexes
CREATE INDEX IF NOT EXISTS idx_roles_name ON roles(name);
CREATE INDEX IF NOT EXISTS idx_roles_is_active ON roles(is_active);

-- Permissions indexes
CREATE INDEX IF NOT EXISTS idx_permissions_name ON permissions(name);
CREATE INDEX IF NOT EXISTS idx_permissions_resource ON permissions(resource);
CREATE INDEX IF NOT EXISTS idx_permissions_action ON permissions(action);
CREATE INDEX IF NOT EXISTS idx_permissions_resource_action ON permissions(resource, action);

-- Role permissions indexes
CREATE INDEX IF NOT EXISTS idx_role_permissions_role_id ON role_permissions(role_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_permission_id ON role_permissions(permission_id);

-- ============================================
-- 6. INSERT DEFAULT ROLES
-- ============================================
INSERT INTO roles (name, description) VALUES 
    ('superadmin', 'Super Administrator with full system access'),
    ('admin', 'Administrator with management access'),
    ('manager', 'Manager with operational access'),
    ('employee', 'Employee with limited access'),
    ('driver', 'Driver with driver-specific access')
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- 7. INSERT ALL PERMISSIONS
-- ============================================

-- User Management Permissions
INSERT INTO permissions (name, description, resource, action) VALUES 
    ('users.view', 'View users', 'users', 'view'),
    ('users.create', 'Create users', 'users', 'create'),
    ('users.update', 'Update users', 'users', 'update'),
    ('users.delete', 'Delete users', 'users', 'delete')
ON CONFLICT (name) DO NOTHING;

-- Driver Management Permissions
INSERT INTO permissions (name, description, resource, action) VALUES 
    ('drivers.view', 'View drivers', 'drivers', 'view'),
    ('drivers.create', 'Create drivers', 'drivers', 'create'),
    ('drivers.update', 'Update drivers', 'drivers', 'update'),
    ('drivers.delete', 'Delete drivers', 'drivers', 'delete')
ON CONFLICT (name) DO NOTHING;

-- Vehicle Management Permissions
INSERT INTO permissions (name, description, resource, action) VALUES 
    ('vehicles.view', 'View vehicles', 'vehicles', 'view'),
    ('vehicles.create', 'Create vehicles', 'vehicles', 'create'),
    ('vehicles.update', 'Update vehicles', 'vehicles', 'update'),
    ('vehicles.delete', 'Delete vehicles', 'vehicles', 'delete')
ON CONFLICT (name) DO NOTHING;

-- Finance Management Permissions
INSERT INTO permissions (name, description, resource, action) VALUES 
    ('finances.view', 'View finance records', 'finances', 'view'),
    ('finances.create', 'Create finance records', 'finances', 'create'),
    ('finances.update', 'Update finance records', 'finances', 'update'),
    ('finances.delete', 'Delete finance records', 'finances', 'delete'),
    ('finances.upload', 'Upload finance records via Excel', 'finances', 'upload')
ON CONFLICT (name) DO NOTHING;

-- Payslip Management Permissions
INSERT INTO permissions (name, description, resource, action) VALUES 
    ('payslips.view', 'View payslips', 'payslips', 'view'),
    ('payslips.create', 'Create payslips', 'payslips', 'create'),
    ('payslips.update', 'Update payslips', 'payslips', 'update'),
    ('payslips.delete', 'Delete payslips', 'payslips', 'delete'),
    ('payslips.generate', 'Generate payslips from finance data', 'payslips', 'generate')
ON CONFLICT (name) DO NOTHING;

-- Booking Management Permissions
INSERT INTO permissions (name, description, resource, action) VALUES 
    ('bookings.view', 'View bookings', 'bookings', 'view'),
    ('bookings.create', 'Create bookings', 'bookings', 'create'),
    ('bookings.update', 'Update bookings', 'bookings', 'update'),
    ('bookings.delete', 'Delete bookings', 'bookings', 'delete')
ON CONFLICT (name) DO NOTHING;

-- Field Metadata Management Permissions
INSERT INTO permissions (name, description, resource, action) VALUES 
    ('field_metadata.view', 'View field metadata', 'field_metadata', 'view'),
    ('field_metadata.create', 'Create field metadata', 'field_metadata', 'create'),
    ('field_metadata.update', 'Update field metadata', 'field_metadata', 'update'),
    ('field_metadata.delete', 'Delete field metadata', 'field_metadata', 'delete')
ON CONFLICT (name) DO NOTHING;

-- Role Management Permissions
INSERT INTO permissions (name, description, resource, action) VALUES 
    ('roles.view', 'View roles', 'roles', 'view'),
    ('roles.create', 'Create roles', 'roles', 'create'),
    ('roles.update', 'Update roles', 'roles', 'update'),
    ('roles.delete', 'Delete roles', 'roles', 'delete'),
    ('roles.assign', 'Assign roles to users', 'roles', 'assign')
ON CONFLICT (name) DO NOTHING;

-- Dashboard & Reports Permissions
INSERT INTO permissions (name, description, resource, action) VALUES 
    ('dashboard.view', 'View dashboard', 'dashboard', 'view'),
    ('reports.view', 'View reports', 'reports', 'view'),
    ('reports.export', 'Export reports', 'reports', 'export')
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- 8. ASSIGN PERMISSIONS TO ROLES
-- ============================================

-- SUPERADMIN: Gets ALL permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'superadmin'
ON CONFLICT DO NOTHING;

-- ADMIN: Gets most permissions except role management
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'admin' 
  AND p.resource IN ('users', 'drivers', 'vehicles', 'finances', 'payslips', 'bookings', 'dashboard', 'reports')
ON CONFLICT DO NOTHING;

-- Grant field_metadata view/update to admin
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'admin' 
  AND p.resource = 'field_metadata'
  AND p.action IN ('view', 'update')
ON CONFLICT DO NOTHING;

-- MANAGER: Gets view, create, update permissions (no delete)
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'manager' 
  AND p.action IN ('view', 'create', 'update', 'generate')
  AND p.resource IN ('drivers', 'vehicles', 'finances', 'payslips', 'bookings', 'dashboard', 'reports')
ON CONFLICT DO NOTHING;

-- EMPLOYEE: Gets view permissions only
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'employee' 
  AND p.action = 'view'
  AND p.resource IN ('drivers', 'vehicles', 'finances', 'payslips', 'bookings', 'dashboard')
ON CONFLICT DO NOTHING;

-- DRIVER: Gets limited view permissions (own data)
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'driver' 
  AND p.action = 'view'
  AND p.resource IN ('payslips', 'vehicles', 'dashboard', 'drivers')
ON CONFLICT DO NOTHING;

-- ============================================
-- 9. CREATE TRIGGER FUNCTIONS
-- ============================================

-- Function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 10. CREATE TRIGGERS
-- ============================================

-- Trigger for roles table
DROP TRIGGER IF EXISTS trigger_update_roles_updated_at ON roles;
CREATE TRIGGER trigger_update_roles_updated_at
    BEFORE UPDATE ON roles 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger for users table
DROP TRIGGER IF EXISTS trigger_update_users_updated_at ON users;
CREATE TRIGGER trigger_update_users_updated_at
    BEFORE UPDATE ON users 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger for permissions table
DROP TRIGGER IF EXISTS trigger_update_permissions_updated_at ON permissions;
CREATE TRIGGER trigger_update_permissions_updated_at
    BEFORE UPDATE ON permissions 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 11. USEFUL FUNCTIONS FOR RBAC QUERIES
-- ============================================

-- Function to get all permissions for a user
CREATE OR REPLACE FUNCTION get_user_permissions(user_id INTEGER)
RETURNS TABLE (
    permission_name VARCHAR(100),
    resource VARCHAR(50),
    action VARCHAR(50),
    description TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.name,
        p.resource,
        p.action,
        p.description
    FROM users u
    JOIN roles r ON u.role_id = r.id
    JOIN role_permissions rp ON r.id = rp.role_id
    JOIN permissions p ON rp.permission_id = p.id
    WHERE u.id = user_id
    ORDER BY p.resource, p.action;
END;
$$ LANGUAGE plpgsql;

-- Function to check if user has specific permission
CREATE OR REPLACE FUNCTION user_has_permission(
    user_id INTEGER,
    permission_name VARCHAR(100)
)
RETURNS BOOLEAN AS $$
DECLARE
    has_perm BOOLEAN;
BEGIN
    SELECT EXISTS(
        SELECT 1
        FROM users u
        JOIN roles r ON u.role_id = r.id
        JOIN role_permissions rp ON r.id = rp.role_id
        JOIN permissions p ON rp.permission_id = p.id
        WHERE u.id = user_id AND p.name = permission_name
    ) INTO has_perm;
    
    RETURN has_perm;
END;
$$ LANGUAGE plpgsql;

-- Function to get all users with a specific role
CREATE OR REPLACE FUNCTION get_users_by_role(role_name VARCHAR(50))
RETURNS TABLE (
    user_id INTEGER,
    username VARCHAR(50),
    email VARCHAR(255),
    name VARCHAR(255),
    is_active BOOLEAN,
    created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        u.id,
        u.username,
        u.email,
        u.name,
        u.is_active,
        u.created_at
    FROM users u
    JOIN roles r ON u.role_id = r.id
    WHERE r.name = role_name
    ORDER BY u.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to get role with all its permissions
CREATE OR REPLACE FUNCTION get_role_permissions(role_name VARCHAR(50))
RETURNS TABLE (
    permission_name VARCHAR(100),
    resource VARCHAR(50),
    action VARCHAR(50),
    description TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.name,
        p.resource,
        p.action,
        p.description
    FROM roles r
    JOIN role_permissions rp ON r.id = rp.role_id
    JOIN permissions p ON rp.permission_id = p.id
    WHERE r.name = role_name
    ORDER BY p.resource, p.action;
END;
$$ LANGUAGE plpgsql;

-- Function to count users by role
CREATE OR REPLACE FUNCTION count_users_by_role()
RETURNS TABLE (
    role_name VARCHAR(50),
    user_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        r.name,
        COUNT(u.id)
    FROM roles r
    LEFT JOIN users u ON r.id = u.role_id
    GROUP BY r.name
    ORDER BY COUNT(u.id) DESC;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- VERIFICATION QUERIES (optional - for testing)
-- ============================================

-- Check if tables exist
-- SELECT table_name FROM information_schema.tables 
-- WHERE table_name IN ('users', 'roles', 'permissions', 'role_permissions');

-- Check table structures
-- SELECT column_name, data_type, is_nullable, column_default 
-- FROM information_schema.columns 
-- WHERE table_name = 'permissions' 
-- ORDER BY ordinal_position;

-- Check indexes
-- SELECT tablename, indexname, indexdef 
-- FROM pg_indexes 
-- WHERE tablename IN ('users', 'roles', 'permissions', 'role_permissions')
-- ORDER BY tablename, indexname;

-- View all roles
-- SELECT * FROM roles ORDER BY name;

-- View all permissions grouped by resource
-- SELECT resource, action, name, description 
-- FROM permissions 
-- ORDER BY resource, action;

-- Count permissions by resource
-- SELECT 
--     resource,
--     COUNT(*) as permission_count,
--     STRING_AGG(action, ', ' ORDER BY action) as actions
-- FROM permissions
-- GROUP BY resource
-- ORDER BY resource;

-- View all role-permission assignments
-- SELECT 
--     r.name as role_name,
--     p.resource,
--     p.action,
--     p.name as permission_name
-- FROM roles r
-- JOIN role_permissions rp ON r.id = rp.role_id
-- JOIN permissions p ON rp.permission_id = p.id
-- ORDER BY r.name, p.resource, p.action;

-- Count permissions by role
-- SELECT 
--     r.name as role_name,
--     r.description,
--     COUNT(rp.permission_id) as permission_count
-- FROM roles r
-- LEFT JOIN role_permissions rp ON r.id = rp.role_id
-- GROUP BY r.id, r.name, r.description
-- ORDER BY permission_count DESC;

-- View superadmin permissions
-- SELECT 
--     p.resource,
--     STRING_AGG(p.action, ', ' ORDER BY p.action) as actions,
--     COUNT(*) as count
-- FROM roles r
-- JOIN role_permissions rp ON r.id = rp.role_id
-- JOIN permissions p ON rp.permission_id = p.id
-- WHERE r.name = 'superadmin'
-- GROUP BY p.resource
-- ORDER BY p.resource;

-- Compare permissions between roles
-- SELECT 
--     p.resource,
--     p.action,
--     MAX(CASE WHEN r.name = 'superadmin' THEN '✓' ELSE '' END) as superadmin,
--     MAX(CASE WHEN r.name = 'admin' THEN '✓' ELSE '' END) as admin,
--     MAX(CASE WHEN r.name = 'manager' THEN '✓' ELSE '' END) as manager,
--     MAX(CASE WHEN r.name = 'employee' THEN '✓' ELSE '' END) as employee,
--     MAX(CASE WHEN r.name = 'driver' THEN '✓' ELSE '' END) as driver
-- FROM permissions p
-- LEFT JOIN role_permissions rp ON p.id = rp.permission_id
-- LEFT JOIN roles r ON rp.role_id = r.id
-- GROUP BY p.resource, p.action
-- ORDER BY p.resource, p.action;

-- View all users with their roles
-- SELECT 
--     u.id,
--     u.username,
--     u.name,
--     u.email,
--     r.name as role_name,
--     u.is_active,
--     u.last_login,
--     u.created_at
-- FROM users u
-- LEFT JOIN roles r ON u.role_id = r.id
-- ORDER BY u.created_at DESC;

-- Count active vs inactive users
-- SELECT 
--     r.name as role_name,
--     COUNT(CASE WHEN u.is_active = true THEN 1 END) as active_users,
--     COUNT(CASE WHEN u.is_active = false THEN 1 END) as inactive_users,
--     COUNT(*) as total_users
-- FROM roles r
-- LEFT JOIN users u ON r.id = u.role_id
-- GROUP BY r.name
-- ORDER BY r.name;

-- Find users without any role
-- SELECT id, username, name, email 
-- FROM users 
-- WHERE role_id IS NULL;

-- Find permissions not assigned to any role
-- SELECT p.name, p.resource, p.action, p.description
-- FROM permissions p
-- LEFT JOIN role_permissions rp ON p.id = rp.permission_id
-- WHERE rp.permission_id IS NULL
-- ORDER BY p.resource, p.action;

-- Test custom functions
-- SELECT * FROM get_user_permissions(1);
-- SELECT user_has_permission(1, 'users.view');
-- SELECT * FROM get_users_by_role('admin');
-- SELECT * FROM get_role_permissions('superadmin');
-- SELECT * FROM count_users_by_role();

-- Get permission matrix (resources vs roles)
-- SELECT 
--     p.resource,
--     COUNT(DISTINCT p.id) as total_permissions,
--     COUNT(DISTINCT CASE WHEN r.name = 'superadmin' THEN p.id END) as superadmin_count,
--     COUNT(DISTINCT CASE WHEN r.name = 'admin' THEN p.id END) as admin_count,
--     COUNT(DISTINCT CASE WHEN r.name = 'manager' THEN p.id END) as manager_count,
--     COUNT(DISTINCT CASE WHEN r.name = 'employee' THEN p.id END) as employee_count,
--     COUNT(DISTINCT CASE WHEN r.name = 'driver' THEN p.id END) as driver_count
-- FROM permissions p
-- LEFT JOIN role_permissions rp ON p.id = rp.permission_id
-- LEFT JOIN roles r ON rp.role_id = r.id
-- GROUP BY p.resource
-- ORDER BY p.resource;

-- List all resources and their available actions
-- SELECT 
--     resource,
--     STRING_AGG(DISTINCT action, ', ' ORDER BY action) as available_actions,
--     COUNT(*) as permission_count
-- FROM permissions
-- GROUP BY resource
-- ORDER BY resource;

