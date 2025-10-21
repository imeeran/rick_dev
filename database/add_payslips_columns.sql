-- ============================================
-- MIGRATION: Add month_name, year, and obopm columns to payslips table
-- ============================================

-- Add month_name column
ALTER TABLE payslips ADD COLUMN IF NOT EXISTS month_name VARCHAR(50);

-- Add year column  
ALTER TABLE payslips ADD COLUMN IF NOT EXISTS year VARCHAR(10);

-- Add obopm column (opening balance of previous month)
ALTER TABLE payslips ADD COLUMN IF NOT EXISTS obopm DECIMAL(10,2) DEFAULT 0;

-- Create indexes for the new columns for better performance
CREATE INDEX IF NOT EXISTS idx_payslips_month_name ON payslips(month_name);
CREATE INDEX IF NOT EXISTS idx_payslips_year ON payslips(year);
CREATE INDEX IF NOT EXISTS idx_payslips_obopm ON payslips(obopm);

-- Create composite index for month_name and year queries
CREATE INDEX IF NOT EXISTS idx_payslips_month_year ON payslips(month_name, year);

-- Update existing records to extract month_name and year from JSONB data
UPDATE payslips 
SET month_name = data->>'month_name',
    year = data->>'year'
WHERE month_name IS NULL OR year IS NULL;

-- Update existing records to extract obopm from JSONB data if it exists
UPDATE payslips 
SET obopm = COALESCE((data->>'obopm')::DECIMAL, 0)
WHERE obopm = 0 AND data->>'obopm' IS NOT NULL;

-- Add comments to the new columns
COMMENT ON COLUMN payslips.month_name IS 'Month name for the payslip (e.g., January, February)';
COMMENT ON COLUMN payslips.year IS 'Year for the payslip (e.g., 2025)';
COMMENT ON COLUMN payslips.obopm IS 'Opening balance of previous month (decimal value)';

-- Verify the migration
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'payslips' 
  AND column_name IN ('month_name', 'year', 'obopm')
ORDER BY column_name;
