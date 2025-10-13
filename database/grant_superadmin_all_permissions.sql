-- =====================================================
-- GRANT ALL PERMISSIONS TO SUPERADMIN
-- This ensures superadmin has complete access to everything
-- =====================================================

-- Step 1: Ensure superadmin role exists
INSERT INTO roles (name, description) 
VALUES ('superadmin', 'Super Administrator with full system access')
ON CONFLICT (name) DO NOTHING;

-- Step 2: Remove old permission assignments for superadmin
DELETE FROM role_permissions
WHERE role_id = (SELECT id FROM roles WHERE name = 'superadmin');

-- Step 3: Grant ALL permissions to superadmin
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'superadmin'
ON CONFLICT DO NOTHING;

-- Step 4: Verify the grant
SELECT 
    'Superadmin now has ' || COUNT(*) || ' permissions' as result
FROM role_permissions rp
JOIN roles r ON rp.role_id = r.id
WHERE r.name = 'superadmin';

-- Step 5: Show all permissions for superadmin
SELECT 
    p.resource,
    p.action,
    p.name,
    p.description
FROM role_permissions rp
JOIN roles r ON rp.role_id = r.id
JOIN permissions p ON rp.permission_id = p.id
WHERE r.name = 'superadmin'
ORDER BY p.resource, p.action;

-- Step 6: Show users with superadmin role
SELECT 
    u.id,
    u.username,
    u.email,
    u.name,
    u.is_active,
    'Superadmin' as role
FROM users u
JOIN roles r ON u.role_id = r.id
WHERE r.name = 'superadmin';

-- =====================================================
-- DONE! Superadmin now has ALL permissions
-- =====================================================

