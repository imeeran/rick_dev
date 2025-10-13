-- ============================================
-- FIELD_METADATA TABLE SCHEMA
-- Complete SQL script for field metadata management
-- This table stores dynamic field configurations for customizable forms
-- ============================================

-- ============================================
-- 1. CREATE FIELD_METADATA TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS field_metadata (
    id SERIAL PRIMARY KEY,
    field_key VARCHAR(100) NOT NULL UNIQUE,
    field_label VARCHAR(200) NOT NULL,
    field_type VARCHAR(50) NOT NULL CHECK (field_type IN ('text', 'number', 'currency', 'date', 'boolean', 'email', 'phone', 'textarea', 'select', 'multiselect')),
    sortable BOOLEAN DEFAULT true,
    highlight BOOLEAN DEFAULT false,
    hidden BOOLEAN DEFAULT false,
    display_order INTEGER DEFAULT 0,
    category VARCHAR(100),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT field_key_unique UNIQUE (field_key)
);

-- ============================================
-- 2. CREATE INDEXES (for performance)
-- ============================================
CREATE INDEX IF NOT EXISTS idx_field_metadata_field_key ON field_metadata(field_key);
CREATE INDEX IF NOT EXISTS idx_field_metadata_category ON field_metadata(category);
CREATE INDEX IF NOT EXISTS idx_field_metadata_field_type ON field_metadata(field_type);
CREATE INDEX IF NOT EXISTS idx_field_metadata_is_active ON field_metadata(is_active);
CREATE INDEX IF NOT EXISTS idx_field_metadata_display_order ON field_metadata(display_order);
CREATE INDEX IF NOT EXISTS idx_field_metadata_sortable ON field_metadata(sortable);
CREATE INDEX IF NOT EXISTS idx_field_metadata_hidden ON field_metadata(hidden);
CREATE INDEX IF NOT EXISTS idx_field_metadata_highlight ON field_metadata(highlight);

-- ============================================
-- 3. CREATE TRIGGER FUNCTION (auto-update updated_at)
-- ============================================
CREATE OR REPLACE FUNCTION update_field_metadata_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 4. CREATE TRIGGER
-- ============================================
DROP TRIGGER IF EXISTS trigger_update_field_metadata_updated_at ON field_metadata;
CREATE TRIGGER trigger_update_field_metadata_updated_at
    BEFORE UPDATE ON field_metadata
    FOR EACH ROW
    EXECUTE FUNCTION update_field_metadata_updated_at();

-- ============================================
-- 5. INSERT SAMPLE DATA (field configurations)
-- ============================================

-- Driver Fields
INSERT INTO field_metadata (field_key, field_label, field_type, sortable, highlight, hidden, display_order, category, is_active) VALUES 
    ('driver_rick', 'RICK Number', 'text', true, true, false, 1, 'driver', true),
    ('driver_name', 'Driver Name', 'text', true, true, false, 2, 'driver', true),
    ('driver_mobile', 'Mobile Number', 'phone', true, false, false, 3, 'driver', true),
    ('driver_category', 'Category', 'select', true, false, false, 4, 'driver', true),
    ('driver_status', 'Status', 'select', true, true, false, 5, 'driver', true),
    ('driver_eid_no', 'Emirates ID', 'text', true, false, false, 6, 'driver', true),
    ('driver_visa_expiry', 'Visa Expiry', 'date', true, true, false, 7, 'driver', true),
    ('driver_passport_no', 'Passport Number', 'text', true, false, false, 8, 'driver', true),
    ('driver_passport_expiry', 'Passport Expiry', 'date', true, true, false, 9, 'driver', true),
    ('driver_daman_expiry', 'Daman Expiry', 'date', true, true, false, 10, 'driver', true),
    ('driver_licence_no', 'License Number', 'text', true, false, false, 11, 'driver', true),
    ('driver_licence_expiry', 'License Expiry', 'date', true, true, false, 12, 'driver', true),
    ('driver_limo_permit_expiry', 'Limo Permit Expiry', 'date', true, true, false, 13, 'driver', true)
ON CONFLICT (field_key) DO NOTHING;

-- Vehicle Fields
INSERT INTO field_metadata (field_key, field_label, field_type, sortable, highlight, hidden, display_order, category, is_active) VALUES 
    ('vehicle_plate_no', 'Plate Number', 'text', true, true, false, 1, 'vehicle', true),
    ('vehicle_make', 'Make', 'text', true, false, false, 2, 'vehicle', true),
    ('vehicle_model', 'Model', 'text', true, false, false, 3, 'vehicle', true),
    ('vehicle_year', 'Year', 'number', true, false, false, 4, 'vehicle', true),
    ('vehicle_color', 'Color', 'text', true, false, false, 5, 'vehicle', true),
    ('vehicle_status', 'Status', 'select', true, true, false, 6, 'vehicle', true),
    ('vehicle_mulkiya_expiry', 'Mulkiya Expiry', 'date', true, true, false, 7, 'vehicle', true),
    ('vehicle_insurance_expiry', 'Insurance Expiry', 'date', true, true, false, 8, 'vehicle', true)
ON CONFLICT (field_key) DO NOTHING;

-- Booking Fields
INSERT INTO field_metadata (field_key, field_label, field_type, sortable, highlight, hidden, display_order, category, is_active) VALUES 
    ('booking_id', 'Booking ID', 'text', true, true, false, 1, 'booking', true),
    ('booking_guest_name', 'Guest Name', 'text', true, true, false, 2, 'booking', true),
    ('booking_mobile', 'Mobile Number', 'phone', true, false, false, 3, 'booking', true),
    ('booking_email', 'Email', 'email', true, false, false, 4, 'booking', true),
    ('booking_car_type', 'Car Type', 'text', true, false, false, 5, 'booking', true),
    ('booking_pickup_loc', 'Pickup Location', 'text', true, false, false, 6, 'booking', true),
    ('booking_drop_loc', 'Drop Location', 'text', true, false, false, 7, 'booking', true),
    ('booking_date', 'Booking Date', 'date', true, true, false, 8, 'booking', true),
    ('booking_time', 'Booking Time', 'text', true, false, false, 9, 'booking', true),
    ('booking_status', 'Status', 'select', true, true, false, 10, 'booking', true),
    ('booking_assigned_driver', 'Assigned Driver', 'text', true, false, false, 11, 'booking', true),
    ('booking_special_note', 'Special Note', 'textarea', false, false, false, 12, 'booking', true)
ON CONFLICT (field_key) DO NOTHING;

-- Finance Fields
INSERT INTO field_metadata (field_key, field_label, field_type, sortable, highlight, hidden, display_order, category, is_active) VALUES 
    ('finance_rick', 'RICK', 'text', true, true, false, 1, 'finance', true),
    ('finance_date', 'Date', 'date', true, true, false, 2, 'finance', true),
    ('finance_amount', 'Amount', 'currency', true, true, false, 3, 'finance', true),
    ('finance_description', 'Description', 'textarea', false, false, false, 4, 'finance', true),
    ('finance_category', 'Category', 'select', true, false, false, 5, 'finance', true),
    ('finance_payment_method', 'Payment Method', 'select', true, false, false, 6, 'finance', true),
    ('finance_status', 'Status', 'select', true, true, false, 7, 'finance', true)
ON CONFLICT (field_key) DO NOTHING;

-- Payslip Fields
INSERT INTO field_metadata (field_key, field_label, field_type, sortable, highlight, hidden, display_order, category, is_active) VALUES 
    ('payslip_employee_id', 'Employee ID', 'text', true, true, false, 1, 'payslip', true),
    ('payslip_employee_name', 'Employee Name', 'text', true, true, false, 2, 'payslip', true),
    ('payslip_month', 'Month', 'text', true, true, false, 3, 'payslip', true),
    ('payslip_year', 'Year', 'number', true, true, false, 4, 'payslip', true),
    ('payslip_basic_salary', 'Basic Salary', 'currency', true, true, false, 5, 'payslip', true),
    ('payslip_allowances', 'Allowances', 'currency', true, false, false, 6, 'payslip', true),
    ('payslip_deductions', 'Deductions', 'currency', true, false, false, 7, 'payslip', true),
    ('payslip_net_salary', 'Net Salary', 'currency', true, true, false, 8, 'payslip', true),
    ('payslip_status', 'Status', 'select', true, true, false, 9, 'payslip', true),
    ('payslip_payment_date', 'Payment Date', 'date', true, false, false, 10, 'payslip', true)
ON CONFLICT (field_key) DO NOTHING;

-- User Fields
INSERT INTO field_metadata (field_key, field_label, field_type, sortable, highlight, hidden, display_order, category, is_active) VALUES 
    ('user_id', 'User ID', 'text', true, false, true, 1, 'user', true),
    ('user_username', 'Username', 'text', true, true, false, 2, 'user', true),
    ('user_name', 'Full Name', 'text', true, true, false, 3, 'user', true),
    ('user_email', 'Email', 'email', true, true, false, 4, 'user', true),
    ('user_role', 'Role', 'select', true, true, false, 5, 'user', true),
    ('user_status', 'Status', 'select', true, true, false, 6, 'user', true),
    ('user_last_login', 'Last Login', 'date', true, false, false, 7, 'user', true),
    ('user_created_at', 'Created At', 'date', true, false, false, 8, 'user', true)
ON CONFLICT (field_key) DO NOTHING;

-- ============================================
-- 6. ADD FIELD_METADATA PERMISSIONS TO RBAC (optional)
-- ============================================

-- Insert field_metadata permissions
INSERT INTO permissions (name, description, resource, action) VALUES 
    ('field_metadata.view', 'View field metadata', 'field_metadata', 'view'),
    ('field_metadata.create', 'Create field metadata', 'field_metadata', 'create'),
    ('field_metadata.update', 'Update field metadata', 'field_metadata', 'update'),
    ('field_metadata.delete', 'Delete field metadata', 'field_metadata', 'delete')
ON CONFLICT (name) DO NOTHING;

-- Grant all field_metadata permissions to superadmin
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'superadmin' 
  AND p.resource = 'field_metadata'
ON CONFLICT DO NOTHING;

-- Grant view/update field_metadata permissions to admin
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'admin' 
  AND p.resource = 'field_metadata'
  AND p.action IN ('view', 'update')
ON CONFLICT DO NOTHING;

-- ============================================
-- VERIFICATION QUERIES (optional - for testing)
-- ============================================

-- Check if field_metadata table exists
-- SELECT table_name FROM information_schema.tables WHERE table_name = 'field_metadata';

-- Check table structure
-- SELECT column_name, data_type, is_nullable, column_default 
-- FROM information_schema.columns 
-- WHERE table_name = 'field_metadata' 
-- ORDER BY ordinal_position;

-- Check indexes
-- SELECT indexname, indexdef 
-- FROM pg_indexes 
-- WHERE tablename = 'field_metadata';

-- Count field metadata entries
-- SELECT COUNT(*) as total_fields FROM field_metadata;

-- Count fields by category
-- SELECT category, COUNT(*) as count 
-- FROM field_metadata 
-- WHERE category IS NOT NULL
-- GROUP BY category 
-- ORDER BY category;

-- Count fields by type
-- SELECT field_type, COUNT(*) as count 
-- FROM field_metadata 
-- GROUP BY field_type 
-- ORDER BY count DESC;

-- View all field metadata
-- SELECT * FROM field_metadata ORDER BY category, display_order;

-- View active fields only
-- SELECT field_key, field_label, field_type, category, display_order 
-- FROM field_metadata 
-- WHERE is_active = true 
-- ORDER BY category, display_order;

-- View fields by category
-- SELECT field_key, field_label, field_type, sortable, highlight, hidden 
-- FROM field_metadata 
-- WHERE category = 'driver' AND is_active = true 
-- ORDER BY display_order;

-- View highlighted fields
-- SELECT field_key, field_label, category 
-- FROM field_metadata 
-- WHERE highlight = true AND is_active = true 
-- ORDER BY category, display_order;

-- View sortable fields
-- SELECT field_key, field_label, category 
-- FROM field_metadata 
-- WHERE sortable = true AND is_active = true 
-- ORDER BY category, display_order;

-- View hidden fields
-- SELECT field_key, field_label, category 
-- FROM field_metadata 
-- WHERE hidden = true 
-- ORDER BY category, display_order;

-- Check field_metadata permissions
-- SELECT * FROM permissions WHERE resource = 'field_metadata';

-- Verify superadmin has field_metadata permissions
-- SELECT 
--     r.name as role_name,
--     p.name as permission_name,
--     p.description
-- FROM roles r
-- JOIN role_permissions rp ON r.id = rp.role_id
-- JOIN permissions p ON p.id = rp.permission_id
-- WHERE r.name = 'superadmin' AND p.resource = 'field_metadata';

