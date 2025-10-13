const { query, pool } = require('../../shared/database/connection');
const { sendSuccess, sendError, sendNotFound, sendValidationError } = require('../../shared/utils/response');

/**
 * Vehicles Controller
 * Handles vehicle-related operations for the admin panel
 */

// GET /api/admin/vehicles - Get all vehicles with pagination and filtering
const getAllVehicles = async (req, res) => {
  try {
    const { 
      page = 0, 
      size = 10, 
      sort = 'created_at', 
      order = 'desc',
      search = '',
      rick = '',
      vehicle_type = ''
    } = req.query;

    const offset = page * size;

    // Validate sort column
    const validSortColumns = ['id', 'rick_no', 'plate_code', 'plate_no', 'mulkiya_expiry', 
                              'vehicle_insurance_expiry', 'vehicle_type', 'model', 'status', 
                              'created_at', 'updated_at'];
    const sortColumn = validSortColumns.includes(sort) ? sort : 'created_at';

    // Build dynamic query
    let whereClause = 'WHERE 1=1';
    const params = [];
    let paramCount = 1;

    // Search functionality
    if (search) {
      whereClause += ` AND (
        rick_no ILIKE $${paramCount} OR 
        plate_code ILIKE $${paramCount} OR 
        plate_no ILIKE $${paramCount} OR
        chassis_no ILIKE $${paramCount} OR
        engine_no ILIKE $${paramCount} OR
        vehicle_type ILIKE $${paramCount} OR
        model ILIKE $${paramCount}
      )`;
      params.push(`%${search}%`);
      paramCount++;
    }

    // Rick filtering
    if (rick) {
      whereClause += ` AND rick_no = $${paramCount}`;
      params.push(rick);
      paramCount++;
    }

    // Vehicle type filtering
    if (vehicle_type) {
      whereClause += ` AND vehicle_type ILIKE $${paramCount}`;
      params.push(`%${vehicle_type}%`);
      paramCount++;
    }

    // Get total count
    const countQuery = `SELECT COUNT(*) FROM vehicles ${whereClause}`;
    const countResult = await query(countQuery, params);
    const total = parseInt(countResult.rows[0].count);

    // Get vehicles with pagination
    const vehiclesQuery = `
      SELECT 
        id,
        rick_no,
        plate_code,
        plate_no,
        mulkiya_expiry,
        vehicle_insurance_expiry,
        chassis_no,
        engine_no,
        vehicle_type,
        model,
        status,
        created_at,
        updated_at
      FROM vehicles
      ${whereClause}
      ORDER BY ${sortColumn} ${order.toUpperCase()}
      LIMIT $${paramCount} OFFSET $${paramCount + 1}
    `;

    params.push(size, offset);
    const vehiclesResult = await query(vehiclesQuery, params);

    sendSuccess(res, {
      vehicles: vehiclesResult.rows,
      pagination: {
        page: parseInt(page),
        size: parseInt(size),
        total,
        totalPages: Math.ceil(total / parseInt(size)),
        startIndex: offset,
        endIndex: Math.min(offset + parseInt(size) - 1, total - 1)
      }
    }, 'Vehicles retrieved successfully');

  } catch (error) {
    console.error('Error fetching vehicles:', error);
    sendError(res, 'Failed to fetch vehicles', 500, error);
  }
};

// GET /api/admin/vehicles/:id - Get specific vehicle by ID
const getVehicleById = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query('SELECT * FROM vehicles WHERE id = $1', [id]);

    if (result.rows.length === 0) {
      return sendNotFound(res, 'Vehicle');
    }

    sendSuccess(res, result.rows[0], 'Vehicle retrieved successfully');

  } catch (error) {
    console.error('Error fetching vehicle:', error);
    sendError(res, 'Failed to fetch vehicle', 500, error);
  }
};

// GET /api/admin/vehicles/rick/:rick_no - Get vehicles by RICK NO
const getVehiclesByRick = async (req, res) => {
  try {
    const { rick_no } = req.params;
    const { page = 0, size = 10 } = req.query;

    const offset = page * size;

    const result = await query(`
      SELECT * FROM vehicles 
      WHERE rick_no = $1
      ORDER BY created_at DESC
      LIMIT $2 OFFSET $3
    `, [rick_no, size, offset]);

    // Get total count for pagination
    const countResult = await query(
      'SELECT COUNT(*) FROM vehicles WHERE rick_no = $1',
      [rick_no]
    );
    const total = parseInt(countResult.rows[0].count);

    sendSuccess(res, {
      vehicles: result.rows,
      pagination: {
        page: parseInt(page),
        size: parseInt(size),
        total,
        totalPages: Math.ceil(total / parseInt(size))
      }
    }, `Vehicles for RICK ${rick_no} retrieved successfully`);

  } catch (error) {
    console.error('Error fetching vehicles by rick:', error);
    sendError(res, 'Failed to fetch vehicles by rick', 500, error);
  }
};

// POST /api/admin/vehicles - Create new vehicle
const createVehicle = async (req, res) => {
  try {
    const {
      rick_no,
      plate_code,
      plate_no,
      mulkiya_expiry,
      vehicle_insurance_expiry,
      chassis_no,
      engine_no,
      vehicle_type,
      model,
      status
    } = req.body;

    // Basic validation
    if (!rick_no || !plate_code || !plate_no) {
      return sendValidationError(res, 'Missing required fields: rick_no, plate_code, plate_no');
    }

    // Check if vehicle with same plate already exists
    const existingVehicle = await query(
      'SELECT id FROM vehicles WHERE plate_code = $1 AND plate_no = $2',
      [plate_code, plate_no]
    );

    if (existingVehicle.rows.length > 0) {
      return sendError(res, 'Vehicle with this plate code and number already exists', 409);
    }

    const insertResult = await query(`
      INSERT INTO vehicles (
        rick_no,
        plate_code,
        plate_no,
        mulkiya_expiry,
        vehicle_insurance_expiry,
        chassis_no,
        engine_no,
        vehicle_type,
        model,
        status,
        created_at,
        updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING *
    `, [
      rick_no,
      plate_code,
      plate_no,
      mulkiya_expiry || null,
      vehicle_insurance_expiry || null,
      chassis_no || null,
      engine_no || null,
      vehicle_type || null,
      model || null,
      status || 'available'
    ]);

    sendSuccess(res, insertResult.rows[0], 'Vehicle created successfully', 201);

  } catch (error) {
    console.error('Error creating vehicle:', error);
    sendError(res, 'Failed to create vehicle', 500, error);
  }
};

// PUT /api/admin/vehicles/:id - Update existing vehicle
const updateVehicle = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      rick_no,
      plate_code,
      plate_no,
      mulkiya_expiry,
      vehicle_insurance_expiry,
      chassis_no,
      engine_no,
      vehicle_type,
      model,
      status
    } = req.body;

    // Check if vehicle exists
    const existingResult = await query('SELECT * FROM vehicles WHERE id = $1', [id]);
    if (existingResult.rows.length === 0) {
      return sendNotFound(res, 'Vehicle');
    }

    // Check if plate is being changed to one that already exists
    if (plate_code && plate_no) {
      const duplicateCheck = await query(
        'SELECT id FROM vehicles WHERE plate_code = $1 AND plate_no = $2 AND id != $3',
        [plate_code, plate_no, id]
      );

      if (duplicateCheck.rows.length > 0) {
        return sendError(res, 'Another vehicle with this plate code and number already exists', 409);
      }
    }

    const updateResult = await query(`
      UPDATE vehicles 
      SET 
        rick_no = COALESCE($1, rick_no),
        plate_code = COALESCE($2, plate_code),
        plate_no = COALESCE($3, plate_no),
        mulkiya_expiry = COALESCE($4, mulkiya_expiry),
        vehicle_insurance_expiry = COALESCE($5, vehicle_insurance_expiry),
        chassis_no = COALESCE($6, chassis_no),
        engine_no = COALESCE($7, engine_no),
        vehicle_type = COALESCE($8, vehicle_type),
        model = COALESCE($9, model),
        status = COALESCE($10, status),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $11
      RETURNING *
    `, [
      rick_no,
      plate_code,
      plate_no,
      mulkiya_expiry,
      vehicle_insurance_expiry,
      chassis_no,
      engine_no,
      vehicle_type,
      model,
      status,
      id
    ]);

    sendSuccess(res, updateResult.rows[0], 'Vehicle updated successfully');

  } catch (error) {
    console.error('Error updating vehicle:', error);
    sendError(res, 'Failed to update vehicle', 500, error);
  }
};

// DELETE /api/admin/vehicles/:id - Delete vehicle
const deleteVehicle = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query('DELETE FROM vehicles WHERE id = $1 RETURNING *', [id]);

    if (result.rows.length === 0) {
      return sendNotFound(res, 'Vehicle');
    }

    sendSuccess(res, { id: parseInt(id) }, 'Vehicle deleted successfully');

  } catch (error) {
    console.error('Error deleting vehicle:', error);
    sendError(res, 'Failed to delete vehicle', 500, error);
  }
};

// DELETE /api/admin/vehicles - Bulk delete vehicles
const bulkDeleteVehicles = async (req, res) => {
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

    // Check which vehicles exist
    const existingVehicles = await query(
      `SELECT id FROM vehicles WHERE id = ANY($1)`,
      [ids]
    );

    const existingIds = existingVehicles.rows.map(row => row.id);
    const notFoundIds = ids.filter(id => !existingIds.includes(parseInt(id)));

    if (existingIds.length === 0) {
      return sendError(res, 'No vehicles found with the provided IDs', 404);
    }

    // Delete the vehicles
    const deleteQuery = `
      DELETE FROM vehicles 
      WHERE id = ANY($1) 
      RETURNING id, rick_no, plate_code, plate_no
    `;
    const result = await query(deleteQuery, [existingIds]);

    sendSuccess(res, {
      deletedCount: result.rows.length,
      deletedIds: result.rows.map(row => row.id),
      notFoundIds: notFoundIds,
      deletedVehicles: result.rows
    }, `Successfully deleted ${result.rows.length} vehicle(s)`);

  } catch (error) {
    console.error('Error bulk deleting vehicles:', error);
    sendError(res, 'Failed to delete vehicles', 500, error);
  }
};

// GET /api/admin/vehicles/expiring - Get vehicles with expiring documents
const getExpiringVehicles = async (req, res) => {
  try {
    const { days = 30, type = 'all' } = req.query;

    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + parseInt(days));
    const futureDateStr = futureDate.toISOString().split('T')[0];

    let whereClause = 'WHERE ';
    const conditions = [];

    if (type === 'mulkiya' || type === 'all') {
      conditions.push(`mulkiya_expiry <= '${futureDateStr}' AND mulkiya_expiry >= CURRENT_DATE`);
    }

    if (type === 'insurance' || type === 'all') {
      conditions.push(`vehicle_insurance_expiry <= '${futureDateStr}' AND vehicle_insurance_expiry >= CURRENT_DATE`);
    }

    whereClause += conditions.join(' OR ');

    const result = await query(`
      SELECT * FROM vehicles 
      ${whereClause}
      ORDER BY 
        CASE 
          WHEN mulkiya_expiry <= CURRENT_DATE THEN mulkiya_expiry
          WHEN vehicle_insurance_expiry <= CURRENT_DATE THEN vehicle_insurance_expiry
          ELSE LEAST(mulkiya_expiry, vehicle_insurance_expiry)
        END ASC
    `);

    sendSuccess(res, {
      vehicles: result.rows,
      count: result.rows.length,
      days: parseInt(days),
      type: type
    }, `Found ${result.rows.length} vehicle(s) with expiring documents`);

  } catch (error) {
    console.error('Error fetching expiring vehicles:', error);
    sendError(res, 'Failed to fetch expiring vehicles', 500, error);
  }
};

// GET /api/admin/vehicles/summary - Get vehicle summary statistics
const getVehicleSummary = async (req, res) => {
  try {
    // Get summary statistics
    const summaryQuery = `
      SELECT 
        COUNT(*) as total_vehicles,
        COUNT(DISTINCT rick_no) as unique_ricks,
        COUNT(DISTINCT vehicle_type) as vehicle_types_count
      FROM vehicles
    `;

    const summaryResult = await query(summaryQuery);

    // Get vehicle type breakdown
    const typeBreakdown = await query(`
      SELECT 
        vehicle_type,
        COUNT(*) as count
      FROM vehicles
      WHERE vehicle_type IS NOT NULL
      GROUP BY vehicle_type
      ORDER BY count DESC
    `);

    // Get expiring documents count
    const expiringQuery = `
      SELECT 
        COUNT(CASE WHEN mulkiya_expiry <= CURRENT_DATE + INTERVAL '30 days' AND mulkiya_expiry >= CURRENT_DATE THEN 1 END) as expiring_mulkiya,
        COUNT(CASE WHEN vehicle_insurance_expiry <= CURRENT_DATE + INTERVAL '30 days' AND vehicle_insurance_expiry >= CURRENT_DATE THEN 1 END) as expiring_insurance,
        COUNT(CASE WHEN mulkiya_expiry < CURRENT_DATE THEN 1 END) as expired_mulkiya,
        COUNT(CASE WHEN vehicle_insurance_expiry < CURRENT_DATE THEN 1 END) as expired_insurance
      FROM vehicles
    `;

    const expiringResult = await query(expiringQuery);

    sendSuccess(res, {
      summary: summaryResult.rows[0],
      typeBreakdown: typeBreakdown.rows,
      expiringDocuments: expiringResult.rows[0]
    }, 'Vehicle summary retrieved successfully');

  } catch (error) {
    console.error('Error fetching vehicle summary:', error);
    sendError(res, 'Failed to fetch vehicle summary', 500, error);
  }
};

module.exports = {
  getAllVehicles,
  getVehicleById,
  getVehiclesByRick,
  createVehicle,
  updateVehicle,
  deleteVehicle,
  bulkDeleteVehicles,
  getExpiringVehicles,
  getVehicleSummary
};
