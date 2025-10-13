-- ============================================
-- VEHICLES TABLE SCHEMA
-- Complete SQL script for vehicles management
-- ============================================

-- ============================================
-- 1. CREATE VEHICLES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS vehicles (
    id SERIAL PRIMARY KEY,
    rick_no VARCHAR(50) NOT NULL,
    plate_code VARCHAR(20) NOT NULL,
    plate_no VARCHAR(50) NOT NULL,
    mulkiya_expiry DATE,
    vehicle_insurance_expiry DATE,
    chassis_no VARCHAR(100),
    engine_no VARCHAR(100),
    vehicle_type VARCHAR(100),
    model VARCHAR(100),
    status VARCHAR(50) DEFAULT 'available' CHECK (status IN ('available', 'in_use', 'maintenance', 'retired')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_plate UNIQUE (plate_code, plate_no)
);

-- ============================================
-- 2. CREATE INDEXES (for performance)
-- ============================================
CREATE INDEX IF NOT EXISTS idx_vehicles_rick_no ON vehicles(rick_no);
CREATE INDEX IF NOT EXISTS idx_vehicles_plate_code ON vehicles(plate_code);
CREATE INDEX IF NOT EXISTS idx_vehicles_plate_no ON vehicles(plate_no);
CREATE INDEX IF NOT EXISTS idx_vehicles_plate_code_no ON vehicles(plate_code, plate_no);
CREATE INDEX IF NOT EXISTS idx_vehicles_chassis_no ON vehicles(chassis_no);
CREATE INDEX IF NOT EXISTS idx_vehicles_engine_no ON vehicles(engine_no);
CREATE INDEX IF NOT EXISTS idx_vehicles_vehicle_type ON vehicles(vehicle_type);
CREATE INDEX IF NOT EXISTS idx_vehicles_model ON vehicles(model);
CREATE INDEX IF NOT EXISTS idx_vehicles_status ON vehicles(status);
CREATE INDEX IF NOT EXISTS idx_vehicles_mulkiya_expiry ON vehicles(mulkiya_expiry);
CREATE INDEX IF NOT EXISTS idx_vehicles_insurance_expiry ON vehicles(vehicle_insurance_expiry);
CREATE INDEX IF NOT EXISTS idx_vehicles_created_at ON vehicles(created_at);

-- ============================================
-- 3. CREATE TRIGGER FUNCTION (auto-update updated_at)
-- ============================================
CREATE OR REPLACE FUNCTION update_vehicles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 4. CREATE TRIGGER
-- ============================================
DROP TRIGGER IF EXISTS trigger_update_vehicles_updated_at ON vehicles;
CREATE TRIGGER trigger_update_vehicles_updated_at
    BEFORE UPDATE ON vehicles
    FOR EACH ROW
    EXECUTE FUNCTION update_vehicles_updated_at();

-- ============================================
-- 5. INSERT SAMPLE DATA (optional for testing)
-- ============================================
INSERT INTO vehicles (
    rick_no,
    plate_code,
    plate_no,
    mulkiya_expiry,
    vehicle_insurance_expiry,
    chassis_no,
    engine_no,
    vehicle_type,
    model,
    status
) VALUES 
    (
        'RICK001',
        'A',
        '12345',
        '2025-12-31',
        '2025-11-30',
        'CHAS001XYZ123456',
        'ENG001ABC789012',
        'Sedan',
        'Toyota Camry 2023',
        'available'
    ),
    (
        'RICK001',
        'B',
        '67890',
        '2026-01-15',
        '2025-12-15',
        'CHAS002XYZ234567',
        'ENG002ABC890123',
        'SUV',
        'Toyota Land Cruiser 2023',
        'in_use'
    ),
    (
        'RICK002',
        'C',
        '11111',
        '2025-11-30',
        '2025-10-30',
        'CHAS003XYZ345678',
        'ENG003ABC901234',
        'Limousine',
        'Mercedes S-Class 2023',
        'available'
    ),
    (
        'RICK003',
        'D',
        '22222',
        '2026-02-28',
        '2026-01-28',
        'CHAS004XYZ456789',
        'ENG004ABC012345',
        'Sedan',
        'BMW 7 Series 2022',
        'available'
    ),
    (
        'RICK004',
        'E',
        '33333',
        '2025-10-15',
        '2025-09-15',
        'CHAS005XYZ567890',
        'ENG005ABC123456',
        'SUV',
        'Range Rover 2023',
        'maintenance'
    ),
    (
        'RICK005',
        'F',
        '44444',
        '2025-11-01',
        '2025-10-01',
        'CHAS006XYZ678901',
        'ENG006ABC234567',
        'Sedan',
        'Audi A6 2023',
        'available'
    ),
    (
        'RICK006',
        'G',
        '55555',
        '2025-09-30',
        '2025-08-30',
        'CHAS007XYZ789012',
        'ENG007ABC345678',
        'Limousine',
        'Lexus LS 2022',
        'available'
    ),
    (
        'RICK007',
        'H',
        '66666',
        '2026-03-15',
        '2026-02-15',
        'CHAS008XYZ890123',
        'ENG008ABC456789',
        'SUV',
        'GMC Yukon 2023',
        'in_use'
    ),
    (
        'RICK008',
        'J',
        '77777',
        '2025-10-31',
        '2025-09-30',
        'CHAS009XYZ901234',
        'ENG009ABC567890',
        'Sedan',
        'Honda Accord 2023',
        'available'
    ),
    (
        'RICK009',
        'K',
        '88888',
        '2024-12-31',
        '2024-11-30',
        'CHAS010XYZ012345',
        'ENG010ABC678901',
        'Van',
        'Toyota Hiace 2021',
        'retired'
    )
ON CONFLICT (plate_code, plate_no) DO NOTHING;

-- ============================================
-- 6. ADD VEHICLE PERMISSIONS TO RBAC
-- ============================================

-- Insert vehicle permissions
INSERT INTO permissions (name, description, resource, action) VALUES 
    ('vehicles.view', 'View vehicles', 'vehicles', 'view'),
    ('vehicles.create', 'Create vehicles', 'vehicles', 'create'),
    ('vehicles.update', 'Update vehicles', 'vehicles', 'update'),
    ('vehicles.delete', 'Delete vehicles', 'vehicles', 'delete')
ON CONFLICT (name) DO NOTHING;

-- Grant all vehicle permissions to superadmin
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'superadmin' 
  AND p.resource = 'vehicles'
ON CONFLICT DO NOTHING;

-- Grant all vehicle permissions to admin
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'admin' 
  AND p.resource = 'vehicles'
ON CONFLICT DO NOTHING;

-- Grant view/create/update vehicle permissions to manager
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'manager' 
  AND p.resource = 'vehicles'
  AND p.action IN ('view', 'create', 'update')
ON CONFLICT DO NOTHING;

-- Grant view vehicle permission to employee
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'employee' 
  AND p.resource = 'vehicles'
  AND p.action = 'view'
ON CONFLICT DO NOTHING;

-- Grant view vehicle permission to driver role
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'driver' 
  AND p.resource = 'vehicles'
  AND p.action = 'view'
ON CONFLICT DO NOTHING;

-- ============================================
-- 7. USEFUL FUNCTIONS FOR VEHICLE QUERIES
-- ============================================

-- Function to get vehicles by RICK number
CREATE OR REPLACE FUNCTION get_vehicles_by_rick(rick_number TEXT)
RETURNS TABLE (
    id INTEGER,
    rick_no VARCHAR(50),
    plate_code VARCHAR(20),
    plate_no VARCHAR(50),
    vehicle_type VARCHAR(100),
    model VARCHAR(100),
    status VARCHAR(50),
    mulkiya_expiry DATE,
    vehicle_insurance_expiry DATE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        v.id,
        v.rick_no,
        v.plate_code,
        v.plate_no,
        v.vehicle_type,
        v.model,
        v.status,
        v.mulkiya_expiry,
        v.vehicle_insurance_expiry
    FROM vehicles v
    WHERE v.rick_no = rick_number
    ORDER BY v.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to get vehicles by status
CREATE OR REPLACE FUNCTION get_vehicles_by_status(vehicle_status TEXT)
RETURNS TABLE (
    id INTEGER,
    rick_no VARCHAR(50),
    plate_code VARCHAR(20),
    plate_no VARCHAR(50),
    vehicle_type VARCHAR(100),
    model VARCHAR(100),
    status VARCHAR(50)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        v.id,
        v.rick_no,
        v.plate_code,
        v.plate_no,
        v.vehicle_type,
        v.model,
        v.status
    FROM vehicles v
    WHERE v.status = vehicle_status
    ORDER BY v.rick_no, v.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to get expiring vehicles
CREATE OR REPLACE FUNCTION get_expiring_vehicles(days_ahead INTEGER DEFAULT 30)
RETURNS TABLE (
    id INTEGER,
    rick_no VARCHAR(50),
    plate_code VARCHAR(20),
    plate_no VARCHAR(50),
    vehicle_type VARCHAR(100),
    model VARCHAR(100),
    mulkiya_expiry DATE,
    vehicle_insurance_expiry DATE,
    days_until_mulkiya_expiry INTEGER,
    days_until_insurance_expiry INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        v.id,
        v.rick_no,
        v.plate_code,
        v.plate_no,
        v.vehicle_type,
        v.model,
        v.mulkiya_expiry,
        v.vehicle_insurance_expiry,
        (v.mulkiya_expiry - CURRENT_DATE)::INTEGER as days_until_mulkiya_expiry,
        (v.vehicle_insurance_expiry - CURRENT_DATE)::INTEGER as days_until_insurance_expiry
    FROM vehicles v
    WHERE 
        (v.mulkiya_expiry <= CURRENT_DATE + INTERVAL '1 day' * days_ahead AND v.mulkiya_expiry >= CURRENT_DATE)
        OR (v.vehicle_insurance_expiry <= CURRENT_DATE + INTERVAL '1 day' * days_ahead AND v.vehicle_insurance_expiry >= CURRENT_DATE)
    ORDER BY 
        LEAST(
            COALESCE(v.mulkiya_expiry, '9999-12-31'::date),
            COALESCE(v.vehicle_insurance_expiry, '9999-12-31'::date)
        ) ASC;
END;
$$ LANGUAGE plpgsql;

-- Function to count vehicles by type
CREATE OR REPLACE FUNCTION count_vehicles_by_type()
RETURNS TABLE (
    vehicle_type VARCHAR(100),
    vehicle_count BIGINT,
    available_count BIGINT,
    in_use_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        v.vehicle_type,
        COUNT(*) as vehicle_count,
        COUNT(CASE WHEN v.status = 'available' THEN 1 END) as available_count,
        COUNT(CASE WHEN v.status = 'in_use' THEN 1 END) as in_use_count
    FROM vehicles v
    WHERE v.vehicle_type IS NOT NULL
    GROUP BY v.vehicle_type
    ORDER BY vehicle_count DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to check if vehicle exists by plate
CREATE OR REPLACE FUNCTION vehicle_exists_by_plate(
    p_plate_code VARCHAR(20),
    p_plate_no VARCHAR(50)
)
RETURNS BOOLEAN AS $$
DECLARE
    exists_flag BOOLEAN;
BEGIN
    SELECT EXISTS(
        SELECT 1 FROM vehicles
        WHERE plate_code = p_plate_code AND plate_no = p_plate_no
    ) INTO exists_flag;
    
    RETURN exists_flag;
END;
$$ LANGUAGE plpgsql;

-- Function to get vehicle summary statistics
CREATE OR REPLACE FUNCTION get_vehicle_summary()
RETURNS TABLE (
    total_vehicles BIGINT,
    available_vehicles BIGINT,
    in_use_vehicles BIGINT,
    maintenance_vehicles BIGINT,
    retired_vehicles BIGINT,
    unique_ricks BIGINT,
    expiring_mulkiya_30_days BIGINT,
    expiring_insurance_30_days BIGINT,
    expired_mulkiya BIGINT,
    expired_insurance BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*) as total_vehicles,
        COUNT(CASE WHEN status = 'available' THEN 1 END) as available_vehicles,
        COUNT(CASE WHEN status = 'in_use' THEN 1 END) as in_use_vehicles,
        COUNT(CASE WHEN status = 'maintenance' THEN 1 END) as maintenance_vehicles,
        COUNT(CASE WHEN status = 'retired' THEN 1 END) as retired_vehicles,
        COUNT(DISTINCT rick_no) as unique_ricks,
        COUNT(CASE WHEN mulkiya_expiry <= CURRENT_DATE + INTERVAL '30 days' AND mulkiya_expiry >= CURRENT_DATE THEN 1 END) as expiring_mulkiya_30_days,
        COUNT(CASE WHEN vehicle_insurance_expiry <= CURRENT_DATE + INTERVAL '30 days' AND vehicle_insurance_expiry >= CURRENT_DATE THEN 1 END) as expiring_insurance_30_days,
        COUNT(CASE WHEN mulkiya_expiry < CURRENT_DATE THEN 1 END) as expired_mulkiya,
        COUNT(CASE WHEN vehicle_insurance_expiry < CURRENT_DATE THEN 1 END) as expired_insurance
    FROM vehicles;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- VERIFICATION QUERIES (optional - for testing)
-- ============================================

-- Check if vehicles table exists
-- SELECT table_name FROM information_schema.tables WHERE table_name = 'vehicles';

-- Check table structure
-- SELECT column_name, data_type, is_nullable, column_default 
-- FROM information_schema.columns 
-- WHERE table_name = 'vehicles' 
-- ORDER BY ordinal_position;

-- Check indexes
-- SELECT indexname, indexdef 
-- FROM pg_indexes 
-- WHERE tablename = 'vehicles';

-- Check constraints
-- SELECT constraint_name, constraint_type 
-- FROM information_schema.table_constraints 
-- WHERE table_name = 'vehicles';

-- Count vehicles
-- SELECT COUNT(*) as total_vehicles FROM vehicles;

-- Count vehicles by status
-- SELECT status, COUNT(*) as count 
-- FROM vehicles 
-- GROUP BY status 
-- ORDER BY count DESC;

-- Count vehicles by type
-- SELECT vehicle_type, COUNT(*) as count 
-- FROM vehicles 
-- WHERE vehicle_type IS NOT NULL
-- GROUP BY vehicle_type 
-- ORDER BY count DESC;

-- Count vehicles by RICK
-- SELECT rick_no, COUNT(*) as vehicle_count 
-- FROM vehicles 
-- GROUP BY rick_no 
-- ORDER BY vehicle_count DESC;

-- View all vehicles
-- SELECT * FROM vehicles ORDER BY created_at DESC;

-- View available vehicles
-- SELECT rick_no, plate_code, plate_no, vehicle_type, model, status 
-- FROM vehicles 
-- WHERE status = 'available' 
-- ORDER BY vehicle_type, model;

-- View vehicles with expiring documents (next 30 days)
-- SELECT 
--     rick_no,
--     plate_code || '-' || plate_no as plate,
--     vehicle_type,
--     model,
--     mulkiya_expiry,
--     vehicle_insurance_expiry,
--     (mulkiya_expiry - CURRENT_DATE) as days_until_mulkiya_expiry,
--     (vehicle_insurance_expiry - CURRENT_DATE) as days_until_insurance_expiry
-- FROM vehicles
-- WHERE 
--     (mulkiya_expiry <= CURRENT_DATE + INTERVAL '30 days' AND mulkiya_expiry >= CURRENT_DATE)
--     OR (vehicle_insurance_expiry <= CURRENT_DATE + INTERVAL '30 days' AND vehicle_insurance_expiry >= CURRENT_DATE)
-- ORDER BY 
--     LEAST(
--         COALESCE(mulkiya_expiry, '9999-12-31'::date),
--         COALESCE(vehicle_insurance_expiry, '9999-12-31'::date)
--     ) ASC;

-- View expired documents
-- SELECT 
--     rick_no,
--     plate_code || '-' || plate_no as plate,
--     vehicle_type,
--     model,
--     mulkiya_expiry,
--     vehicle_insurance_expiry,
--     CASE 
--         WHEN mulkiya_expiry < CURRENT_DATE THEN 'Mulkiya Expired'
--         WHEN vehicle_insurance_expiry < CURRENT_DATE THEN 'Insurance Expired'
--         ELSE 'OK'
--     END as status
-- FROM vehicles
-- WHERE mulkiya_expiry < CURRENT_DATE OR vehicle_insurance_expiry < CURRENT_DATE
-- ORDER BY mulkiya_expiry, vehicle_insurance_expiry;

-- Search vehicles by plate
-- SELECT * FROM vehicles 
-- WHERE plate_code ILIKE '%A%' OR plate_no ILIKE '%123%'
-- ORDER BY created_at DESC;

-- Search vehicles by chassis or engine number
-- SELECT * FROM vehicles 
-- WHERE chassis_no ILIKE '%XYZ%' OR engine_no ILIKE '%ABC%'
-- ORDER BY created_at DESC;

-- Get vehicles for specific RICK
-- SELECT 
--     id,
--     plate_code || '-' || plate_no as plate,
--     vehicle_type,
--     model,
--     status,
--     mulkiya_expiry,
--     vehicle_insurance_expiry
-- FROM vehicles
-- WHERE rick_no = 'RICK001'
-- ORDER BY created_at DESC;

-- Test custom functions
-- SELECT * FROM get_vehicles_by_rick('RICK001');
-- SELECT * FROM get_vehicles_by_status('available');
-- SELECT * FROM get_expiring_vehicles(30);
-- SELECT * FROM count_vehicles_by_type();
-- SELECT vehicle_exists_by_plate('A', '12345');
-- SELECT * FROM get_vehicle_summary();

-- Check vehicle permissions
-- SELECT * FROM permissions WHERE resource = 'vehicles';

-- Verify superadmin has vehicle permissions
-- SELECT 
--     r.name as role_name,
--     p.name as permission_name,
--     p.description
-- FROM roles r
-- JOIN role_permissions rp ON r.id = rp.role_id
-- JOIN permissions p ON rp.permission_id = p.id
-- WHERE r.name = 'superadmin' AND p.resource = 'vehicles';

-- Verify all roles' vehicle permissions
-- SELECT 
--     r.name as role_name,
--     p.name as permission_name,
--     p.action,
--     p.description
-- FROM roles r
-- JOIN role_permissions rp ON r.id = rp.role_id
-- JOIN permissions p ON rp.permission_id = p.id
-- WHERE p.resource = 'vehicles'
-- ORDER BY r.name, p.action;

-- Get vehicle fleet summary
-- SELECT 
--     COUNT(*) as total_vehicles,
--     COUNT(DISTINCT rick_no) as total_drivers,
--     COUNT(DISTINCT vehicle_type) as vehicle_types,
--     AVG(CASE WHEN status = 'available' THEN 1.0 ELSE 0.0 END) * 100 as availability_rate
-- FROM vehicles;

-- Get oldest and newest vehicles
-- SELECT 
--     'Oldest' as type,
--     rick_no,
--     plate_code || '-' || plate_no as plate,
--     vehicle_type,
--     model,
--     created_at
-- FROM vehicles
-- ORDER BY created_at ASC
-- LIMIT 1
-- UNION ALL
-- SELECT 
--     'Newest' as type,
--     rick_no,
--     plate_code || '-' || plate_no as plate,
--     vehicle_type,
--     model,
--     created_at
-- FROM vehicles
-- ORDER BY created_at DESC
-- LIMIT 1;

-- Get vehicles grouped by RICK with counts
-- SELECT 
--     rick_no,
--     COUNT(*) as vehicle_count,
--     COUNT(CASE WHEN status = 'available' THEN 1 END) as available_count,
--     COUNT(CASE WHEN status = 'in_use' THEN 1 END) as in_use_count,
--     STRING_AGG(vehicle_type, ', ' ORDER BY vehicle_type) as vehicle_types
-- FROM vehicles
-- GROUP BY rick_no
-- ORDER BY vehicle_count DESC;

