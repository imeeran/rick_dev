const { query, pool } = require('../../shared/database/connection');
const { sendSuccess, sendError, sendNotFound, sendValidationError } = require('../../shared/utils/response');

/**
 * Roles Controller
 * Handles role and permission management
 */

// GET /api/admin/roles - Get all roles
const getAllRoles = async (req, res) => {
  try {
    const result = await query(`
      SELECT r.id, r.name, r.description, r.is_active, r.created_at, r.updated_at,
             COUNT(u.id) as user_count
      FROM roles r
      LEFT JOIN users u ON r.id = u.role_id
      GROUP BY r.id
      ORDER BY r.name ASC
    `);

    sendSuccess(res, result.rows, 'Roles retrieved successfully');

  } catch (error) {
    console.error('Error fetching roles:', error);
    sendError(res, 'Failed to fetch roles', 500, error);
  }
};

// GET /api/admin/roles/:id - Get role by ID with permissions
const getRoleById = async (req, res) => {
  try {
    const { id } = req.params;

    const roleResult = await query(
      'SELECT * FROM roles WHERE id = $1',
      [id]
    );

    if (roleResult.rows.length === 0) {
      return sendNotFound(res, 'Role');
    }

    // Get role permissions
    const permissionsResult = await query(
      `SELECT p.id, p.name, p.description, p.resource, p.action
       FROM permissions p
       JOIN role_permissions rp ON p.id = rp.permission_id
       WHERE rp.role_id = $1
       ORDER BY p.resource, p.action`,
      [id]
    );

    sendSuccess(res, {
      ...roleResult.rows[0],
      permissions: permissionsResult.rows
    }, 'Role retrieved successfully');

  } catch (error) {
    console.error('Error fetching role:', error);
    sendError(res, 'Failed to fetch role', 500, error);
  }
};

// POST /api/admin/roles - Create new role
const createRole = async (req, res) => {
  try {
    const { name, description, permissionIds } = req.body;

    // Validation
    if (!name) {
      return sendValidationError(res, 'Role name is required');
    }

    // Check if role already exists
    const existingRole = await query(
      'SELECT id FROM roles WHERE name = $1',
      [name]
    );

    if (existingRole.rows.length > 0) {
      return sendError(res, 'Role with this name already exists', 409);
    }

    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Create role
      const roleResult = await client.query(
        `INSERT INTO roles (name, description, is_active, created_at, updated_at)
         VALUES ($1, $2, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
         RETURNING *`,
        [name, description || null]
      );

      const role = roleResult.rows[0];

      // Assign permissions if provided
      if (permissionIds && Array.isArray(permissionIds) && permissionIds.length > 0) {
        const values = permissionIds.map((permId, index) => 
          `(${role.id}, $${index + 1})`
        ).join(', ');

        await client.query(
          `INSERT INTO role_permissions (role_id, permission_id) VALUES ${values}`,
          permissionIds
        );
      }

      await client.query('COMMIT');

      sendSuccess(res, role, 'Role created successfully', 201);

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Error creating role:', error);
    sendError(res, 'Failed to create role', 500, error);
  }
};

// PUT /api/admin/roles/:id - Update role
const updateRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, isActive, permissionIds } = req.body;

    // Check if role exists
    const existingRole = await query(
      'SELECT * FROM roles WHERE id = $1',
      [id]
    );

    if (existingRole.rows.length === 0) {
      return sendNotFound(res, 'Role');
    }

    // Prevent modifying superadmin role
    if (existingRole.rows[0].name === 'superadmin') {
      return sendError(res, 'Cannot modify superadmin role', 403);
    }

    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Update role
      const updateResult = await client.query(
        `UPDATE roles 
         SET name = COALESCE($1, name),
             description = COALESCE($2, description),
             is_active = COALESCE($3, is_active),
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $4
         RETURNING *`,
        [name, description, isActive, id]
      );

      // Update permissions if provided
      if (permissionIds && Array.isArray(permissionIds)) {
        // Delete existing permissions
        await client.query(
          'DELETE FROM role_permissions WHERE role_id = $1',
          [id]
        );

        // Insert new permissions
        if (permissionIds.length > 0) {
          const values = permissionIds.map((permId, index) => 
            `(${id}, $${index + 1})`
          ).join(', ');

          await client.query(
            `INSERT INTO role_permissions (role_id, permission_id) VALUES ${values}`,
            permissionIds
          );
        }
      }

      await client.query('COMMIT');

      sendSuccess(res, updateResult.rows[0], 'Role updated successfully');

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Error updating role:', error);
    sendError(res, 'Failed to update role', 500, error);
  }
};

// DELETE /api/admin/roles/:id - Delete role
const deleteRole = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if role exists
    const roleResult = await query(
      'SELECT name FROM roles WHERE id = $1',
      [id]
    );

    if (roleResult.rows.length === 0) {
      return sendNotFound(res, 'Role');
    }

    // Prevent deleting default roles
    const protectedRoles = ['superadmin', 'admin', 'manager', 'employee', 'driver'];
    if (protectedRoles.includes(roleResult.rows[0].name)) {
      return sendError(res, 'Cannot delete default system roles', 403);
    }

    // Check if role is assigned to users
    const usersCount = await query(
      'SELECT COUNT(*) FROM users WHERE role_id = $1',
      [id]
    );

    if (parseInt(usersCount.rows[0].count) > 0) {
      return sendError(res, 'Cannot delete role that is assigned to users', 409);
    }

    // Delete role (permissions will be deleted automatically due to CASCADE)
    await query('DELETE FROM roles WHERE id = $1', [id]);

    sendSuccess(res, { id: parseInt(id) }, 'Role deleted successfully');

  } catch (error) {
    console.error('Error deleting role:', error);
    sendError(res, 'Failed to delete role', 500, error);
  }
};

// GET /api/admin/permissions - Get all permissions
const getAllPermissions = async (req, res) => {
  try {
    const result = await query(`
      SELECT * FROM permissions
      ORDER BY resource, action
    `);

    // Group permissions by resource
    const groupedPermissions = result.rows.reduce((acc, permission) => {
      if (!acc[permission.resource]) {
        acc[permission.resource] = [];
      }
      acc[permission.resource].push(permission);
      return acc;
    }, {});

    sendSuccess(res, {
      permissions: result.rows,
      groupedByResource: groupedPermissions
    }, 'Permissions retrieved successfully');

  } catch (error) {
    console.error('Error fetching permissions:', error);
    sendError(res, 'Failed to fetch permissions', 500, error);
  }
};

// POST /api/admin/roles/:id/permissions - Assign permissions to role
const assignPermissionsToRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { permissionIds } = req.body;

    // Validation
    if (!permissionIds || !Array.isArray(permissionIds) || permissionIds.length === 0) {
      return sendValidationError(res, 'Permission IDs array is required');
    }

    // Check if role exists
    const roleResult = await query(
      'SELECT name FROM roles WHERE id = $1',
      [id]
    );

    if (roleResult.rows.length === 0) {
      return sendNotFound(res, 'Role');
    }

    // Prevent modifying superadmin permissions
    if (roleResult.rows[0].name === 'superadmin') {
      return sendError(res, 'Cannot modify superadmin permissions', 403);
    }

    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Delete existing permissions
      await client.query(
        'DELETE FROM role_permissions WHERE role_id = $1',
        [id]
      );

      // Insert new permissions
      const values = permissionIds.map((permId, index) => 
        `(${id}, $${index + 1})`
      ).join(', ');

      await client.query(
        `INSERT INTO role_permissions (role_id, permission_id) VALUES ${values}`,
        permissionIds
      );

      await client.query('COMMIT');

      // Get updated permissions
      const permissionsResult = await query(
        `SELECT p.* FROM permissions p
         JOIN role_permissions rp ON p.id = rp.permission_id
         WHERE rp.role_id = $1`,
        [id]
      );

      sendSuccess(res, {
        roleId: parseInt(id),
        permissions: permissionsResult.rows
      }, 'Permissions assigned successfully');

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Error assigning permissions:', error);
    sendError(res, 'Failed to assign permissions', 500, error);
  }
};

// GET /api/admin/roles/:id/users - Get users with specific role
const getUsersByRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { page = 0, size = 10 } = req.query;

    const offset = page * size;

    const result = await query(`
      SELECT u.id, u.username, u.email, u.is_active, u.last_login, u.created_at
      FROM users u
      WHERE u.role_id = $1
      ORDER BY u.created_at DESC
      LIMIT $2 OFFSET $3
    `, [id, size, offset]);

    // Get total count
    const countResult = await query(
      'SELECT COUNT(*) FROM users WHERE role_id = $1',
      [id]
    );
    const total = parseInt(countResult.rows[0].count);

    sendSuccess(res, {
      users: result.rows,
      pagination: {
        page: parseInt(page),
        size: parseInt(size),
        total,
        totalPages: Math.ceil(total / parseInt(size))
      }
    }, 'Users retrieved successfully');

  } catch (error) {
    console.error('Error fetching users by role:', error);
    sendError(res, 'Failed to fetch users', 500, error);
  }
};

module.exports = {
  getAllRoles,
  getRoleById,
  createRole,
  updateRole,
  deleteRole,
  getAllPermissions,
  assignPermissionsToRole,
  getUsersByRole
};
