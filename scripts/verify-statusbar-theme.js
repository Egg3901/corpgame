
const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../components/ServerTimeFooter.tsx');

try {
  const content = fs.readFileSync(filePath, 'utf8');
  
  const checks = [
    { pattern: /dark:bg-\[#121212\]/, message: 'Dark mode background #121212' },
    { pattern: /bg-white\/95/, message: 'Light mode background bg-white/95' },
    { pattern: /text-content-primary/, message: 'Primary text uses semantic class' },
    { pattern: /text-content-tertiary/, message: 'Tertiary text uses semantic class' }
  ];

  let allPassed = true;

  console.log('Verifying Status Bar Theme Compliance...');
  
  checks.forEach(check => {
    if (check.pattern.test(content)) {
      console.log(`✅ Passed: ${check.message}`);
    } else {
      console.error(`❌ Failed: ${check.message} not found in component`);
      allPassed = false;
    }
  });

  if (allPassed) {
    console.log('\nAll visual regression checks passed!');
    process.exit(0);
  } else {
    console.error('\nVisual regression checks failed!');
    process.exit(1);
  }

} catch (error) {
  console.error('Error reading file:', error);
  process.exit(1);
}
