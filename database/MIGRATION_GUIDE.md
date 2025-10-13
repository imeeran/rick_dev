# Users Table Migration Guide

## 🎯 Purpose
This guide helps you **ALTER** (modify) your existing users table without losing data, rather than dropping and recreating it.

---

## 📋 What This Migration Does

### ✅ Adds Missing Columns
- `name` - User's full name
- `username` - Unique username
- `email` - Unique email address
- `password_hash` - Encrypted password
- `user_dob` - Date of birth
- `user_contact_num` - Contact number
- `role_id` - Foreign key to roles table
- `is_active` - Active status flag
- `last_login` - Last login timestamp
- `refresh_token` - For JWT refresh tokens
- `join_date` - Date user joined
- `created_at` - Record creation timestamp
- `updated_at` - Record update timestamp

### ✅ Adds Constraints
- Unique constraint on `username`
- Unique constraint on `email`
- Foreign key from `role_id` to `roles.id`

### ✅ Adds Indexes
- Index on `username` (for fast lookups)
- Index on `email` (for fast lookups)
- Index on `role_id` (for joins)
- Index on `is_active` (for filtering)
- Index on `last_login` (for analytics)
- Index on `join_date` (for reports)

### ✅ Adds Triggers
- Auto-update `updated_at` timestamp on record changes

### ✅ Updates Existing Data
- Sets `is_active = true` for existing users
- Generates `username` from `email` if missing
- Sets default `role_id` to 'employee' if missing
- Sets timestamps for old records

---

## 🚀 How to Run Migration

### **Method 1: Using Node.js (Recommended)**

```bash
node database/migrate_users_table.js
```

**Advantages:**
- ✅ Shows detailed progress
- ✅ Handles errors gracefully
- ✅ Provides verification
- ✅ No password in command line

---

### **Method 2: Using SQL File**

```bash
PGPASSWORD="FesY8XYcICHswt2UUmtBR02jFWV8MadY" psql \
  -h dpg-d3ls3hogjchc73cm1r5g-a.oregon-postgres.render.com \
  -p 5432 \
  -U dev_rick_user \
  -d dev_rick \
  -f database/migrate_users_table.sql
```

---

### **Method 3: Interactive psql**

```bash
# Connect to database
PGPASSWORD="FesY8XYcICHswt2UUmtBR02jFWV8MadY" psql \
  -h dpg-d3ls3hogjchc73cm1r5g-a.oregon-postgres.render.com \
  -p 5432 \
  -U dev_rick_user \
  -d dev_rick

# Then run the migration file
\i database/migrate_users_table.sql
```

---

## 🔍 Before Running Migration

### Check Current Structure
```bash
node database/check_current_structure.js
```

This will show you:
- Current columns and their types
- Existing constraints
- Current indexes
- Sample data

---

## 🛡️ Safety Features

### 1. **Non-Destructive**
- Uses `ADD COLUMN IF NOT EXISTS` - won't fail if column already exists
- Uses `CREATE INDEX IF NOT EXISTS` - won't recreate existing indexes
- All existing data is preserved

### 2. **Idempotent**
- Safe to run multiple times
- Won't cause errors if already migrated
- Can be used to fix partial migrations

### 3. **No Data Loss**
- Only adds columns, never removes them
- Existing data remains intact
- New columns are nullable by default

---

## ⚠️ Important Notes

### Removing Old Columns
If you want to **remove** old columns that are no longer needed, you need to do it manually:

```sql
-- ⚠️ CAUTION: This will permanently delete data!
-- Only run this if you're sure you don't need this column

ALTER TABLE users DROP COLUMN old_column_name;
```

### Handling Conflicts
If you have existing columns with different types:

```sql
-- Change column type (be careful with existing data!)
ALTER TABLE users ALTER COLUMN column_name TYPE new_type;

-- Example: Change varchar(20) to varchar(50)
ALTER TABLE users ALTER COLUMN username TYPE VARCHAR(50);
```

---

## ✅ After Migration: Verification

### Check Table Structure
```sql
\d users
```

### Count Records
```sql
SELECT 
    COUNT(*) as total,
    COUNT(*) FILTER (WHERE username IS NOT NULL) as has_username,
    COUNT(*) FILTER (WHERE role_id IS NOT NULL) as has_role
FROM users;
```

### View Sample Data
```sql
SELECT id, username, email, role_id, is_active, join_date 
FROM users 
LIMIT 5;
```

### Check Roles Assignment
```sql
SELECT r.name as role, COUNT(u.id) as user_count
FROM roles r
LEFT JOIN users u ON r.id = u.role_id
GROUP BY r.name
ORDER BY user_count DESC;
```

---

## 🔧 Common Migration Scenarios

### Scenario 1: You have users but no roles
```sql
-- Migration will:
-- 1. Create roles table
-- 2. Add role_id column
-- 3. Set all users to 'employee' role by default
```

### Scenario 2: You have text-based roles (not role_id)
```sql
-- First, map old roles to new role_ids
UPDATE users u
SET role_id = r.id
FROM roles r
WHERE u.old_role_column = r.name;

-- Then drop old column (optional)
-- ALTER TABLE users DROP COLUMN old_role_column;
```

### Scenario 3: No username, only email
```sql
-- Migration will automatically generate username from email
-- email: john.doe@example.com → username: john.doe
```

### Scenario 4: Different field names
```sql
-- If your current table uses different names, map them first:
ALTER TABLE users RENAME COLUMN user_email TO email;
ALTER TABLE users RENAME COLUMN user_name TO name;
-- Then run the migration
```

---

## 🐛 Troubleshooting

### Error: "column already exists"
**Solution:** This is normal if the column was partially added. The script will skip it.

### Error: "unique constraint violation"
**Solution:** You have duplicate usernames or emails. Clean them up first:
```sql
-- Find duplicates
SELECT username, COUNT(*) 
FROM users 
GROUP BY username 
HAVING COUNT(*) > 1;

-- Update duplicates to make them unique
UPDATE users 
SET username = username || '_' || id 
WHERE id IN (SELECT id FROM duplicate_list);
```

### Error: "foreign key constraint violation"
**Solution:** You have role_id values that don't exist in roles table:
```sql
-- Find orphaned role_ids
SELECT DISTINCT u.role_id 
FROM users u
LEFT JOIN roles r ON u.role_id = r.id
WHERE u.role_id IS NOT NULL AND r.id IS NULL;

-- Set them to NULL or valid role_id
UPDATE users SET role_id = NULL WHERE role_id NOT IN (SELECT id FROM roles);
```

---

## 📊 Migration Checklist

Before migration:
- [ ] Backup your database
- [ ] Check current table structure
- [ ] Document custom columns you want to keep
- [ ] Note any custom constraints or indexes

During migration:
- [ ] Run the migration script
- [ ] Check for errors in output
- [ ] Verify column count increased

After migration:
- [ ] Verify table structure
- [ ] Check sample data
- [ ] Test login functionality
- [ ] Verify all existing users are accessible
- [ ] Check that roles are properly assigned

---

## 💾 Backup Commands

### Full Database Backup
```bash
pg_dump -h dpg-d3ls3hogjchc73cm1r5g-a.oregon-postgres.render.com \
  -p 5432 -U dev_rick_user -d dev_rick \
  > backup_$(date +%Y%m%d).sql
```

### Users Table Only
```bash
pg_dump -h dpg-d3ls3hogjchc73cm1r5g-a.oregon-postgres.render.com \
  -p 5432 -U dev_rick_user -d dev_rick \
  --table=users > users_backup_$(date +%Y%m%d).sql
```

### Export to CSV
```bash
psql -h dpg-d3ls3hogjchc73cm1r5g-a.oregon-postgres.render.com \
  -p 5432 -U dev_rick_user -d dev_rick \
  -c "\COPY users TO 'users_backup.csv' CSV HEADER"
```

---

## 🎉 Success Indicators

After migration, you should see:
- ✅ All original users still exist
- ✅ New columns added with default values
- ✅ Indexes created for performance
- ✅ Triggers working (updated_at changes on update)
- ✅ No login errors in your application
- ✅ All existing functionality works

---

## 📞 Need Help?

If migration fails:
1. Check the error message
2. Look up the error in Troubleshooting section
3. Check database logs
4. Restore from backup if needed
5. Try running individual SQL statements to identify the issue

Remember: The migration is designed to be **safe and non-destructive**. Your data will not be lost!

