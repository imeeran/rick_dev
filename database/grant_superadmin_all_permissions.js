const { query, pool } = require('../shared/database/connection');

/**
 * Grant ALL permissions to superadmin role
 * This script ensures superadmin has complete access to everything
 */

async function grantAllPermissionsToSuperadmin() {
  console.log('🔐 Granting ALL permissions to superadmin...\n');
  console.log('=' .repeat(70));

  try {
    // Step 1: Check if superadmin role exists
    console.log('📋 Step 1: Checking superadmin role...');
    const roleCheck = await query(`
      SELECT id, name FROM roles WHERE name = 'superadmin'
    `);

    if (roleCheck.rows.length === 0) {
      console.log('   ⚠️  Superadmin role not found! Creating it...');
      await query(`
        INSERT INTO roles (name, description) 
        VALUES ('superadmin', 'Super Administrator with full system access')
      `);
      console.log('   ✅ Superadmin role created\n');
    } else {
      console.log('   ✅ Superadmin role exists (ID: ' + roleCheck.rows[0].id + ')\n');
    }

    // Step 2: Get all permissions count
    console.log('📊 Step 2: Checking permissions...');
    const permissionsResult = await query('SELECT COUNT(*) as count FROM permissions');
    const totalPermissions = parseInt(permissionsResult.rows[0].count);
    console.log(`   ✅ Total permissions in system: ${totalPermissions}\n`);

    if (totalPermissions === 0) {
      console.log('   ⚠️  No permissions found! Please run permissions.sql first.');
      process.exit(1);
    }

    // Step 3: Check current superadmin permissions
    console.log('🔍 Step 3: Checking current superadmin permissions...');
    const currentPerms = await query(`
      SELECT COUNT(*) as count
      FROM role_permissions rp
      JOIN roles r ON rp.role_id = r.id
      WHERE r.name = 'superadmin'
    `);
    const currentPermCount = parseInt(currentPerms.rows[0].count);
    console.log(`   Current superadmin permissions: ${currentPermCount}/${totalPermissions}\n`);

    // Step 4: Delete existing superadmin permissions (to avoid conflicts)
    console.log('🗑️  Step 4: Removing old permission assignments...');
    await query(`
      DELETE FROM role_permissions
      WHERE role_id = (SELECT id FROM roles WHERE name = 'superadmin')
    `);
    console.log('   ✅ Old permissions cleared\n');

    // Step 5: Grant ALL permissions to superadmin
    console.log('✨ Step 5: Granting ALL permissions to superadmin...');
    const result = await query(`
      INSERT INTO role_permissions (role_id, permission_id)
      SELECT r.id, p.id
      FROM roles r, permissions p
      WHERE r.name = 'superadmin'
      ON CONFLICT DO NOTHING
    `);
    console.log(`   ✅ Granted all permissions!\n`);

    // Step 6: Verify the grant
    console.log('✅ Step 6: Verifying permissions...');
    const verifyResult = await query(`
      SELECT COUNT(*) as count
      FROM role_permissions rp
      JOIN roles r ON rp.role_id = r.id
      WHERE r.name = 'superadmin'
    `);
    const finalPermCount = parseInt(verifyResult.rows[0].count);
    console.log(`   Superadmin now has: ${finalPermCount}/${totalPermissions} permissions\n`);

    if (finalPermCount === totalPermissions) {
      console.log('   ✅✅✅ SUCCESS! Superadmin has ALL permissions!\n');
    } else {
      console.log('   ⚠️  Warning: Not all permissions were granted.\n');
    }

    // Step 7: Show all permissions for superadmin
    console.log('=' .repeat(70));
    console.log('📋 Superadmin Permissions List:');
    console.log('=' .repeat(70));
    const allPerms = await query(`
      SELECT p.resource, p.action, p.name, p.description
      FROM role_permissions rp
      JOIN roles r ON rp.role_id = r.id
      JOIN permissions p ON rp.permission_id = p.id
      WHERE r.name = 'superadmin'
      ORDER BY p.resource, p.action
    `);

    let currentResource = '';
    allPerms.rows.forEach(perm => {
      if (perm.resource !== currentResource) {
        console.log(`\n${perm.resource.toUpperCase()}:`);
        currentResource = perm.resource;
      }
      console.log(`  ✓ ${perm.name.padEnd(30)} - ${perm.description}`);
    });

    console.log('\n' + '=' .repeat(70));
    console.log('✅ COMPLETE! Superadmin has full access to everything!');
    console.log('=' .repeat(70));

    // Step 8: Show superadmin users
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

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run the script
grantAllPermissionsToSuperadmin();

