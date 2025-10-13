-- ============================================
-- FINANCE_RECORDS TABLE SCHEMA
-- Complete SQL script for finance records management
-- Uses JSONB for flexible/dynamic field storage
-- ============================================

-- ============================================
-- 1. CREATE FINANCE_RECORDS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS finance_records (
    id SERIAL PRIMARY KEY,
    data JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 2. CREATE INDEXES (for performance)
-- ============================================

-- GIN index for full JSONB search
CREATE INDEX IF NOT EXISTS idx_finance_records_data_gin ON finance_records USING GIN (data);

-- Specific JSONB field indexes for common queries
CREATE INDEX IF NOT EXISTS idx_finance_records_rick ON finance_records USING GIN ((data->>'rick'));
CREATE INDEX IF NOT EXISTS idx_finance_records_name ON finance_records USING GIN ((data->>'name'));
CREATE INDEX IF NOT EXISTS idx_finance_records_month ON finance_records USING GIN ((data->>'month'));
CREATE INDEX IF NOT EXISTS idx_finance_records_year ON finance_records USING GIN ((data->>'year'));

-- Timestamp indexes
CREATE INDEX IF NOT EXISTS idx_finance_records_created_at ON finance_records(created_at);
CREATE INDEX IF NOT EXISTS idx_finance_records_updated_at ON finance_records(updated_at);

-- Composite index for date-based queries
CREATE INDEX IF NOT EXISTS idx_finance_records_created_at_desc ON finance_records(created_at DESC);

-- Index for month filtering
CREATE INDEX IF NOT EXISTS idx_finance_records_month_trunc ON finance_records(DATE_TRUNC('month', created_at));

-- ============================================
-- 3. CREATE TRIGGER FUNCTION (auto-update updated_at)
-- ============================================
CREATE OR REPLACE FUNCTION update_finance_records_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 4. CREATE TRIGGER
-- ============================================
DROP TRIGGER IF EXISTS trigger_update_finance_records_updated_at ON finance_records;
CREATE TRIGGER trigger_update_finance_records_updated_at
    BEFORE UPDATE ON finance_records
    FOR EACH ROW
    EXECUTE FUNCTION update_finance_records_updated_at();

-- ============================================
-- 5. INSERT SAMPLE DATA (optional for testing)
-- ============================================
INSERT INTO finance_records (data) VALUES 
    ('{
        "rick": "RICK001",
        "name": "Ahmed Ali",
        "month": "January",
        "year": 2025,
        "basic_salary": 3000,
        "total_salary": 3500,
        "uber_trips": 250,
        "careem_trips": 180,
        "salik_charges": 120,
        "fuel_advance": 500,
        "daman_insurance": 150,
        "status": "paid"
    }'::jsonb),
    ('{
        "rick": "RICK002",
        "name": "Mohammed Hassan",
        "month": "January",
        "year": 2025,
        "basic_salary": 3200,
        "total_salary": 3750,
        "uber_trips": 280,
        "careem_trips": 200,
        "salik_charges": 135,
        "fuel_advance": 550,
        "daman_insurance": 150,
        "status": "paid"
    }'::jsonb),
    ('{
        "rick": "RICK003",
        "name": "Abdullah Rahman",
        "month": "January",
        "year": 2025,
        "basic_salary": 2800,
        "total_salary": 3200,
        "uber_trips": 220,
        "careem_trips": 160,
        "salik_charges": 110,
        "fuel_advance": 480,
        "daman_insurance": 150,
        "status": "paid"
    }'::jsonb),
    ('{
        "rick": "RICK001",
        "name": "Ahmed Ali",
        "month": "February",
        "year": 2025,
        "basic_salary": 3000,
        "total_salary": 3650,
        "uber_trips": 270,
        "careem_trips": 190,
        "salik_charges": 130,
        "fuel_advance": 520,
        "daman_insurance": 150,
        "status": "pending"
    }'::jsonb),
    ('{
        "rick": "RICK002",
        "name": "Mohammed Hassan",
        "month": "February",
        "year": 2025,
        "basic_salary": 3200,
        "total_salary": 3850,
        "uber_trips": 300,
        "careem_trips": 210,
        "salik_charges": 145,
        "fuel_advance": 570,
        "daman_insurance": 150,
        "status": "pending"
    }'::jsonb),
    ('{
        "rick": "RICK004",
        "name": "Khalid Ibrahim",
        "month": "January",
        "year": 2025,
        "basic_salary": 3100,
        "total_salary": 3600,
        "uber_trips": 260,
        "careem_trips": 185,
        "salik_charges": 125,
        "fuel_advance": 510,
        "daman_insurance": 150,
        "status": "paid"
    }'::jsonb),
    ('{
        "rick": "RICK005",
        "name": "Omar Youssef",
        "month": "January",
        "year": 2025,
        "basic_salary": 2900,
        "total_salary": 3350,
        "uber_trips": 240,
        "careem_trips": 170,
        "salik_charges": 115,
        "fuel_advance": 490,
        "daman_insurance": 150,
        "status": "paid"
    }'::jsonb),
    ('{
        "rick": "RICK003",
        "name": "Abdullah Rahman",
        "month": "February",
        "year": 2025,
        "basic_salary": 2800,
        "total_salary": 3280,
        "uber_trips": 230,
        "careem_trips": 165,
        "salik_charges": 118,
        "fuel_advance": 495,
        "daman_insurance": 150,
        "status": "pending"
    }'::jsonb),
    ('{
        "rick": "RICK006",
        "name": "Hassan Mahmoud",
        "month": "January",
        "year": 2025,
        "basic_salary": 3050,
        "total_salary": 3550,
        "uber_trips": 265,
        "careem_trips": 188,
        "salik_charges": 128,
        "fuel_advance": 515,
        "daman_insurance": 150,
        "status": "paid"
    }'::jsonb),
    ('{
        "rick": "RICK007",
        "name": "Saeed Ahmed",
        "month": "January",
        "year": 2025,
        "basic_salary": 2950,
        "total_salary": 3400,
        "uber_trips": 245,
        "careem_trips": 175,
        "salik_charges": 122,
        "fuel_advance": 500,
        "daman_insurance": 150,
        "status": "paid"
    }'::jsonb)
ON CONFLICT DO NOTHING;

-- ============================================
-- 6. ADD FINANCE PERMISSIONS TO RBAC
-- ============================================

-- Insert finance permissions
INSERT INTO permissions (name, description, resource, action) VALUES 
    ('finances.view', 'View finance records', 'finances', 'view'),
    ('finances.create', 'Create finance records', 'finances', 'create'),
    ('finances.update', 'Update finance records', 'finances', 'update'),
    ('finances.delete', 'Delete finance records', 'finances', 'delete'),
    ('finances.upload', 'Upload finance records via Excel', 'finances', 'upload')
ON CONFLICT (name) DO NOTHING;

-- Grant all finance permissions to superadmin
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'superadmin' 
  AND p.resource = 'finances'
ON CONFLICT DO NOTHING;

-- Grant all finance permissions to admin
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'admin' 
  AND p.resource = 'finances'
ON CONFLICT DO NOTHING;

-- Grant view/create/update finance permissions to manager
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'manager' 
  AND p.resource = 'finances'
  AND p.action IN ('view', 'create', 'update')
ON CONFLICT DO NOTHING;

-- Grant view finance permission to employee
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'employee' 
  AND p.resource = 'finances'
  AND p.action = 'view'
ON CONFLICT DO NOTHING;

-- ============================================
-- 7. USEFUL FUNCTIONS FOR JSONB QUERIES
-- ============================================

-- Function to get finance records by RICK
CREATE OR REPLACE FUNCTION get_finance_by_rick(rick_id TEXT)
RETURNS TABLE (
    id INTEGER,
    data JSONB,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
) AS $$
BEGIN
    RETURN QUERY
    SELECT fr.id, fr.data, fr.created_at, fr.updated_at
    FROM finance_records fr
    WHERE fr.data->>'rick' = rick_id
    ORDER BY fr.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to get finance records by month and year
CREATE OR REPLACE FUNCTION get_finance_by_month(month_name TEXT, year_num INTEGER)
RETURNS TABLE (
    id INTEGER,
    data JSONB,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
) AS $$
BEGIN
    RETURN QUERY
    SELECT fr.id, fr.data, fr.created_at, fr.updated_at
    FROM finance_records fr
    WHERE fr.data->>'month' = month_name 
      AND (fr.data->>'year')::INTEGER = year_num
    ORDER BY fr.data->>'rick';
END;
$$ LANGUAGE plpgsql;

-- Function to calculate total salary for a RICK in a specific month
CREATE OR REPLACE FUNCTION get_total_salary_by_rick_month(
    rick_id TEXT, 
    month_name TEXT, 
    year_num INTEGER
)
RETURNS NUMERIC AS $$
DECLARE
    total NUMERIC;
BEGIN
    SELECT COALESCE(SUM((data->>'total_salary')::NUMERIC), 0)
    INTO total
    FROM finance_records
    WHERE data->>'rick' = rick_id
      AND data->>'month' = month_name
      AND (data->>'year')::INTEGER = year_num;
    
    RETURN total;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- VERIFICATION QUERIES (optional - for testing)
-- ============================================

-- Check if finance_records table exists
-- SELECT table_name FROM information_schema.tables WHERE table_name = 'finance_records';

-- Check table structure
-- SELECT column_name, data_type, is_nullable, column_default 
-- FROM information_schema.columns 
-- WHERE table_name = 'finance_records' 
-- ORDER BY ordinal_position;

-- Check indexes
-- SELECT indexname, indexdef 
-- FROM pg_indexes 
-- WHERE tablename = 'finance_records';

-- Count finance records
-- SELECT COUNT(*) as total_records FROM finance_records;

-- View all finance records
-- SELECT id, data, created_at, updated_at FROM finance_records ORDER BY created_at DESC;

-- View finance records for specific RICK
-- SELECT data FROM finance_records WHERE data->>'rick' = 'RICK001' ORDER BY created_at DESC;

-- View finance records for specific month
-- SELECT data FROM finance_records WHERE data->>'month' = 'January' ORDER BY data->>'rick';

-- Get total salary by month
-- SELECT 
--     data->>'month' as month,
--     data->>'year' as year,
--     SUM((data->>'total_salary')::NUMERIC) as total_salary
-- FROM finance_records
-- GROUP BY data->>'month', data->>'year'
-- ORDER BY data->>'year', data->>'month';

-- Get records count by status
-- SELECT 
--     data->>'status' as status,
--     COUNT(*) as count
-- FROM finance_records
-- GROUP BY data->>'status';

-- Get all unique RICKs
-- SELECT DISTINCT data->>'rick' as rick FROM finance_records ORDER BY rick;

-- Get all unique months and years
-- SELECT DISTINCT 
--     data->>'month' as month,
--     data->>'year' as year
-- FROM finance_records
-- ORDER BY year, month;

-- Search in JSONB data (example: find records with salary > 3500)
-- SELECT data FROM finance_records 
-- WHERE (data->>'total_salary')::NUMERIC > 3500 
-- ORDER BY (data->>'total_salary')::NUMERIC DESC;

-- Test custom functions
-- SELECT * FROM get_finance_by_rick('RICK001');
-- SELECT * FROM get_finance_by_month('January', 2025);
-- SELECT get_total_salary_by_rick_month('RICK001', 'January', 2025);

-- Check finance permissions
-- SELECT * FROM permissions WHERE resource = 'finances';

-- Verify superadmin has finance permissions
-- SELECT 
--     r.name as role_name,
--     p.name as permission_name,
--     p.description
-- FROM roles r
-- JOIN role_permissions rp ON r.id = rp.role_id
-- JOIN permissions p ON p.id = rp.permission_id
-- WHERE r.name = 'superadmin' AND p.resource = 'finances';

-- Get finance summary by RICK
-- SELECT 
--     data->>'rick' as rick,
--     data->>'name' as name,
--     COUNT(*) as total_records,
--     SUM((data->>'total_salary')::NUMERIC) as total_earnings,
--     AVG((data->>'total_salary')::NUMERIC) as avg_salary
-- FROM finance_records
-- GROUP BY data->>'rick', data->>'name'
-- ORDER BY total_earnings DESC;

