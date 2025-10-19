const { query } = require('../../shared/database/connection');
const { sendSuccess, sendError, sendNotFound, sendValidationError } = require('../../shared/utils/response');

// Helper function to format field label from key
const formatFieldLabel = (key) => {
  // Convert snake_case or camelCase to Title Case
  // First replace underscores with spaces
  let formatted = key.replace(/_/g, ' ');
  
  // Only add spaces before capitals if NOT all uppercase (handle camelCase properly)
  // This prevents "CAREEM" from becoming "C A R E E M"
  if (formatted !== formatted.toUpperCase()) {
    // Add space before capital letters that follow lowercase letters (camelCase)
    formatted = formatted.replace(/([a-z])([A-Z])/g, '$1 $2');
  }
  
  // Convert to Title Case
  return formatted
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

// Helper function to determine if field should be highlighted
const shouldHighlightField = (key) => {
  const highlightFields = ['total_salary', 'uber_30_days', 'careem_30_days', 'yango_30'];
  return highlightFields.includes(key);
};

// GET /api/admin/payslips - Get all payslips with pagination and filtering
const getAllPayslips = async (req, res) => {
  try {
    const { 
      page = 0, 
      size = 10, 
      search = '',
      month = '',
      year = '',
      employee_id = '',
      status = ''
    } = req.query;

    const offset = page * size;

    // Build dynamic query for JSONB
    let whereClause = 'WHERE 1=1';
    const params = [];
    let paramCount = 1;

    // Search functionality
    if (search) {
      whereClause += ` AND (
        data->>'employee_name' ILIKE $${paramCount} OR 
        data->>'employee_id' ILIKE $${paramCount} OR 
        data->>'department' ILIKE $${paramCount}
      )`;
      params.push(`%${search}%`);
      paramCount++;
    }

    // Month filtering - using month_name column
    if (month) {
      whereClause += ` AND month_name = $${paramCount}`;
      params.push(month);
      paramCount++;
    }

    // Year filtering - using year column
    if (year) {
      whereClause += ` AND year = $${paramCount}`;
      params.push(year);
      paramCount++;
    }

    // Employee ID filtering
    if (employee_id) {
      whereClause += ` AND data->>'employee_id' = $${paramCount}`;
      params.push(employee_id);
      paramCount++;
    }

    // Status filtering
    if (status) {
      whereClause += ` AND data->>'status' = $${paramCount}`;
      params.push(status);
      paramCount++;
    }

    // Get total count
    const countQuery = `SELECT COUNT(*) FROM payslips ${whereClause}`;
    const countResult = await query(countQuery, params);
    const total = parseInt(countResult.rows[0].count);

    // No ordering - display data exactly as it appears in database
    let orderClause = '';

    // Get payslips with pagination
    const payslipsQuery = `
      SELECT 
        id,
        data,
        month_name,
        year,
        created_at,
        updated_at
      FROM payslips
      ${whereClause}
      ${orderClause}
      LIMIT $${paramCount} OFFSET $${paramCount + 1}
    `;

    params.push(size, offset);
    const payslipsResult = await query(payslipsQuery, params);

    // Extract column order from first record (similar to finance controller)
    let columnOrder = [];
    if (payslipsResult.rows.length > 0) {
      const firstRecord = payslipsResult.rows[0].data || {};
      columnOrder = Object.keys(firstRecord);
    }

    // Extract all unique keys from all records and collect sample values
    const keyStats = {};
    payslipsResult.rows.forEach(row => {
      Object.entries(row.data || {}).forEach(([key, value]) => {
        if (!keyStats[key]) {
          keyStats[key] = { samples: [] };
        }
        if (keyStats[key].samples.length < 5 && value != null && value !== '') {
          keyStats[key].samples.push(value);
        }
      });
    });

    // Generate field configurations dynamically
    const fields = Object.entries(keyStats).map(([key, stats]) => {
      // Infer type from sample values
      let fieldType = 'text';
      const samples = stats.samples;
      
      if (samples.length > 0) {
        // Check if all non-empty samples are numeric
        const numericSamples = samples.filter(v => {
          const num = parseFloat(v);
          return !isNaN(num) && typeof v === 'number';
        });
        
        if (numericSamples.length > 0 && numericSamples.length === samples.length) {
          // Check if values have decimal places
          const hasDecimals = numericSamples.some(v => v % 1 !== 0);
          fieldType = hasDecimals ? 'currency' : 'number';
        }
      }

      return {
        key: key,
        label: formatFieldLabel(key),
        type: fieldType,
        sortable: true,
        highlight: shouldHighlightField(key),
        hidden: false,
        displayOrder: 0
      };
    });

    // Sort fields to match database column order (similar to finance controller)
    fields.sort((a, b) => {
      const aIndex = columnOrder.indexOf(a.key);
      const bIndex = columnOrder.indexOf(b.key);
      
      // If both found, sort by their position in database
      if (aIndex !== -1 && bIndex !== -1) {
        return aIndex - bIndex;
      }
      // If only one found, prioritize it
      if (aIndex !== -1) return -1;
      if (bIndex !== -1) return 1;
      // If neither found, alphabetical
      return a.key.localeCompare(b.key);
    });

    // Add month_name and year fields right after the first field
    const monthYearFields = [
      {
        key: 'month_name',
        label: formatFieldLabel('month_name'),
        type: 'text',
        sortable: true,
        highlight: shouldHighlightField('month_name'),
        hidden: false,
        displayOrder: 0
      },
      {
        key: 'year',
        label: formatFieldLabel('year'),
        type: 'number',
        sortable: true,
        highlight: shouldHighlightField('year'),
        hidden: false,
        displayOrder: 0
      }
    ];

    // Insert month_name and year after the first field
    const allFields = [
      fields[0],           // First field from database
      ...monthYearFields,  // month_name and year
      ...fields.slice(1)   // Rest of the fields
    ];

    // Transform data - extract and flatten JSONB structure
    const payslips = payslipsResult.rows.map(row => ({
      id: row.id,
      month_name: row.month_name,
      year: row.year,
      created_at: row.created_at,
      updated_at: row.updated_at,
      ...row.data // Spread all JSONB data fields
    }));

    sendSuccess(res, {
      fields: allFields,
      data: payslips,
      pagination: {
        page: parseInt(page),
        size: parseInt(size),
        total,
        totalPages: Math.ceil(total / parseInt(size)),
        startIndex: offset,
        endIndex: Math.min(offset + parseInt(size) - 1, total - 1)
      }
    }, 'Payslips retrieved successfully');

  } catch (error) {
    console.error('Error fetching payslips:', error);
    sendError(res, 'Failed to fetch payslips', 500, error);
  }
};

// GET /api/admin/payslips/:id - Get specific payslip by ID
const getPayslipById = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query('SELECT * FROM payslips WHERE id = $1', [id]);

    if (result.rows.length === 0) {
      return sendNotFound(res, 'Payslip');
    }

    const payslip = {
      id: result.rows[0].id,
      month_name: result.rows[0].month_name,
      year: result.rows[0].year,
      ...result.rows[0].data,
      created_at: result.rows[0].created_at,
      updated_at: result.rows[0].updated_at
    };

    sendSuccess(res, payslip, 'Payslip retrieved successfully');

  } catch (error) {
    console.error('Error fetching payslip:', error);
    sendError(res, 'Failed to fetch payslip', 500, error);
  }
};

// POST /api/admin/payslips - Create new payslip
const createPayslip = async (req, res) => {
  try {
    const payslipData = req.body;

    // Basic validation
    if (!payslipData.employee_id || !payslipData.employee_name || !payslipData.pay_period_start || !payslipData.pay_period_end || payslipData.basic_salary === undefined || !payslipData.month_name || !payslipData.year) {
      return sendValidationError(res, 'Missing required fields for payslip creation: employee_id, employee_name, pay_period_start, pay_period_end, basic_salary, month_name, year');
    }

    // Calculate gross and net salary if not provided
    if (!payslipData.gross_salary) {
      const totalAllowances = Object.values(payslipData.allowances || {}).reduce((sum, val) => sum + parseFloat(val || 0), 0);
      payslipData.gross_salary = parseFloat(payslipData.basic_salary) + totalAllowances;
    }

    if (!payslipData.net_salary) {
      const totalDeductions = Object.values(payslipData.deductions || {}).reduce((sum, val) => sum + parseFloat(val || 0), 0);
      payslipData.net_salary = payslipData.gross_salary - totalDeductions;
    }

    // Add metadata
    payslipData.status = payslipData.status || 'draft';
    payslipData.created_at = new Date().toISOString();

    const insertResult = await query(`
      INSERT INTO payslips (data, month_name, year, created_at, updated_at)
      VALUES ($1, $2, $3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING *
    `, [JSON.stringify(payslipData), payslipData.month_name || null, payslipData.year || null]);

    const payslip = {
      id: insertResult.rows[0].id,
      month_name: insertResult.rows[0].month_name,
      year: insertResult.rows[0].year,
      ...insertResult.rows[0].data,
      created_at: insertResult.rows[0].created_at,
      updated_at: insertResult.rows[0].updated_at
    };

    sendSuccess(res, payslip, 'Payslip created successfully', 201);

  } catch (error) {
    console.error('Error creating payslip:', error);
    sendError(res, 'Failed to create payslip', 500, error);
  }
};

// PUT /api/admin/payslips/:id - Update existing payslip
const updatePayslip = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Get existing payslip
    const existingResult = await query('SELECT * FROM payslips WHERE id = $1', [id]);
    if (existingResult.rows.length === 0) {
      return sendNotFound(res, 'Payslip');
    }

    // Merge with existing data
    const existingData = existingResult.rows[0].data;
    const updatedData = { ...existingData, ...updateData };
    updatedData.updated_at = new Date().toISOString();

    // Recalculate if financial fields changed
    if (updateData.basic_salary !== undefined || updateData.allowances || updateData.deductions) {
      const totalAllowances = Object.values(updatedData.allowances || {}).reduce((sum, val) => sum + parseFloat(val || 0), 0);
      const totalDeductions = Object.values(updatedData.deductions || {}).reduce((sum, val) => sum + parseFloat(val || 0), 0);
      updatedData.gross_salary = parseFloat(updatedData.basic_salary) + totalAllowances;
      updatedData.net_salary = updatedData.gross_salary - totalDeductions;
    }

    // Prepare update query with month_name and year if provided
    let updateQuery = `
      UPDATE payslips 
      SET data = $1, updated_at = CURRENT_TIMESTAMP`;
    let queryParams = [JSON.stringify(updatedData)];
    let paramCount = 2;

    if (updateData.month_name !== undefined) {
      updateQuery += `, month_name = $${paramCount}`;
      queryParams.push(updateData.month_name);
      paramCount++;
    }

    if (updateData.year !== undefined) {
      updateQuery += `, year = $${paramCount}`;
      queryParams.push(updateData.year);
      paramCount++;
    }

    updateQuery += ` WHERE id = $${paramCount} RETURNING *`;
    queryParams.push(id);

    const updateResult = await query(updateQuery, queryParams);

    const payslip = {
      id: updateResult.rows[0].id,
      month_name: updateResult.rows[0].month_name,
      year: updateResult.rows[0].year,
      ...updateResult.rows[0].data,
      created_at: updateResult.rows[0].created_at,
      updated_at: updateResult.rows[0].updated_at
    };

    sendSuccess(res, payslip, 'Payslip updated successfully');

  } catch (error) {
    console.error('Error updating payslip:', error);
    sendError(res, 'Failed to update payslip', 500, error);
  }
};

// DELETE /api/admin/payslips/:id - Delete payslip
const deletePayslip = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query('DELETE FROM payslips WHERE id = $1 RETURNING *', [id]);

    if (result.rows.length === 0) {
      return sendNotFound(res, 'Payslip');
    }

    sendSuccess(res, { id: parseInt(id) }, 'Payslip deleted successfully');

  } catch (error) {
    console.error('Error deleting payslip:', error);
    sendError(res, 'Failed to delete payslip', 500, error);
  }
};

// GET /api/admin/payslips/employee/:employee_id - Get payslips for specific employee
const getPayslipsByEmployee = async (req, res) => {
  try {
    const { employee_id } = req.params;
    const { year = '', month = '' } = req.query;

    let whereClause = "WHERE data->>'employee_id' = $1";
    const params = [employee_id];
    let paramCount = 2;

    if (year) {
      whereClause += ` AND year = $${paramCount}`;
      params.push(year);
      paramCount++;
    }

    if (month) {
      whereClause += ` AND month_name = $${paramCount}`;
      params.push(month);
      paramCount++;
    }

    const result = await query(`
      SELECT id, data, month_name, year, created_at, updated_at
      FROM payslips 
      ${whereClause}
    `, params);

    const payslips = result.rows.map(row => ({
      id: row.id,
      month_name: row.month_name,
      year: row.year,
      ...row.data,
      created_at: row.created_at,
      updated_at: row.updated_at
    }));

    sendSuccess(res, { payslips }, 'Employee payslips retrieved successfully');

  } catch (error) {
    console.error('Error fetching employee payslips:', error);
    sendError(res, 'Failed to fetch employee payslips', 500, error);
  }
};

// GET /api/admin/payslips/summary - Get payslip summary statistics
const getPayslipSummary = async (req, res) => {
  try {
    const { year = new Date().getFullYear(), month = '' } = req.query;

    let whereClause = "WHERE year = $1";
    const params = [year.toString()];
    let paramCount = 2;

    if (month) {
      whereClause += ` AND month_name = $${paramCount}`;
      params.push(month);
      paramCount++;
    }

    // Get summary statistics
    const summaryQuery = `
      SELECT 
        COUNT(*) as total_payslips,
        SUM((data->>'gross_salary')::DECIMAL) as total_gross_salary,
        SUM((data->>'net_salary')::DECIMAL) as total_net_salary,
        AVG((data->>'gross_salary')::DECIMAL) as avg_gross_salary,
        AVG((data->>'net_salary')::DECIMAL) as avg_net_salary
      FROM payslips ${whereClause}
    `;

    const summaryResult = await query(summaryQuery, params);

    // Get status breakdown
    const statusBreakdown = await query(`
      SELECT 
        data->>'status' as status,
        COUNT(*) as count
      FROM payslips ${whereClause}
      GROUP BY data->>'status'
    `, params);

    // Get department breakdown
    const departmentBreakdown = await query(`
      SELECT 
        data->>'department' as department,
        COUNT(*) as count,
        SUM((data->>'gross_salary')::DECIMAL) as total_salary
      FROM payslips ${whereClause}
      GROUP BY data->>'department'
    `, params);

    sendSuccess(res, {
      period: month ? `${month} ${year}` : year.toString(),
      summary: summaryResult.rows[0],
      statusBreakdown: statusBreakdown.rows,
      departmentBreakdown: departmentBreakdown.rows
    }, 'Payslip summary retrieved successfully');

  } catch (error) {
    console.error('Error fetching payslip summary:', error);
    sendError(res, 'Failed to fetch payslip summary', 500, error);
  }
};

// POST /api/admin/payslips/generate - Generate payslip from finance data
// Expected request body: { Rick: "RICK001", month_name: "January", year: 2025 }
// month_name should be the full month name (January, February, March, etc.)
const generatePayslip = async (req, res) => {
  try {
    const { Rick, month_name, year } = req.body;

    // Get driver information
    const driverResult = await query(
      'SELECT id, rick, name, mobile FROM drivers WHERE rick = $1',
      [Rick]
    );

    if (driverResult.rows.length === 0) {
      return sendNotFound(res, 'Driver with Rick ID');
    }

    const driver = driverResult.rows[0];

    // Get finance records for the specific user, month, and year
    const financeQuery = `
      SELECT 
        data,
        created_at
      FROM finance_records 
      WHERE data->>'Rick' = $1 
      AND month_name = $2
      AND year = $3
      ORDER BY created_at ASC
    `;
    
    const financeResult = await query(financeQuery, [Rick, month_name, year.toString()]);
    console.log("Finance result: === ", financeResult.rows);

    if (financeResult.rows.length === 0) {
      return sendError(res, `No finance records found for Rick ID ${Rick} in ${month_name} ${year}`, 404);
    }

    // Process finance data to create payslip array with CR/DR logic
    const financeData = financeResult.rows;
    
    try {
      // Helper function to safely get numeric value from data
      const getNumericValue = (data, key) => {
        if (!data || typeof data !== 'object') return 0;
        const value = data[key];
        if (value === undefined || value === null || value === '') return 0;
        const numValue = parseFloat(value);
        return isNaN(numValue) ? 0 : numValue;
      };

      // Create payslip array from JSONB data
      const payslipArray = [];
      
      // Process each finance record
      financeData.forEach(record => {
        const data = record.data;
        
        // Process each field in the finance record
        Object.entries(data).forEach(([key, value]) => {
          // Skip non-financial fields
          if (['Rick', 'name', 'date', 'plate'].includes(key)) {
            return;
          }
          
          const numericValue = getNumericValue(data, key);
          
          // Skip zero values
          if (numericValue === 0) {
            return;
          }
          
          // Create payslip entry
          const payslipEntry = {
            field: key,
            amount: Math.abs(numericValue), // Always positive amount
            type: numericValue < 0 ? 'CR' : 'DR' // Negative values = CR, Positive values = DR
          };
          
          payslipArray.push(payslipEntry);
        });
      });

      // Get opening balance (obopm) from payslips table
      let obopm = 0; // Default opening balance
      
      try {
        // Get the most recent payslip for this driver to get the closing balance as opening balance
        const obopmQuery = `
          SELECT data->>'obopm' as obopm
          FROM payslips 
          WHERE data->>'rick' = $1 
          AND (year < $2 OR (year = $2 AND month_name < $3))
          ORDER BY year DESC, month_name DESC
          LIMIT 1
        `;
        
        const obopmResult = await query(obopmQuery, [Rick, year.toString(), month_name]);
        
        if (obopmResult.rows.length > 0 && obopmResult.rows[0].obopm) {
          obopm = parseFloat(obopmResult.rows[0].obopm) || 0;
        }
        
        console.log(`Opening balance (obopm) for ${Rick}: ${obopm}`);
        
      } catch (obopmError) {
        console.error('Error fetching opening balance:', obopmError);
        // Keep default value of 0 if there's an error
      }

      // Get plate number from first finance record if available
      const firstRecord = financeData[0];
      const plateNumber = firstRecord && firstRecord.data && firstRecord.data.plate ? 
        firstRecord.data.plate.toString() : 'N/A';

      console.log("RickRick === ", Rick);

      // Create payslip data in the desired format
      const payslipData = {
        driver_name: driver.name,
        rick: Rick,
        plate: plateNumber,
        mobile_no: driver.mobile,
        obopm: obopm, // Opening balance
        payslip_array: payslipArray // Array with CR/DR logic
      };

    sendSuccess(res, {
      payslip: payslipData
    }, "Payslip generated successfully");

      } catch (processingError) {
        console.error('Error processing finance data:', processingError);
        return sendError(res, 'Failed to process finance data for payslip generation', 500, processingError);
      }
    } catch (error) {
      console.error('Error generating payslip:', error);
      sendError(res, 'Failed to generate payslip', 500, error);
    }
};

// POST /api/admin/payslips/insert - Insert generated payslip to database
// Expected request body: { driver_name: "...", rick: "...", month_name: "January", year: 2025, ... }
const insertPayslip = async (req, res) => {
  try {
    const { month_name, year } = req.body;

    // Basic validation
    if (!month_name || !year) {
      return sendValidationError(res, 'Missing required fields: month_name, year');
    }

    // Extract payslip data (everything except month_name and year)
    const payslipData = { ...req.body };
    delete payslipData.month_name;
    delete payslipData.year;

    // Insert the generated payslip as JSON
    const insertResult = await query(`
      INSERT INTO payslips (data, month_name, year, created_at, updated_at)
      VALUES ($1, $2, $3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING *
    `, [JSON.stringify(payslipData), month_name, year.toString()]);

    const payslip = {
      id: insertResult.rows[0].id,
      month_name: insertResult.rows[0].month_name,
      year: insertResult.rows[0].year,
      ...insertResult.rows[0].data,
      created_at: insertResult.rows[0].created_at,
      updated_at: insertResult.rows[0].updated_at
    };

    sendSuccess(res, payslip, 'Payslip inserted successfully', 201);

  } catch (error) {
    console.error('Error inserting payslip:', error);
    sendError(res, 'Failed to insert payslip', 500, error);
  }
};

// POST /api/admin/payslips/update - Update payslip (frontend handles duplicate checking)
// Expected request body: { driver_name: "...", rick: "...", month_name: "January", year: 2025, ... }
const updatePayslipData = async (req, res) => {
  try {
    const { month_name, year, rick } = req.body;

    // Basic validation
    if (!month_name || !year || !rick) {
      return sendValidationError(res, 'Missing required fields: month_name, year, rick');
    }

    // Extract payslip data (everything except month_name and year)
    const payslipData = { ...req.body };
    delete payslipData.month_name;
    delete payslipData.year;

    // Update existing payslip
    const updateResult = await query(`
      UPDATE payslips 
      SET data = $1, updated_at = CURRENT_TIMESTAMP
      WHERE data->>'rick' = $2 
      AND month_name = $3 
      AND year = $4
      RETURNING *
    `, [JSON.stringify(payslipData), rick, month_name, year.toString()]);

    if (updateResult.rows.length === 0) {
      return sendNotFound(res, 'Payslip not found for update');
    }

    const payslip = {
      id: updateResult.rows[0].id,
      month_name: updateResult.rows[0].month_name,
      year: updateResult.rows[0].year,
      ...updateResult.rows[0].data,
      created_at: updateResult.rows[0].created_at,
      updated_at: updateResult.rows[0].updated_at
    };

    sendSuccess(res, payslip, 'Payslip updated successfully');

  } catch (error) {
    console.error('Error updating payslip:', error);
    sendError(res, 'Failed to update payslip', 500, error);
  }
};

module.exports = {
  getAllPayslips,
  getPayslipById,
  createPayslip,
  updatePayslip,
  deletePayslip,
  getPayslipsByEmployee,
  getPayslipSummary,
  generatePayslip,
  insertPayslip,
  updatePayslipData
};