import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

const possibleEnvPaths = [
  path.join(__dirname, '..', '..', '.env'),
  path.join(process.cwd(), '.env'),
  path.join(process.cwd(), 'backend', '.env'),
];

console.log('Checking environment variables...');
console.log('Current working directory:', process.cwd());

for (const envPath of possibleEnvPaths) {
  if (fs.existsSync(envPath)) {
    console.log('Found .env at:', envPath);
    dotenv.config({ path: envPath });
  }
}

console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'SET' : 'NOT SET');
if (process.env.DATABASE_URL) {
  console.log('DATABASE_URL starts with:', process.env.DATABASE_URL.substring(0, 20) + '...');
}
