-- ================================================================
-- Finance Records Table Setup for Dynamic JSONB System
-- ================================================================
-- This script sets up the finance_records table with proper indexes
-- for optimal performance with dynamic JSONB data.
--
-- Usage:
--   psql -U your_user -d your_database -f finance_records_setup.sql
-- ================================================================

-- Drop existing table if you want to start fresh (CAREFUL!)
-- DROP TABLE IF EXISTS finance_records CASCADE;

-- Create finance_records table
CREATE TABLE IF NOT EXISTS finance_records (
    id SERIAL PRIMARY KEY,
    data JSONB NOT NULL,
    year VARCHAR(4),
    month_name VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_finance_records_year 
    ON finance_records(year);

CREATE INDEX IF NOT EXISTS idx_finance_records_month 
    ON finance_records(month_name);

CREATE INDEX IF NOT EXISTS idx_finance_records_data 
    ON finance_records USING GIN(data);

CREATE INDEX IF NOT EXISTS idx_finance_records_created_at 
    ON finance_records(created_at DESC);

-- Optional: Create a trigger to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_finance_records_updated_at ON finance_records;

CREATE TRIGGER update_finance_records_updated_at
    BEFORE UPDATE ON finance_records
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ================================================================
-- Insert Sample Data (Optional - for testing)
-- ================================================================

-- Uncomment to insert sample data
/*
INSERT INTO finance_records (data, year, month_name) 
VALUES 
-- Record 1
(
    '{
        "rick": "1",
        "rick_no": "R001",
        "plate": "ABC-123",
        "name": "John Doe",
        "employee": "EMP001",
        "daman": 100,
        "darb": 50,
        "fine": 0,
        "salik": 30,
        "pos": 200,
        "advance": 150,
        "adnoc": 500,
        "trip": 1200,
        "other_exp": 75,
        "uber_30_days": 5000,
        "careem_30_days": 3000,
        "yango_30": 2000,
        "total_salary": 8500
    }'::jsonb,
    '2024',
    'January'
),
-- Record 2
(
    '{
        "rick": "2",
        "rick_no": "R002",
        "plate": "XYZ-456",
        "name": "Jane Smith",
        "employee": "EMP002",
        "daman": 120,
        "darb": 60,
        "fine": 25,
        "salik": 40,
        "pos": 250,
        "advance": 200,
        "adnoc": 600,
        "trip": 1500,
        "other_exp": 100,
        "uber_30_days": 6000,
        "careem_30_days": 3500,
        "yango_30": 2500,
        "total_salary": 9500
    }'::jsonb,
    '2024',
    'January'
),
-- Record 3
(
    '{
        "rick": "3",
        "rick_no": "R003",
        "plate": "DEF-789",
        "name": "Bob Johnson",
        "employee": "EMP003",
        "daman": 90,
        "darb": 45,
        "fine": 50,
        "salik": 35,
        "pos": 180,
        "advance": 100,
        "adnoc": 450,
        "trip": 1100,
        "other_exp": 80,
        "uber_30_days": 4500,
        "careem_30_days": 2800,
        "yango_30": 1800,
        "total_salary": 7500
    }'::jsonb,
    '2024',
    'January'
),
-- Record 4 - Different month
(
    '{
        "rick": "4",
        "rick_no": "R004",
        "plate": "GHI-321",
        "name": "Alice Williams",
        "employee": "EMP004",
        "daman": 110,
        "darb": 55,
        "fine": 15,
        "salik": 45,
        "pos": 220,
        "advance": 175,
        "adnoc": 550,
        "trip": 1300,
        "other_exp": 90,
        "uber_30_days": 5500,
        "careem_30_days": 3200,
        "yango_30": 2200,
        "total_salary": 8900
    }'::jsonb,
    '2024',
    'February'
),
-- Record 5 - With custom fields to show dynamic behavior
(
    '{
        "rick": "5",
        "rick_no": "R005",
        "plate": "JKL-654",
        "name": "Charlie Brown",
        "employee": "EMP005",
        "daman": 95,
        "darb": 48,
        "fine": 30,
        "salik": 32,
        "pos": 190,
        "advance": 125,
        "adnoc": 475,
        "trip": 1150,
        "other_exp": 85,
        "uber_30_days": 4800,
        "careem_30_days": 2900,
        "yango_30": 1900,
        "total_salary": 7800,
        "custom_bonus": 500,
        "special_allowance": 200,
        "overtime_hours": 15
    }'::jsonb,
    '2024',
    'February'
);
*/

-- ================================================================
-- Verification Queries
-- ================================================================

-- Check table structure
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM 
    information_schema.columns
WHERE 
    table_name = 'finance_records'
ORDER BY 
    ordinal_position;

-- Check indexes
SELECT 
    indexname, 
    indexdef
FROM 
    pg_indexes
WHERE 
    tablename = 'finance_records'
ORDER BY 
    indexname;

-- Count records
SELECT COUNT(*) as total_records FROM finance_records;

-- Get sample data
SELECT 
    id, 
    year, 
    month_name, 
    data->>'rick' as rick,
    data->>'name' as name,
    data->>'total_salary' as total_salary
FROM 
    finance_records
ORDER BY 
    (data->>'rick')::numeric
LIMIT 10;

-- Get all unique keys in JSONB data
SELECT DISTINCT jsonb_object_keys(data) as field_key
FROM finance_records
ORDER BY field_key;

-- Get summary by month
SELECT 
    year,
    month_name,
    COUNT(*) as record_count,
    MIN(created_at) as first_record,
    MAX(created_at) as last_record
FROM 
    finance_records
GROUP BY 
    year, month_name
ORDER BY 
    year DESC, 
    month_name;

-- ================================================================
-- Useful Maintenance Queries
-- ================================================================

-- Vacuum and analyze for better performance
VACUUM ANALYZE finance_records;

-- Check table size
SELECT 
    pg_size_pretty(pg_total_relation_size('finance_records')) as total_size,
    pg_size_pretty(pg_relation_size('finance_records')) as table_size,
    pg_size_pretty(pg_indexes_size('finance_records')) as indexes_size;

-- ================================================================
-- Optional: Clean up old field_metadata table
-- ================================================================

-- If you have an old field_metadata table and want to remove it:
-- BACKUP FIRST before running these commands!

-- Step 1: Backup the table
-- pg_dump -U your_user -d your_database -t field_metadata > field_metadata_backup.sql

-- Step 2: Drop the table (uncomment to execute)
-- DROP TABLE IF EXISTS field_metadata CASCADE;

-- ================================================================
-- Success Message
-- ================================================================

DO $$
BEGIN
    RAISE NOTICE '============================================';
    RAISE NOTICE 'Finance Records Table Setup Complete!';
    RAISE NOTICE '============================================';
    RAISE NOTICE 'Table: finance_records';
    RAISE NOTICE 'Indexes: Created';
    RAISE NOTICE 'Trigger: update_updated_at_column';
    RAISE NOTICE '============================================';
    RAISE NOTICE 'Next steps:';
    RAISE NOTICE '1. Insert sample data (uncomment INSERT section above)';
    RAISE NOTICE '2. Start your backend: cd backend && npm start';
    RAISE NOTICE '3. Start your frontend: cd Admin && npm start';
    RAISE NOTICE '4. Navigate to /finance in your app';
    RAISE NOTICE '============================================';
END $$;

