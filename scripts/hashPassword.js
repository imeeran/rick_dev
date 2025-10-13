// Quick script to generate a hashed password
const bcrypt = require('bcrypt');

const password = process.argv[2] || 'Admin@123';

bcrypt.hash(password, 10, (err, hash) => {
  if (err) {
    console.error('Error hashing password:', err);
    return;
  }
  
  console.log('\n========================================');
  console.log('Password Hash Generated Successfully!');
  console.log('========================================');
  console.log('\nOriginal Password:', password);
  console.log('\nHashed Password:');
  console.log(hash);
  console.log('\n========================================');
  console.log('\nCopy the SQL query below:\n');
  console.log(`INSERT INTO users (name, email, username, password, role_id, is_active)`);
  console.log(`VALUES (`);
  console.log(`    'Super Admin',`);
  console.log(`    'admin@example.com',`);
  console.log(`    'superadmin',`);
  console.log(`    '${hash}',`);
  console.log(`    (SELECT id FROM roles WHERE name = 'superadmin'),`);
  console.log(`    true`);
  console.log(`)
ON CONFLICT (email) DO UPDATE
SET password = '${hash}', 
    role_id = (SELECT id FROM roles WHERE name = 'superadmin'),
    is_active = true;`);
  console.log('\n========================================\n');
});


