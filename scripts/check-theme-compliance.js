const fs = require('fs');
const path = require('path');

const filesToCheck = [
  'app/messages/page.tsx',
  'components/ComposeMessage.tsx',
];

const forbiddenPatterns = [
  { regex: /\bbg-gray-\d+\b/, message: 'Hardcoded gray background' },
  { regex: /\btext-gray-\d+\b/, message: 'Hardcoded gray text' },
  { regex: /\bborder-gray-\d+\b/, message: 'Hardcoded gray border' },
  { regex: /\bbg-corporate-blue\b/, message: 'Hardcoded corporate blue background' },
  { regex: /\btext-corporate-blue\b/, message: 'Hardcoded corporate blue text' },
  { regex: /\bbg-white\b/, message: 'Hardcoded white background (use bg-surface-*)' },
  { regex: /\bbg-red-\d+\b/, message: 'Hardcoded red background' },
  { regex: /\btext-red-\d+\b/, message: 'Hardcoded red text' },
  { regex: /\btext-green-\d+\b/, message: 'Hardcoded green text' },
  { regex: /\btext-blue-\d+\b/, message: 'Hardcoded blue text' },
];

let hasErrors = false;

console.log('Starting Theme Compliance Check...\n');

filesToCheck.forEach(file => {
  const filePath = path.join(process.cwd(), file);
  if (!fs.existsSync(filePath)) {
    console.error(`Error: File not found: ${file}`);
    hasErrors = true;
    return;
  }

  const content = fs.readFileSync(filePath, 'utf8');
  let fileErrors = [];

  forbiddenPatterns.forEach(pattern => {
    const match = content.match(pattern.regex);
    if (match) {
      // Find line number
      const lines = content.split('\n');
      lines.forEach((line, index) => {
        if (pattern.regex.test(line)) {
            // Ignore if it's in a comment (simple check)
            if (line.trim().startsWith('//')) return;
            
            fileErrors.push(`  Line ${index + 1}: ${pattern.message} found: "${match[0]}"`);
        }
      });
    }
  });

  if (fileErrors.length > 0) {
    console.error(`❌ ${file} has theme compliance issues:`);
    fileErrors.forEach(err => console.error(err));
    hasErrors = true;
  } else {
    console.log(`✅ ${file} is compliant.`);
  }
});

if (hasErrors) {
  console.error('\nFAILED: Theme compliance violations found.');
  process.exit(1);
} else {
  console.log('\nPASSED: All checked files are theme compliant.');
  process.exit(0);
}
