/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
const dotenv = require('dotenv');

dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('Missing DATABASE_URL (set it in backend/.env or environment).');
  process.exit(1);
}

const migrationsDir = path.join(__dirname, '..', 'migrations');

function listMigrationFiles() {
  return fs
    .readdirSync(migrationsDir, { withFileTypes: true })
    .filter((d) => d.isFile() && /^\d+.*\.sql$/i.test(d.name))
    .map((d) => d.name)
    .sort((a, b) => a.localeCompare(b, 'en', { numeric: true }));
}

async function ensureMigrationsTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      filename TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
}

async function hasMigration(client, filename) {
  const result = await client.query('SELECT 1 FROM schema_migrations WHERE filename = $1', [filename]);
  return result.rowCount > 0;
}

async function applyMigration(client, filename) {
  const fullPath = path.join(migrationsDir, filename);
  const sql = fs.readFileSync(fullPath, 'utf8');

  await client.query('BEGIN');
  try {
    await client.query(sql);
    await client.query('INSERT INTO schema_migrations (filename) VALUES ($1)', [filename]);
    await client.query('COMMIT');
    console.log(`Applied ${filename}`);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error(`Failed ${filename}`);
    throw error;
  }
}

async function main() {
  const pool = new Pool({ connectionString: DATABASE_URL });
  const client = await pool.connect();

  try {
    await ensureMigrationsTable(client);

    const files = listMigrationFiles();
    if (files.length === 0) {
      console.log('No migration files found.');
      return;
    }

    let appliedCount = 0;
    for (const filename of files) {
      // eslint-disable-next-line no-await-in-loop
      const alreadyApplied = await hasMigration(client, filename);
      if (alreadyApplied) {
        console.log(`Skip ${filename} (already applied)`);
        continue;
      }
      // eslint-disable-next-line no-await-in-loop
      await applyMigration(client, filename);
      appliedCount += 1;
    }

    console.log(`Done. Applied ${appliedCount} migration(s).`);
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

