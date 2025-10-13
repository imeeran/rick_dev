-- ============================================
-- PAYSLIPS TABLE SCHEMA
-- Complete SQL script for payslips management
-- Uses JSONB for flexible/dynamic field storage
-- ============================================

-- ============================================
-- 1. CREATE PAYSLIPS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS payslips (
    id SERIAL PRIMARY KEY,
    data JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 2. CREATE INDEXES (for performance)
-- ============================================

-- GIN index for full JSONB search
CREATE INDEX IF NOT EXISTS idx_payslips_data_gin ON payslips USING GIN (data);

-- Specific JSONB field indexes for common queries
CREATE INDEX IF NOT EXISTS idx_payslips_rick ON payslips USING GIN ((data->>'rick'));
CREATE INDEX IF NOT EXISTS idx_payslips_employee_id ON payslips USING GIN ((data->>'employee_id'));
CREATE INDEX IF NOT EXISTS idx_payslips_employee_name ON payslips USING GIN ((data->>'employee_name'));
CREATE INDEX IF NOT EXISTS idx_payslips_month ON payslips USING GIN ((data->>'month'));
CREATE INDEX IF NOT EXISTS idx_payslips_year ON payslips USING GIN ((data->>'year'));
CREATE INDEX IF NOT EXISTS idx_payslips_status ON payslips USING GIN ((data->>'status'));
CREATE INDEX IF NOT EXISTS idx_payslips_period_start ON payslips USING GIN ((data->>'pay_period_start'));
CREATE INDEX IF NOT EXISTS idx_payslips_period_end ON payslips USING GIN ((data->>'pay_period_end'));

-- Timestamp indexes
CREATE INDEX IF NOT EXISTS idx_payslips_created_at ON payslips(created_at);
CREATE INDEX IF NOT EXISTS idx_payslips_updated_at ON payslips(updated_at);

-- Composite index for date-based queries
CREATE INDEX IF NOT EXISTS idx_payslips_created_at_desc ON payslips(created_at DESC);

-- ============================================
-- 3. CREATE TRIGGER FUNCTION (auto-update updated_at)
-- ============================================
CREATE OR REPLACE FUNCTION update_payslips_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 4. CREATE TRIGGER
-- ============================================
DROP TRIGGER IF EXISTS trigger_update_payslips_updated_at ON payslips;
CREATE TRIGGER trigger_update_payslips_updated_at
    BEFORE UPDATE ON payslips
    FOR EACH ROW
    EXECUTE FUNCTION update_payslips_updated_at();

-- ============================================
-- 5. INSERT SAMPLE DATA (optional for testing)
-- ============================================
INSERT INTO payslips (data) VALUES 
    ('{
        "rick": "RICK001",
        "employee_id": "EMP001",
        "employee_name": "Ahmed Ali",
        "employee_mobile": "+971501234567",
        "month": "1",
        "year": "2025",
        "pay_period_start": "2025-01-01",
        "pay_period_end": "2025-01-31",
        "basic_salary": 3000,
        "total_salary": 3500,
        "allowances": {
            "transport": 200,
            "housing": 300
        },
        "deductions": {
            "fine": 50,
            "salik": 120,
            "advance": 200
        },
        "earnings": [
            {"name": "Basic Salary", "amount": 3000},
            {"name": "Transport Allowance", "amount": 200},
            {"name": "Housing Allowance", "amount": 300}
        ],
        "deduction_items": [
            {"name": "Fine", "amount": 50},
            {"name": "Salik", "amount": 120},
            {"name": "Advance", "amount": 200}
        ],
        "gross_salary": 3500,
        "total_deductions": 370,
        "net_salary": 3130,
        "status": "paid",
        "payment_date": "2025-02-01",
        "department": "Transportation"
    }'::jsonb),
    ('{
        "rick": "RICK002",
        "employee_id": "EMP002",
        "employee_name": "Mohammed Hassan",
        "employee_mobile": "+971501234568",
        "month": "1",
        "year": "2025",
        "pay_period_start": "2025-01-01",
        "pay_period_end": "2025-01-31",
        "basic_salary": 3200,
        "total_salary": 3750,
        "allowances": {
            "transport": 250,
            "housing": 300
        },
        "deductions": {
            "fine": 30,
            "salik": 135,
            "advance": 250
        },
        "earnings": [
            {"name": "Basic Salary", "amount": 3200},
            {"name": "Transport Allowance", "amount": 250},
            {"name": "Housing Allowance", "amount": 300}
        ],
        "deduction_items": [
            {"name": "Fine", "amount": 30},
            {"name": "Salik", "amount": 135},
            {"name": "Advance", "amount": 250}
        ],
        "gross_salary": 3750,
        "total_deductions": 415,
        "net_salary": 3335,
        "status": "paid",
        "payment_date": "2025-02-01",
        "department": "Transportation"
    }'::jsonb),
    ('{
        "rick": "RICK003",
        "employee_id": "EMP003",
        "employee_name": "Abdullah Rahman",
        "employee_mobile": "+971501234569",
        "month": "1",
        "year": "2025",
        "pay_period_start": "2025-01-01",
        "pay_period_end": "2025-01-31",
        "basic_salary": 2800,
        "total_salary": 3200,
        "allowances": {
            "transport": 200,
            "housing": 200
        },
        "deductions": {
            "fine": 40,
            "salik": 110,
            "advance": 180
        },
        "earnings": [
            {"name": "Basic Salary", "amount": 2800},
            {"name": "Transport Allowance", "amount": 200},
            {"name": "Housing Allowance", "amount": 200}
        ],
        "deduction_items": [
            {"name": "Fine", "amount": 40},
            {"name": "Salik", "amount": 110},
            {"name": "Advance", "amount": 180}
        ],
        "gross_salary": 3200,
        "total_deductions": 330,
        "net_salary": 2870,
        "status": "paid",
        "payment_date": "2025-02-01",
        "department": "Transportation"
    }'::jsonb),
    ('{
        "rick": "RICK001",
        "employee_id": "EMP001",
        "employee_name": "Ahmed Ali",
        "employee_mobile": "+971501234567",
        "month": "2",
        "year": "2025",
        "pay_period_start": "2025-02-01",
        "pay_period_end": "2025-02-28",
        "basic_salary": 3000,
        "total_salary": 3650,
        "allowances": {
            "transport": 200,
            "housing": 300,
            "performance": 150
        },
        "deductions": {
            "fine": 25,
            "salik": 130,
            "advance": 220
        },
        "earnings": [
            {"name": "Basic Salary", "amount": 3000},
            {"name": "Transport Allowance", "amount": 200},
            {"name": "Housing Allowance", "amount": 300},
            {"name": "Performance Bonus", "amount": 150}
        ],
        "deduction_items": [
            {"name": "Fine", "amount": 25},
            {"name": "Salik", "amount": 130},
            {"name": "Advance", "amount": 220}
        ],
        "gross_salary": 3650,
        "total_deductions": 375,
        "net_salary": 3275,
        "status": "pending",
        "department": "Transportation"
    }'::jsonb),
    ('{
        "rick": "RICK004",
        "employee_id": "EMP004",
        "employee_name": "Khalid Ibrahim",
        "employee_mobile": "+971501234570",
        "month": "1",
        "year": "2025",
        "pay_period_start": "2025-01-01",
        "pay_period_end": "2025-01-31",
        "basic_salary": 3100,
        "total_salary": 3600,
        "allowances": {
            "transport": 250,
            "housing": 250
        },
        "deductions": {
            "fine": 35,
            "salik": 125,
            "advance": 210
        },
        "earnings": [
            {"name": "Basic Salary", "amount": 3100},
            {"name": "Transport Allowance", "amount": 250},
            {"name": "Housing Allowance", "amount": 250}
        ],
        "deduction_items": [
            {"name": "Fine", "amount": 35},
            {"name": "Salik", "amount": 125},
            {"name": "Advance", "amount": 210}
        ],
        "gross_salary": 3600,
        "total_deductions": 370,
        "net_salary": 3230,
        "status": "paid",
        "payment_date": "2025-02-01",
        "department": "Transportation"
    }'::jsonb),
    ('{
        "rick": "RICK005",
        "employee_id": "EMP005",
        "employee_name": "Omar Youssef",
        "employee_mobile": "+971501234571",
        "month": "1",
        "year": "2025",
        "pay_period_start": "2025-01-01",
        "pay_period_end": "2025-01-31",
        "basic_salary": 2900,
        "total_salary": 3350,
        "allowances": {
            "transport": 200,
            "housing": 250
        },
        "deductions": {
            "fine": 45,
            "salik": 115,
            "advance": 195
        },
        "earnings": [
            {"name": "Basic Salary", "amount": 2900},
            {"name": "Transport Allowance", "amount": 200},
            {"name": "Housing Allowance", "amount": 250}
        ],
        "deduction_items": [
            {"name": "Fine", "amount": 45},
            {"name": "Salik", "amount": 115},
            {"name": "Advance", "amount": 195}
        ],
        "gross_salary": 3350,
        "total_deductions": 355,
        "net_salary": 2995,
        "status": "draft",
        "department": "Transportation"
    }'::jsonb)
ON CONFLICT DO NOTHING;

-- ============================================
-- 6. ADD PAYSLIP PERMISSIONS TO RBAC
-- ============================================

-- Insert payslip permissions
INSERT INTO permissions (name, description, resource, action) VALUES 
    ('payslips.view', 'View payslips', 'payslips', 'view'),
    ('payslips.create', 'Create payslips', 'payslips', 'create'),
    ('payslips.update', 'Update payslips', 'payslips', 'update'),
    ('payslips.delete', 'Delete payslips', 'payslips', 'delete'),
    ('payslips.generate', 'Generate payslips from finance data', 'payslips', 'generate')
ON CONFLICT (name) DO NOTHING;

-- Grant all payslip permissions to superadmin
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'superadmin' 
  AND p.resource = 'payslips'
ON CONFLICT DO NOTHING;

-- Grant all payslip permissions to admin
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'admin' 
  AND p.resource = 'payslips'
ON CONFLICT DO NOTHING;

-- Grant view/create/update payslip permissions to manager
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'manager' 
  AND p.resource = 'payslips'
  AND p.action IN ('view', 'create', 'update', 'generate')
ON CONFLICT DO NOTHING;

-- Grant view payslip permission to employee
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'employee' 
  AND p.resource = 'payslips'
  AND p.action = 'view'
ON CONFLICT DO NOTHING;

-- Grant view payslip permission to driver (own payslips)
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'driver' 
  AND p.resource = 'payslips'
  AND p.action = 'view'
ON CONFLICT DO NOTHING;

-- ============================================
-- 7. USEFUL FUNCTIONS FOR JSONB QUERIES
-- ============================================

-- Function to get payslips by RICK/Employee ID
CREATE OR REPLACE FUNCTION get_payslips_by_employee(emp_id TEXT)
RETURNS TABLE (
    id INTEGER,
    data JSONB,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
) AS $$
BEGIN
    RETURN QUERY
    SELECT p.id, p.data, p.created_at, p.updated_at
    FROM payslips p
    WHERE p.data->>'employee_id' = emp_id 
       OR p.data->>'rick' = emp_id
    ORDER BY p.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to get payslips by month and year
CREATE OR REPLACE FUNCTION get_payslips_by_period(month_num TEXT, year_num TEXT)
RETURNS TABLE (
    id INTEGER,
    data JSONB,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
) AS $$
BEGIN
    RETURN QUERY
    SELECT p.id, p.data, p.created_at, p.updated_at
    FROM payslips p
    WHERE p.data->>'month' = month_num 
      AND p.data->>'year' = year_num
    ORDER BY p.data->>'employee_name';
END;
$$ LANGUAGE plpgsql;

-- Function to get payslips by status
CREATE OR REPLACE FUNCTION get_payslips_by_status(payslip_status TEXT)
RETURNS TABLE (
    id INTEGER,
    data JSONB,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
) AS $$
BEGIN
    RETURN QUERY
    SELECT p.id, p.data, p.created_at, p.updated_at
    FROM payslips p
    WHERE p.data->>'status' = payslip_status
    ORDER BY p.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate total payslips amount by month
CREATE OR REPLACE FUNCTION get_total_payslips_by_month(month_num TEXT, year_num TEXT)
RETURNS TABLE (
    month TEXT,
    year TEXT,
    total_gross NUMERIC,
    total_deductions NUMERIC,
    total_net NUMERIC,
    payslip_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        month_num as month,
        year_num as year,
        COALESCE(SUM((data->>'gross_salary')::NUMERIC), 0) as total_gross,
        COALESCE(SUM((data->>'total_deductions')::NUMERIC), 0) as total_deductions,
        COALESCE(SUM((data->>'net_salary')::NUMERIC), 0) as total_net,
        COUNT(*) as payslip_count
    FROM payslips
    WHERE data->>'month' = month_num
      AND data->>'year' = year_num;
END;
$$ LANGUAGE plpgsql;

-- Function to check if payslip exists for employee in period
CREATE OR REPLACE FUNCTION payslip_exists(
    emp_id TEXT,
    month_num TEXT,
    year_num TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
    exists_flag BOOLEAN;
BEGIN
    SELECT EXISTS(
        SELECT 1 FROM payslips
        WHERE (data->>'employee_id' = emp_id OR data->>'rick' = emp_id)
          AND data->>'month' = month_num
          AND data->>'year' = year_num
    ) INTO exists_flag;
    
    RETURN exists_flag;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- VERIFICATION QUERIES (optional - for testing)
-- ============================================

-- Check if payslips table exists
-- SELECT table_name FROM information_schema.tables WHERE table_name = 'payslips';

-- Check table structure
-- SELECT column_name, data_type, is_nullable, column_default 
-- FROM information_schema.columns 
-- WHERE table_name = 'payslips' 
-- ORDER BY ordinal_position;

-- Check indexes
-- SELECT indexname, indexdef 
-- FROM pg_indexes 
-- WHERE tablename = 'payslips';

-- Count payslips
-- SELECT COUNT(*) as total_payslips FROM payslips;

-- View all payslips
-- SELECT id, data, created_at, updated_at FROM payslips ORDER BY created_at DESC;

-- View payslips for specific employee/RICK
-- SELECT data FROM payslips WHERE data->>'rick' = 'RICK001' ORDER BY created_at DESC;

-- View payslips for specific month
-- SELECT data FROM payslips WHERE data->>'month' = '1' AND data->>'year' = '2025' ORDER BY data->>'employee_name';

-- Get payslips by status
-- SELECT 
--     data->>'employee_name' as name,
--     data->>'month' as month,
--     data->>'year' as year,
--     data->>'status' as status,
--     (data->>'net_salary')::NUMERIC as net_salary
-- FROM payslips
-- WHERE data->>'status' = 'paid'
-- ORDER BY created_at DESC;

-- Get total payslips summary by month
-- SELECT 
--     data->>'month' as month,
--     data->>'year' as year,
--     COUNT(*) as count,
--     SUM((data->>'gross_salary')::NUMERIC) as total_gross,
--     SUM((data->>'total_deductions')::NUMERIC) as total_deductions,
--     SUM((data->>'net_salary')::NUMERIC) as total_net
-- FROM payslips
-- GROUP BY data->>'month', data->>'year'
-- ORDER BY data->>'year', data->>'month';

-- Get payslips count by status
-- SELECT 
--     data->>'status' as status,
--     COUNT(*) as count,
--     SUM((data->>'net_salary')::NUMERIC) as total_amount
-- FROM payslips
-- GROUP BY data->>'status';

-- Get all unique employees with payslips
-- SELECT DISTINCT 
--     data->>'employee_id' as employee_id,
--     data->>'employee_name' as employee_name,
--     data->>'rick' as rick
-- FROM payslips 
-- ORDER BY employee_name;

-- Search payslips by name or ID
-- SELECT 
--     id,
--     data->>'employee_name' as name,
--     data->>'rick' as rick,
--     data->>'month' as month,
--     data->>'year' as year,
--     (data->>'net_salary')::NUMERIC as net_salary
-- FROM payslips
-- WHERE data->>'employee_name' ILIKE '%Ahmed%'
--    OR data->>'employee_id' ILIKE '%001%'
--    OR data->>'rick' ILIKE '%RICK001%'
-- ORDER BY created_at DESC;

-- Test custom functions
-- SELECT * FROM get_payslips_by_employee('RICK001');
-- SELECT * FROM get_payslips_by_employee('EMP001');
-- SELECT * FROM get_payslips_by_period('1', '2025');
-- SELECT * FROM get_payslips_by_status('paid');
-- SELECT * FROM get_total_payslips_by_month('1', '2025');
-- SELECT payslip_exists('RICK001', '1', '2025');

-- Check payslip permissions
-- SELECT * FROM permissions WHERE resource = 'payslips';

-- Verify superadmin has payslip permissions
-- SELECT 
--     r.name as role_name,
--     p.name as permission_name,
--     p.description
-- FROM roles r
-- JOIN role_permissions rp ON r.id = rp.role_id
-- JOIN permissions p ON p.id = rp.permission_id
-- WHERE r.name = 'superadmin' AND p.resource = 'payslips';

-- Get payslip summary by employee
-- SELECT 
--     data->>'employee_id' as employee_id,
--     data->>'employee_name' as name,
--     data->>'rick' as rick,
--     COUNT(*) as total_payslips,
--     SUM((data->>'gross_salary')::NUMERIC) as total_gross,
--     SUM((data->>'net_salary')::NUMERIC) as total_net,
--     AVG((data->>'net_salary')::NUMERIC) as avg_net_salary
-- FROM payslips
-- GROUP BY data->>'employee_id', data->>'employee_name', data->>'rick'
-- ORDER BY total_net DESC;

-- Get pending payslips with details
-- SELECT 
--     id,
--     data->>'employee_name' as name,
--     data->>'rick' as rick,
--     data->>'month' as month,
--     data->>'year' as year,
--     (data->>'gross_salary')::NUMERIC as gross,
--     (data->>'total_deductions')::NUMERIC as deductions,
--     (data->>'net_salary')::NUMERIC as net,
--     data->>'status' as status,
--     created_at
-- FROM payslips
-- WHERE data->>'status' = 'pending'
-- ORDER BY created_at DESC;

