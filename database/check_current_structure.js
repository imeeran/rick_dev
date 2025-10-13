const { query, pool } = require('../shared/database/connection');

/**
 * Script to check current users table structure
 */

async function checkStructure() {
  try {
    console.log('🔍 Checking current users table structure...\n');
    console.log('=' .repeat(80));
    
    // Get table columns
    const columnsResult = await query(`
      SELECT 
        column_name,
        data_type,
        character_maximum_length,
        column_default,
        is_nullable,
        udt_name
      FROM information_schema.columns
      WHERE table_name = 'users'
      ORDER BY ordinal_position;
    `);

    if (columnsResult.rows.length === 0) {
      console.log('❌ Users table does not exist!\n');
      process.exit(1);
    }

    console.log('📋 CURRENT COLUMNS:');
    console.log('=' .repeat(80));
    columnsResult.rows.forEach(col => {
      const nullable = col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL';
      const length = col.character_maximum_length ? `(${col.character_maximum_length})` : '';
      const defaultVal = col.column_default ? `DEFAULT ${col.column_default}` : '';
      console.log(`  ${col.column_name.padEnd(25)} ${col.data_type}${length.padEnd(10)} ${nullable.padEnd(10)} ${defaultVal}`);
    });

    // Get constraints
    console.log('\n' + '=' .repeat(80));
    console.log('🔒 CONSTRAINTS:');
    console.log('=' .repeat(80));
    const constraintsResult = await query(`
      SELECT 
        tc.constraint_name,
        tc.constraint_type,
        kcu.column_name
      FROM information_schema.table_constraints tc
      LEFT JOIN information_schema.key_column_usage kcu 
        ON tc.constraint_name = kcu.constraint_name
      WHERE tc.table_name = 'users'
      ORDER BY tc.constraint_type, tc.constraint_name;
    `);

    constraintsResult.rows.forEach(constraint => {
      console.log(`  ${constraint.constraint_type.padEnd(15)} ${constraint.constraint_name.padEnd(30)} on ${constraint.column_name || 'multiple columns'}`);
    });

    // Get indexes
    console.log('\n' + '=' .repeat(80));
    console.log('📇 INDEXES:');
    console.log('=' .repeat(80));
    const indexesResult = await query(`
      SELECT 
        indexname,
        indexdef
      FROM pg_indexes
      WHERE tablename = 'users'
      ORDER BY indexname;
    `);

    indexesResult.rows.forEach(index => {
      console.log(`  ${index.indexname}`);
      console.log(`    ${index.indexdef}\n`);
    });

    // Get foreign keys
    console.log('=' .repeat(80));
    console.log('🔗 FOREIGN KEYS:');
    console.log('=' .repeat(80));
    const fkResult = await query(`
      SELECT
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY' 
        AND tc.table_name = 'users';
    `);

    if (fkResult.rows.length > 0) {
      fkResult.rows.forEach(fk => {
        console.log(`  ${fk.column_name} -> ${fk.foreign_table_name}.${fk.foreign_column_name}`);
      });
    } else {
      console.log('  No foreign keys found');
    }

    // Sample data
    console.log('\n' + '=' .repeat(80));
    console.log('📊 SAMPLE DATA (First 3 rows):');
    console.log('=' .repeat(80));
    const sampleData = await query('SELECT * FROM users LIMIT 3');
    
    if (sampleData.rows.length > 0) {
      console.log('\nColumns:', Object.keys(sampleData.rows[0]).join(', '));
      sampleData.rows.forEach((row, idx) => {
        console.log(`\nRow ${idx + 1}:`);
        Object.entries(row).forEach(([key, value]) => {
          console.log(`  ${key}: ${value}`);
        });
      });
    } else {
      console.log('  No data in users table');
    }

    console.log('\n' + '=' .repeat(80));
    console.log('✅ Analysis complete!\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await pool.end();
  }
}

checkStructure();

