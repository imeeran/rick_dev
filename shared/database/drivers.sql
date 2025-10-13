-- ============================================
-- DRIVERS TABLE SCHEMA
-- Complete SQL script for drivers management
-- ============================================

-- ============================================
-- 1. CREATE DRIVERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS drivers (
    id SERIAL PRIMARY KEY,
    rick VARCHAR(50) UNIQUE NOT NULL,
    category VARCHAR(100),
    name VARCHAR(255) NOT NULL,
    mobile VARCHAR(20),
    eid_no VARCHAR(50),
    visa_expiry DATE,
    passport_no VARCHAR(50),
    passport_expiry DATE,
    daman_expiry DATE,
    driving_licence_no VARCHAR(50),
    driving_licence_expiry DATE,
    trafic_code VARCHAR(50),
    trans_no VARCHAR(50),
    limo_permit_expiry DATE,
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended', 'on_leave')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 2. CREATE INDEXES (for performance)
-- ============================================
CREATE INDEX IF NOT EXISTS idx_drivers_rick ON drivers(rick);
CREATE INDEX IF NOT EXISTS idx_drivers_name ON drivers(name);
CREATE INDEX IF NOT EXISTS idx_drivers_mobile ON drivers(mobile);
CREATE INDEX IF NOT EXISTS idx_drivers_status ON drivers(status);
CREATE INDEX IF NOT EXISTS idx_drivers_category ON drivers(category);
CREATE INDEX IF NOT EXISTS idx_drivers_eid_no ON drivers(eid_no);
CREATE INDEX IF NOT EXISTS idx_drivers_passport_no ON drivers(passport_no);
CREATE INDEX IF NOT EXISTS idx_drivers_visa_expiry ON drivers(visa_expiry);
CREATE INDEX IF NOT EXISTS idx_drivers_passport_expiry ON drivers(passport_expiry);
CREATE INDEX IF NOT EXISTS idx_drivers_daman_expiry ON drivers(daman_expiry);
CREATE INDEX IF NOT EXISTS idx_drivers_driving_licence_expiry ON drivers(driving_licence_expiry);
CREATE INDEX IF NOT EXISTS idx_drivers_limo_permit_expiry ON drivers(limo_permit_expiry);
CREATE INDEX IF NOT EXISTS idx_drivers_created_at ON drivers(created_at);

-- ============================================
-- 3. CREATE TRIGGER FUNCTION (auto-update updated_at)
-- ============================================
CREATE OR REPLACE FUNCTION update_drivers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 4. CREATE TRIGGER
-- ============================================
DROP TRIGGER IF EXISTS trigger_update_drivers_updated_at ON drivers;
CREATE TRIGGER trigger_update_drivers_updated_at
    BEFORE UPDATE ON drivers
    FOR EACH ROW
    EXECUTE FUNCTION update_drivers_updated_at();

-- ============================================
-- 5. INSERT SAMPLE DATA (optional for testing)
-- ============================================
INSERT INTO drivers (
    rick,
    category,
    name,
    mobile,
    eid_no,
    visa_expiry,
    passport_no,
    passport_expiry,
    daman_expiry,
    driving_licence_no,
    driving_licence_expiry,
    trafic_code,
    trans_no,
    limo_permit_expiry,
    status
) VALUES 
    (
        'RICK001',
        'Limousine',
        'Ahmed Ali',
        '+971501234567',
        '784-1234-5678901-2',
        '2025-12-31',
        'A12345678',
        '2026-06-30',
        '2025-11-30',
        'DL123456',
        '2026-03-31',
        'TC001',
        'TR001',
        '2025-10-31',
        'active'
    ),
    (
        'RICK002',
        'Sedan',
        'Mohammed Hassan',
        '+971501234568',
        '784-1234-5678902-3',
        '2026-01-15',
        'B23456789',
        '2026-08-15',
        '2025-12-15',
        'DL234567',
        '2026-05-15',
        'TC002',
        'TR002',
        '2025-11-15',
        'active'
    ),
    (
        'RICK003',
        'SUV',
        'Abdullah Rahman',
        '+971501234569',
        '784-1234-5678903-4',
        '2025-11-30',
        'C34567890',
        '2026-07-30',
        '2025-10-30',
        'DL345678',
        '2026-04-30',
        'TC003',
        'TR003',
        '2025-12-30',
        'active'
    ),
    (
        'RICK004',
        'Limousine',
        'Khalid Ibrahim',
        '+971501234570',
        '784-1234-5678904-5',
        '2026-02-28',
        'D45678901',
        '2026-09-28',
        '2026-01-28',
        'DL456789',
        '2026-06-28',
        'TC004',
        'TR004',
        '2026-01-28',
        'inactive'
    ),
    (
        'RICK005',
        'Sedan',
        'Omar Youssef',
        '+971501234571',
        '784-1234-5678905-6',
        '2025-10-15',
        'E56789012',
        '2026-05-15',
        '2025-09-15',
        'DL567890',
        '2026-02-15',
        'TC005',
        'TR005',
        '2025-10-15',
        'active'
    ),
    (
        'RICK006',
        'SUV',
        'Hassan Mahmoud',
        '+971501234572',
        '784-1234-5678906-7',
        '2025-11-01',
        'F67890123',
        '2026-06-01',
        '2025-10-01',
        'DL678901',
        '2026-03-01',
        'TC006',
        'TR006',
        '2025-11-01',
        'active'
    ),
    (
        'RICK007',
        'Limousine',
        'Saeed Ahmed',
        '+971501234573',
        '784-1234-5678907-8',
        '2025-09-30',
        'G78901234',
        '2026-04-30',
        '2025-08-30',
        'DL789012',
        '2026-01-30',
        'TC007',
        'TR007',
        '2025-09-30',
        'suspended'
    ),
    (
        'RICK008',
        'Sedan',
        'Tariq Khaled',
        '+971501234574',
        '784-1234-5678908-9',
        '2026-03-15',
        'H89012345',
        '2026-10-15',
        '2026-02-15',
        'DL890123',
        '2026-07-15',
        'TC008',
        'TR008',
        '2026-01-15',
        'active'
    ),
    (
        'RICK009',
        'SUV',
        'Rashid Malik',
        '+971501234575',
        '784-1234-5678909-0',
        '2025-10-31',
        'I90123456',
        '2026-05-31',
        '2025-09-30',
        'DL901234',
        '2026-02-28',
        'TC009',
        'TR009',
        '2025-10-31',
        'on_leave'
    ),
    (
        'RICK010',
        'Limousine',
        'Faisal Abdullah',
        '+971501234576',
        '784-1234-5678910-1',
        '2026-01-31',
        'J01234567',
        '2026-08-31',
        '2025-12-31',
        'DL012345',
        '2026-05-31',
        'TC010',
        'TR010',
        '2025-11-30',
        'active'
    )
ON CONFLICT (rick) DO NOTHING;

-- ============================================
-- 6. ADD DRIVER PERMISSIONS TO RBAC
-- ============================================

-- Insert driver permissions
INSERT INTO permissions (name, description, resource, action) VALUES 
    ('drivers.view', 'View drivers', 'drivers', 'view'),
    ('drivers.create', 'Create drivers', 'drivers', 'create'),
    ('drivers.update', 'Update drivers', 'drivers', 'update'),
    ('drivers.delete', 'Delete drivers', 'drivers', 'delete')
ON CONFLICT (name) DO NOTHING;

-- Grant all driver permissions to superadmin
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'superadmin' 
  AND p.resource = 'drivers'
ON CONFLICT DO NOTHING;

-- Grant all driver permissions to admin
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'admin' 
  AND p.resource = 'drivers'
ON CONFLICT DO NOTHING;

-- Grant view/create/update driver permissions to manager
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'manager' 
  AND p.resource = 'drivers'
  AND p.action IN ('view', 'create', 'update')
ON CONFLICT DO NOTHING;

-- Grant view driver permission to employee
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'employee' 
  AND p.resource = 'drivers'
  AND p.action = 'view'
ON CONFLICT DO NOTHING;

-- Grant view driver permission to driver role (view own data)
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'driver' 
  AND p.resource = 'drivers'
  AND p.action = 'view'
ON CONFLICT DO NOTHING;

-- ============================================
-- VERIFICATION QUERIES (optional - for testing)
-- ============================================

-- Check if drivers table exists
-- SELECT table_name FROM information_schema.tables WHERE table_name = 'drivers';

-- Check table structure
-- SELECT column_name, data_type, is_nullable, column_default 
-- FROM information_schema.columns 
-- WHERE table_name = 'drivers' 
-- ORDER BY ordinal_position;

-- Check indexes
-- SELECT indexname, indexdef 
-- FROM pg_indexes 
-- WHERE tablename = 'drivers';

-- Count drivers
-- SELECT COUNT(*) as total_drivers FROM drivers;

-- Count drivers by status
-- SELECT status, COUNT(*) as count 
-- FROM drivers 
-- GROUP BY status 
-- ORDER BY count DESC;

-- Count drivers by category
-- SELECT category, COUNT(*) as count 
-- FROM drivers 
-- WHERE category IS NOT NULL
-- GROUP BY category 
-- ORDER BY count DESC;

-- View all drivers
-- SELECT * FROM drivers ORDER BY created_at DESC;

-- View active drivers
-- SELECT rick, name, mobile, category, status 
-- FROM drivers 
-- WHERE status = 'active' 
-- ORDER BY name;

-- Check expiring documents (next 30 days)
-- SELECT 
--     rick,
--     name,
--     visa_expiry,
--     passport_expiry,
--     daman_expiry,
--     driving_licence_expiry,
--     limo_permit_expiry
-- FROM drivers
-- WHERE 
--     visa_expiry <= CURRENT_DATE + INTERVAL '30 days' AND visa_expiry >= CURRENT_DATE
--     OR passport_expiry <= CURRENT_DATE + INTERVAL '30 days' AND passport_expiry >= CURRENT_DATE
--     OR daman_expiry <= CURRENT_DATE + INTERVAL '30 days' AND daman_expiry >= CURRENT_DATE
--     OR driving_licence_expiry <= CURRENT_DATE + INTERVAL '30 days' AND driving_licence_expiry >= CURRENT_DATE
--     OR limo_permit_expiry <= CURRENT_DATE + INTERVAL '30 days' AND limo_permit_expiry >= CURRENT_DATE
-- ORDER BY 
--     LEAST(
--         COALESCE(visa_expiry, '9999-12-31'::date),
--         COALESCE(passport_expiry, '9999-12-31'::date),
--         COALESCE(daman_expiry, '9999-12-31'::date),
--         COALESCE(driving_licence_expiry, '9999-12-31'::date),
--         COALESCE(limo_permit_expiry, '9999-12-31'::date)
--     ) ASC;

-- Check driver permissions
-- SELECT * FROM permissions WHERE resource = 'drivers';

-- Verify superadmin has driver permissions
-- SELECT 
--     r.name as role_name,
--     p.name as permission_name,
--     p.description
-- FROM roles r
-- JOIN role_permissions rp ON r.id = rp.role_id
-- JOIN permissions p ON p.id = rp.permission_id
-- WHERE r.name = 'superadmin' AND p.resource = 'drivers';

-- Verify all roles' driver permissions
-- SELECT 
--     r.name as role_name,
--     p.name as permission_name,
--     p.action,
--     p.description
-- FROM roles r
-- JOIN role_permissions rp ON r.id = rp.role_id
-- JOIN permissions p ON p.id = rp.permission_id
-- WHERE p.resource = 'drivers'
-- ORDER BY r.name, p.action;

