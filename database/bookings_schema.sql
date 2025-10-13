-- Create bookings table for managing booking requests
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

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_booking_date ON bookings(booking_date);
CREATE INDEX IF NOT EXISTS idx_bookings_guest_name ON bookings(guest_name);
CREATE INDEX IF NOT EXISTS idx_bookings_email_id ON bookings(email_id);
CREATE INDEX IF NOT EXISTS idx_bookings_mobile_number ON bookings(mobile_number);
CREATE INDEX IF NOT EXISTS idx_bookings_assigned_driver ON bookings(assigned_driver);
CREATE INDEX IF NOT EXISTS idx_bookings_created_at ON bookings(created_at);

-- Insert sample bookings data
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
    )
ON CONFLICT DO NOTHING;

-- Create a function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_bookings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to call the function before updates
DROP TRIGGER IF EXISTS trigger_update_bookings_updated_at ON bookings;
CREATE TRIGGER trigger_update_bookings_updated_at
    BEFORE UPDATE ON bookings
    FOR EACH ROW
    EXECUTE FUNCTION update_bookings_updated_at();

