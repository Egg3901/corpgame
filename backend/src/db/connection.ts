import { Pool } from 'pg';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

const ssl = (() => {
  const rootCertPath = process.env.PGSSLROOTCERT;
  if (rootCertPath) {
    return { ca: fs.readFileSync(rootCertPath, 'utf8'), rejectUnauthorized: true };
  }

  if (process.env.PGSSLINSECURE === 'true') {
    return { rejectUnauthorized: false };
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


