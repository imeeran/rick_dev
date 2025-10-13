-- ============================================
-- BOOKINGS TABLE SCHEMA
-- Complete SQL script for bookings management
-- ============================================

-- ============================================
-- 1. CREATE BOOKINGS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS bookings (
    id SERIAL PRIMARY KEY,
    car_type VARCHAR(100) NOT NULL,
    pickup_loc TEXT NOT NULL,
    drop_loc TEXT NOT NULL,
    booking_date DATE NOT NULL,
    booking_time TIME NOT NULL,
    guest_name VARCHAR(255) NOT NULL,
    mobile_number VARCHAR(20) NOT NULL,
    email_id VARCHAR(255),
    special_note TEXT,
    assigned_driver VARCHAR(255),
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'in_progress', 'completed', 'cancelled')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 2. CREATE INDEXES (for performance)
-- ============================================
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_booking_date ON bookings(booking_date);
CREATE INDEX IF NOT EXISTS idx_bookings_guest_name ON bookings(guest_name);
CREATE INDEX IF NOT EXISTS idx_bookings_email_id ON bookings(email_id);
CREATE INDEX IF NOT EXISTS idx_bookings_mobile_number ON bookings(mobile_number);
CREATE INDEX IF NOT EXISTS idx_bookings_assigned_driver ON bookings(assigned_driver);
CREATE INDEX IF NOT EXISTS idx_bookings_created_at ON bookings(created_at);

-- ============================================
-- 3. CREATE TRIGGER FUNCTION (auto-update updated_at)
-- ============================================
CREATE OR REPLACE FUNCTION update_bookings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 4. CREATE TRIGGER
-- ============================================
DROP TRIGGER IF EXISTS trigger_update_bookings_updated_at ON bookings;
CREATE TRIGGER trigger_update_bookings_updated_at
    BEFORE UPDATE ON bookings
    FOR EACH ROW
    EXECUTE FUNCTION update_bookings_updated_at();

-- ============================================
-- 5. INSERT SAMPLE DATA (optional for testing)
-- ============================================
INSERT INTO bookings (
    car_type,
    pickup_loc,
    drop_loc,
    booking_date,
    booking_time,
    guest_name,
    mobile_number,
    email_id,
    special_note,
    assigned_driver,
    status
) VALUES 
    (
        'BMW 7 Series',
        '123 Main St, New York, NY',
        '456 Park Ave, New York, NY',
        '2025-10-15',
        '14:30',
        'John Doe',
        '+1234567890',
        'john.doe@example.com',
        'Please call upon arrival',
        'Driver 1',
        'pending'
    ),
    (
        'Mercedes S-Class',
        '789 Broadway, New York, NY',
        '321 Fifth Ave, New York, NY',
        '2025-10-16',
        '10:00',
        'Jane Smith',
        '+1234567891',
        'jane.smith@example.com',
        'Airport pickup',
        NULL,
        'pending'
    ),
    (
        'Audi A8',
        '555 Central Park West, New York, NY',
        '777 Wall Street, New York, NY',
        '2025-10-17',
        '09:30',
        'Bob Johnson',
        '+1234567892',
        'bob.johnson@example.com',
        'Business meeting',
        'Driver 2',
        'confirmed'
    ),
    (
        'Tesla Model S',
        '101 Park Lane, New York, NY',
        '202 Madison Ave, New York, NY',
        '2025-10-18',
        '16:00',
        'Alice Williams',
        '+1234567893',
        'alice.williams@example.com',
        'VIP client',
        'Driver 1',
        'confirmed'
    ),
    (
        'Lexus LS',
        '303 Fifth Ave, New York, NY',
        '404 Broadway, New York, NY',
        '2025-10-19',
        '11:30',
        'Michael Brown',
        '+1234567894',
        'michael.brown@example.com',
        'Corporate event',
        NULL,
        'pending'
    )
ON CONFLICT DO NOTHING;

-- ============================================
-- 6. ADD BOOKING PERMISSIONS TO RBAC
-- ============================================

-- Insert booking permissions
INSERT INTO permissions (name, description, resource, action) VALUES 
    ('bookings.view', 'View bookings', 'bookings', 'view'),
    ('bookings.create', 'Create bookings', 'bookings', 'create'),
    ('bookings.update', 'Update bookings', 'bookings', 'update'),
    ('bookings.delete', 'Delete bookings', 'bookings', 'delete')
ON CONFLICT (name) DO NOTHING;

-- Grant all booking permissions to superadmin
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'superadmin' 
  AND p.resource = 'bookings'
ON CONFLICT DO NOTHING;

-- Grant all booking permissions to admin
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'admin' 
  AND p.resource = 'bookings'
ON CONFLICT DO NOTHING;

-- Grant view/create/update booking permissions to manager
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'manager' 
  AND p.resource = 'bookings'
  AND p.action IN ('view', 'create', 'update')
ON CONFLICT DO NOTHING;

-- Grant view booking permission to employee
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.name = 'employee' 
  AND p.resource = 'bookings'
  AND p.action = 'view'
ON CONFLICT DO NOTHING;

-- ============================================
-- VERIFICATION QUERIES (optional - for testing)
-- ============================================

-- Check if bookings table exists
-- SELECT table_name FROM information_schema.tables WHERE table_name = 'bookings';

-- Check table structure
-- SELECT column_name, data_type, is_nullable, column_default 
-- FROM information_schema.columns 
-- WHERE table_name = 'bookings' 
-- ORDER BY ordinal_position;

-- Check indexes
-- SELECT indexname, indexdef 
-- FROM pg_indexes 
-- WHERE tablename = 'bookings';

-- Count bookings
-- SELECT COUNT(*) as total_bookings FROM bookings;

-- View all bookings
-- SELECT * FROM bookings ORDER BY created_at DESC;

-- Check booking permissions
-- SELECT * FROM permissions WHERE resource = 'bookings';

-- Verify superadmin has booking permissions
-- SELECT 
--     r.name as role_name,
--     p.name as permission_name,
--     p.description
-- FROM roles r
-- JOIN role_permissions rp ON r.id = rp.role_id
-- JOIN permissions p ON p.id = rp.permission_id
-- WHERE r.name = 'superadmin' AND p.resource = 'bookings';

