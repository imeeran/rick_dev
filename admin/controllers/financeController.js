const { query, pool } = require('../../shared/database/connection');
const { sendSuccess, sendError, sendNotFound } = require('../../shared/utils/response');
const multer = require('multer');
const XLSX = require('xlsx');

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Helper function to format field label from key
const formatFieldLabel = (key) => {
  // Special cases for known fields
  const labelMap = {
    'rick': 'S No.',
    'rick_no': 'Rick',
    'plate': 'Plate',
    'name': 'Name',
    'employee': 'Employee',
    'daman': 'Daman',
    'darb': 'DARB',
    'fine': 'Fine',
    'salik': 'Salik',
    'pos': 'POS',
    'advance': 'Advance',
    'adnoc': 'ADNOC',
    'trip': 'Trip',
    'other_exp': 'Other Exp',
    'uber_30_days': 'Uber 30 Days',
    'careem_30_days': 'Careem 30 Days',
    'yango_30': 'Yango 30',
    'total_salary': 'Total Salary'
  };
  
  if (labelMap[key]) {
    return labelMap[key];
  }
  
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
    .join(' ')
    .trim();
};

// Helper function to determine if field should be highlighted
const shouldHighlightField = (key) => {
  const highlightFields = ['total_salary', 'uber_30_days', 'careem_30_days', 'yango_30'];
  return highlightFields.includes(key);
};

// GET /api/admin/finances - Get finance records with dynamic fields
const getFinances = async (req, res) => {
  try {
    const {
      page = 0,
      size = 10,
      sort = 'rick',
      order = 'asc',
      search = '',
      year = '',
      month = ''
    } = req.query;

    // Pagination setup
    const offset = page * size;
    const limit = parseInt(size);
    const sortOrder = order.toLowerCase() === 'desc' ? 'DESC' : 'ASC';

    // WHERE clause setup
    const queryParams = [];
    let whereClause = '';
    let paramCount = 0;

    if (search) {
      paramCount++;
      whereClause += `WHERE data::text ILIKE $${paramCount}`;
      queryParams.push(`%${search}%`);
    }

    if (year) {
      paramCount++;
      const condition = whereClause ? 'AND' : 'WHERE';
      whereClause += ` ${condition} year = $${paramCount}`;
      queryParams.push(year);
    }

    if (month) {
      paramCount++;
      const condition = whereClause ? 'AND' : 'WHERE';
      whereClause += ` ${condition} LOWER(month_name) = LOWER($${paramCount})`;
      queryParams.push(month);
    }

    // Order by Excel row order by default, or by specified field if sorting is requested
    let orderClause = '';
    if (sort && sort !== 'rick') {
      // User explicitly requested sorting by a specific field
      if (sort === 'created_at' || sort === 'updated_at' || sort === 'id') {
        orderClause = `ORDER BY ${sort} ${sortOrder}`;
      } else {
        // Try to sort as numeric if possible, otherwise sort as text
        orderClause = `ORDER BY 
          CASE 
            WHEN data->>'${sort}' ~ '^[0-9]+\\.?[0-9]*$' 
            THEN (data->>'${sort}')::numeric 
            ELSE NULL 
          END ${sortOrder} NULLS LAST,
          data->>'${sort}' ${sortOrder}`;
      }
    } else {
      // Default: maintain Excel row order using _excel_row field, fallback to id
      orderClause = `ORDER BY COALESCE((data->>'_excel_row')::integer, id) ASC`;
    }

    // Pagination
    paramCount += 2;
    const limitClause = `LIMIT $${paramCount - 1} OFFSET $${paramCount}`;
    queryParams.push(limit, offset);

    // Build query
    const selectQuery = `
      SELECT id, data, year, month_name, created_at, updated_at
      FROM finance_records
      ${whereClause}
      ${orderClause}
      ${limitClause}
    `;

    const countQuery = `
      SELECT COUNT(*) AS total
      FROM finance_records
      ${whereClause}
    `;

    // Execute queries
    const [dataResult, countResult] = await Promise.all([
      query(selectQuery, queryParams),
      query(countQuery, queryParams.slice(0, -2))
    ]);

    const total = parseInt(countResult.rows[0].total);
    const totalPages = Math.ceil(total / size);

    // Extract column order from first record (stored during upload)
    let columnOrder = [];
    if (dataResult.rows.length > 0) {
      const firstRecord = dataResult.rows[0].data || {};
      columnOrder = firstRecord._column_order || Object.keys(firstRecord);
    }

    // Extract all unique keys from all records and collect sample values
    const keyStats = {};
    dataResult.rows.forEach(row => {
      Object.entries(row.data || {}).forEach(([key, value]) => {
        // Skip internal fields
        if (key === '_excel_row' || key === '_column_order') {
          return;
        }
        
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

    // Sort fields to match Excel column order (using stored _column_order)
    fields.sort((a, b) => {
      const aIndex = columnOrder.indexOf(a.key);
      const bIndex = columnOrder.indexOf(b.key);
      
      // If both found, sort by their position in Excel
      if (aIndex !== -1 && bIndex !== -1) {
        return aIndex - bIndex;
      }
      // If only one found, prioritize it
      if (aIndex !== -1) return -1;
      if (bIndex !== -1) return 1;
      // If neither found, alphabetical
      return a.key.localeCompare(b.key);
    });

    // Transform data - flatten JSONB into top-level properties (exclude internal fields)
    const transformedData = dataResult.rows.map(row => {
      const { _excel_row, _column_order, ...dataWithoutInternal } = row.data || {};
      return {
        id: row.id,
        ...dataWithoutInternal
      };
    });

    // Response
    sendSuccess(res, {
      fields: fields,
      data: transformedData,
      pagination: {
        page: parseInt(page),
        size: parseInt(size),
        totalPages,
        total,
        startIndex: offset,
        endIndex: Math.min(offset + transformedData.length - 1, total - 1)
      }
    }, 'Finance records retrieved successfully');

  } catch (error) {
    console.error('Error fetching finances:', error);
    sendError(res, 'Failed to fetch finance records', 500, error);
  }
};

// PUT /api/admin/finances/:id - Update finance record
const updateFinance = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Validate ID
    if (!id || isNaN(id)) {
      return sendError(res, 'Invalid finance record ID', 400);
    }

    // Remove protected fields from update data if present
    delete updateData.id;
    delete updateData.created_at;
    delete updateData.updated_at;
    delete updateData.year;
    delete updateData.month_name;
    delete updateData._excel_row;      // Preserve original Excel row position
    delete updateData._column_order;   // Preserve original Excel column order

    // Check if record exists
    const existingRecord = await query(
      'SELECT id, data, year, month_name FROM finance_records WHERE id = $1',
      [id]
    );

    if (existingRecord.rows.length === 0) {
      return sendNotFound(res, 'Finance record');
    }

    // Merge existing data with update data (preserves _excel_row from existing)
    const currentData = existingRecord.rows[0].data;
    const mergedData = { ...currentData, ...updateData };

    // Update the record
    const updateQuery = `
      UPDATE finance_records 
      SET data = $1, updated_at = CURRENT_TIMESTAMP 
      WHERE id = $2 
      RETURNING id, data, year, month_name, created_at, updated_at
    `;

    const result = await query(updateQuery, [JSON.stringify(mergedData), id]);

    // Transform response data - flatten JSONB (exclude internal fields)
    const { _excel_row, _column_order, ...dataWithoutInternal } = result.rows[0].data || {};
    const updatedRecord = {
      id: result.rows[0].id,
      ...dataWithoutInternal
    };

    sendSuccess(res, updatedRecord, 'Finance record updated successfully');

  } catch (error) {
    console.error('Error updating finance record:', error);
    sendError(res, 'Failed to update finance record', 500, error);
  }
};

// DELETE /api/admin/finances/:id - Delete finance record
const deleteFinance = async (req, res) => {
  try {
    const { id } = req.params;

    // Validate ID
    if (!id || isNaN(id)) {
      return sendError(res, 'Invalid finance record ID', 400);
    }

    // Check if record exists
    const existingRecord = await query(
      'SELECT id, data FROM finance_records WHERE id = $1',
      [id]
    );

    if (existingRecord.rows.length === 0) {
      return sendNotFound(res, 'Finance record');
    }

    // Delete the record
    const deleteQuery = 'DELETE FROM finance_records WHERE id = $1 RETURNING id, data';
    const result = await query(deleteQuery, [id]);

    sendSuccess(res, {
      id: result.rows[0].id,
      deletedData: result.rows[0].data
    }, 'Finance record deleted successfully');

  } catch (error) {
    console.error('Error deleting finance record:', error);
    sendError(res, 'Failed to delete finance record', 500, error);
  }
};

// DELETE /api/admin/finances - Bulk delete finance records
const bulkDeleteFinances = async (req, res) => {
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

    // Check which records exist
    const existingRecords = await query(
      `SELECT id FROM finance_records WHERE id = ANY($1)`,
      [ids]
    );

    const existingIds = existingRecords.rows.map(row => row.id);
    const notFoundIds = ids.filter(id => !existingIds.includes(parseInt(id)));

    if (existingIds.length === 0) {
      return sendError(res, 'No records found with the provided IDs', 404);
    }

    // Delete the records
    const deleteQuery = `
      DELETE FROM finance_records 
      WHERE id = ANY($1) 
      RETURNING id, data
    `;
    const result = await query(deleteQuery, [existingIds]);

    sendSuccess(res, {
      deletedCount: result.rows.length,
      deletedIds: result.rows.map(row => row.id),
      notFoundIds: notFoundIds,
      deletedRecords: result.rows
    }, `Successfully deleted ${result.rows.length} finance record(s)`);

  } catch (error) {
    console.error('Error bulk deleting finance records:', error);
    sendError(res, 'Failed to delete finance records', 500, error);
  }
};

// DELETE /api/admin/finances/fields/:fieldname - Delete field from all records
const deleteField = async (req, res) => {
  try {
    const { fieldname } = req.params;

    // Validate field name
    if (!fieldname || fieldname.trim() === '') {
      return sendError(res, 'Field name is required', 400);
    }

    const fieldKey = fieldname.trim();

    // Prevent deletion of critical fields
    const protectedFields = ['id', 'rick', 'rick_no', 'name'];
    if (protectedFields.includes(fieldKey)) {
      return sendError(res, `Cannot delete protected field '${fieldKey}'`, 400);
    }

    // Check if field is being used in any finance records
    const usageCheck = await query(
      `SELECT COUNT(*) as usage_count 
       FROM finance_records 
       WHERE data ? $1`,
      [fieldKey]
    );

    const usageCount = parseInt(usageCheck.rows[0].usage_count);

    if (usageCount === 0) {
      return sendSuccess(res, {
        deletedField: fieldKey,
        usageCount: 0,
        recordsUpdated: 0
      }, `Field '${fieldKey}' was not found in any records`);
    }

    // Remove the field from all finance records
    const updateRecordsQuery = `
      UPDATE finance_records 
      SET data = data - $1,
          updated_at = CURRENT_TIMESTAMP
      WHERE data ? $1
    `;
    await query(updateRecordsQuery, [fieldKey]);

    sendSuccess(res, {
      deletedField: fieldKey,
      usageCount: usageCount,
      recordsUpdated: usageCount
    }, `Field '${fieldKey}' deleted successfully and removed from ${usageCount} record(s)`);

  } catch (error) {
    console.error('Error deleting field:', error);
    sendError(res, 'Failed to delete field', 500, error);
  }
};

// POST /api/admin/finances/upload - Upload Excel file
const uploadFinances = async (req, res) => {
  try {
    // Validate required inputs
    if (!req.file) {
      return sendError(res, 'No Excel file uploaded', 400);
    }

    const { year, month_name } = req.body;
    
    if (!year || !month_name) {
      return sendError(res, 'Year and month_name are required', 400);
    }

    // Parse Excel file into JSON array (each row becomes an object)
    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
// console.log(jsonData);
    // Validate data is not empty
    if (jsonData.length === 0) {
      return sendError(res, 'Excel file is empty', 400);
    }

    // Extract column order from first row (Excel column order)
    const columnOrder = jsonData.length > 0 ? Object.keys(jsonData[0]) : [];

    // Insert each row as a separate record in the same order as Excel
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const insertQuery = `
        INSERT INTO finance_records (data, year, month_name)
        VALUES ($1, $2, $3)
        RETURNING id
      `;

      const insertedIds = [];
      // Loop through jsonData array in order - maintains Excel row order
      for (let i = 0; i < jsonData.length; i++) {
        const rowData = jsonData[i];
        
        // Add Excel row number and column order to the data
        const dataWithMetadata = {
          ...rowData,
          _excel_row: i + 1,        // Track original Excel row position
          _column_order: columnOrder // Track original Excel column order
        };
        
        const result = await client.query(insertQuery, [
          JSON.stringify(dataWithMetadata), 
          year, 
          month_name
        ]);
        insertedIds.push(result.rows[0].id);
      }

      await client.query('COMMIT');

      // Return success response
      return sendSuccess(res, {
        success: true,
        message: 'Finance data uploaded successfully',
        month: month_name,
        year: parseInt(year),
        totalRows: jsonData.length,
        insertedIds: insertedIds,
        firstId: insertedIds[0],
        lastId: insertedIds[insertedIds.length - 1]
      }, `Successfully uploaded ${jsonData.length} finance records`);

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Error uploading Excel file:', error);
    sendError(res, 'Failed to upload Excel file', 500, error);
  }
};

// PUT /api/admin/finances/upload - Update Excel file for existing month
const updateFinances = async (req, res) => {
  try {
    // Validate required inputs
    if (!req.file) {
      return sendError(res, 'No Excel file uploaded', 400);
    }

    const { year, month_name } = req.body;
    
    if (!year || !month_name) {
      return sendError(res, 'Year and month_name are required', 400);
    }

    // Parse Excel file into JSON array (each row becomes an object)
    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

    // Validate data is not empty
    if (jsonData.length === 0) {
      return sendError(res, 'Excel file is empty', 400);
    }

    // Extract column order from first row (Excel column order)
    const columnOrder = jsonData.length > 0 ? Object.keys(jsonData[0]) : [];

    // Check if records exist for this month/year
    const existingRecords = await query(
      'SELECT COUNT(*) as count FROM finance_records WHERE year = $1 AND month_name = $2',
      [year, month_name]
    );

    const recordCount = parseInt(existingRecords.rows[0].count);
    if (recordCount === 0) {
      return sendError(res, `No existing records found for ${month_name} ${year}. Use POST /upload to create new records.`, 404);
    }

    // Update existing records for this month/year
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // First, delete all existing records for this month/year
      const deleteQuery = `
        DELETE FROM finance_records 
        WHERE year = $1 AND month_name = $2
        RETURNING id
      `;
      const deletedResult = await client.query(deleteQuery, [year, month_name]);
      const deletedIds = deletedResult.rows.map(row => row.id);

      // Insert new records with same Excel order
      const insertQuery = `
        INSERT INTO finance_records (data, year, month_name)
        VALUES ($1, $2, $3)
        RETURNING id
      `;

      const insertedIds = [];
      // Loop through jsonData array in order - maintains Excel row order
      for (let i = 0; i < jsonData.length; i++) {
        const rowData = jsonData[i];
        
        // Add Excel row number and column order to the data
        const dataWithMetadata = {
          ...rowData,
          _excel_row: i + 1,        // Track original Excel row position
          _column_order: columnOrder // Track original Excel column order
        };
        
        const result = await client.query(insertQuery, [
          JSON.stringify(dataWithMetadata), 
          year, 
          month_name
        ]);
        insertedIds.push(result.rows[0].id);
      }

      await client.query('COMMIT');

      // Return success response
      return sendSuccess(res, {
        success: true,
        message: 'Finance data updated successfully',
        month: month_name,
        year: parseInt(year),
        totalRows: jsonData.length,
        deletedCount: deletedIds.length,
        insertedCount: insertedIds.length,
        deletedIds: deletedIds,
        insertedIds: insertedIds,
        firstId: insertedIds[0],
        lastId: insertedIds[insertedIds.length - 1]
      }, `Successfully updated ${jsonData.length} finance records for ${month_name} ${year}`);

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Error updating Excel file:', error);
    sendError(res, 'Failed to update Excel file', 500, error);
  }
};

module.exports = {
  getFinances,
  updateFinance,
  deleteFinance,
  bulkDeleteFinances,
  deleteField,
  uploadFinances,
  updateFinances,
  upload
};