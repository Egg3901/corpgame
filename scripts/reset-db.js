const { MongoClient } = require('mongodb');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const readline = require('readline');
const bcrypt = require('bcryptjs');

// Load env vars
function loadEnv() {
  try {
    const envPath = path.join(__dirname, '..', '.env.local');
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf8');
      content.split('\n').forEach(line => {
        const match = line.match(/^([^=]+)=(.*)$/);
        if (match) {
          const key = match[1].trim();
          const value = match[2].trim().replace(/^["']|["']$/g, '');
          process.env[key] = value;
        }
      });
    }
  } catch (e) {
    console.error('Error loading .env.local:', e);
  }
}

loadEnv();

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error('ERROR: MONGODB_URI is not set');
  process.exit(1);
}

const client = new MongoClient(uri);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function askQuestion(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function getNextId(db, sequenceName) {
  const result = await db.collection('counters').findOneAndUpdate(
    { _id: sequenceName },
    { $inc: { seq: 1 } },
    { upsert: true, returnDocument: 'after' }
  );
  return result.seq;
}

async function createDefaultAdmin(db) {
  const username = process.env.DEFAULT_ADMIN_USERNAME || 'fame';
  const email = process.env.DEFAULT_ADMIN_EMAIL || 'spencerhowell84@gmail.com';
  const password = process.env.DEFAULT_ADMIN_PASSWORD || 'fame';

  console.log(`Creating default admin: ${username} (${email})`);

  const existing = await db.collection('users').findOne({ 
    $or: [{ username: username.toLowerCase() }, { email: email.toLowerCase() }] 
  });

  if (existing) {
    console.log('Admin user already exists, skipping creation.');
    return;
  }

  const id = await getNextId(db, 'users_id');
  const profile_id = await getNextId(db, 'users_profile_id');
  const password_hash = await bcrypt.hash(password, 10);
  const now = new Date();

  const user = {
    id,
    profile_id,
    email,
    username,
    email_lower: email.toLowerCase(),
    username_lower: username.toLowerCase(),
    password_hash,
    is_admin: true,
    player_name: 'System Admin',
    cash: 100000000,
    actions: 1000,
    created_at: now,
    profile_slug: 'admin',
    bio: 'The Boss',
    registration_ip: '127.0.0.1'
  };

  await db.collection('users').insertOne(user);
  console.log('Default admin created.');
}

async function runSeedScript() {
  return new Promise((resolve, reject) => {
    console.log('Running seed-states.js...');
    exec('node scripts/seed-states.js', (error, stdout, stderr) => {
      if (error) {
        console.error(`exec error: ${error}`);
        return reject(error);
      }
      console.log(stdout);
      if (stderr) console.error(stderr);
      resolve();
    });
  });
}

async function main() {
  try {
    const answer = await askQuestion('WARNING: This will delete ALL data in the database. Are you sure? (yes/no): ');
    if (answer.toLowerCase() !== 'yes') {
      console.log('Aborted.');
      process.exit(0);
    }

    await client.connect();
    const db = client.db();

    console.log('Dropping database...');
    await db.dropDatabase();
    console.log('Database dropped.');

    await runSeedScript();
    await createDefaultAdmin(db);

    console.log('Database reset and seeded successfully.');
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await client.close();
    rl.close();
  }
}

main();
