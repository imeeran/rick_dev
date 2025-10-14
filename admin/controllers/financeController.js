const { query, pool } = require('../../shared/database/connection');
const { sendSuccess, sendError, sendNotFound, sendValidationError } = require('../../shared/utils/response');
const multer = require('multer');
const XLSX = require('xlsx');

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Helper function to get default values based on field type
const getDefaultValue = (fieldType) => {
  switch (fieldType) {
    case 'currency':
    case 'number':
      return 0;
    case 'date':
      return null;
    case 'text':
    default:
      return '';
  }
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

    // Get current field metadata
    const fieldsQuery = `
      SELECT field_key, field_label, field_type, sortable, highlight, hidden, display_order, category
      FROM field_metadata 
      WHERE is_active = true
      ORDER BY display_order ASC
    `;
    const fieldsResult = await query(fieldsQuery);
    const fields = fieldsResult.rows;

    // Build dynamic query based on JSON fields
    let whereClause = '';
    let queryParams = [];
    let paramCount = 0;

    // Search in name field (or any text field)
    if (search) {
      paramCount++;
      whereClause += `WHERE data->>'name' ILIKE $${paramCount}`;
      queryParams.push(`%${search}%`);
    }

    // Year filtering - filter by year column
    if (year) {
      paramCount++;
      const yearCondition = whereClause ? 'AND' : 'WHERE';
      whereClause += ` ${yearCondition} year = $${paramCount}`;
      queryParams.push(year);
    }

    // Month filtering - filter by month_name column (case-insensitive)
    if (month) {
      paramCount++;
      const monthCondition = whereClause ? 'AND' : 'WHERE';
      whereClause += ` ${monthCondition} LOWER(month_name) = LOWER($${paramCount})`;
      queryParams.push(month);
    }

    // Dynamic sorting - handle JSON field sorting
    let orderClause = '';
    if (sort && fields.some(f => f.field_key === sort && f.sortable)) {
      const fieldType = fields.find(f => f.field_key === sort)?.field_type || 'text';
      const sortOrder = order.toLowerCase() === 'desc' ? 'DESC' : 'ASC';
      
      if (['currency', 'number'].includes(fieldType)) {
        orderClause = `ORDER BY (data->>'${sort}')::numeric ${sortOrder}`;
      } else {
        orderClause = `ORDER BY data->>'${sort}' ${sortOrder}`;
      }
    } else {
      orderClause = `ORDER BY created_at DESC`;
    }

    // Pagination
    const offset = page * size;
    paramCount += 2;
    const limitClause = `LIMIT $${paramCount - 1} OFFSET $${paramCount}`;
    queryParams.push(size, offset);

    const selectQuery = `
      SELECT id, data, year, month_name, created_at, updated_at FROM finance_records 
      ${whereClause} 
      ${orderClause} 
      ${limitClause}
    `;

    const countQuery = `
      SELECT COUNT(*) as total FROM finance_records 
      ${whereClause}
    `;

    const [dataResult, countResult] = await Promise.all([
      query(selectQuery, queryParams),
      query(countQuery, queryParams.slice(0, -2))
    ]);

    const total = parseInt(countResult.rows[0].total);
    const totalPages = Math.ceil(total / size);

    // Transform data to include all fields with proper structure
    const transformedData = dataResult.rows.map(row => {
      const record = {
        id: row.id,
        year: row.year,
        month_name: row.month_name,
        created_at: row.created_at,
        updated_at: row.updated_at
      };
      
      // Add all configured fields to the record
      fields.forEach(field => {
        record[field.field_key] = row.data[field.field_key] || getDefaultValue(field.field_type);
      });
      
      return record;
    });

    sendSuccess(res, {
      data: transformedData,
      pagination: {
        page: parseInt(page),
        size: parseInt(size),
        totalPages,
        total,
        startIndex: offset,
        endIndex: Math.min(offset + size - 1, total - 1)
      },
      fields: fields.map(field => ({
        key: field.field_key,
        label: field.field_label,
        type: field.field_type,
        sortable: field.sortable,
        highlight: field.highlight,
        hidden: field.hidden,
        displayOrder: field.display_order,
        category: field.category
      }))
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

    // Check if record exists
    const existingRecord = await query(
      'SELECT id, data FROM finance_records WHERE id = $1',
      [id]
    );

    if (existingRecord.rows.length === 0) {
      return sendNotFound(res, 'Finance record');
    }

    // Merge existing data with update data
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

    // Get field metadata for response formatting
    const fieldsQuery = `
      SELECT field_key, field_label, field_type, sortable, highlight, hidden, display_order, category
      FROM field_metadata 
      WHERE is_active = true
      ORDER BY display_order ASC
    `;
    const fieldsResult = await query(fieldsQuery);
    const fields = fieldsResult.rows;

    // Transform response data
    const updatedRecord = {
      id: result.rows[0].id,
      year: result.rows[0].year,
      month_name: result.rows[0].month_name,
      created_at: result.rows[0].created_at,
      updated_at: result.rows[0].updated_at
    };

    // Add all configured fields to the record
    fields.forEach(field => {
      updatedRecord[field.field_key] = result.rows[0].data[field.field_key] || getDefaultValue(field.field_type);
    });

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

// DELETE /api/admin/finances/fields/:fieldname - Delete field metadata
const deleteField = async (req, res) => {
  try {
    const { fieldname } = req.params;

    // Validate field name
    if (!fieldname || fieldname.trim() === '') {
      return sendError(res, 'Field name is required', 400);
    }

    const fieldKey = fieldname.trim();

    // Check if field exists
    const existingField = await query(
      'SELECT id, field_key, field_label FROM field_metadata WHERE field_key = $1',
      [fieldKey]
    );

    if (existingField.rows.length === 0) {
      return sendNotFound(res, `Field '${fieldKey}'`);
    }

    const field = existingField.rows[0];

    // Check if field is being used in any finance records
    const usageCheck = await query(
      `SELECT COUNT(*) as usage_count 
       FROM finance_records 
       WHERE data ? $1`,
      [fieldKey]
    );

    const usageCount = parseInt(usageCheck.rows[0].usage_count);

    // Delete the field metadata
    const deleteQuery = 'DELETE FROM field_metadata WHERE field_key = $1 RETURNING *';
    const result = await query(deleteQuery, [fieldKey]);

    // If field was being used, also remove it from all finance records
    if (usageCount > 0) {
      const updateRecordsQuery = `
        UPDATE finance_records 
        SET data = data - $1,
            updated_at = CURRENT_TIMESTAMP
        WHERE data ? $1
      `;
      await query(updateRecordsQuery, [fieldKey]);
    }

    sendSuccess(res, {
      deletedField: {
        id: result.rows[0].id,
        field_key: result.rows[0].field_key,
        field_label: result.rows[0].field_label,
        field_type: result.rows[0].field_type
      },
      usageCount: usageCount,
      recordsUpdated: usageCount > 0 ? usageCount : 0
    }, `Field '${fieldKey}' deleted successfully${usageCount > 0 ? ` and removed from ${usageCount} record(s)` : ''}`);

  } catch (error) {
    console.error('Error deleting field:', error);
    sendError(res, 'Failed to delete field', 500, error);
  }
};

// POST /api/admin/finances/upload - Upload Excel file
const uploadFinances = async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'No Excel file uploaded'
        });
      }

      // Extract year and month_name from request body
      const { year, month_name } = req.body;
      
      // Validate year and month_name
      if (!year || !month_name) {
        return res.status(400).json({
          success: false,
          message: 'Year and month_name are required'
        });
      }
  
      // Parse Excel file
      const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
  
      if (jsonData.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Excel file is empty'
        });
      }
  
      const headers = jsonData[0];
      const dataRows = jsonData.slice(1);
  
      // Auto-discover new fields from Excel headers
      const discoveredFields = await discoverAndCreateFields(headers);

      // Check if this is the first upload (table is empty)
      const countResult = await query('SELECT COUNT(*) as total FROM finance_records');
      const isFirstUpload = parseInt(countResult.rows[0].total) === 0;
  
      // Process data rows
      const processedData = [];
      const rejectedRows = [];
      
      dataRows.forEach((row, rowIndex) => {
        // Skip empty rows
        if (row.every(cell => cell === null || cell === undefined || cell === '')) {
          return;
        }
  
        const recordData = {};
        headers.forEach((header, index) => {
          if (header) {
            const fieldKey = sanitizeFieldKey(header.toString());
            const cellValue = row[index] || '';
            recordData[fieldKey] = processCellValue(cellValue);
          }
        });
  
        // Only process records with some meaningful data
        if (Object.keys(recordData).length > 0) {
          // Check if 'rick' field is available and has a value
          if (!recordData.rick || recordData.rick.toString().trim() === '') {
            rejectedRows.push({
              rowNumber: rowIndex + 2, // +2 because: +1 for 0-based index, +1 for header row
              data: recordData,
              reason: 'Missing or empty rick field'
            });
          } else {
            // Add to processed data for further validation
            processedData.push({
              ...recordData,
              rowNumber: rowIndex + 2
            });
          }
        }
      });
  
      // If no valid records after rick validation
      if (processedData.length === 0) {
        // Only show error if it's not the first upload
        if (!isFirstUpload) {
          return sendSuccess(res, {
            totalRows: dataRows.length,
            validRows: 0,
            insertedRows: 0,
            rejectedRows: rejectedRows.length,
            records: [],
            discoveredFields: discoveredFields,
            rejectedData: rejectedRows
          }, rejectedRows.length > 0 
            ? `Upload completed but no records were inserted. All ${rejectedRows.length} rows were rejected due to missing or empty 'rick' field.`
            : 'Upload completed but no valid records found in Excel file');
        }
        // For first upload, continue even with no valid data to avoid blocking
      }

      // Check if any rick IDs from Excel already exist in finance_records table
      const rickIdsInExcel = processedData.map(record => record.rick ? record.rick.toString().trim() : '').filter(id => id);
      let hasExistingRecords = false;
      
      if (!isFirstUpload && rickIdsInExcel.length > 0) {
        // Check if any of the rick IDs from Excel already exist in the table
        const existingCheck = await query(
          `SELECT COUNT(*) as count FROM finance_records 
           WHERE data->>'rick' = ANY($1)`,
          [rickIdsInExcel]
        );
        hasExistingRecords = parseInt(existingCheck.rows[0].count) > 0;
      }

      // Prepare validated data - skip validation if first upload or if rick IDs already exist
      const validatedData = [];
      
      if (isFirstUpload || hasExistingRecords) {
        // Scenario 1: Table is empty (first upload) - insert all data
        // Scenario 2: Rick IDs from Excel already exist in table - insert all data
        for (const record of processedData) {
          const { rowNumber, ...cleanRecord } = record;
          validatedData.push(cleanRecord);
        }
        // Clear rejected rows since we're accepting all
        rejectedRows.length = 0;
      } else {
        // Only validate if table has data but none of the rick IDs match
        // This shouldn't normally happen, but keeping validation for safety
        for (const record of processedData) {
          const { rowNumber, ...cleanRecord } = record;
          validatedData.push(cleanRecord);
        }
        // Clear rejected rows - always accept data
        rejectedRows.length = 0;
      }

      // If no valid records
      if (validatedData.length === 0) {
        return sendSuccess(res, {
          totalRows: dataRows.length,
          validRows: 0,
          insertedRows: 0,
          rejectedRows: rejectedRows.length,
          records: [],
          discoveredFields: discoveredFields,
          rejectedData: rejectedRows.length > 0 ? rejectedRows : undefined,
          isFirstUpload: isFirstUpload
        }, 'Upload completed. Field structure created but no valid records were inserted.');
      }

      // Always INSERT new records (never update)
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
  
        const insertedRecords = [];
        for (const recordData of validatedData) {
          // Use year and month_name from request body for all records
          const insertQuery = `
            INSERT INTO finance_records (data, year, month_name)
            VALUES ($1, $2, $3)
            RETURNING *
          `;
  
          const result = await client.query(insertQuery, [JSON.stringify(recordData), year, month_name]);
          insertedRecords.push({
            id: result.rows[0].id,
            year: result.rows[0].year,
            month_name: result.rows[0].month_name,
            ...recordData,
            created_at: result.rows[0].created_at
          });
        }
  
        await client.query('COMMIT');
  
        const successMessage = isFirstUpload 
          ? `First ledger uploaded successfully! Created ${insertedRecords.length} new records for ${month_name} ${year}`
          : `Successfully uploaded ${insertedRecords.length} finance records for ${month_name} ${year}`;

        return sendSuccess(res, {
          totalRows: dataRows.length,
          validRows: validatedData.length,
          insertedRows: insertedRecords.length,
          rejectedRows: rejectedRows.length,
          year: year,
          month_name: month_name,
          records: insertedRecords,
          discoveredFields: discoveredFields,
          rejectedData: rejectedRows.length > 0 ? rejectedRows : undefined,
          isFirstUpload: isFirstUpload,
          hasExistingRecords: hasExistingRecords
        }, successMessage);
  
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

// Auto-discover fields from Excel headers
const discoverAndCreateFields = async (headers) => {
const discoveredFields = [];

for (const header of headers) {
    if (header) {
    const fieldKey = sanitizeFieldKey(header.toString());
    const fieldLabel = header.toString().trim();
    
    // Check if field already exists
    const existingField = await pool.query(
        'SELECT field_key FROM field_metadata WHERE field_key = $1',
        [fieldKey]
    );
    
    if (existingField.rows.length === 0) {
        // Auto-detect field type based on name
        const fieldType = detectFieldType(fieldLabel);
        
        // Insert new field
        await pool.query(`
        INSERT INTO field_metadata (field_key, field_label, field_type, display_order)
        VALUES ($1, $2, $3, (SELECT COALESCE(MAX(display_order), 0) + 1 FROM field_metadata))
        `, [fieldKey, fieldLabel, fieldType]);
        
        discoveredFields.push({
        field_key: fieldKey,
        field_label: fieldLabel,
        field_type: fieldType
        });
    }
    }
}

return discoveredFields;
};

// Sanitize field key for database
const sanitizeFieldKey = (header) => {
return header
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
};

// Auto-detect field type based on field name
const detectFieldType = (fieldLabel) => {
const label = fieldLabel.toLowerCase();

if (label.includes('salary') || label.includes('amount') || label.includes('price') || 
    label.includes('cost') || label.includes('fee') || label.includes('daman') ||
    label.includes('darb') || label.includes('fine') || label.includes('salik') ||
    label.includes('pos') || label.includes('advance') || label.includes('adnoc') ||
    label.includes('trip') || label.includes('uber') || label.includes('careem') ||
    label.includes('yango') || label.includes('exp')) {
    return 'currency';
}

if (label.includes('date') || label.includes('time')) {
    return 'date';
}

if (label.includes('count') || label.includes('number') || label.includes('qty') ||
    label.includes('quantity')) {
    return 'number';
}

return 'text';
};

// Process cell value
const processCellValue = (cellValue) => {
if (cellValue === null || cellValue === undefined || cellValue === '') {
    return '';
}

// Try to parse as number first
if (!isNaN(cellValue) && !isNaN(parseFloat(cellValue))) {
    return parseFloat(cellValue);
}

return cellValue.toString().trim();
};

module.exports = {
  getFinances,
  updateFinance,
  deleteFinance,
  bulkDeleteFinances,
  deleteField,
  uploadFinances,
  upload
};