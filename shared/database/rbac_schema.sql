-- RBAC Database Schema
-- This schema implements Role-Based Access Control with users, roles, and permissions
-- Note: roles and users tables already exist, we'll just add missing columns

-- Add missing columns to existing roles table
ALTER TABLE roles ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE roles ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE roles ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE roles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

-- Add missing columns to existing users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS username VARCHAR(50) UNIQUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login TIMESTAMP WITH TIME ZONE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS refresh_token TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

-- Update existing users to have username from name (if username is null)
UPDATE users SET username = LOWER(REPLACE(name, ' ', '_')) WHERE username IS NULL;

-- Create permissions table
CREATE TABLE IF NOT EXISTS permissions (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    resource VARCHAR(50) NOT NULL,
    action VARCHAR(50) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create role_permissions junction table
CREATE TABLE IF NOT EXISTS role_permissions (
    role_id INTEGER REFERENCES roles(id) ON DELETE CASCADE,
    permission_id INTEGER REFERENCES permissions(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (role_id, permission_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_role_id ON users(role_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);
CREATE INDEX IF NOT EXISTS idx_roles_name ON roles(name);
CREATE INDEX IF NOT EXISTS idx_permissions_resource ON permissions(resource);
CREATE INDEX IF NOT EXISTS idx_permissions_action ON permissions(action);

-- Insert default roles
INSERT INTO roles (name, description) VALUES 
    ('superadmin', 'Super Administrator with full system access'),
    ('admin', 'Administrator with management access'),
    ('manager', 'Manager with operational access'),
    ('employee', 'Employee with limited access'),
    ('driver', 'Driver with driver-specific access')
ON CONFLICT (name) DO NOTHING;

-- Insert default permissions
INSERT INTO permissions (name, description, resource, action) VALUES 
    -- User Management
    ('users.view', 'View users', 'users', 'view'),
    ('users.create', 'Create users', 'users', 'create'),
    ('users.update', 'Update users', 'users', 'update'),
    ('users.delete', 'Delete users', 'users', 'delete'),
    
    -- Driver Management
    ('drivers.view', 'View drivers', 'drivers', 'view'),
    ('drivers.create', 'Create drivers', 'drivers', 'create'),
    ('drivers.update', 'Update drivers', 'drivers', 'update'),
    ('drivers.delete', 'Delete drivers', 'drivers', 'delete'),
    
    -- Vehicle Management
    ('vehicles.view', 'View vehicles', 'vehicles', 'view'),
    ('vehicles.create', 'Create vehicles', 'vehicles', 'create'),
    ('vehicles.update', 'Update vehicles', 'vehicles', 'update'),
    ('vehicles.delete', 'Delete vehicles', 'vehicles', 'delete'),
    
    -- Finance Management
    ('finances.view', 'View finance records', 'finances', 'view'),
    ('finances.create', 'Create finance records', 'finances', 'create'),
    ('finances.update', 'Update finance records', 'finances', 'update'),
    ('finances.delete', 'Delete finance records', 'finances', 'delete'),
    ('finances.upload', 'Upload finance records', 'finances', 'upload'),
    
    -- Payslip Management
    ('payslips.view', 'View payslips', 'payslips', 'view'),
    ('payslips.create', 'Create payslips', 'payslips', 'create'),
    ('payslips.generate', 'Generate payslips', 'payslips', 'generate'),
    ('payslips.update', 'Update payslips', 'payslips', 'update'),
    ('payslips.delete', 'Delete payslips', 'payslips', 'delete'),
    
    -- Role Management
    ('roles.view', 'View roles', 'roles', 'view'),
    ('roles.create', 'Create roles', 'roles', 'create'),
    ('roles.update', 'Update roles', 'roles', 'update'),
    ('roles.delete', 'Delete roles', 'roles', 'delete'),
    ('roles.assign', 'Assign roles to users', 'roles', 'assign'),
    
    -- Dashboard & Reports
    ('dashboard.view', 'View dashboard', 'dashboard', 'view'),
    ('reports.view', 'View reports', 'reports', 'view'),
    ('reports.export', 'Export reports', 'reports', 'export')
ON CONFLICT (name) DO NOTHING;

-- Assign permissions to roles
-- Superadmin gets all permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'superadmin'
ON CONFLICT DO NOTHING;

-- Admin gets most permissions except role management
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'admin' 
  AND p.resource IN ('users', 'drivers', 'vehicles', 'finances', 'payslips', 'dashboard', 'reports')
ON CONFLICT DO NOTHING;

-- Manager gets view and update permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'manager' 
  AND p.action IN ('view', 'update', 'create')
  AND p.resource IN ('drivers', 'vehicles', 'finances', 'payslips', 'dashboard', 'reports')
ON CONFLICT DO NOTHING;

-- Employee gets view permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'employee' 
  AND p.action = 'view'
  AND p.resource IN ('drivers', 'vehicles', 'finances', 'payslips', 'dashboard')
ON CONFLICT DO NOTHING;

-- Driver gets limited permissions (view own data)
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'driver' 
  AND p.action = 'view'
  AND p.resource IN ('payslips', 'vehicles', 'dashboard')
ON CONFLICT DO NOTHING;

-- Create trigger for updating updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_roles_updated_at 
    BEFORE UPDATE ON roles 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_permissions_updated_at 
    BEFORE UPDATE ON permissions 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- AUTO-GRANT SYSTEM FOR SUPERADMIN
-- Ensures superadmin automatically gets ALL permissions
-- =====================================================

-- Create function to grant all permissions to superadmin
CREATE OR REPLACE FUNCTION grant_all_permissions_to_superadmin()
RETURNS void AS $$
DECLARE
    superadmin_role_id INTEGER;
    permission_count INTEGER;
BEGIN
    -- Get superadmin role ID
    SELECT id INTO superadmin_role_id FROM roles WHERE name = 'superadmin';
    
    IF superadmin_role_id IS NULL THEN
        -- Create superadmin role if it doesn't exist
        INSERT INTO roles (name, description, is_active) 
        VALUES ('superadmin', 'Super Administrator with full system access', true)
        RETURNING id INTO superadmin_role_id;
        RAISE NOTICE 'Created superadmin role with ID: %', superadmin_role_id;
    END IF;
    
    -- Grant ALL existing permissions to superadmin
    INSERT INTO role_permissions (role_id, permission_id)
    SELECT superadmin_role_id, p.id
    FROM permissions p
    WHERE NOT EXISTS (
        SELECT 1 FROM role_permissions rp 
        WHERE rp.role_id = superadmin_role_id 
        AND rp.permission_id = p.id
    )
    ON CONFLICT DO NOTHING;
    
    -- Get count of permissions granted
    SELECT COUNT(*) INTO permission_count
    FROM role_permissions rp
    WHERE rp.role_id = superadmin_role_id;
    
    RAISE NOTICE 'Superadmin now has % permissions', permission_count;
END;
$$ LANGUAGE plpgsql;

-- Create trigger function to auto-grant new permissions to superadmin
CREATE OR REPLACE FUNCTION auto_grant_permission_to_superadmin()
RETURNS TRIGGER AS $$
DECLARE
    superadmin_role_id INTEGER;
BEGIN
    -- Get superadmin role ID
    SELECT id INTO superadmin_role_id FROM roles WHERE name = 'superadmin';
    
    IF superadmin_role_id IS NOT NULL THEN
        -- Grant the new permission to superadmin
        INSERT INTO role_permissions (role_id, permission_id)
        VALUES (superadmin_role_id, NEW.id)
        ON CONFLICT DO NOTHING;
        
        RAISE NOTICE 'Auto-granted permission % to superadmin', NEW.name;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on permissions table to auto-grant new permissions
DROP TRIGGER IF EXISTS auto_grant_permission_trigger ON permissions;
CREATE TRIGGER auto_grant_permission_trigger
    AFTER INSERT ON permissions
    FOR EACH ROW
    EXECUTE FUNCTION auto_grant_permission_to_superadmin();

-- Create function to check superadmin permission status
CREATE OR REPLACE FUNCTION ensure_superadmin_has_all_permissions()
RETURNS TABLE(
    total_permissions INTEGER,
    superadmin_permissions INTEGER,
    missing_permissions INTEGER,
    status TEXT
) AS $$
DECLARE
    total_count INTEGER;
    superadmin_count INTEGER;
    missing_count INTEGER;
    status_text TEXT;
BEGIN
    -- Get total permissions count
    SELECT COUNT(*) INTO total_count FROM permissions;
    
    -- Get superadmin permissions count
    SELECT COUNT(*) INTO superadmin_count
    FROM role_permissions rp
    JOIN roles r ON rp.role_id = r.id
    WHERE r.name = 'superadmin';
    
    -- Calculate missing permissions
    missing_count := total_count - superadmin_count;
    
    -- Determine status
    IF missing_count = 0 THEN
        status_text := 'COMPLETE - Superadmin has all permissions';
    ELSE
        status_text := 'INCOMPLETE - Superadmin missing ' || missing_count || ' permissions';
    END IF;
    
    -- Return results
    RETURN QUERY SELECT total_count, superadmin_count, missing_count, status_text;
END;
$$ LANGUAGE plpgsql;

-- Create function to fix missing superadmin permissions
CREATE OR REPLACE FUNCTION fix_superadmin_permissions()
RETURNS TABLE(
    permissions_granted INTEGER,
    message TEXT
) AS $$
DECLARE
    superadmin_role_id INTEGER;
    granted_count INTEGER;
BEGIN
    -- Get superadmin role ID
    SELECT id INTO superadmin_role_id FROM roles WHERE name = 'superadmin';
    
    IF superadmin_role_id IS NULL THEN
        RETURN QUERY SELECT 0, 'ERROR: Superadmin role not found';
        RETURN;
    END IF;
    
    -- Grant missing permissions to superadmin
    INSERT INTO role_permissions (role_id, permission_id)
    SELECT superadmin_role_id, p.id
    FROM permissions p
    WHERE NOT EXISTS (
        SELECT 1 FROM role_permissions rp 
        WHERE rp.role_id = superadmin_role_id 
        AND rp.permission_id = p.id
    )
    ON CONFLICT DO NOTHING;
    
    -- Get count of permissions granted
    GET DIAGNOSTICS granted_count = ROW_COUNT;
    
    RETURN QUERY SELECT granted_count, 'Granted ' || granted_count || ' missing permissions to superadmin';
END;
$$ LANGUAGE plpgsql;

-- Create view for easy monitoring
CREATE OR REPLACE VIEW superadmin_permission_status AS
SELECT 
    (SELECT COUNT(*) FROM permissions) as total_permissions,
    (SELECT COUNT(*) FROM role_permissions rp JOIN roles r ON rp.role_id = r.id WHERE r.name = 'superadmin') as superadmin_permissions,
    (SELECT COUNT(*) FROM permissions) - (SELECT COUNT(*) FROM role_permissions rp JOIN roles r ON rp.role_id = r.id WHERE r.name = 'superadmin') as missing_permissions,
    CASE 
        WHEN (SELECT COUNT(*) FROM permissions) = (SELECT COUNT(*) FROM role_permissions rp JOIN roles r ON rp.role_id = r.id WHERE r.name = 'superadmin')
        THEN 'COMPLETE'
        ELSE 'INCOMPLETE'
    END as status;

-- Grant all current permissions to superadmin
SELECT grant_all_permissions_to_superadmin();
