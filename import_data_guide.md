# Data Import Guide for Rick Backend

This guide provides SQL queries and scripts to import data from Google Sheets or Excel files into your database tables.

## Available Tables

### 1. Users Table
```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('admin', 'user', 'moderator')),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 2. Vehicles Table
```sql
CREATE TABLE vehicles (
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
```

### 3. Drivers Table
```sql
CREATE TABLE drivers (
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
```

### 4. Bookings Table
```sql
CREATE TABLE bookings (
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
```

## Import Methods

### Method 1: CSV Import (Recommended)

#### Step 1: Export from Google Sheets/Excel as CSV
1. Open your Google Sheet or Excel file
2. Go to File → Download → Comma-separated values (.csv)
3. Save the file

#### Step 2: Create Import Script

Create a Node.js script to import CSV data:

```javascript
const fs = require('fs');
const csv = require('csv-parser');
const { Pool } = require('pg');
const bcrypt = require('bcrypt');

// Database connection
const pool = new Pool({
    user: 'your_username',
    host: 'localhost',
    database: 'rick_db',
    password: 'your_password',
    port: 5432,
});

async function importCSVData(tableName, csvFilePath, columnMapping) {
    const results = [];
    
    return new Promise((resolve, reject) => {
        fs.createReadStream(csvFilePath)
            .pipe(csv())
            .on('data', (data) => results.push(data))
            .on('end', async () => {
                try {
                    for (const row of results) {
                        await insertRow(tableName, row, columnMapping);
                    }
                    console.log(`Successfully imported ${results.length} records to ${tableName}`);
                    resolve(results.length);
                } catch (error) {
                    reject(error);
                }
            });
    });
}

async function insertRow(tableName, row, columnMapping) {
    const columns = Object.keys(columnMapping);
    const values = columns.map(col => row[columnMapping[col]]);
    const placeholders = columns.map((_, index) => `$${index + 1}`).join(', ');
    
    const query = `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES (${placeholders}) ON CONFLICT DO NOTHING`;
    
    await pool.query(query, values);
}

// Example usage functions
async function importVehicles(csvFilePath) {
    const columnMapping = {
        rick_no: 'Rick Number',
        plate_code: 'Plate Code',
        plate_no: 'Plate Number',
        mulkiya_expiry: 'Mulkiya Expiry',
        vehicle_insurance_expiry: 'Insurance Expiry',
        chassis_no: 'Chassis Number',
        engine_no: 'Engine Number',
        vehicle_type: 'Vehicle Type',
        model: 'Model',
        status: 'Status'
    };
    
    await importCSVData('vehicles', csvFilePath, columnMapping);
}

async function importDrivers(csvFilePath) {
    const columnMapping = {
        rick: 'Rick',
        category: 'Category',
        name: 'Name',
        mobile: 'Mobile',
        eid_no: 'EID Number',
        visa_expiry: 'Visa Expiry',
        passport_no: 'Passport Number',
        passport_expiry: 'Passport Expiry',
        daman_expiry: 'Daman Expiry',
        driving_licence_no: 'Driving Licence Number',
        driving_licence_expiry: 'Driving Licence Expiry',
        trafic_code: 'Traffic Code',
        trans_no: 'Trans Number',
        limo_permit_expiry: 'Limo Permit Expiry',
        status: 'Status'
    };
    
    await importCSVData('drivers', csvFilePath, columnMapping);
}

async function importBookings(csvFilePath) {
    const columnMapping = {
        car_type: 'Car Type',
        pickup_loc: 'Pickup Location',
        drop_loc: 'Drop Location',
        booking_date: 'Booking Date',
        booking_time: 'Booking Time',
        guest_name: 'Guest Name',
        mobile_number: 'Mobile Number',
        email_id: 'Email',
        special_note: 'Special Note',
        assigned_driver: 'Assigned Driver',
        status: 'Status'
    };
    
    await importCSVData('bookings', csvFilePath, columnMapping);
}

// Run the import
async function main() {
    try {
        // Example: Import vehicles from CSV
        await importVehicles('./vehicles.csv');
        
        // Example: Import drivers from CSV
        await importDrivers('./drivers.csv');
        
        // Example: Import bookings from CSV
        await importBookings('./bookings.csv');
        
        console.log('All imports completed successfully!');
    } catch (error) {
        console.error('Import failed:', error);
    } finally {
        await pool.end();
    }
}

main();
```

### Method 2: Direct SQL INSERT Statements

If you prefer to generate SQL statements directly:

```sql
-- Example: Insert vehicles
INSERT INTO vehicles (
    rick_no, plate_code, plate_no, mulkiya_expiry, vehicle_insurance_expiry,
    chassis_no, engine_no, vehicle_type, model, status
) VALUES 
    ('RICK001', 'A', '12345', '2025-12-31', '2025-11-30', 'CHAS001', 'ENG001', 'Sedan', 'Toyota Camry', 'available'),
    ('RICK002', 'B', '67890', '2026-01-15', '2025-12-15', 'CHAS002', 'ENG002', 'SUV', 'Toyota Land Cruiser', 'available')
ON CONFLICT (plate_code, plate_no) DO NOTHING;

-- Example: Insert drivers
INSERT INTO drivers (
    rick, category, name, mobile, eid_no, visa_expiry, passport_no, passport_expiry,
    daman_expiry, driving_licence_no, driving_licence_expiry, trafic_code, trans_no,
    limo_permit_expiry, status
) VALUES 
    ('RICK001', 'Limousine', 'Ahmed Ali', '+971501234567', '784-1234-5678901-2', '2025-12-31', 'A12345678', '2026-06-30', '2025-11-30', 'DL123456', '2026-03-31', 'TC001', 'TR001', '2025-10-31', 'active'),
    ('RICK002', 'Sedan', 'Mohammed Hassan', '+971501234568', '784-1234-5678902-3', '2026-01-15', 'B23456789', '2026-08-15', '2025-12-15', 'DL234567', '2026-05-15', 'TC002', 'TR002', '2025-11-15', 'active')
ON CONFLICT (rick) DO NOTHING;

-- Example: Insert bookings
INSERT INTO bookings (
    car_type, pickup_loc, drop_loc, booking_date, booking_time, guest_name,
    mobile_number, email_id, special_note, assigned_driver, status
) VALUES 
    ('BMW 7 Series', '123 Main St, Dubai', '456 Sheikh Zayed Road, Dubai', '2025-10-15', '14:30', 'John Doe', '+971501234567', 'john.doe@example.com', 'Please call upon arrival', 'Driver 1', 'pending'),
    ('Mercedes S-Class', '789 JBR, Dubai', '321 Downtown, Dubai', '2025-10-16', '10:00', 'Jane Smith', '+971501234568', 'jane.smith@example.com', 'Airport pickup', NULL, 'pending')
ON CONFLICT DO NOTHING;
```

### Method 3: Using PostgreSQL COPY Command

For large datasets, use the COPY command:

```sql
-- Copy data from CSV file
COPY vehicles (rick_no, plate_code, plate_no, mulkiya_expiry, vehicle_insurance_expiry, chassis_no, engine_no, vehicle_type, model, status)
FROM '/path/to/your/vehicles.csv'
DELIMITER ','
CSV HEADER;

COPY drivers (rick, category, name, mobile, eid_no, visa_expiry, passport_no, passport_expiry, daman_expiry, driving_licence_no, driving_licence_expiry, trafic_code, trans_no, limo_permit_expiry, status)
FROM '/path/to/your/drivers.csv'
DELIMITER ','
CSV HEADER;

COPY bookings (car_type, pickup_loc, drop_loc, booking_date, booking_time, guest_name, mobile_number, email_id, special_note, assigned_driver, status)
FROM '/path/to/your/bookings.csv'
DELIMITER ','
CSV HEADER;
```

## Data Format Requirements

### Date Format
- Use YYYY-MM-DD format for dates (e.g., 2025-12-31)
- Use HH:MM format for times (e.g., 14:30)

### Status Values
- **Vehicles**: 'available', 'in_use', 'maintenance', 'retired'
- **Drivers**: 'active', 'inactive', 'suspended', 'on_leave'
- **Bookings**: 'pending', 'confirmed', 'in_progress', 'completed', 'cancelled'

### Required Fields
- **Vehicles**: rick_no, plate_code, plate_no
- **Drivers**: rick, name
- **Bookings**: car_type, pickup_loc, drop_loc, booking_date, booking_time, guest_name, mobile_number

## Next Steps

1. Tell me which table you want to import data into
2. Provide the column names from your spreadsheet
3. I'll create a customized import script for your specific data

## Troubleshooting

### Common Issues:
1. **Date format errors**: Ensure dates are in YYYY-MM-DD format
2. **Duplicate key errors**: Use ON CONFLICT DO NOTHING to skip duplicates
3. **Missing required fields**: Check that all NOT NULL columns have values
4. **Invalid status values**: Use only the allowed status values listed above

### Validation Queries:
```sql
-- Check imported data
SELECT COUNT(*) FROM vehicles;
SELECT COUNT(*) FROM drivers;
SELECT COUNT(*) FROM bookings;

-- Check for any data issues
SELECT * FROM vehicles WHERE status NOT IN ('available', 'in_use', 'maintenance', 'retired');
SELECT * FROM drivers WHERE status NOT IN ('active', 'inactive', 'suspended', 'on_leave');
SELECT * FROM bookings WHERE status NOT IN ('pending', 'confirmed', 'in_progress', 'completed', 'cancelled');
```
