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
