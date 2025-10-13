# Drop and Recreate Users Table Guide

## ⚠️ **IMPORTANT WARNING**
Dropping tables will **DELETE ALL DATA PERMANENTLY**. Make sure to backup your data first!

---

## **Method 1: Using the Reset Script (Recommended)**

### Step 1: Backup your data (IMPORTANT!)
```bash
# Export current users data to CSV
psql -U your_username -d rick_db -c "\COPY users TO '/tmp/users_backup.csv' CSV HEADER;"

# Or create a SQL dump
pg_dump -U your_username -d rick_db --table=users --table=roles > users_backup.sql
```

### Step 2: Run the reset script
```bash
psql -U your_username -d rick_db -f database/reset_users.sql
```

This will:
- Drop existing tables (users, roles, and related tables)
- Recreate them using users.sql
- Insert sample data

---

## **Method 2: Manual Step-by-Step**

### Step 1: Connect to database
```bash
psql -U your_username -d rick_db
```

### Step 2: Drop tables in correct order
```sql
-- Drop dependent tables first
DROP TABLE IF EXISTS role_permissions CASCADE;
DROP TABLE IF EXISTS payslips CASCADE;
DROP TABLE IF EXISTS finance_records CASCADE;
DROP TABLE IF EXISTS bookings CASCADE;
DROP TABLE IF EXISTS drivers CASCADE;
DROP TABLE IF EXISTS vehicles CASCADE;
DROP TABLE IF EXISTS comments CASCADE;
DROP TABLE IF EXISTS posts CASCADE;

-- Drop users and roles tables
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS roles CASCADE;

-- Drop functions
DROP FUNCTION IF EXISTS update_users_updated_at() CASCADE;
```

### Step 3: Recreate from script
```sql
\i database/users.sql
```

### Step 4: Verify
```sql
-- Check tables exist
\dt

-- Check sample users were created
SELECT username, email FROM users;
```

---

## **Method 3: Using Node.js Script**

Create a script to drop and recreate programmatically:

```bash
node database/recreate_users.js
```

(Script file created separately)

---

## **Method 4: Drop Only Users Table (Keep Other Data)**

If you want to keep other tables and only recreate users:

```sql
-- Temporarily disable foreign key checks (PostgreSQL doesn't support this directly)
-- So we need to drop constraints, drop table, recreate

-- Drop the users table
DROP TABLE IF EXISTS users CASCADE;

-- Recreate just the users table section from users.sql
-- Run lines 18-30 from users.sql
```

---

## **Method 5: Using CASCADE to Handle Dependencies**

The safest way to drop with all dependencies:

```sql
-- This will drop users table and all dependent objects
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS roles CASCADE;

-- Then recreate
\i database/users.sql
```

---

## **Quick Commands Reference**

### Check what tables exist
```bash
psql -U your_username -d rick_db -c "\dt"
```

### Check users table structure
```bash
psql -U your_username -d rick_db -c "\d users"
```

### Check what depends on users table
```bash
psql -U your_username -d rick_db -c "SELECT 
    tc.table_name, 
    kcu.column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
    ON tc.constraint_name = kcu.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND kcu.table_name != 'users'
    AND tc.constraint_name IN (
        SELECT constraint_name 
        FROM information_schema.constraint_column_usage 
        WHERE table_name = 'users'
    );"
```

### Count users before dropping
```bash
psql -U your_username -d rick_db -c "SELECT COUNT(*) FROM users;"
```

---

## **After Recreation: Important Steps**

### 1. Test Login with Sample Users
```javascript
// Default credentials created:
username: 'admin', password: 'admin123'
username: 'manager', password: 'manager123'
username: 'employee', password: 'employee123'
```

### 2. Verify Roles
```sql
SELECT * FROM roles;
```

### 3. Verify Indexes
```sql
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'users';
```

### 4. Verify Triggers
```sql
SELECT trigger_name, event_manipulation, event_object_table
FROM information_schema.triggers
WHERE event_object_table = 'users';
```

---

## **Troubleshooting**

### Error: "cannot drop table users because other objects depend on it"
**Solution:** Use `CASCADE` option:
```sql
DROP TABLE users CASCADE;
```

### Error: "relation users does not exist"
**Solution:** Table already dropped or doesn't exist. Proceed with creation.

### Error: "role does not exist"
**Solution:** Make sure you're connected as the correct database user:
```bash
psql -U your_db_username -d rick_db
```

### Error: "database rick_db does not exist"
**Solution:** Create the database first:
```bash
createdb rick_db
# or
psql -U postgres -c "CREATE DATABASE rick_db;"
```

---

## **Best Practices**

1. ✅ **Always backup before dropping tables**
2. ✅ **Test on development database first**
3. ✅ **Document what you're doing**
4. ✅ **Verify data after recreation**
5. ✅ **Inform your team if working on shared database**
6. ❌ **Never do this on production without approval**
7. ❌ **Never skip the backup step**

---

## **Database Connection Details**

Check your `config.js` for connection details:
```javascript
{
  host: 'localhost',
  port: 5432,
  database: 'rick_db',
  user: 'your_username',
  password: 'your_password'
}
```

