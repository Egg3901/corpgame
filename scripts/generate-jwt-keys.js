const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const generateSecret = () => {
  return crypto.randomBytes(64).toString('hex');
};

const envPath = path.join(__dirname, '..', '.env.local');

let envContent = '';
if (fs.existsSync(envPath)) {
  envContent = fs.readFileSync(envPath, 'utf8');
}

const keys = {
  JWT_SECRET: generateSecret(),
  JWT_REFRESH_SECRET: generateSecret(),
};

let newEnvContent = envContent;

Object.entries(keys).forEach(([key, value]) => {
  const regex = new RegExp(`^${key}=.*`, 'm');
  if (regex.test(newEnvContent)) {
    newEnvContent = newEnvContent.replace(regex, `${key}=${value}`);
  } else {
    newEnvContent += `\n${key}=${value}`;
  }
});

// Ensure permissions (best effort in Node)
// fs.chmodSync(envPath, 0o600); // This might fail on Windows or in this environment, so skipping strict chmod for now.

console.log('Generated new JWT secrets.');
console.log('JWT_SECRET: ' + keys.JWT_SECRET.substring(0, 10) + '...');
console.log('JWT_REFRESH_SECRET: ' + keys.JWT_REFRESH_SECRET.substring(0, 10) + '...');

fs.writeFileSync(envPath, newEnvContent, { encoding: 'utf8', mode: 0o600 });
console.log('Updated .env.local');
