#!/usr/bin/env node

const { query, pool } = require('../shared/database/connection');
const { ensureSuperadminPermissions, grantAllPermissionsToSuperadmin, getSuperadminPermissionStatus } = require('../shared/middleware/superadminPermissions');

/**
 * Complete Superadmin Permissions Setup
 * This script ensures superadmin has ALL permissions by default
 */

async function setupSuperadminPermissions() {
  console.log('🔐 COMPLETE SUPERADMIN PERMISSIONS SETUP');
  console.log('=' .repeat(70));
  console.log('This script will ensure superadmin has ALL permissions by default');
  console.log('and set up automatic permission granting for future permissions.\n');

  try {
    // Step 1: Check if RBAC schema exists
    console.log('📋 Step 1: Checking RBAC schema...');
    const schemaCheck = await query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'roles' AND table_schema = 'public'
      ) as roles_exists,
      EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'permissions' AND table_schema = 'public'
      ) as permissions_exists
    `);

    const { roles_exists, permissions_exists } = schemaCheck.rows[0];
    
    if (!roles_exists || !permissions_exists) {
      console.log('   ⚠️  RBAC schema not found! Please run rbac_schema.sql first.');
      console.log('   Run: psql -d your_database -f shared/database/rbac_schema.sql\n');
      process.exit(1);
    }
    
    console.log('   ✅ RBAC schema found\n');

    // Step 2: Check current status
    console.log('📊 Step 2: Checking current superadmin permission status...');
    const statusResult = await getSuperadminPermissionStatus();
    
    if (statusResult.success) {
      const status = statusResult.data;
      console.log(`   Total permissions in system: ${status.totalPermissions}`);
      console.log(`   Superadmin permissions: ${status.superadminPermissions}`);
      console.log(`   Missing permissions: ${status.missingPermissions}`);
      console.log(`   Status: ${status.status}\n`);
    } else {
      console.log('   ⚠️  Could not check status, proceeding with setup...\n');
    }

    // Step 3: Grant all permissions to superadmin
    console.log('✨ Step 3: Granting ALL permissions to superadmin...');
    const grantResult = await grantAllPermissionsToSuperadmin();
    
    if (grantResult.success) {
      console.log(`   ✅ ${grantResult.message}`);
      console.log(`   Total permissions: ${grantResult.totalPermissions}`);
      console.log(`   Superadmin permissions: ${grantResult.superadminPermissions}`);
      console.log(`   Status: ${grantResult.status}\n`);
    } else {
      console.log(`   ❌ Error: ${grantResult.message}\n`);
    }

    // Step 4: Verify the setup
    console.log('✅ Step 4: Verifying setup...');
    const verifyResult = await getSuperadminPermissionStatus();
    
    if (verifyResult.success) {
      const status = verifyResult.data;
      console.log(`   Final status: ${status.status}`);
      console.log(`   Superadmin has: ${status.superadminPermissions}/${status.totalPermissions} permissions\n`);
      
      if (status.isComplete) {
        console.log('   🎉 SUCCESS! Superadmin has ALL permissions!\n');
      } else {
        console.log('   ⚠️  Warning: Superadmin is missing some permissions.\n');
      }
    }

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
    console.log('✅ SUPERADMIN PERMISSIONS SETUP COMPLETE!');
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

    // Step 7: Show API endpoints
    console.log('🔗 API Endpoints for Superadmin Permission Management:');
    console.log('=' .repeat(70));
    console.log('GET  /api/auth/superadmin/permissions/status  - Check status');
    console.log('POST /api/auth/superadmin/permissions/fix     - Fix permissions');
    console.log('GET  /api/auth/roles                         - List all roles');
    console.log('GET  /api/auth/permissions                   - List all permissions');
    console.log('POST /api/auth/roles/:id/permissions         - Assign permissions to role');
    console.log('=' .repeat(70));

    // Step 8: Show usage instructions
    console.log('\n📖 Usage Instructions:');
    console.log('=' .repeat(70));
    console.log('1. Check status anytime:');
    console.log('   curl -H "Authorization: Bearer <token>" http://localhost:3000/api/auth/superadmin/permissions/status');
    console.log('');
    console.log('2. Fix missing permissions:');
    console.log('   curl -X POST -H "Authorization: Bearer <token>" http://localhost:3000/api/auth/superadmin/permissions/fix');
    console.log('');
    console.log('3. New permissions will be automatically granted to superadmin!');
    console.log('4. The database trigger ensures superadmin gets all future permissions.');
    console.log('=' .repeat(70));

    console.log('\n🎉 SETUP COMPLETE! Superadmin now has complete access to everything!');
    console.log('=' .repeat(70));

  } catch (error) {
    console.error('\n❌ Error during setup:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run the script
if (require.main === module) {
  setupSuperadminPermissions();
}

module.exports = { setupSuperadminPermissions };

