-- ============================================
-- RICK NUMBERS TABLE SCHEMA
-- Complete SQL script for Rick numbers management
-- ============================================

-- ============================================
-- 1. CREATE RICK NUMBERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS rick_numbers (
    id SERIAL PRIMARY KEY,
    rick VARCHAR(50) UNIQUE NOT NULL,
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended', 'retired')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 2. CREATE INDEXES (for performance)
-- ============================================
CREATE INDEX IF NOT EXISTS idx_rick_numbers_rick ON rick_numbers(rick);
CREATE INDEX IF NOT EXISTS idx_rick_numbers_status ON rick_numbers(status);
CREATE INDEX IF NOT EXISTS idx_rick_numbers_created_at ON rick_numbers(created_at);
CREATE INDEX IF NOT EXISTS idx_rick_numbers_updated_at ON rick_numbers(updated_at);

-- ============================================
-- 3. CREATE TRIGGER FUNCTION (auto-update updated_at)
-- ============================================
CREATE OR REPLACE FUNCTION update_rick_numbers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 4. CREATE TRIGGER
-- ============================================
DROP TRIGGER IF EXISTS trigger_update_rick_numbers_updated_at ON rick_numbers;
CREATE TRIGGER trigger_update_rick_numbers_updated_at
    BEFORE UPDATE ON rick_numbers
    FOR EACH ROW
    EXECUTE FUNCTION update_rick_numbers_updated_at();

-- ============================================
-- 5. INSERT SAMPLE DATA (optional for testing)
-- ============================================
INSERT INTO rick_numbers (
    rick,
    status
) VALUES 
    ('RICK001', 'active'),
    ('RICK002', 'active'),
    ('RICK003', 'active'),
    ('RICK004', 'inactive'),
    ('RICK005', 'active'),
    ('RICK006', 'active'),
    ('RICK007', 'suspended'),
    ('RICK008', 'active'),
    ('RICK009', 'retired'),
    ('RICK010', 'active')
ON CONFLICT (rick) DO NOTHING;

-- ============================================
-- 6. ADD RICK NUMBERS PERMISSIONS TO RBAC
-- ============================================

-- Insert rick_numbers permissions
INSERT INTO permissions (name, description, resource, action) VALUES 
    ('rick_numbers.view', 'View Rick numbers', 'rick_numbers', 'view'),
    ('rick_numbers.create', 'Create Rick numbers', 'rick_numbers', 'create'),
    ('rick_numbers.update', 'Update Rick numbers', 'rick_numbers', 'update'),
    ('rick_numbers.delete', 'Delete Rick numbers', 'rick_numbers', 'delete')
ON CONFLICT (name) DO NOTHING;

-- Grant all rick_numbers permissions to superadmin
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'superadmin' 
  AND p.resource = 'rick_numbers'
ON CONFLICT DO NOTHING;

-- Grant all rick_numbers permissions to admin
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'admin' 
  AND p.resource = 'rick_numbers'
ON CONFLICT DO NOTHING;

-- Grant view/create/update rick_numbers permissions to manager
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'manager' 
  AND p.resource = 'rick_numbers'
  AND p.action IN ('view', 'create', 'update')
ON CONFLICT DO NOTHING;

-- Grant view rick_numbers permission to employee
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'employee' 
  AND p.resource = 'rick_numbers'
  AND p.action = 'view'
ON CONFLICT DO NOTHING;

-- Grant view rick_numbers permission to driver role
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'driver' 
  AND p.resource = 'rick_numbers'
  AND p.action = 'view'
ON CONFLICT DO NOTHING;

-- ============================================
-- 7. USEFUL FUNCTIONS FOR RICK NUMBERS QUERIES
-- ============================================

-- Function to get Rick number by rick
CREATE OR REPLACE FUNCTION get_rick_number_by_no(rick_number TEXT)
RETURNS TABLE (
    id INTEGER,
    rick VARCHAR(50),
    status VARCHAR(50),
    created_at TIMESTAMP,
    updated_at TIMESTAMP
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        rn.id,
        rn.rick,
        rn.status,
        rn.created_at,
        rn.updated_at
    FROM rick_numbers rn
    WHERE rn.rick = rick_number;
END;
$$ LANGUAGE plpgsql;

-- Function to get Rick numbers by status
CREATE OR REPLACE FUNCTION get_rick_numbers_by_status(rick_status TEXT)
RETURNS TABLE (
    id INTEGER,
    rick VARCHAR(50),
    status VARCHAR(50),
    created_at TIMESTAMP,
    updated_at TIMESTAMP
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        rn.id,
        rn.rick,
        rn.status,
        rn.created_at,
        rn.updated_at
    FROM rick_numbers rn
    WHERE rn.status = rick_status
    ORDER BY rn.rick;
END;
$$ LANGUAGE plpgsql;

-- Function to get active Rick numbers
CREATE OR REPLACE FUNCTION get_active_rick_numbers()
RETURNS TABLE (
    id INTEGER,
    rick VARCHAR(50),
    status VARCHAR(50),
    created_at TIMESTAMP,
    updated_at TIMESTAMP
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        rn.id,
        rn.rick,
        rn.status,
        rn.created_at,
        rn.updated_at
    FROM rick_numbers rn
    WHERE rn.status = 'active'
    ORDER BY rn.rick;
END;
$$ LANGUAGE plpgsql;

-- Function to check if Rick number exists
CREATE OR REPLACE FUNCTION rick_number_exists(rick_number TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    exists_flag BOOLEAN;
BEGIN
    SELECT EXISTS(
        SELECT 1 FROM rick_numbers
        WHERE rick = rick_number
    ) INTO exists_flag;
    
    RETURN exists_flag;
END;
$$ LANGUAGE plpgsql;

-- Function to get Rick numbers summary statistics
CREATE OR REPLACE FUNCTION get_rick_numbers_summary()
RETURNS TABLE (
    total_rick_numbers BIGINT,
    active_rick_numbers BIGINT,
    inactive_rick_numbers BIGINT,
    suspended_rick_numbers BIGINT,
    retired_rick_numbers BIGINT,
    created_this_month BIGINT,
    created_this_year BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*) as total_rick_numbers,
        COUNT(CASE WHEN status = 'active' THEN 1 END) as active_rick_numbers,
        COUNT(CASE WHEN status = 'inactive' THEN 1 END) as inactive_rick_numbers,
        COUNT(CASE WHEN status = 'suspended' THEN 1 END) as suspended_rick_numbers,
        COUNT(CASE WHEN status = 'retired' THEN 1 END) as retired_rick_numbers,
        COUNT(CASE WHEN created_at >= DATE_TRUNC('month', CURRENT_DATE) THEN 1 END) as created_this_month,
        COUNT(CASE WHEN created_at >= DATE_TRUNC('year', CURRENT_DATE) THEN 1 END) as created_this_year
    FROM rick_numbers;
END;
$$ LANGUAGE plpgsql;

-- Function to get Rick numbers with vehicle counts
CREATE OR REPLACE FUNCTION get_rick_numbers_with_vehicle_counts()
RETURNS TABLE (
    id INTEGER,
    rick VARCHAR(50),
    status VARCHAR(50),
    total_vehicles BIGINT,
    available_vehicles BIGINT,
    in_use_vehicles BIGINT,
    maintenance_vehicles BIGINT,
    retired_vehicles BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        rn.id,
        rn.rick,
        rn.status,
        COUNT(v.id) as total_vehicles,
        COUNT(CASE WHEN v.status = 'available' THEN 1 END) as available_vehicles,
        COUNT(CASE WHEN v.status = 'in_use' THEN 1 END) as in_use_vehicles,
        COUNT(CASE WHEN v.status = 'maintenance' THEN 1 END) as maintenance_vehicles,
        COUNT(CASE WHEN v.status = 'retired' THEN 1 END) as retired_vehicles
    FROM rick_numbers rn
    LEFT JOIN vehicles v ON rn.rick = v.rick_no
    GROUP BY rn.id, rn.rick, rn.status
    ORDER BY rn.rick;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- VERIFICATION QUERIES (optional - for testing)
-- ============================================

-- Check if rick_numbers table exists
-- SELECT table_name FROM information_schema.tables WHERE table_name = 'rick_numbers';

-- Check table structure
-- SELECT column_name, data_type, is_nullable, column_default 
-- FROM information_schema.columns 
-- WHERE table_name = 'rick_numbers' 
-- ORDER BY ordinal_position;

-- Check indexes
-- SELECT indexname, indexdef 
-- FROM pg_indexes 
-- WHERE tablename = 'rick_numbers';

-- Check constraints
-- SELECT constraint_name, constraint_type 
-- FROM information_schema.table_constraints 
-- WHERE table_name = 'rick_numbers';

-- Count Rick numbers
-- SELECT COUNT(*) as total_rick_numbers FROM rick_numbers;

-- Count Rick numbers by status
-- SELECT status, COUNT(*) as count 
-- FROM rick_numbers 
-- GROUP BY status 
-- ORDER BY count DESC;

-- View all Rick numbers
-- SELECT * FROM rick_numbers ORDER BY created_at DESC;

-- View active Rick numbers
-- SELECT rick, status, created_at, updated_at 
-- FROM rick_numbers 
-- WHERE status = 'active' 
-- ORDER BY rick;

-- Test custom functions
-- SELECT * FROM get_rick_number_by_no('RICK001');
-- SELECT * FROM get_rick_numbers_by_status('active');
-- SELECT * FROM get_active_rick_numbers();
-- SELECT rick_number_exists('RICK001');
-- SELECT * FROM get_rick_numbers_summary();
-- SELECT * FROM get_rick_numbers_with_vehicle_counts();

-- Check Rick numbers permissions
-- SELECT * FROM permissions WHERE resource = 'rick_numbers';

-- Verify superadmin has Rick numbers permissions
-- SELECT 
--     r.name as role_name,
--     p.name as permission_name,
--     p.description
-- FROM roles r
-- JOIN role_permissions rp ON r.id = rp.role_id
-- JOIN permissions p ON rp.permission_id = p.id
-- WHERE r.name = 'superadmin' AND p.resource = 'rick_numbers';

-- Verify all roles' Rick numbers permissions
-- SELECT 
--     r.name as role_name,
--     p.name as permission_name,
--     p.action,
--     p.description
-- FROM roles r
-- JOIN role_permissions rp ON r.id = rp.role_id
-- JOIN permissions p ON rp.permission_id = p.id
-- WHERE p.resource = 'rick_numbers'
-- ORDER BY r.name, p.action;

-- Get Rick numbers summary
-- SELECT 
--     COUNT(*) as total_rick_numbers,
--     COUNT(DISTINCT status) as status_types,
--     AVG(CASE WHEN status = 'active' THEN 1.0 ELSE 0.0 END) * 100 as active_percentage
-- FROM rick_numbers;

-- Search Rick numbers by rick
-- SELECT * FROM rick_numbers 
-- WHERE rick ILIKE '%RICK001%'
-- ORDER BY created_at DESC;

-- Get Rick numbers with recent updates
-- SELECT rick, status, updated_at
-- FROM rick_numbers
-- WHERE updated_at >= CURRENT_DATE - INTERVAL '7 days'
-- ORDER BY updated_at DESC;

-- Get Rick numbers created in the last month
-- SELECT rick, status, created_at
-- FROM rick_numbers
-- WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
-- ORDER BY created_at DESC;
