const fs = require('fs');
const csv = require('csv-parser');
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const path = require('path');

// Import database configuration
const config = require('../config.js');

// Database connection
const pool = new Pool({
    user: config.database.user,
    host: config.database.host,
    database: config.database.database,
    password: config.database.password,
    port: config.database.port,
});

/**
 * Generic function to import CSV data into any table
 * @param {string} tableName - Name of the database table
 * @param {string} csvFilePath - Path to the CSV file
 * @param {Object} columnMapping - Object mapping CSV columns to database columns
 * @param {Function} dataTransformer - Optional function to transform data before insertion
 */
async function importCSVData(tableName, csvFilePath, columnMapping, dataTransformer = null) {
    const results = [];
    let successCount = 0;
    let errorCount = 0;
    const errors = [];
    
    console.log(`\n🔄 Starting import for table: ${tableName}`);
    console.log(`📁 Reading file: ${csvFilePath}`);
    
    return new Promise((resolve, reject) => {
        if (!fs.existsSync(csvFilePath)) {
            reject(new Error(`CSV file not found: ${csvFilePath}`));
            return;
        }

        fs.createReadStream(csvFilePath)
            .pipe(csv())
            .on('data', (data) => results.push(data))
            .on('end', async () => {
                console.log(`📊 Found ${results.length} rows in CSV file`);
                
                try {
                    for (let i = 0; i < results.length; i++) {
                        const row = results[i];
                        try {
                            await insertRow(tableName, row, columnMapping, dataTransformer);
                            successCount++;
                            if ((i + 1) % 10 === 0) {
                                process.stdout.write(`\r⏳ Processed ${i + 1}/${results.length} rows...`);
                            }
                        } catch (error) {
                            errorCount++;
                            errors.push({ row: i + 1, error: error.message, data: row });
                            console.error(`\n❌ Error in row ${i + 1}: ${error.message}`);
                        }
                    }
                    
                    console.log(`\n✅ Import completed for ${tableName}`);
                    console.log(`   📈 Successfully imported: ${successCount} rows`);
                    console.log(`   ❌ Errors: ${errorCount} rows`);
                    
                    if (errors.length > 0) {
                        console.log(`\n🔍 Error details:`);
                        errors.slice(0, 5).forEach(err => {
                            console.log(`   Row ${err.row}: ${err.error}`);
                        });
                        if (errors.length > 5) {
                            console.log(`   ... and ${errors.length - 5} more errors`);
                        }
                    }
                    
                    resolve({ successCount, errorCount, errors });
                } catch (error) {
                    reject(error);
                }
            })
            .on('error', (error) => {
                reject(error);
            });
    });
}

/**
 * Insert a single row into the database
 */
async function insertRow(tableName, row, columnMapping, dataTransformer) {
    // Transform data if transformer function is provided
    let processedRow = dataTransformer ? dataTransformer(row) : row;
    
    const columns = Object.keys(columnMapping);
    const values = columns.map(col => {
        const csvColumn = columnMapping[col];
        let value = processedRow[csvColumn];
        
        // Handle empty strings as NULL for optional fields
        if (value === '' || value === undefined) {
            return null;
        }
        
        // Handle date fields
        if (col.includes('_expiry') || col.includes('_date') || col === 'booking_date') {
            if (value) {
                // Convert various date formats to YYYY-MM-DD
                const date = new Date(value);
                if (isNaN(date.getTime())) {
                    throw new Error(`Invalid date format: ${value}`);
                }
                value = date.toISOString().split('T')[0];
            }
        }
        
        // Handle time fields
        if (col === 'booking_time') {
            if (value && !value.includes(':')) {
                // Convert time format if needed
                const time = new Date(`2000-01-01T${value}`);
                if (!isNaN(time.getTime())) {
                    value = time.toTimeString().split(' ')[0].substring(0, 5);
                }
            }
        }
        
        return value;
    });
    
    const placeholders = columns.map((_, index) => `$${index + 1}`).join(', ');
    const query = `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES (${placeholders}) ON CONFLICT DO NOTHING`;
    
    await pool.query(query, values);
}

/**
 * Import vehicles from CSV
 */
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
    
    return await importCSVData('vehicles', csvFilePath, columnMapping);
}

/**
 * Import drivers from CSV
 */
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
    
    return await importCSVData('drivers', csvFilePath, columnMapping);
}

/**
 * Import bookings from CSV
 */
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
    
    return await importCSVData('bookings', csvFilePath, columnMapping);
}

/**
 * Import users from CSV (with password hashing)
 */
async function importUsers(csvFilePath) {
    const columnMapping = {
        username: 'Username',
        email: 'Email',
        password_hash: 'Password',
        role: 'Role',
        is_active: 'Is Active'
    };
    
    const dataTransformer = (row) => {
        // Hash password if provided
        if (row.Password) {
            row.Password = bcrypt.hashSync(row.Password, 10);
        }
        
        // Convert is_active to boolean
        if (row['Is Active']) {
            row['Is Active'] = row['Is Active'].toLowerCase() === 'true' || row['Is Active'] === '1';
        }
        
        return row;
    };
    
    return await importCSVData('users', csvFilePath, columnMapping, dataTransformer);
}

/**
 * Custom import function - you can modify this for your specific data
 */
async function customImport(csvFilePath, tableName, columnMapping) {
    return await importCSVData(tableName, csvFilePath, columnMapping);
}

/**
 * Main function to run imports
 */
async function main() {
    console.log('🚀 Rick Backend Data Import Tool');
    console.log('=====================================');
    
    try {
        // Check if CSV files exist in the data directory
        const dataDir = path.join(__dirname, '..', 'data');
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
            console.log(`📁 Created data directory: ${dataDir}`);
            console.log('📋 Please place your CSV files in this directory and update the file paths below.');
        }
        
        // Example imports - modify these paths and uncomment as needed
        const imports = [];
        
        // Uncomment and modify these based on your files:
        
        // if (fs.existsSync(path.join(dataDir, 'vehicles.csv'))) {
        //     imports.push(importVehicles(path.join(dataDir, 'vehicles.csv')));
        // }
        
        // if (fs.existsSync(path.join(dataDir, 'drivers.csv'))) {
        //     imports.push(importDrivers(path.join(dataDir, 'drivers.csv')));
        // }
        
        // if (fs.existsSync(path.join(dataDir, 'bookings.csv'))) {
        //     imports.push(importBookings(path.join(dataDir, 'bookings.csv')));
        // }
        
        // if (fs.existsSync(path.join(dataDir, 'users.csv'))) {
        //     imports.push(importUsers(path.join(dataDir, 'users.csv')));
        // }
        
        if (imports.length === 0) {
            console.log('📋 No CSV files found in data directory.');
            console.log('📁 Please add CSV files to:', dataDir);
            console.log('\n📖 Available import functions:');
            console.log('   - importVehicles(csvFilePath)');
            console.log('   - importDrivers(csvFilePath)');
            console.log('   - importBookings(csvFilePath)');
            console.log('   - importUsers(csvFilePath)');
            console.log('   - customImport(csvFilePath, tableName, columnMapping)');
            return;
        }
        
        // Run all imports
        const results = await Promise.all(imports);
        
        // Summary
        console.log('\n📊 Import Summary');
        console.log('==================');
        let totalSuccess = 0;
        let totalErrors = 0;
        
        results.forEach(result => {
            totalSuccess += result.successCount;
            totalErrors += result.errorCount;
        });
        
        console.log(`✅ Total successful imports: ${totalSuccess}`);
        console.log(`❌ Total errors: ${totalErrors}`);
        
    } catch (error) {
        console.error('💥 Import failed:', error.message);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

// Export functions for use in other scripts
module.exports = {
    importCSVData,
    importVehicles,
    importDrivers,
    importBookings,
    importUsers,
    customImport
};

// Run if called directly
if (require.main === module) {
    main();
}
