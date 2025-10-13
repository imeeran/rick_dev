const { query } = require('../../shared/database/connection');
const { sendSuccess, sendError, sendNotFound, sendValidationError } = require('../../shared/utils/response');

// GET /api/admin/payslips - Get all payslips with pagination and filtering
const getAllPayslips = async (req, res) => {
  try {
    const { 
      page = 0, 
      size = 10, 
      sort = 'created_at', 
      order = 'desc',
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

    // Month filtering
    if (month) {
      whereClause += ` AND data->>'month' = $${paramCount}`;
      params.push(month);
      paramCount++;
    }

    // Year filtering
    if (year) {
      whereClause += ` AND data->>'year' = $${paramCount}`;
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

    // Get payslips with pagination
    const payslipsQuery = `
      SELECT 
        id,
        data,
        created_at,
        updated_at
      FROM payslips
      ${whereClause}
      ORDER BY ${sort} ${order.toUpperCase()}
      LIMIT $${paramCount} OFFSET $${paramCount + 1}
    `;

    params.push(size, offset);
    const payslipsResult = await query(payslipsQuery, params);

    // Transform data - extract and flatten JSONB structure
    const payslips = payslipsResult.rows.map(row => ({
      id: row.id,
      created_at: row.created_at,
      updated_at: row.updated_at,
      ...row.data // Spread all JSONB data fields
    }));

    sendSuccess(res, {
      payslips,
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
    if (!payslipData.employee_id || !payslipData.employee_name || !payslipData.pay_period_start || !payslipData.pay_period_end || payslipData.basic_salary === undefined) {
      return sendValidationError(res, 'Missing required fields for payslip creation');
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
      INSERT INTO payslips (data, created_at, updated_at)
      VALUES ($1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING *
    `, [JSON.stringify(payslipData)]);

    const payslip = {
      id: insertResult.rows[0].id,
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

    const updateResult = await query(`
      UPDATE payslips 
      SET data = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *
    `, [JSON.stringify(updatedData), id]);

    const payslip = {
      id: updateResult.rows[0].id,
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
      whereClause += ` AND data->>'year' = $${paramCount}`;
      params.push(year);
      paramCount++;
    }

    if (month) {
      whereClause += ` AND data->>'month' = $${paramCount}`;
      params.push(month);
      paramCount++;
    }

    const result = await query(`
      SELECT id, data, created_at, updated_at
      FROM payslips 
      ${whereClause}
      ORDER BY data->>'pay_period_start' DESC
    `, params);

    const payslips = result.rows.map(row => ({
      id: row.id,
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

    let whereClause = "WHERE data->>'year' = $1";
    const params = [year.toString()];
    let paramCount = 2;

    if (month) {
      whereClause += ` AND data->>'month' = $${paramCount}`;
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
      period: month ? `${month}/${year}` : year.toString(),
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
const generatePayslip = async (req, res) => {
  try {
    const { rick, month, year } = req.body;

    // Validation
    if (!rick || !month || !year) {
      return sendError(res, 'Missing required parameters: rick, month, year', 400);
    }

    // Validate month and year
    const monthNum = parseInt(month);
    const yearNum = parseInt(year);
    
    if (monthNum < 1 || monthNum > 12) {
      return sendError(res, 'Invalid month. Must be between 1 and 12', 400);
    }

    if (yearNum < 2000 || yearNum > 2100) {
      return sendError(res, 'Invalid year', 400);
    }

    // Get driver information
    const driverResult = await query(
      'SELECT id, rick, name, mobile FROM drivers WHERE rick = $1',
      [rick]
    );

    if (driverResult.rows.length === 0) {
      return sendNotFound(res, 'Driver with rick ID');
    }

    const driver = driverResult.rows[0];

    // Get finance records for the specific user, month, and year
    const startDate = `${year}-${month.toString().padStart(2, '0')}-01`;
    const endDate = new Date(yearNum, monthNum, 0).toISOString().split('T')[0]; // Last day of month

    const financeQuery = `
      SELECT 
        data,
        created_at
      FROM finance_records 
      WHERE data->>'rick' = $1 
      AND DATE_TRUNC('month', created_at) = $2
      ORDER BY created_at ASC
    `;
    
    const financeResult = await query(financeQuery, [rick, startDate]);

    if (financeResult.rows.length === 0) {
      return sendError(res, `No finance records found for rick ID ${rick} in ${month}/${year}`, 404);
    }

    // Process finance data to calculate payslip
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

      // Initialize all finance fields with totals
      const monthlyTotals = {
        // Earnings (DR - Debit/Positive amounts)
        total_salary: 0,
        employee: 0,
        daman: 0,
        darb: 0,
        pos: 0,
        adnoc: 0,
        trip: 0,
        other_exp: 0,
        uber_30_days: 0,
        careem_30_days: 0,
        yango_30: 0,
        
        // Deductions (CR - Credit/Negative amounts)
        fine: 0,
        salik: 0,
        advance: 0,
        
        // Net calculations
        total_earnings: 0,
        total_deductions: 0,
        net_salary: 0
      };

      // Process each finance record and sum all fields
      financeData.forEach(record => {
        const data = record.data;
        
        // Debug logging
        console.log('Processing finance record:', record.id, 'Data keys:', Object.keys(data || {}));
        
        // Sum all financial fields using safe helper function
        Object.keys(monthlyTotals).forEach(key => {
          const value = getNumericValue(data, key);
          monthlyTotals[key] += value;
          if (value !== 0) {
            console.log(`Added ${key}: ${value} (total: ${monthlyTotals[key]})`);
          }
        });
      });

      // Calculate earnings (positive amounts)
      const earnings = {
        total_salary: monthlyTotals.total_salary,
        employee: monthlyTotals.employee,
        daman: monthlyTotals.daman,
        darb: monthlyTotals.darb,
        pos: monthlyTotals.pos,
        adnoc: monthlyTotals.adnoc,
        trip: monthlyTotals.trip,
        other_exp: monthlyTotals.other_exp,
        uber_30_days: monthlyTotals.uber_30_days,
        careem_30_days: monthlyTotals.careem_30_days,
        yango_30: monthlyTotals.yango_30
      };

      // Calculate deductions (negative amounts)
      const deductions = {
        fine: Math.abs(monthlyTotals.fine),
        salik: Math.abs(monthlyTotals.salik),
        advance: Math.abs(monthlyTotals.advance)
      };

      // Calculate totals
      const totalEarnings = Object.values(earnings).reduce((sum, val) => sum + (val > 0 ? val : 0), 0);
      const totalDeductions = Object.values(deductions).reduce((sum, val) => sum + val, 0);
      const netSalary = totalEarnings - totalDeductions;

    // Helper function to create earnings/deductions array
    const createEarningsArray = (totals) => {
      const earnings = [];
      
      // Add earnings with positive values
      if (totals.total_salary > 0) {
        earnings.push({
          name: "Salary",
          amount: totals.total_salary,
          description: `Salary posted ${monthNum}-${year}`
        });
      }
      if (totals.employee > 0) {
        earnings.push({
          name: "Employee",
          amount: totals.employee,
          description: `Employee payment for ${monthNum}-${year}`
        });
      }
      if (totals.daman > 0) {
        earnings.push({
          name: "Daman",
          amount: totals.daman,
          description: `Daman payment for ${monthNum}-${year}`
        });
      }
      if (totals.darb > 0) {
        earnings.push({
          name: "Darb",
          amount: totals.darb,
          description: `Darb payment for ${monthNum}-${year}`
        });
      }
      if (totals.pos > 0) {
        earnings.push({
          name: "POS",
          amount: totals.pos,
          description: `POS payment for ${monthNum}-${year}`
        });
      }
      if (totals.adnoc > 0) {
        earnings.push({
          name: "ADNOC",
          amount: totals.adnoc,
          description: `ADNOC payment for ${monthNum}-${year}`
        });
      }
      if (totals.trip > 0) {
        earnings.push({
          name: "Trip",
          amount: totals.trip,
          description: `Trip payment for ${monthNum}-${year}`
        });
      }
      if (totals.other_exp > 0) {
        earnings.push({
          name: "Other Expenses",
          amount: totals.other_exp,
          description: `Other expenses for ${monthNum}-${year}`
        });
      }
      if (totals.uber_30_days > 0) {
        earnings.push({
          name: "UBER Payment",
          amount: totals.uber_30_days,
          description: `UBER Payment Received From 1st to 31 ${monthNum}-${year}`
        });
      }
      if (totals.careem_30_days > 0) {
        earnings.push({
          name: "Careem Payment",
          amount: totals.careem_30_days,
          description: `Careem Payment Received From 1st to 31 ${monthNum}-${year}`
        });
      }
      if (totals.yango_30 > 0) {
        earnings.push({
          name: "Yango Payment",
          amount: totals.yango_30,
          description: `Yango Payment Received From 1st to 31 ${monthNum}-${year}`
        });
      }
      
      return earnings;
    };

    const createDeductionsArray = (totals) => {
      const deductions = [];
      
      // Add deductions with positive values
      if (Math.abs(totals.fine) > 0) {
        deductions.push({
          name: "Fine",
          amount: Math.abs(totals.fine),
          description: `Fine charges for ${monthNum}-${year}`
        });
      }
      if (Math.abs(totals.salik) > 0) {
        deductions.push({
          name: "Salik Charges",
          amount: Math.abs(totals.salik),
          description: `Salik Charges From 1 to 31-${monthNum}-${year}`
        });
      }
      if (Math.abs(totals.advance) > 0) {
        deductions.push({
          name: "Advance",
          amount: Math.abs(totals.advance),
          description: `Advance deduction for ${monthNum}-${year}`
        });
      }
      if (Math.abs(totals.employee) > 0) {
        deductions.push({
          name: "Employee",
          amount: Math.abs(totals.employee),
          description: "Employee"
        });
      }
      if (Math.abs(totals.daman) > 0) {
        deductions.push({
          name: "Health Insurance",
          amount: Math.abs(totals.daman),
          description: `Health Insurance Month of ${monthNum}-${year}`
        });
      }
      if (Math.abs(totals.darb) > 0) {
        deductions.push({
          name: "Darb Charges",
          amount: Math.abs(totals.darb),
          description: `Darb Charges From 1 to 31-${monthNum}-${year}`
        });
      }
      
      return deductions;
    };

    // Get plate number from first finance record if available
    const firstRecord = financeData[0];
    const plateNumber = firstRecord && firstRecord.data && firstRecord.data.plate ? 
      firstRecord.data.plate.toString() : 'N/A';

    // Create payslip data in the desired format
    const payslipData = {
      driver_name: driver.name,
      rick: rick,
      plate: plateNumber,
      mobile_no: driver.mobile,
      opening_balance: 0, // You can calculate this based on your business logic
      monthly_deductions: createDeductionsArray(monthlyTotals),
      monthly_earnings: createEarningsArray(monthlyTotals)
    };

      // Extract any additional dynamic fields from finance records
      const allDynamicFields = new Set();
      financeData.forEach(record => {
        Object.keys(record.data).forEach(key => {
          if (!['rick', 'name', 'date'].includes(key)) {
            allDynamicFields.add(key);
          }
        });
      });
      console.log("All fields: === ",  allDynamicFields);

      // Add dynamic fields to payslip data
      allDynamicFields.forEach(field => {
        if(payslipData.allowances !== undefined){
          if (!payslipData.allowances[field] && !payslipData.deductions[field]) {
            payslipData.dynamic_fields[field] = 0; // Default value for fields not in earnings/deductions
          }
        }
      });

      // Insert the generated payslip as JSON
      const insertResult = await query(`
        INSERT INTO payslips (data, created_at, updated_at)
        VALUES ($1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        RETURNING *
      `, [JSON.stringify(payslipData)]);

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

// GET /api/admin/payslips/generate/:rick/:month/:year - Generate payslip with URL params
const generatePayslipByParams = async (req, res) => {
  try {
    const { rick, month, year } = req.params;

    // Use the same logic as generatePayslip but with URL parameters
    req.body = { rick, month, year };
    return await generatePayslip(req, res);

  } catch (error) {
    console.error('Error generating payslip by params:', error);
    sendError(res, 'Failed to generate payslip', 500, error);
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
  generatePayslipByParams
};