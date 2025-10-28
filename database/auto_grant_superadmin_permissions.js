const { query, pool } = require('../shared/database/connection');

/**
 * Auto Grant All Permissions to Superadmin
 * This script ensures superadmin automatically gets ALL permissions
 * and creates a system to auto-grant future permissions
 */

async function setupAutoGrantSystem() {
  console.log('🔐 Setting up Auto-Grant System for Superadmin...\n');
  console.log('=' .repeat(70));

  try {
    // Step 1: Run the SQL setup
    console.log('📋 Step 1: Running SQL setup...');
    const fs = require('fs');
    const path = require('path');
    
    const sqlFile = path.join(__dirname, 'auto_grant_superadmin_permissions.sql');
    const sqlContent = fs.readFileSync(sqlFile, 'utf8');
    
    // Split by semicolon and execute each statement
    const statements = sqlContent.split(';').filter(stmt => stmt.trim());
    
    for (const statement of statements) {
      if (statement.trim()) {
        try {
          await query(statement);
        } catch (error) {
          if (!error.message.includes('already exists')) {
            console.log(`   ⚠️  Warning: ${error.message}`);
          }
        }
      }
    }
    
    console.log('   ✅ SQL setup completed\n');

    // Step 2: Check current status
    console.log('📊 Step 2: Checking current status...');
    const statusResult = await query('SELECT * FROM superadmin_permission_status');
    const status = statusResult.rows[0];
    
    console.log(`   Total permissions in system: ${status.total_permissions}`);
    console.log(`   Superadmin permissions: ${status.superadmin_permissions}`);
    console.log(`   Missing permissions: ${status.missing_permissions}`);
    console.log(`   Status: ${status.status}\n`);

    // Step 3: Fix any missing permissions
    if (status.missing_permissions > 0) {
      console.log('🔧 Step 3: Fixing missing permissions...');
      const fixResult = await query('SELECT * FROM fix_superadmin_permissions()');
      const fix = fixResult.rows[0];
      
      console.log(`   ${fix.message}\n`);
    } else {
      console.log('✅ Step 3: No missing permissions found\n');
    }

    // Step 4: Verify final status
    console.log('✅ Step 4: Final verification...');
    const finalStatus = await query('SELECT * FROM superadmin_permission_status');
    const final = finalStatus.rows[0];
    
    console.log(`   Final status: ${final.status}`);
    console.log(`   Superadmin has: ${final.superadmin_permissions}/${final.total_permissions} permissions\n`);

    // Step 5: Show all superadmin permissions
    console.log('📋 Step 5: Superadmin Permissions List:');
    console.log('=' .repeat(70));
    const permissionsResult = await query(`
      SELECT p.resource, p.action, p.name, p.description
      FROM role_permissions rp
      JOIN roles r ON rp.role_id = r.id
      JOIN permissions p ON rp.permission_id = p.id
      WHERE r.name = 'superadmin'
      ORDER BY p.resource, p.action
    `);

    let currentResource = '';
    permissionsResult.rows.forEach(perm => {
      if (perm.resource !== currentResource) {
        console.log(`\n${perm.resource.toUpperCase()}:`);
        currentResource = perm.resource;
      }
      console.log(`  ✓ ${perm.name.padEnd(30)} - ${perm.description}`);
    });

    console.log('\n' + '=' .repeat(70));
    console.log('✅ AUTO-GRANT SYSTEM SETUP COMPLETE!');
    console.log('=' .repeat(70));

    // Step 6: Show superadmin users
    console.log('\n👥 Users with superadmin role:');
    console.log('=' .repeat(70));
    const superadminUsers = await query(`
      SELECT u.id, u.username, u.email, u.name, u.is_active
      FROM users u
      JOIN roles r ON u.role_id = r.id
      WHERE r.name = 'superadmin'
    `);

    if (superadminUsers.rows.length === 0) {
      console.log('⚠️  No users have superadmin role!');
      console.log('\nTo make a user superadmin, run:');
      console.log(`UPDATE users SET role_id = (SELECT id FROM roles WHERE name = 'superadmin') WHERE username = 'your_username';\n`);
    } else {
      superadminUsers.rows.forEach(user => {
        const status = user.is_active ? '✅ Active' : '❌ Inactive';
        console.log(`  ${user.username.padEnd(20)} ${user.email.padEnd(30)} ${status}`);
      });
      console.log('');
    }

    // Step 7: Show usage instructions
    console.log('📖 Usage Instructions:');
    console.log('=' .repeat(70));
    console.log('1. Check status anytime:');
    console.log('   SELECT * FROM superadmin_permission_status;');
    console.log('');
    console.log('2. Fix missing permissions:');
    console.log('   SELECT * FROM fix_superadmin_permissions();');
    console.log('');
    console.log('3. Grant all permissions manually:');
    console.log('   SELECT grant_all_permissions_to_superadmin();');
    console.log('');
    console.log('4. New permissions will be automatically granted to superadmin!');
    console.log('=' .repeat(70));

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run the script
setupAutoGrantSystem();

