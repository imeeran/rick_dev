const { query } = require('../database/connection');

/**
 * Superadmin Permissions Middleware
 * Ensures superadmin always has all permissions
 */

/**
 * Check and fix superadmin permissions
 * Call this function whenever permissions are added or modified
 */
const ensureSuperadminPermissions = async () => {
  try {
    // Check current status
    const statusResult = await query('SELECT * FROM superadmin_permission_status');
    const status = statusResult.rows[0];
    
    // If there are missing permissions, fix them
    if (status.missing_permissions > 0) {
      console.log(`🔧 Fixing ${status.missing_permissions} missing permissions for superadmin...`);
      
      const fixResult = await query('SELECT * FROM fix_superadmin_permissions()');
      const fix = fixResult.rows[0];
      
      console.log(`✅ ${fix.message}`);
      return {
        success: true,
        message: fix.message,
        permissionsGranted: fix.permissions_granted
      };
    }
    
    return {
      success: true,
      message: 'Superadmin already has all permissions',
      permissionsGranted: 0
    };
    
  } catch (error) {
    console.error('Error ensuring superadmin permissions:', error);
    return {
      success: false,
      message: 'Failed to ensure superadmin permissions',
      error: error.message
    };
  }
};

/**
 * Grant all permissions to superadmin
 * Call this function to manually grant all permissions
 */
const grantAllPermissionsToSuperadmin = async () => {
  try {
    await query('SELECT grant_all_permissions_to_superadmin()');
    
    // Get updated status
    const statusResult = await query('SELECT * FROM superadmin_permission_status');
    const status = statusResult.rows[0];
    
    return {
      success: true,
      message: `Superadmin now has ${status.superadmin_permissions}/${status.total_permissions} permissions`,
      totalPermissions: status.total_permissions,
      superadminPermissions: status.superadmin_permissions,
      status: status.status
    };
    
  } catch (error) {
    console.error('Error granting all permissions to superadmin:', error);
    return {
      success: false,
      message: 'Failed to grant all permissions to superadmin',
      error: error.message
    };
  }
};

/**
 * Get superadmin permission status
 */
const getSuperadminPermissionStatus = async () => {
  try {
    const statusResult = await query('SELECT * FROM superadmin_permission_status');
    const status = statusResult.rows[0];
    
    return {
      success: true,
      data: {
        totalPermissions: status.total_permissions,
        superadminPermissions: status.superadmin_permissions,
        missingPermissions: status.missing_permissions,
        status: status.status,
        isComplete: status.status === 'COMPLETE'
      }
    };
    
  } catch (error) {
    console.error('Error getting superadmin permission status:', error);
    return {
      success: false,
      message: 'Failed to get superadmin permission status',
      error: error.message
    };
  }
};

/**
 * Middleware to ensure superadmin permissions on permission changes
 * Use this in routes that add or modify permissions
 */
const ensureSuperadminPermissionsMiddleware = (req, res, next) => {
  // Run the check asynchronously without blocking the request
  ensureSuperadminPermissions()
    .then(result => {
      if (result.success && result.permissionsGranted > 0) {
        console.log(`✅ Auto-granted ${result.permissionsGranted} permissions to superadmin`);
      }
    })
    .catch(error => {
      console.error('Error in superadmin permissions middleware:', error);
    });
  
  next();
};

module.exports = {
  ensureSuperadminPermissions,
  grantAllPermissionsToSuperadmin,
  getSuperadminPermissionStatus,
  ensureSuperadminPermissionsMiddleware
};

