const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query } = require('../../shared/database/connection');
const { sendSuccess, sendError, sendValidationError } = require('../../shared/utils/response');
const config = require('../../config');

/**
 * Authentication Controller
 * Handles user authentication operations
 */

// Generate JWT tokens
const generateTokens = (userId, username, role) => {
  const accessToken = jwt.sign(
    { userId, username, role },
    config.jwt.secret,
    { expiresIn: '24h' } // Access token expires in 24 hours
  );

  const refreshToken = jwt.sign(
    { userId, type: 'refresh' },
    config.jwt.secret,
    { expiresIn: '7d' } // Refresh token expires in 7 days
  );

  return { accessToken, refreshToken };
};

// POST /api/admin/auth/register - Register new user
const register = async (req, res) => {
  try {
    const { username, name, email, password, user_dob, user_contact_num, role } = req.body;

    // Validation
    if (!username || !name || !email || !password || !user_dob || !user_contact_num) {
      return sendValidationError(res, 'Username, name, email, password, date of birth, and contact number are required');
    }

    if (password.length < 6) {
      return sendValidationError(res, 'Password must be at least 6 characters long');
    }

    // Check if user already exists
    const existingUser = await query(
      'SELECT id FROM users WHERE username = $1 OR email = $2',
      [username, email]
    );

    if (existingUser.rows.length > 0) {
      return sendError(res, 'User with this username or email already exists', 409);
    }

    // Get role ID (default to 'employee' if not specified)
    const roleName = role || 'employee';
    const roleResult = await query(
      'SELECT id FROM roles WHERE name = $1',
      [roleName]
    );

    if (roleResult.rows.length === 0) {
      return sendError(res, `Role '${roleName}' not found`, 400);
    }

    const roleId = roleResult.rows[0].id;

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Create user
    const insertResult = await query(
      `INSERT INTO users (name, username, email, password_hash, user_dob, user_contact_num, role_id, join_date, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_DATE, CURRENT_TIMESTAMP)
       RETURNING id, name, username, email, user_dob, user_contact_num, role_id, join_date`,
      [name, username, email, passwordHash, user_dob, user_contact_num, roleId]
    );

    const user = insertResult.rows[0];

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(user.id, user.username, roleName);

    // Save refresh token to database
    await query(
      'UPDATE users SET refresh_token = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [refreshToken, user.id]
    );

    sendSuccess(res, {
      user: {
        id: user.id,
        name: user.name,
        username: user.username,
        email: user.email,
        userDob: user.user_dob,
        userContactNum: user.user_contact_num,
        role: roleName,
        joinDate: user.join_date
      },
      accessToken,
      refreshToken
    }, 'User registered successfully', 201);

  } catch (error) {
    console.error('Registration error:', error);
    sendError(res, 'Failed to register user', 500, error);
  }
};

// POST /api/admin/auth/login - User login
const login = async (req, res) => {
    console.log('Login request received');
  try {
    const { username, password } = req.body;

    // Validation
    if (!username || !password) {
      return sendValidationError(res, 'Username and password are required');
    }

    // Get user with role
    const userResult = await query(
      `SELECT u.id, u.name, u.username, u.email, u.password_hash, u.role_id, r.name as role_name
       FROM users u
       LEFT JOIN roles r ON u.role_id = r.id
       WHERE u.username = $1 OR u.email = $1`,
      [username]
    );

    if (userResult.rows.length === 0) {
      return sendError(res, 'Invalid username or password', 401);
    }

    const user = userResult.rows[0];

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);

    if (!isPasswordValid) {
      return sendError(res, 'Invalid username or password', 401);
    }

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(user.id, user.username, user.role_name);

    // Update refresh token and last login
    await query(
      'UPDATE users SET refresh_token = $1, last_login = CURRENT_TIMESTAMP WHERE id = $2',
      [refreshToken, user.id]
    );

    // Get user permissions
    const permissionsResult = await query(
      `SELECT DISTINCT p.name, p.resource, p.action
       FROM permissions p
       JOIN role_permissions rp ON p.id = rp.permission_id
       WHERE rp.role_id = $1`,
      [user.role_id]
    );

    sendSuccess(res, {
      user: {
        id: user.id,
        name: user.name,
        username: user.username,
        email: user.email,
        role: user.role_name,
        permissions: permissionsResult.rows
      },
      accessToken,
      refreshToken
    }, 'Login successful');

  } catch (error) {
    console.error('Login error:', error);
    sendError(res, 'Failed to login', 500, error);
  }
};

// POST /api/admin/auth/refresh - Refresh access token
const refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return sendValidationError(res, 'Refresh token is required');
    }

    // Verify refresh token
    const decoded = jwt.verify(refreshToken, config.jwt.secret);

    if (decoded.type !== 'refresh') {
      return sendError(res, 'Invalid refresh token', 401);
    }

    // Get user
    const userResult = await query(
      `SELECT u.id, u.username, u.email, u.refresh_token, r.name as role_name
       FROM users u
       LEFT JOIN roles r ON u.role_id = r.id
       WHERE u.id = $1`,
      [decoded.userId]
    );

    if (userResult.rows.length === 0) {
      return sendError(res, 'User not found', 404);
    }

    const user = userResult.rows[0];

    // Check if refresh token matches
    if (user.refresh_token !== refreshToken) {
      return sendError(res, 'Invalid refresh token', 401);
    }

    // Generate new tokens
    const tokens = generateTokens(user.id, user.username, user.role_name);

    // Update refresh token
    await query(
      'UPDATE users SET refresh_token = $1 WHERE id = $2',
      [tokens.refreshToken, user.id]
    );

    sendSuccess(res, {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken
    }, 'Token refreshed successfully');

  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return sendError(res, 'Invalid or expired refresh token', 401);
    }

    console.error('Refresh token error:', error);
    sendError(res, 'Failed to refresh token', 500, error);
  }
};

// POST /api/admin/auth/logout - User logout
const logout = async (req, res) => {
  try {
    const userId = req.user.id;

    // Clear refresh token
    await query(
      'UPDATE users SET refresh_token = NULL WHERE id = $1',
      [userId]
    );

    sendSuccess(res, null, 'Logout successful');

  } catch (error) {
    console.error('Logout error:', error);
    sendError(res, 'Failed to logout', 500, error);
  }
};

// GET /api/admin/auth/me - Get current user info
const getCurrentUser = async (req, res) => {
  try {
    const userId = req.user.id;

    const userResult = await query(
      `SELECT u.id, u.username, u.email, u.last_login, u.join_date, r.name as role_name
       FROM users u
       LEFT JOIN roles r ON u.role_id = r.id
       WHERE u.id = $1`,
      [userId]
    );

    if (userResult.rows.length === 0) {
      return sendError(res, 'User not found', 404);
    }

    const user = userResult.rows[0];

    // Get user permissions
    const permissionsResult = await query(
      `SELECT DISTINCT p.name, p.resource, p.action, p.description
       FROM permissions p
       JOIN role_permissions rp ON p.id = rp.permission_id
       JOIN users u ON u.role_id = rp.role_id
       WHERE u.id = $1`,
      [userId]
    );

    sendSuccess(res, {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role_name,
      lastLogin: user.last_login,
      joinDate: user.join_date,
      permissions: permissionsResult.rows
    }, 'User info retrieved successfully');

  } catch (error) {
    console.error('Get current user error:', error);
    sendError(res, 'Failed to get user info', 500, error);
  }
};

// PUT /api/admin/auth/change-password - Change password
const changePassword = async (req, res) => {
  try {
    const userId = req.user.id;
    const { currentPassword, newPassword } = req.body;

    // Validation
    if (!currentPassword || !newPassword) {
      return sendValidationError(res, 'Current password and new password are required');
    }

    if (newPassword.length < 6) {
      return sendValidationError(res, 'New password must be at least 6 characters long');
    }

    // Get user
    const userResult = await query(
      'SELECT password_hash FROM users WHERE id = $1',
      [userId]
    );

    if (userResult.rows.length === 0) {
      return sendError(res, 'User not found', 404);
    }

    // Verify current password
    const isPasswordValid = await bcrypt.compare(currentPassword, userResult.rows[0].password_hash);

    if (!isPasswordValid) {
      return sendError(res, 'Current password is incorrect', 401);
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const newPasswordHash = await bcrypt.hash(newPassword, salt);

    // Update password
    await query(
      'UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [newPasswordHash, userId]
    );

    sendSuccess(res, null, 'Password changed successfully');

  } catch (error) {
    console.error('Change password error:', error);
    sendError(res, 'Failed to change password', 500, error);
  }
};

module.exports = {
  register,
  login,
  refreshToken,
  logout,
  getCurrentUser,
  changePassword
};
