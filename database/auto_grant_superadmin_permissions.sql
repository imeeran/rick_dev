-- =====================================================
-- AUTO GRANT ALL PERMISSIONS TO SUPERADMIN
-- This ensures superadmin automatically gets ALL permissions
-- =====================================================

-- Step 1: Create function to grant all permissions to superadmin
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

-- Step 2: Create trigger function to auto-grant new permissions to superadmin
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

-- Step 3: Create trigger on permissions table
DROP TRIGGER IF EXISTS auto_grant_permission_trigger ON permissions;
CREATE TRIGGER auto_grant_permission_trigger
    AFTER INSERT ON permissions
    FOR EACH ROW
    EXECUTE FUNCTION auto_grant_permission_to_superadmin();

-- Step 4: Grant all current permissions to superadmin
SELECT grant_all_permissions_to_superadmin();

-- Step 5: Create function to check and fix superadmin permissions
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

-- Step 6: Create function to fix missing superadmin permissions
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

-- Step 7: Run initial setup
SELECT 'Setting up auto-grant system for superadmin...' as message;

-- Grant all current permissions
SELECT grant_all_permissions_to_superadmin();

-- Check status
SELECT * FROM ensure_superadmin_has_all_permissions();

-- Step 8: Create view for easy monitoring
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

-- Step 9: Show final status
SELECT 'Auto-grant system setup complete!' as message;
SELECT * FROM superadmin_permission_status;

-- =====================================================
-- USAGE INSTRUCTIONS:
-- =====================================================
-- 1. Check superadmin permission status:
--    SELECT * FROM superadmin_permission_status;
--
-- 2. Fix any missing permissions:
--    SELECT * FROM fix_superadmin_permissions();
--
-- 3. Grant all permissions manually:
--    SELECT grant_all_permissions_to_superadmin();
--
-- 4. Check detailed status:
--    SELECT * FROM ensure_superadmin_has_all_permissions();
-- =====================================================

