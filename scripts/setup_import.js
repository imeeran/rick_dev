const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔧 Setting up data import tools...');

try {
    // Check if required packages are installed
    const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8'));
    
    const requiredPackages = ['csv-parser', 'bcrypt'];
    const missingPackages = requiredPackages.filter(pkg => !packageJson.dependencies[pkg]);
    
    if (missingPackages.length > 0) {
        console.log(`📦 Installing missing packages: ${missingPackages.join(', ')}`);
        execSync(`npm install ${missingPackages.join(' ')}`, { stdio: 'inherit' });
    } else {
        console.log('✅ All required packages are already installed');
    }
    
    // Create data directory if it doesn't exist
    const dataDir = path.join(__dirname, '..', 'data');
    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
        console.log(`📁 Created data directory: ${dataDir}`);
    }
    
    // Check if template files exist
    const templates = [
        'vehicles_template.csv',
        'drivers_template.csv',
        'bookings_template.csv'
    ];
    
    console.log('\n📋 Template files available:');
    templates.forEach(template => {
        const templatePath = path.join(dataDir, template);
        if (fs.existsSync(templatePath)) {
            console.log(`   ✅ ${template}`);
        } else {
            console.log(`   ❌ ${template} (missing)`);
        }
    });
    
    console.log('\n🎉 Setup completed successfully!');
    console.log('\n📖 Next steps:');
    console.log('1. Replace template CSV files with your actual data');
    console.log('2. Make sure column headers match the template files');
    console.log('3. Run: node scripts/import_data.js');
    console.log('\n💡 Or use the import functions directly in your code:');
    console.log('   const { importVehicles, importDrivers, importBookings } = require("./scripts/import_data.js");');
    
} catch (error) {
    console.error('❌ Setup failed:', error.message);
    process.exit(1);
}
