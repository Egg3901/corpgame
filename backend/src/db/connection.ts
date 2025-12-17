import { Pool } from 'pg';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

const ssl = (() => {
  const insecure = (process.env.PGSSLINSECURE || '').trim().toLowerCase();
  if (insecure === 'true' || insecure === '1' || insecure === 'yes') {
    return { rejectUnauthorized: false };
  }

  const rootCertPath = process.env.PGSSLROOTCERT;
  if (rootCertPath) {
    const ca = fs.readFileSync(rootCertPath.trim(), 'utf8');
    let servername: string | undefined;
    try {
      servername = new URL(process.env.DATABASE_URL || '').hostname;
    } catch {
      servername = undefined;
    }
    return { ca, rejectUnauthorized: true, servername };
  }

  return undefined;
})();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl,
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

export default pool;
