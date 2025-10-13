const { query, pool } = require('../../shared/database/connection');
const { sendSuccess, sendError, sendNotFound, sendValidationError } = require('../../shared/utils/response');

/**
 * Booking Controller
 * Handles booking-related operations for the admin panel
 */

// GET /api/admin/bookings - Get all bookings with pagination and filtering
const getAllBookings = async (req, res) => {
  try {
    const { 
      page = 0, 
      size = 10, 
      sort = 'created_at', 
      order = 'desc',
      search = '',
      status = ''
    } = req.query;

    const offset = page * size;

    // Build dynamic query
    let whereClause = 'WHERE 1=1';
    const params = [];
    let paramCount = 1;

    // Search functionality
    if (search) {
      whereClause += ` AND (
        guest_name ILIKE $${paramCount} OR 
        email_id ILIKE $${paramCount} OR 
        mobile_number ILIKE $${paramCount} OR
        car_type ILIKE $${paramCount} OR
        pickup_loc ILIKE $${paramCount} OR
        drop_loc ILIKE $${paramCount}
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

    // Get total count
    const countQuery = `SELECT COUNT(*) FROM bookings ${whereClause}`;
    const countResult = await query(countQuery, params);
    const total = parseInt(countResult.rows[0].count);

    // Get bookings with pagination
    const bookingsQuery = `
      SELECT 
        id,
        guest_name as name,
        car_type,
        pickup_loc,
        drop_loc,
        booking_date,
        booking_time,
        guest_name,
        mobile_number,
        email_id,
        special_note,
        assigned_driver,
        status,
        created_at,
        updated_at
      FROM bookings
      ${whereClause}
      ORDER BY ${sort} ${order.toUpperCase()}
      LIMIT $${paramCount} OFFSET $${paramCount + 1}
    `;

    params.push(size, offset);
    const bookingsResult = await query(bookingsQuery, params);

    // Calculate last_page
    const last_page = Math.ceil(total / parseInt(size)) - 1;

    sendSuccess(res, {
      bookings: bookingsResult.rows,
      pagination: {
        page: parseInt(page),
        size: parseInt(size),
        total,
        last_page: last_page >= 0 ? last_page : 0
      }
    }, 'Bookings retrieved successfully');

  } catch (error) {
    console.error('Error fetching bookings:', error);
    sendError(res, 'Failed to fetch bookings', 500, error);
  }
};

// GET /api/admin/bookings/:id - Get specific booking by ID
const getBookingById = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query(`
      SELECT 
        id,
        guest_name as name,
        car_type,
        pickup_loc,
        drop_loc,
        booking_date,
        booking_time,
        guest_name,
        mobile_number,
        email_id,
        special_note,
        assigned_driver,
        status,
        created_at,
        updated_at
      FROM bookings 
      WHERE id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return sendNotFound(res, 'Booking');
    }

    sendSuccess(res, result.rows[0], 'Booking retrieved successfully');

  } catch (error) {
    console.error('Error fetching booking:', error);
    sendError(res, 'Failed to fetch booking', 500, error);
  }
};

// POST /api/admin/bookings - Create new booking
const createBooking = async (req, res) => {
  try {
    const {
      vehicleType,
      pickupLocation,
      dropoffLocation,
      bookingDate,
      bookingTime,
      guestName,
      mobileNumber,
      emailId,
      specialNote
    } = req.body;

    // Basic validation
    if (!vehicleType || !pickupLocation || !dropoffLocation || !bookingDate || !bookingTime || !guestName || !mobileNumber) {
      return sendValidationError(res, {
        message: 'Missing required fields',
        required: ['vehicleType', 'pickupLocation', 'dropoffLocation', 'bookingDate', 'bookingTime', 'guestName', 'mobileNumber']
      });
    }

    // Validate email format if provided
    if (emailId && !isValidEmail(emailId)) {
      return sendValidationError(res, { message: 'Invalid email format' });
    }

    const insertResult = await query(`
      INSERT INTO bookings (
        car_type,
        pickup_loc,
        drop_loc,
        booking_date,
        booking_time,
        guest_name,
        mobile_number,
        email_id,
        special_note,
        assigned_driver,
        status,
        created_at,
        updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING 
        id,
        guest_name as name,
        car_type,
        pickup_loc,
        drop_loc,
        booking_date,
        booking_time,
        guest_name,
        mobile_number,
        email_id,
        special_note,
        assigned_driver,
        status,
        created_at,
        updated_at
    `, [
      vehicleType,
      pickupLocation,
      dropoffLocation,
      bookingDate,
      bookingTime,
      guestName,
      mobileNumber,
      emailId || null,
      specialNote || null,
      null, // assigned_driver
      'pending' // default status
    ]);

    return res.status(200).json({
      success: true,
      message: 'Booking created successfully',
      booking: insertResult.rows[0]
    });

  } catch (error) {
    console.error('Error creating booking:', error);
    sendError(res, 'Failed to create booking', 500, error);
  }
};

// PUT /api/admin/bookings/:id - Update existing booking
const updateBooking = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      vehicleType,
      pickupLocation,
      dropoffLocation,
      bookingDate,
      bookingTime,
      guestName,
      mobileNumber,
      emailId,
      specialNote,
      status
    } = req.body;

    // Check if booking exists
    const existingResult = await query('SELECT * FROM bookings WHERE id = $1', [id]);
    if (existingResult.rows.length === 0) {
      return sendNotFound(res, 'Booking');
    }

    // Validate email format if provided
    if (emailId && !isValidEmail(emailId)) {
      return sendValidationError(res, { message: 'Invalid email format' });
    }

    // Build dynamic update query
    const updateFields = [];
    const updateParams = [];
    let paramCount = 1;

    if (vehicleType !== undefined) {
      updateFields.push(`car_type = $${paramCount}`);
      updateParams.push(vehicleType);
      paramCount++;
    }
    if (pickupLocation !== undefined) {
      updateFields.push(`pickup_loc = $${paramCount}`);
      updateParams.push(pickupLocation);
      paramCount++;
    }
    if (dropoffLocation !== undefined) {
      updateFields.push(`drop_loc = $${paramCount}`);
      updateParams.push(dropoffLocation);
      paramCount++;
    }
    if (bookingDate !== undefined) {
      updateFields.push(`booking_date = $${paramCount}`);
      updateParams.push(bookingDate);
      paramCount++;
    }
    if (bookingTime !== undefined) {
      updateFields.push(`booking_time = $${paramCount}`);
      updateParams.push(bookingTime);
      paramCount++;
    }
    if (guestName !== undefined) {
      updateFields.push(`guest_name = $${paramCount}`);
      updateParams.push(guestName);
      paramCount++;
    }
    if (mobileNumber !== undefined) {
      updateFields.push(`mobile_number = $${paramCount}`);
      updateParams.push(mobileNumber);
      paramCount++;
    }
    if (emailId !== undefined) {
      updateFields.push(`email_id = $${paramCount}`);
      updateParams.push(emailId);
      paramCount++;
    }
    if (specialNote !== undefined) {
      updateFields.push(`special_note = $${paramCount}`);
      updateParams.push(specialNote);
      paramCount++;
    }
    if (status !== undefined) {
      updateFields.push(`status = $${paramCount}`);
      updateParams.push(status);
      paramCount++;
    }

    if (updateFields.length === 0) {
      return sendValidationError(res, { message: 'No fields to update' });
    }

    updateFields.push('updated_at = CURRENT_TIMESTAMP');
    updateParams.push(id);

    const updateQuery = `
      UPDATE bookings 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramCount}
      RETURNING 
        id,
        guest_name as name,
        car_type,
        pickup_loc,
        drop_loc,
        booking_date,
        booking_time,
        guest_name,
        mobile_number,
        email_id,
        special_note,
        assigned_driver,
        status,
        created_at,
        updated_at
    `;

    const updateResult = await query(updateQuery, updateParams);

    return res.status(200).json({
      success: true,
      message: 'Booking updated successfully',
      booking: updateResult.rows[0]
    });

  } catch (error) {
    console.error('Error updating booking:', error);
    sendError(res, 'Failed to update booking', 500, error);
  }
};

// PATCH /api/admin/bookings/:id/assign-driver - Assign driver to booking
const assignDriver = async (req, res) => {
  try {
    const { id } = req.params;
    const { driver_name } = req.body;

    if (!driver_name) {
      return sendValidationError(res, { message: 'driver_name is required' });
    }

    // Check if booking exists
    const existingResult = await query('SELECT * FROM bookings WHERE id = $1', [id]);
    if (existingResult.rows.length === 0) {
      return sendNotFound(res, 'Booking');
    }

    // Update assigned driver
    const updateResult = await query(`
      UPDATE bookings 
      SET assigned_driver = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING id, assigned_driver
    `, [driver_name, id]);

    return res.status(200).json({
      success: true,
      message: 'Driver assigned successfully',
      booking: {
        id: updateResult.rows[0].id,
        assigned_driver: updateResult.rows[0].assigned_driver
      }
    });

  } catch (error) {
    console.error('Error assigning driver:', error);
    sendError(res, 'Failed to assign driver', 500, error);
  }
};

// DELETE /api/admin/bookings/:id - Delete booking
const deleteBooking = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query('DELETE FROM bookings WHERE id = $1 RETURNING *', [id]);

    if (result.rows.length === 0) {
      return sendNotFound(res, 'Booking');
    }

    return res.status(200).json({
      success: true,
      message: 'Booking deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting booking:', error);
    sendError(res, 'Failed to delete booking', 500, error);
  }
};

// Helper function to validate email
const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

module.exports = {
  getAllBookings,
  getBookingById,
  createBooking,
  updateBooking,
  assignDriver,
  deleteBooking
};

