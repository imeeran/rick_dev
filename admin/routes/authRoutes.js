const express = require('express');
const router = express.Router();
console.log('Auth routes loaded======');

// Import controllers and middleware
const authController = require('../controllers/authController');
const rolesController = require('../controllers/rolesController');
const { authenticate } = require('../../shared/middleware/auth');
const { requireSuperAdmin, requireAdmin } = require('../../shared/middleware/authorize');

// Authentication routes (public)
router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/refresh', authController.refreshToken);
router.post('/refresh-token', authController.refreshToken); // Alternative endpoint for compatibility

// Protected authentication routes
router.post('/logout', authenticate, authController.logout);
router.get('/me', authenticate, authController.getCurrentUser);
router.put('/change-password', authenticate, authController.changePassword);

// Role management routes (admin only)
router.get('/roles', authenticate, requireAdmin(), rolesController.getAllRoles);
router.get('/roles/:id', authenticate, requireAdmin(), rolesController.getRoleById);
router.post('/roles', authenticate, requireSuperAdmin(), rolesController.createRole);
router.put('/roles/:id', authenticate, requireSuperAdmin(), rolesController.updateRole);
router.delete('/roles/:id', authenticate, requireSuperAdmin(), rolesController.deleteRole);

// Permission management routes (admin only)
router.get('/permissions', authenticate, requireAdmin(), rolesController.getAllPermissions);
router.post('/roles/:id/permissions', authenticate, requireSuperAdmin(), rolesController.assignPermissionsToRole);
router.get('/roles/:id/users', authenticate, requireAdmin(), rolesController.getUsersByRole);

// Superadmin permission management routes (superadmin only)
router.get('/superadmin/permissions/status', authenticate, requireSuperAdmin(), rolesController.getSuperadminPermissionStatus);
router.post('/superadmin/permissions/fix', authenticate, requireSuperAdmin(), rolesController.fixSuperadminPermissions);

module.exports = router;
