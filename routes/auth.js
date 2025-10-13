const express = require('express');
const router = express.Router();
const { query } = require('../shared/database/connection');
const { authenticate } = require('../shared/middleware/auth');

/**
 * GET /api/user - Get current authenticated user
 * This endpoint is used by the frontend to get user info
 */
router.get('/user', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;

    // Get user with role
    const userResult = await query(
      `SELECT u.id, u.name, u.username, u.email, u.role_id, r.name as role_name
       FROM users u
       LEFT JOIN roles r ON u.role_id = r.id
       WHERE u.id = $1`,
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const user = userResult.rows[0];

    // Get user permissions
    const permissionsResult = await query(
      `SELECT DISTINCT p.name, p.resource, p.action, p.description
       FROM permissions p
       JOIN role_permissions rp ON p.id = rp.permission_id
       WHERE rp.role_id = $1`,
      [user.role_id]
    );

    // Return user data in the format expected by frontend
    res.status(200).json({
      id: user.id.toString(),
      name: user.name || user.username,
      username: user.username,
      email: user.email,
      role: user.role_name,
      permissions: permissionsResult.rows
    });

  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user info',
      error: error.message
    });
  }
});

module.exports = router;
