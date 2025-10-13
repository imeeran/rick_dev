const { query, pool } = require('../shared/database/connection');

/**
 * Migrate existing users table to new structure
 * This script ALTERS the table without dropping it (data preserved)
 */

async function migrateUsersTable() {
  console.log('🚀 Starting users table migration...\n');
  
  const steps = [];
  let errors = [];

  try {
    // Step 1: Create roles table
    console.log('📋 Step 1: Creating roles table...');
    try {
      await query(`
        CREATE TABLE IF NOT EXISTS roles (
          id SERIAL PRIMARY KEY,
          name VARCHAR(50) UNIQUE NOT NULL,
          description TEXT,
          is_active BOOLEAN DEFAULT true,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )
      `);
      
      await query(`
        INSERT INTO roles (name, description) VALUES 
          ('superadmin', 'Super Administrator with full system access'),
          ('admin', 'Administrator with management access'),
          ('manager', 'Manager with operational access'),
          ('employee', 'Employee with limited access'),
          ('driver', 'Driver with driver-specific access')
        ON CONFLICT (name) DO NOTHING
      `);
      
      console.log('   ✅ Roles table ready\n');
      steps.push('Roles table created');
    } catch (error) {
      console.log('   ⚠️  Error with roles:', error.message);
      errors.push({ step: 'Roles', error: error.message });
    }

    // Step 2: Add missing columns
    console.log('➕ Step 2: Adding missing columns...');
    const columnsToAdd = [
      { name: 'name', type: 'VARCHAR(100)' },
      { name: 'username', type: 'VARCHAR(50)' },
      { name: 'email', type: 'VARCHAR(100)' },
      { name: 'password_hash', type: 'VARCHAR(255)' },
      { name: 'user_dob', type: 'DATE' },
      { name: 'user_contact_num', type: 'VARCHAR(20)' },
      { name: 'role_id', type: 'INTEGER' },
      { name: 'is_active', type: 'BOOLEAN DEFAULT true' },
      { name: 'last_login', type: 'TIMESTAMP WITH TIME ZONE' },
      { name: 'refresh_token', type: 'TEXT' },
      { name: 'join_date', type: 'DATE DEFAULT CURRENT_DATE' },
      { name: 'created_at', type: 'TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP' },
      { name: 'updated_at', type: 'TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP' }
    ];

    for (const col of columnsToAdd) {
      try {
        await query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS ${col.name} ${col.type}`);
        console.log(`   ✅ Added column: ${col.name}`);
      } catch (error) {
        console.log(`   ⚠️  Column ${col.name}: ${error.message}`);
      }
    }
    console.log('');
    steps.push('Columns added');

    // Step 3: Add constraints
    console.log('🔒 Step 3: Adding constraints...');
    try {
      // Unique constraints
      await query('ALTER TABLE users DROP CONSTRAINT IF EXISTS users_username_key CASCADE');
      await query('ALTER TABLE users ADD CONSTRAINT users_username_key UNIQUE (username)');
      console.log('   ✅ Username unique constraint added');
      
      await query('ALTER TABLE users DROP CONSTRAINT IF EXISTS users_email_key CASCADE');
      await query('ALTER TABLE users ADD CONSTRAINT users_email_key UNIQUE (email)');
      console.log('   ✅ Email unique constraint added');
      
      // Foreign key
      await query('ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_id_fkey CASCADE');
      await query(`
        ALTER TABLE users 
        ADD CONSTRAINT users_role_id_fkey 
        FOREIGN KEY (role_id) 
        REFERENCES roles(id) 
        ON DELETE SET NULL
      `);
      console.log('   ✅ Foreign key constraint added\n');
      steps.push('Constraints added');
    } catch (error) {
      console.log('   ⚠️  Error with constraints:', error.message, '\n');
      errors.push({ step: 'Constraints', error: error.message });
    }

    // Step 4: Create indexes
    console.log('📇 Step 4: Creating indexes...');
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)',
      'CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)',
      'CREATE INDEX IF NOT EXISTS idx_users_role_id ON users(role_id)',
      'CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active)',
      'CREATE INDEX IF NOT EXISTS idx_users_last_login ON users(last_login)',
      'CREATE INDEX IF NOT EXISTS idx_users_join_date ON users(join_date)'
    ];

    for (const indexSQL of indexes) {
      try {
        await query(indexSQL);
        const indexName = indexSQL.match(/idx_\w+/)[0];
        console.log(`   ✅ Created index: ${indexName}`);
      } catch (error) {
        console.log(`   ⚠️  Index error: ${error.message}`);
      }
    }
    console.log('');
    steps.push('Indexes created');

    // Step 5: Create triggers
    console.log('⚡ Step 5: Creating triggers...');
    try {
      await query(`
        CREATE OR REPLACE FUNCTION update_users_updated_at()
        RETURNS TRIGGER AS $$
        BEGIN
          NEW.updated_at = CURRENT_TIMESTAMP;
          RETURN NEW;
        END;
        $$ language 'plpgsql'
      `);

      await query('DROP TRIGGER IF EXISTS update_users_updated_at_trigger ON users');
      await query(`
        CREATE TRIGGER update_users_updated_at_trigger
        BEFORE UPDATE ON users
        FOR EACH ROW
        EXECUTE FUNCTION update_users_updated_at()
      `);
      console.log('   ✅ Triggers created\n');
      steps.push('Triggers created');
    } catch (error) {
      console.log('   ⚠️  Error with triggers:', error.message, '\n');
      errors.push({ step: 'Triggers', error: error.message });
    }

    // Step 6: Update existing data
    console.log('🔄 Step 6: Updating existing data...');
    try {
      // Set defaults for NULL values
      await query('UPDATE users SET is_active = true WHERE is_active IS NULL');
      await query('UPDATE users SET join_date = COALESCE(created_at::date, CURRENT_DATE) WHERE join_date IS NULL');
      await query('UPDATE users SET created_at = CURRENT_TIMESTAMP WHERE created_at IS NULL');
      await query('UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE updated_at IS NULL');
      
      // Generate username from email if missing
      await query(`
        UPDATE users 
        SET username = LOWER(SPLIT_PART(email, '@', 1)) 
        WHERE username IS NULL AND email IS NOT NULL
      `);
      
      // Set default role
      await query(`
        UPDATE users 
        SET role_id = (SELECT id FROM roles WHERE name = 'employee' LIMIT 1)
        WHERE role_id IS NULL
      `);
      
      console.log('   ✅ Existing data updated\n');
      steps.push('Data updated');
    } catch (error) {
      console.log('   ⚠️  Error updating data:', error.message, '\n');
      errors.push({ step: 'Data update', error: error.message });
    }

    // Step 7: Verify migration
    console.log('✅ Step 7: Verifying migration...');
    
    const columnsResult = await query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'users'
      ORDER BY ordinal_position
    `);
    console.log(`   ✅ Total columns: ${columnsResult.rows.length}`);

    const indexResult = await query(`
      SELECT COUNT(*) as count
      FROM pg_indexes
      WHERE tablename = 'users'
    `);
    console.log(`   ✅ Total indexes: ${indexResult.rows[0].count}`);

    const statsResult = await query(`
      SELECT 
        COUNT(*) as total_users,
        COUNT(*) FILTER (WHERE is_active = true) as active_users,
        COUNT(*) FILTER (WHERE role_id IS NOT NULL) as users_with_roles
      FROM users
    `);
    console.log(`   ✅ Total users: ${statsResult.rows[0].total_users}`);
    console.log(`   ✅ Active users: ${statsResult.rows[0].active_users}`);
    console.log(`   ✅ Users with roles: ${statsResult.rows[0].users_with_roles}\n`);

    // Summary
    console.log('=' .repeat(60));
    console.log('✅ MIGRATION COMPLETE!');
    console.log('=' .repeat(60));
    console.log('\nSteps completed:');
    steps.forEach((step, idx) => {
      console.log(`  ${idx + 1}. ${step}`);
    });

    if (errors.length > 0) {
      console.log('\n⚠️  Warnings/Errors encountered:');
      errors.forEach(err => {
        console.log(`  - ${err.step}: ${err.error}`);
      });
    }

    console.log('\n📋 Your users table has been updated!');
    console.log('   All existing data has been preserved.\n');

  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run migration
console.log('🔄 Users Table Migration');
console.log('This will ALTER your existing table (data will be preserved)\n');

migrateUsersTable();

