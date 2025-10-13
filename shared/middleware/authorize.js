/**
 * Authorization Middleware
 * Checks if user has required roles or permissions
 */

/**
 * Check if user has any of the specified roles
 * @param {Array<string>} allowedRoles - Array of role names
 */
const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const userRole = req.user.role;

    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Required role(s): ${allowedRoles.join(', ')}. Your role: ${userRole}`
      });
    }

    next();
  };
};

/**
 * Check if user has specific permission
 * @param {string} permissionName - Permission name (e.g., 'users.create')
 */
const requirePermission = (permissionName) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const hasPermission = req.user.permissions.some(
      permission => permission.name === permissionName
    );

    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Required permission: ${permissionName}`
      });
    }

    next();
  };
};

/**
 * Check if user has permission for resource and action
 * @param {string} resource - Resource name (e.g., 'users')
 * @param {string} action - Action name (e.g., 'create')
 */
const requireResourcePermission = (resource, action) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const hasPermission = req.user.permissions.some(
      permission => permission.resource === resource && permission.action === action
    );

    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Required permission: ${resource}.${action}`
      });
    }

    next();
  };
};

/**
 * Check if user has any of the specified permissions
 * @param {Array<string>} permissionNames - Array of permission names
 */
const requireAnyPermission = (...permissionNames) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const hasAnyPermission = req.user.permissions.some(
      permission => permissionNames.includes(permission.name)
    );

    if (!hasAnyPermission) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Required one of: ${permissionNames.join(', ')}`
      });
    }

    next();
  };
};

/**
 * Check if user has all of the specified permissions
 * @param {Array<string>} permissionNames - Array of permission names
 */
const requireAllPermissions = (...permissionNames) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const userPermissionNames = req.user.permissions.map(p => p.name);
    const hasAllPermissions = permissionNames.every(
      permName => userPermissionNames.includes(permName)
    );

    if (!hasAllPermissions) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Required all of: ${permissionNames.join(', ')}`
      });
    }

    next();
  };
};

/**
 * Check if user is superadmin
 */
const requireSuperAdmin = () => {
  return requireRole('superadmin');
};

/**
 * Check if user is admin or superadmin
 */
const requireAdmin = () => {
  return requireRole('superadmin', 'admin');
};

/**
 * Check if user is manager, admin, or superadmin
 */
const requireManager = () => {
  return requireRole('superadmin', 'admin', 'manager');
};

/**
 * Check if user owns the resource or has admin role
 * @param {Function} getResourceOwnerId - Function to extract owner ID from request
 */
const requireOwnerOrAdmin = (getResourceOwnerId) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    // Allow if user is admin or superadmin
    if (['superadmin', 'admin'].includes(req.user.role)) {
      return next();
    }

    // Check if user owns the resource
    const ownerId = getResourceOwnerId(req);
    if (req.user.id === ownerId) {
      return next();
    }

    return res.status(403).json({
      success: false,
      message: 'Access denied. You can only access your own resources.'
    });
  };
};

module.exports = {
  requireRole,
  requirePermission,
  requireResourcePermission,
  requireAnyPermission,
  requireAllPermissions,
  requireSuperAdmin,
  requireAdmin,
  requireManager,
  requireOwnerOrAdmin
};
