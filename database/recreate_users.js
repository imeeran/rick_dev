const { query, pool } = require('../shared/database/connection');
const fs = require('fs').promises;
const path = require('path');

/**
 * Script to drop and recreate users table
 * ⚠️ WARNING: This will delete all user data!
 */

async function recreateUsersTable() {
  console.log('🚀 Starting users table recreation...\n');

  try {
    // Step 1: Backup existing data
    console.log('📦 Step 1: Creating backup...');
    try {
      const backupResult = await query('SELECT * FROM users');
      if (backupResult.rows.length > 0) {
        console.log(`   ✅ Found ${backupResult.rows.length} users to backup`);
        // Save to file
        await fs.writeFile(
          path.join(__dirname, 'users_backup.json'),
          JSON.stringify(backupResult.rows, null, 2)
        );
        console.log('   ✅ Backup saved to database/users_backup.json\n');
      } else {
        console.log('   ℹ️  No users found to backup\n');
      }
    } catch (error) {
      console.log('   ℹ️  Users table does not exist yet\n');
    }

    // Step 2: Drop existing tables
    console.log('🗑️  Step 2: Dropping existing tables...');
    
    const tablesToDrop = [
      'role_permissions',
      'bookings',
      'payslips',
      'finance_records',
      'drivers',
      'vehicles',
      'analytics',
      'comments',
      'posts',
      'post_categories'
    ];

    for (const table of tablesToDrop) {
      try {
        await query(`DROP TABLE IF EXISTS ${table} CASCADE`);
        console.log(`   ✅ Dropped ${table}`);
      } catch (error) {
        console.log(`   ⚠️  Could not drop ${table}: ${error.message}`);
      }
    }

    // Drop users and roles
    await query('DROP TABLE IF EXISTS users CASCADE');
    console.log('   ✅ Dropped users table');
    
    await query('DROP TABLE IF EXISTS roles CASCADE');
    console.log('   ✅ Dropped roles table');

    // Drop functions
    await query('DROP FUNCTION IF EXISTS update_users_updated_at() CASCADE');
    console.log('   ✅ Dropped triggers and functions\n');

    // Step 3: Read and execute users.sql
    console.log('📝 Step 3: Recreating tables from users.sql...');
    const sqlFile = await fs.readFile(
      path.join(__dirname, 'users.sql'),
      'utf8'
    );

    // Remove comments and split by semicolon
    const statements = sqlFile
      .split('\n')
      .filter(line => !line.trim().startsWith('--') && line.trim() !== '')
      .join('\n')
      .split(';')
      .filter(statement => statement.trim() !== '');

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i].trim();
      if (statement) {
        try {
          await query(statement);
        } catch (error) {
          // Ignore errors for commented queries
          if (!error.message.includes('syntax error')) {
            console.log(`   ⚠️  Statement ${i + 1}: ${error.message}`);
          }
        }
      }
    }
    console.log('   ✅ Tables recreated successfully\n');

    // Step 4: Verify creation
    console.log('✅ Step 4: Verifying tables...');
    
    // Check roles
    const rolesResult = await query('SELECT * FROM roles ORDER BY name');
    console.log(`   ✅ Roles table: ${rolesResult.rows.length} roles created`);
    rolesResult.rows.forEach(role => {
      console.log(`      - ${role.name}: ${role.description}`);
    });

    // Check users
    const usersResult = await query(`
      SELECT u.username, u.email, r.name as role_name 
      FROM users u
      LEFT JOIN roles r ON u.role_id = r.id
      ORDER BY u.username
    `);
    console.log(`\n   ✅ Users table: ${usersResult.rows.length} sample users created`);
    usersResult.rows.forEach(user => {
      console.log(`      - ${user.username} (${user.email}) - Role: ${user.role_name}`);
    });

    // Check indexes
    const indexResult = await query(`
      SELECT indexname 
      FROM pg_indexes 
      WHERE tablename = 'users'
      ORDER BY indexname
    `);
    console.log(`\n   ✅ Indexes: ${indexResult.rows.length} indexes created`);

    // Check triggers
    const triggerResult = await query(`
      SELECT trigger_name 
      FROM information_schema.triggers 
      WHERE event_object_table = 'users'
    `);
    console.log(`   ✅ Triggers: ${triggerResult.rows.length} trigger(s) created\n`);

    console.log('=' .repeat(60));
    console.log('✅ SUCCESS! Users table has been recreated');
    console.log('=' .repeat(60));
    console.log('\n📝 Default Login Credentials:');
    console.log('   Username: admin     | Password: admin123');
    console.log('   Username: manager   | Password: manager123');
    console.log('   Username: employee  | Password: employee123');
    console.log('\n⚠️  Remember to change these passwords in production!\n');

  } catch (error) {
    console.error('\n❌ Error during recreation:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  } finally {
    // Close pool
    await pool.end();
  }
}

// Ask for confirmation
const readline = require('readline');
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('⚠️  WARNING: This will DROP and RECREATE the users table!');
console.log('⚠️  ALL USER DATA WILL BE LOST!\n');

rl.question('Are you sure you want to continue? (yes/no): ', (answer) => {
  if (answer.toLowerCase() === 'yes') {
    rl.close();
    recreateUsersTable();
  } else {
    console.log('\n❌ Operation cancelled');
    rl.close();
    process.exit(0);
  }
});

