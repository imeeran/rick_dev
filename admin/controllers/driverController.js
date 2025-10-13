const { query, pool } = require('../../shared/database/connection');
const { sendSuccess, sendError, sendNotFound, sendValidationError } = require('../../shared/utils/response');

/**
 * Driver Controller
 * Handles driver-related operations for the admin panel
 */

// GET /api/admin/drivers - Get all drivers with pagination and filtering
const getAllDrivers = async (req, res) => {
  try {
    const { 
      page = 0, 
      size = 10, 
      sort = 'id', 
      order = 'desc',
      search = '',
      status = '',
      category = ''
    } = req.query;

    const offset = page * size;

    // Build dynamic query
    let whereClause = 'WHERE 1=1';
    const params = [];
    let paramCount = 1;

    // Search functionality
    if (search) {
      whereClause += ` AND (
        rick ILIKE $${paramCount} OR 
        name ILIKE $${paramCount} OR 
        mobile ILIKE $${paramCount} OR
        eid_no ILIKE $${paramCount} OR
        passport_no ILIKE $${paramCount}
      )`;
      params.push(`%${search}%`);
      paramCount++;
    }

    // Status filtering
    if (status) {
      whereClause += ` AND status = $${paramCount}`;
      params.push(status);
      paramCount++;
    }

    // Category filtering
    if (category) {
      whereClause += ` AND category ILIKE $${paramCount}`;
      params.push(`%${category}%`);
      paramCount++;
    }

    // Get total count
    const countQuery = `SELECT COUNT(*) FROM drivers ${whereClause}`;
    const countResult = await query(countQuery, params);
    const total = parseInt(countResult.rows[0].count);

    // Get drivers with pagination
    const driversQuery = `
      SELECT 
        id,
        rick,
        category,
        name,
        mobile,
        eid_no,
        visa_expiry,
        passport_no,
        passport_expiry,
        daman_expiry,
        driving_licence_no,
        driving_licence_expiry,
        trafic_code,
        trans_no,
        limo_permit_expiry,
        status,
        created_at,
        updated_at
      FROM drivers
      ${whereClause}
      ORDER BY ${sort} ${order.toUpperCase()}
      LIMIT $${paramCount} OFFSET $${paramCount + 1}
    `;

    params.push(size, offset);
    const driversResult = await query(driversQuery, params);

    sendSuccess(res, {
      drivers: driversResult.rows,
      pagination: {
        page: parseInt(page),
        size: parseInt(size),
        total,
        totalPages: Math.ceil(total / parseInt(size)),
        startIndex: offset,
        endIndex: Math.min(offset + parseInt(size) - 1, total - 1)
      }
    }, 'Drivers retrieved successfully');

  } catch (error) {
    console.error('Error fetching drivers:', error);
    sendError(res, 'Failed to fetch drivers', 500, error);
  }
};

// GET /api/admin/drivers/:id - Get specific driver by ID
const getDriverById = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query('SELECT * FROM drivers WHERE id = $1', [id]);

    if (result.rows.length === 0) {
      return sendNotFound(res, 'Driver');
    }

    sendSuccess(res, result.rows[0], 'Driver retrieved successfully');

  } catch (error) {
    console.error('Error fetching driver:', error);
    sendError(res, 'Failed to fetch driver', 500, error);
  }
};

// GET /api/admin/drivers/rick/:rick - Get driver by RICK
const getDriverByRick = async (req, res) => {
  try {
    const { rick } = req.params;

    const result = await query('SELECT * FROM drivers WHERE rick = $1', [rick]);

    if (result.rows.length === 0) {
      return sendNotFound(res, 'Driver');
    }

    sendSuccess(res, result.rows[0], 'Driver retrieved successfully');

  } catch (error) {
    console.error('Error fetching driver by rick:', error);
    sendError(res, 'Failed to fetch driver', 500, error);
  }
};

// POST /api/admin/drivers - Create new driver
const createDriver = async (req, res) => {
  try {
    const {
      rick,
      category,
      name,
      mobile,
      eid_no,
      visa_expiry,
      passport_no,
      passport_expiry,
      daman_expiry,
      driving_licence_no,
      driving_licence_expiry,
      trafic_code,
      trans_no,
      limo_permit_expiry,
      status
    } = req.body;

    // Basic validation
    if (!rick || !name) {
      return sendValidationError(res, 'Missing required fields: rick, name');
    }

    // Check if driver with same rick already exists
    const existingDriver = await query(
      'SELECT id FROM drivers WHERE rick = $1',
      [rick]
    );

    if (existingDriver.rows.length > 0) {
      return sendError(res, 'Driver with this RICK already exists', 409);
    }

    const insertResult = await query(`
      INSERT INTO drivers (
        rick,
        category,
        name,
        mobile,
        eid_no,
        visa_expiry,
        passport_no,
        passport_expiry,
        daman_expiry,
        driving_licence_no,
        driving_licence_expiry,
        trafic_code,
        trans_no,
        limo_permit_expiry,
        status,
        created_at,
        updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING *
    `, [
      rick,
      category || null,
      name,
      mobile || null,
      eid_no || null,
      visa_expiry || null,
      passport_no || null,
      passport_expiry || null,
      daman_expiry || null,
      driving_licence_no || null,
      driving_licence_expiry || null,
      trafic_code || null,
      trans_no || null,
      limo_permit_expiry || null,
      status || 'active'
    ]);

    sendSuccess(res, insertResult.rows[0], 'Driver created successfully', 201);

  } catch (error) {
    console.error('Error creating driver:', error);
    sendError(res, 'Failed to create driver', 500, error);
  }
};

// PUT /api/admin/drivers/:id - Update existing driver
const updateDriver = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      rick,
      category,
      name,
      mobile,
      eid_no,
      visa_expiry,
      passport_no,
      passport_expiry,
      daman_expiry,
      driving_licence_no,
      driving_licence_expiry,
      trafic_code,
      trans_no,
      limo_permit_expiry,
      status
    } = req.body;

    // Check if driver exists
    const existingResult = await query('SELECT * FROM drivers WHERE id = $1', [id]);
    if (existingResult.rows.length === 0) {
      return sendNotFound(res, 'Driver');
    }

    // Check if rick is being changed to one that already exists
    if (rick) {
      const duplicateCheck = await query(
        'SELECT id FROM drivers WHERE rick = $1 AND id != $2',
        [rick, id]
      );

      if (duplicateCheck.rows.length > 0) {
        return sendError(res, 'Another driver with this RICK already exists', 409);
      }
    }

    const updateResult = await query(`
      UPDATE drivers 
      SET 
        rick = COALESCE($1, rick),
        category = COALESCE($2, category),
        name = COALESCE($3, name),
        mobile = COALESCE($4, mobile),
        eid_no = COALESCE($5, eid_no),
        visa_expiry = COALESCE($6, visa_expiry),
        passport_no = COALESCE($7, passport_no),
        passport_expiry = COALESCE($8, passport_expiry),
        daman_expiry = COALESCE($9, daman_expiry),
        driving_licence_no = COALESCE($10, driving_licence_no),
        driving_licence_expiry = COALESCE($11, driving_licence_expiry),
        trafic_code = COALESCE($12, trafic_code),
        trans_no = COALESCE($13, trans_no),
        limo_permit_expiry = COALESCE($14, limo_permit_expiry),
        status = COALESCE($15, status),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $16
      RETURNING *
    `, [
      rick,
      category,
      name,
      mobile,
      eid_no,
      visa_expiry,
      passport_no,
      passport_expiry,
      daman_expiry,
      driving_licence_no,
      driving_licence_expiry,
      trafic_code,
      trans_no,
      limo_permit_expiry,
      status,
      id
    ]);

    sendSuccess(res, updateResult.rows[0], 'Driver updated successfully');

  } catch (error) {
    console.error('Error updating driver:', error);
    sendError(res, 'Failed to update driver', 500, error);
  }
};

// DELETE /api/admin/drivers/:id - Delete driver
const deleteDriver = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query('DELETE FROM drivers WHERE id = $1 RETURNING *', [id]);

    if (result.rows.length === 0) {
      return sendNotFound(res, 'Driver');
    }

    sendSuccess(res, { id: parseInt(id) }, 'Driver deleted successfully');

  } catch (error) {
    console.error('Error deleting driver:', error);
    sendError(res, 'Failed to delete driver', 500, error);
  }
};

// GET /api/admin/drivers/status/:status - Get drivers by status
const getDriversByStatus = async (req, res) => {
  try {
    const { status } = req.params;
    const { page = 0, size = 10 } = req.query;

    const offset = page * size;

    const result = await query(`
      SELECT * FROM drivers 
      WHERE status = $1
      ORDER BY created_at DESC
      LIMIT $2 OFFSET $3
    `, [status, size, offset]);

    // Get total count for pagination
    const countResult = await query(
      'SELECT COUNT(*) FROM drivers WHERE status = $1',
      [status]
    );
    const total = parseInt(countResult.rows[0].count);

    sendSuccess(res, {
      drivers: result.rows,
      pagination: {
        page: parseInt(page),
        size: parseInt(size),
        total,
        totalPages: Math.ceil(total / parseInt(size))
      }
    }, `Drivers with status '${status}' retrieved successfully`);

  } catch (error) {
    console.error('Error fetching drivers by status:', error);
    sendError(res, 'Failed to fetch drivers by status', 500, error);
  }
};

// GET /api/admin/drivers/summary - Get driver summary statistics
const getDriverSummary = async (req, res) => {
  try {
    // Get summary statistics
    const summaryQuery = `
      SELECT 
        COUNT(*) as total_drivers,
        COUNT(CASE WHEN status = 'active' THEN 1 END) as active_drivers,
        COUNT(CASE WHEN status = 'inactive' THEN 1 END) as inactive_drivers,
        COUNT(CASE WHEN status = 'suspended' THEN 1 END) as suspended_drivers,
        COUNT(CASE WHEN status = 'on_leave' THEN 1 END) as on_leave_drivers
      FROM drivers
    `;

    const summaryResult = await query(summaryQuery);

    // Get category breakdown
    const categoryBreakdown = await query(`
      SELECT 
        category,
        COUNT(*) as count
      FROM drivers
      WHERE category IS NOT NULL
      GROUP BY category
      ORDER BY count DESC
    `);

    // Get expiring documents count
    const expiringDocsQuery = `
      SELECT 
        COUNT(CASE WHEN visa_expiry <= CURRENT_DATE + INTERVAL '30 days' AND visa_expiry >= CURRENT_DATE THEN 1 END) as expiring_visa,
        COUNT(CASE WHEN passport_expiry <= CURRENT_DATE + INTERVAL '30 days' AND passport_expiry >= CURRENT_DATE THEN 1 END) as expiring_passport,
        COUNT(CASE WHEN daman_expiry <= CURRENT_DATE + INTERVAL '30 days' AND daman_expiry >= CURRENT_DATE THEN 1 END) as expiring_daman,
        COUNT(CASE WHEN driving_licence_expiry <= CURRENT_DATE + INTERVAL '30 days' AND driving_licence_expiry >= CURRENT_DATE THEN 1 END) as expiring_licence,
        COUNT(CASE WHEN limo_permit_expiry <= CURRENT_DATE + INTERVAL '30 days' AND limo_permit_expiry >= CURRENT_DATE THEN 1 END) as expiring_permit
      FROM drivers
    `;

    const expiringDocsResult = await query(expiringDocsQuery);

    sendSuccess(res, {
      summary: summaryResult.rows[0],
      categoryBreakdown: categoryBreakdown.rows,
      expiringDocuments: expiringDocsResult.rows[0]
    }, 'Driver summary retrieved successfully');

  } catch (error) {
    console.error('Error fetching driver summary:', error);
    sendError(res, 'Failed to fetch driver summary', 500, error);
  }
};

// PUT /api/admin/drivers/:id/status - Update driver status
const updateDriverStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      return sendValidationError(res, 'Status is required');
    }

    const validStatuses = ['active', 'inactive', 'suspended', 'on_leave'];
    if (!validStatuses.includes(status)) {
      return sendValidationError(res, `Invalid status. Must be one of: ${validStatuses.join(', ')}`);
    }

    // Check if driver exists
    const existingResult = await query('SELECT * FROM drivers WHERE id = $1', [id]);
    if (existingResult.rows.length === 0) {
      return sendNotFound(res, 'Driver');
    }

    // Update status
    const updateResult = await query(`
      UPDATE drivers 
      SET status = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *
    `, [status, id]);

    sendSuccess(res, updateResult.rows[0], `Driver status updated to '${status}' successfully`);

  } catch (error) {
    console.error('Error updating driver status:', error);
    sendError(res, 'Failed to update driver status', 500, error);
  }
};

// DELETE /api/admin/drivers - Bulk delete drivers
const bulkDeleteDrivers = async (req, res) => {
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

    // Check which drivers exist
    const existingDrivers = await query(
      `SELECT id FROM drivers WHERE id = ANY($1)`,
      [ids]
    );

    const existingIds = existingDrivers.rows.map(row => row.id);
    const notFoundIds = ids.filter(id => !existingIds.includes(parseInt(id)));

    if (existingIds.length === 0) {
      return sendError(res, 'No drivers found with the provided IDs', 404);
    }

    // Delete the drivers
    const deleteQuery = `
      DELETE FROM drivers 
      WHERE id = ANY($1) 
      RETURNING id, rick, name
    `;
    const result = await query(deleteQuery, [existingIds]);

    sendSuccess(res, {
      deletedCount: result.rows.length,
      deletedIds: result.rows.map(row => row.id),
      notFoundIds: notFoundIds,
      deletedDrivers: result.rows
    }, `Successfully deleted ${result.rows.length} driver(s)`);

  } catch (error) {
    console.error('Error bulk deleting drivers:', error);
    sendError(res, 'Failed to delete drivers', 500, error);
  }
};

// GET /api/admin/drivers/expiring - Get drivers with expiring documents
const getExpiringDrivers = async (req, res) => {
  try {
    const { days = 30, type = 'all' } = req.query;

    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + parseInt(days));
    const futureDateStr = futureDate.toISOString().split('T')[0];

    let whereConditions = [];

    if (type === 'visa' || type === 'all') {
      whereConditions.push(`(visa_expiry <= '${futureDateStr}' AND visa_expiry >= CURRENT_DATE)`);
    }
    if (type === 'passport' || type === 'all') {
      whereConditions.push(`(passport_expiry <= '${futureDateStr}' AND passport_expiry >= CURRENT_DATE)`);
    }
    if (type === 'daman' || type === 'all') {
      whereConditions.push(`(daman_expiry <= '${futureDateStr}' AND daman_expiry >= CURRENT_DATE)`);
    }
    if (type === 'licence' || type === 'all') {
      whereConditions.push(`(driving_licence_expiry <= '${futureDateStr}' AND driving_licence_expiry >= CURRENT_DATE)`);
    }
    if (type === 'permit' || type === 'all') {
      whereConditions.push(`(limo_permit_expiry <= '${futureDateStr}' AND limo_permit_expiry >= CURRENT_DATE)`);
    }

    const whereClause = whereConditions.length > 0 ? 'WHERE ' + whereConditions.join(' OR ') : '';

    const result = await query(`
      SELECT * FROM drivers 
      ${whereClause}
      ORDER BY 
        CASE 
          WHEN visa_expiry <= CURRENT_DATE THEN visa_expiry
          WHEN passport_expiry <= CURRENT_DATE THEN passport_expiry
          WHEN daman_expiry <= CURRENT_DATE THEN daman_expiry
          WHEN driving_licence_expiry <= CURRENT_DATE THEN driving_licence_expiry
          WHEN limo_permit_expiry <= CURRENT_DATE THEN limo_permit_expiry
          ELSE LEAST(
            COALESCE(visa_expiry, '9999-12-31'::date),
            COALESCE(passport_expiry, '9999-12-31'::date),
            COALESCE(daman_expiry, '9999-12-31'::date),
            COALESCE(driving_licence_expiry, '9999-12-31'::date),
            COALESCE(limo_permit_expiry, '9999-12-31'::date)
          )
        END ASC
    `);

    sendSuccess(res, {
      drivers: result.rows,
      count: result.rows.length,
      days: parseInt(days),
      type: type
    }, `Found ${result.rows.length} driver(s) with expiring documents`);

  } catch (error) {
    console.error('Error fetching expiring drivers:', error);
    sendError(res, 'Failed to fetch expiring drivers', 500, error);
  }
};

module.exports = {
  getAllDrivers,
  getDriverById,
  getDriverByRick,
  createDriver,
  updateDriver,
  deleteDriver,
  getDriversByStatus,
  getDriverSummary,
  updateDriverStatus,
  bulkDeleteDrivers,
  getExpiringDrivers
};