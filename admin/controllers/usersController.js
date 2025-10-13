const { query, pool } = require('../../shared/database/connection');
const { sendSuccess, sendError, sendNotFound, sendValidationError } = require('../../shared/utils/response');
const bcrypt = require('bcryptjs');

/**
 * Users Controller
 * Handles user-related operations for the admin panel
 */

// GET /api/admin/users - Get all users with pagination and filtering
const getAllUsers = async (req, res) => {
  try {
    const { 
      page = 0, 
      size = 10, 
      sort = 'join_date', 
      order = 'desc',
      search = '',
      role = ''
    } = req.query;

    const offset = page * size;

    // Build dynamic query
    let whereClause = 'WHERE 1=1';
    const params = [];
    let paramCount = 1;

    // Search functionality
    if (search) {
      whereClause += ` AND (
        u.username ILIKE $${paramCount} OR 
        u.email ILIKE $${paramCount} OR 
        u.name ILIKE $${paramCount} OR
        u.user_contact_num ILIKE $${paramCount}
      )`;
      params.push(`%${search}%`);
      paramCount++;
    }

    // Role filtering
    if (role) {
      whereClause += ` AND r.name = $${paramCount}`;
      params.push(role);
      paramCount++;
    }

    // Get total count
    const countQuery = `
      SELECT COUNT(*) 
      FROM users u
      LEFT JOIN roles r ON u.role_id = r.id
      ${whereClause}
    `;
    const countResult = await query(countQuery, params);
    const total = parseInt(countResult.rows[0].count);

    // Get users with pagination
    const usersQuery = `
      SELECT 
        u.id,
        u.name,
        u.username,
        u.email,
        u.user_dob,
        u.user_contact_num,
        u.join_date,
        u.last_login,
        u.updated_at,
        u.role_id,
        r.name as role_name,
        r.description as role_description
      FROM users u
      LEFT JOIN roles r ON u.role_id = r.id
      ${whereClause}
      ORDER BY u.${sort} ${order.toUpperCase()}
      LIMIT $${paramCount} OFFSET $${paramCount + 1}
    `;

    params.push(size, offset);
    const usersResult = await query(usersQuery, params);

    // Format response
    const users = usersResult.rows.map(row => ({
      id: row.id,
      name: row.name,
      username: row.username,
      email: row.email,
      userDob: row.user_dob,
      userContactNum: row.user_contact_num,
      joinDate: row.join_date,
      lastLogin: row.last_login,
      updatedAt: row.updated_at,
      role_id: row.role_id,
      role_name: row.role_name,
      role_description: row.role_description
    }));

    sendSuccess(res, {
      users,
      pagination: {
        page: parseInt(page),
        size: parseInt(size),
        total,
        totalPages: Math.ceil(total / parseInt(size)),
        startIndex: offset,
        endIndex: Math.min(offset + parseInt(size) - 1, total - 1)
      }
    }, 'Users retrieved successfully');

  } catch (error) {
    console.error('Error fetching users:', error);
    sendError(res, 'Failed to fetch users', 500, error);
  }
};

// GET /api/admin/users/:id - Get specific user by ID
const getUserById = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query(`
      SELECT 
        u.id,
        u.name,
        u.username,
        u.email,
        u.user_dob,
        u.user_contact_num,
        u.join_date,
        u.last_login,
        u.updated_at,
        u.role_id,
        r.name as role_name,
        r.description as role_description
      FROM users u
      LEFT JOIN roles r ON u.role_id = r.id
      WHERE u.id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return sendNotFound(res, 'User');
    }

    const user = result.rows[0];

    // Get user permissions
    const permissionsResult = await query(
      `SELECT DISTINCT p.name, p.resource, p.action, p.description
       FROM permissions p
       JOIN role_permissions rp ON p.id = rp.permission_id
       WHERE rp.role_id = $1`,
      [user.role_id]
    );

    sendSuccess(res, {
      id: user.id,
      name: user.name,
      username: user.username,
      email: user.email,
      userDob: user.user_dob,
      userContactNum: user.user_contact_num,
      joinDate: user.join_date,
      lastLogin: user.last_login,
      updatedAt: user.updated_at,
      role: {
        id: user.role_id,
        name: user.role_name,
        description: user.role_description
      },
      permissions: permissionsResult.rows
    }, 'User retrieved successfully');

  } catch (error) {
    console.error('Error fetching user:', error);
    sendError(res, 'Failed to fetch user', 500, error);
  }
};

// POST /api/admin/users - Create new user
const createUser = async (req, res) => {
  try {
    const { username, name, email, password, user_dob, user_contact_num, role } = req.body;

    // Basic validation
    if (!username || !name || !email || !password || !user_dob || !user_contact_num) {
      return sendValidationError(res, 'Missing required fields: username, name, email, password, user_dob, user_contact_num');
    }

    // Check if user already exists
    const existingUser = await query(
      'SELECT id FROM users WHERE username = $1 OR email = $2',
      [username, email]
    );

    if (existingUser.rows.length > 0) {
      return sendError(res, 'User with this username or email already exists', 409);
    }

    // Get role ID
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

    const insertResult = await query(`
      INSERT INTO users (name, username, email, password_hash, user_dob, user_contact_num, role_id, join_date, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_DATE, CURRENT_TIMESTAMP)
      RETURNING id, name, username, email, user_dob, user_contact_num, role_id, join_date
    `, [name, username, email, passwordHash, user_dob, user_contact_num, roleId]);

    const user = insertResult.rows[0];

    sendSuccess(res, {
      id: user.id,
      name: user.name,
      username: user.username,
      email: user.email,
      userDob: user.user_dob,
      userContactNum: user.user_contact_num,
      joinDate: user.join_date,
      role: roleName
    }, 'User created successfully', 201);

  } catch (error) {
    console.error('Error creating user:', error);
    sendError(res, 'Failed to create user', 500, error);
  }
};

// PUT /api/admin/users/:id - Update existing user
const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, username, email, user_dob, user_contact_num, role } = req.body;

    // Check if user exists
    const existingResult = await query('SELECT * FROM users WHERE id = $1', [id]);
    if (existingResult.rows.length === 0) {
      return sendNotFound(res, 'User');
    }

    // Check if username/email is being changed to one that already exists
    if (username || email) {
      const duplicateCheck = await query(
        'SELECT id FROM users WHERE (username = $1 OR email = $2) AND id != $3',
        [username || existingResult.rows[0].username, email || existingResult.rows[0].email, id]
      );

      if (duplicateCheck.rows.length > 0) {
        return sendError(res, 'Another user with this username or email already exists', 409);
      }
    }

    // Get role ID if role is being updated
    let roleId = null;
    if (role) {
      const roleResult = await query('SELECT id FROM roles WHERE name = $1', [role]);
      if (roleResult.rows.length === 0) {
        return sendError(res, `Role '${role}' not found`, 400);
      }
      roleId = roleResult.rows[0].id;
    }

    const updateResult = await query(`
      UPDATE users 
      SET 
        name = COALESCE($1, name),
        username = COALESCE($2, username),
        email = COALESCE($3, email),
        user_dob = COALESCE($4, user_dob),
        user_contact_num = COALESCE($5, user_contact_num),
        role_id = COALESCE($6, role_id),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $7
      RETURNING id, name, username, email, user_dob, user_contact_num, role_id, join_date, updated_at
    `, [name, username, email, user_dob, user_contact_num, roleId, id]);

    const user = updateResult.rows[0];

    // Get role name
    const roleResult = await query('SELECT name FROM roles WHERE id = $1', [user.role_id]);
    const roleName = roleResult.rows[0]?.name || null;

    sendSuccess(res, {
      id: user.id,
      name: user.name,
      username: user.username,
      email: user.email,
      userDob: user.user_dob,
      userContactNum: user.user_contact_num,
      joinDate: user.join_date,
      updatedAt: user.updated_at,
      role: roleName
    }, 'User updated successfully');

  } catch (error) {
    console.error('Error updating user:', error);
    sendError(res, 'Failed to update user', 500, error);
  }
};

// DELETE /api/admin/users/:id - Delete user
const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query('DELETE FROM users WHERE id = $1 RETURNING *', [id]);

    if (result.rows.length === 0) {
      return sendNotFound(res, 'User');
    }

    sendSuccess(res, { id: parseInt(id) }, 'User deleted successfully');

  } catch (error) {
    console.error('Error deleting user:', error);
    sendError(res, 'Failed to delete user', 500, error);
  }
};

// GET /api/admin/users/role/:role - Get users by role
const getUsersByRole = async (req, res) => {
  try {
    const { role } = req.params;
    const { page = 0, size = 10 } = req.query;

    const offset = page * size;

    const result = await query(`
      SELECT 
        u.id,
        u.name,
        u.username,
        u.email,
        u.user_dob,
        u.user_contact_num,
        u.join_date,
        u.last_login,
        u.role_id,
        r.name as role_name
      FROM users u
      LEFT JOIN roles r ON u.role_id = r.id
      WHERE r.name = $1
      ORDER BY u.join_date DESC
      LIMIT $2 OFFSET $3
    `, [role, size, offset]);

    // Get total count for pagination
    const countResult = await query(
      `SELECT COUNT(*) FROM users u
       LEFT JOIN roles r ON u.role_id = r.id
       WHERE r.name = $1`,
      [role]
    );
    const total = parseInt(countResult.rows[0].count);

    const users = result.rows.map(row => ({
      id: row.id,
      name: row.name,
      username: row.username,
      email: row.email,
      userDob: row.user_dob,
      userContactNum: row.user_contact_num,
      joinDate: row.join_date,
      lastLogin: row.last_login,
      role_id: row.role_id,
      role_name: row.role_name
    }));

    sendSuccess(res, {
      users,
      pagination: {
        page: parseInt(page),
        size: parseInt(size),
        total,
        totalPages: Math.ceil(total / parseInt(size))
      }
    }, `Users with role '${role}' retrieved successfully`);

  } catch (error) {
    console.error('Error fetching users by role:', error);
    sendError(res, 'Failed to fetch users by role', 500, error);
  }
};

// GET /api/admin/users/summary - Get user summary statistics
const getUserSummary = async (req, res) => {
  try {
    // Get summary statistics
    const summaryQuery = `
      SELECT 
        COUNT(*) as total_users,
        COUNT(DISTINCT u.role_id) as total_roles
      FROM users u
    `;

    const summaryResult = await query(summaryQuery);

    // Get role breakdown
    const roleBreakdown = await query(`
      SELECT 
        r.name as role,
        r.description,
        COUNT(u.id) as count
      FROM roles r
      LEFT JOIN users u ON r.id = u.role_id
      GROUP BY r.id, r.name, r.description
      ORDER BY count DESC
    `);

    // Get recent users
    const recentUsers = await query(`
      SELECT 
        u.id,
        u.name,
        u.username,
        u.email,
        u.join_date,
        r.name as role_name
      FROM users u
      LEFT JOIN roles r ON u.role_id = r.id
      ORDER BY u.join_date DESC
      LIMIT 5
    `);

    sendSuccess(res, {
      summary: summaryResult.rows[0],
      roleBreakdown: roleBreakdown.rows,
      recentUsers: recentUsers.rows
    }, 'User summary retrieved successfully');

  } catch (error) {
    console.error('Error fetching user summary:', error);
    sendError(res, 'Failed to fetch user summary', 500, error);
  }
};

// PUT /api/admin/users/:id/role - Update user role
const updateUserRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!role) {
      return sendValidationError(res, 'Role is required');
    }

    // Get role ID
    const roleResult = await query('SELECT id FROM roles WHERE name = $1', [role]);
    if (roleResult.rows.length === 0) {
      return sendError(res, `Role '${role}' not found`, 400);
    }

    const roleId = roleResult.rows[0].id;

    // Check if user exists
    const existingResult = await query('SELECT * FROM users WHERE id = $1', [id]);
    if (existingResult.rows.length === 0) {
      return sendNotFound(res, 'User');
    }

    // Update role
    const updateResult = await query(`
      UPDATE users 
      SET role_id = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING id, name, username, email, role_id
    `, [roleId, id]);

    const user = updateResult.rows[0];

    sendSuccess(res, {
      id: user.id,
      name: user.name,
      username: user.username,
      email: user.email,
      role: role
    }, `User role updated to '${role}' successfully`);

  } catch (error) {
    console.error('Error updating user role:', error);
    sendError(res, 'Failed to update user role', 500, error);
  }
};

// DELETE /api/admin/users - Bulk delete users
const bulkDeleteUsers = async (req, res) => {
  try {
    const { ids } = req.body;

    // Validate input
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return sendError(res, 'Please provide an array of IDs to delete', 400);
    }

    // Validate all IDs are numbers
    const invalidIds = ids.filter(id => isNaN(id));
    if (invalidIds.length > 0) {
      return sendError(res, `Invalid IDs: ${invalidIds.join(', ')}`, 400);
    }

    // Check which users exist
    const existingUsers = await query(
      `SELECT id FROM users WHERE id = ANY($1)`,
      [ids]
    );

    const existingIds = existingUsers.rows.map(row => row.id);
    const notFoundIds = ids.filter(id => !existingIds.includes(parseInt(id)));

    if (existingIds.length === 0) {
      return sendError(res, 'No users found with the provided IDs', 404);
    }

    // Delete the users
    const deleteQuery = `
      DELETE FROM users 
      WHERE id = ANY($1) 
      RETURNING id, name, username, email
    `;
    const result = await query(deleteQuery, [existingIds]);

    sendSuccess(res, {
      deletedCount: result.rows.length,
      deletedIds: result.rows.map(row => row.id),
      notFoundIds: notFoundIds,
      deletedUsers: result.rows
    }, `Successfully deleted ${result.rows.length} user(s)`);

  } catch (error) {
    console.error('Error bulk deleting users:', error);
    sendError(res, 'Failed to delete users', 500, error);
  }
};

// GET /api/admin/users/search/:query - Search users
const searchUsers = async (req, res) => {
  try {
    const { query: searchQuery } = req.params;
    const { page = 0, size = 10 } = req.query;

    const offset = page * size;

    if (!searchQuery || searchQuery.trim() === '') {
      return sendError(res, 'Search query is required', 400);
    }

    const result = await query(`
      SELECT 
        u.id,
        u.name,
        u.username,
        u.email,
        u.user_dob,
        u.user_contact_num,
        u.join_date,
        u.last_login,
        r.name as role_name
      FROM users u
      LEFT JOIN roles r ON u.role_id = r.id
      WHERE (
        u.username ILIKE $1 OR 
        u.email ILIKE $1 OR 
        u.name ILIKE $1 OR
        u.user_contact_num ILIKE $1
      )
      ORDER BY u.join_date DESC
      LIMIT $2 OFFSET $3
    `, [`%${searchQuery}%`, size, offset]);

    // Get total count for pagination
    const countResult = await query(`
      SELECT COUNT(*) FROM users u
      WHERE (
        u.username ILIKE $1 OR 
        u.email ILIKE $1 OR 
        u.name ILIKE $1 OR
        u.user_contact_num ILIKE $1
      )
    `, [`%${searchQuery}%`]);
    const total = parseInt(countResult.rows[0].count);

    const users = result.rows.map(row => ({
      id: row.id,
      name: row.name,
      username: row.username,
      email: row.email,
      userDob: row.user_dob,
      userContactNum: row.user_contact_num,
      joinDate: row.join_date,
      lastLogin: row.last_login,
      role_name: row.role_name
    }));

    sendSuccess(res, {
      users,
      searchQuery,
      pagination: {
        page: parseInt(page),
        size: parseInt(size),
        total,
        totalPages: Math.ceil(total / parseInt(size))
      }
    }, `Search results for '${searchQuery}'`);

  } catch (error) {
    console.error('Error searching users:', error);
    sendError(res, 'Failed to search users', 500, error);
  }
};

// PUT /api/admin/users/:id/password - Update user password (admin function)
const updateUserPassword = async (req, res) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;

    if (!newPassword) {
      return sendValidationError(res, 'New password is required');
    }

    if (newPassword.length < 6) {
      return sendValidationError(res, 'Password must be at least 6 characters long');
    }

    // Check if user exists
    const existingResult = await query('SELECT id FROM users WHERE id = $1', [id]);
    if (existingResult.rows.length === 0) {
      return sendNotFound(res, 'User');
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(newPassword, salt);

    // Update password
    await query(
      'UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [passwordHash, id]
    );

    sendSuccess(res, null, 'User password updated successfully');

  } catch (error) {
    console.error('Error updating user password:', error);
    sendError(res, 'Failed to update user password', 500, error);
  }
};

module.exports = {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  getUsersByRole,
  getUserSummary,
  updateUserRole,
  bulkDeleteUsers,
  searchUsers,
  updateUserPassword
};