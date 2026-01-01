const { MongoClient } = require('mongodb');
const fs = require('fs');
const path = require('path');
const readline = require('readline');
const bcrypt = require('bcryptjs');

// ============================================================================
// CONFIGURATION
// ============================================================================

const COLLECTIONS_TO_WIPE = [
  'audit_logs',
  'banned_ips',
  'boards',
  'board_messages',
  'board_proposals',
  'business_units',
  'commodity_price_history',
  'corporate_actions',
  'corporations',
  'issues',
  'market_entries',
  'messages',
  'product_price_history',
  'reported_chats',
  'share_price_history',
  'share_transactions',
  'shareholders',
  'transactions',
  'users',
  // Sector config tables - carefully wiped and reseeded
  'sector_configs',
  'sector_unit_configs',
  'sector_unit_inputs',
  'sector_unit_outputs',
  'product_configs',
  'resource_configs',
  // Metadata
  'state_metadata'
];

const COUNTERS_TO_RESET = [
  'users_id', 'users_profile_id',
  'corporations_id', 'business_units_id',
  'messages_id', 'transactions_id',
  'corporate_actions_id', 'issues_id',
  'market_entries_id', 'share_transactions_id',
  'board_proposals_id', 'board_messages_id',
  'boards_id', 'audit_logs_id',
  'sector_configs_id', 'sector_unit_configs_id',
  'sector_unit_inputs_id', 'sector_unit_outputs_id',
  'product_configs_id', 'resource_configs_id'
];

// ============================================================================
// UTILITIES
// ============================================================================

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

async function getNextId(db, sequenceName) {
  const result = await db.collection('counters').findOneAndUpdate(
    { _id: sequenceName },
    { $inc: { seq: 1 } },
    { upsert: true, returnDocument: 'after' }
  );
  return result.seq;
}

// ============================================================================
// MAIN RESET LOGIC
// ============================================================================

async function main() {
  loadEnv();

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('ERROR: MONGODB_URI is not set');
    process.exit(1);
  }

  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log('Connected to MongoDB');
    const db = client.db();

    // 1. WIPE DATA
    console.log('\n--- PHASE 1: WIPING DATA ---');
    for (const collection of COLLECTIONS_TO_WIPE) {
      try {
        const exists = await db.listCollections({ name: collection }).hasNext();
        if (exists) {
          await db.collection(collection).drop();
          console.log(`Dropped collection: ${collection}`);
        }
      } catch (err) {
        console.warn(`Failed to drop ${collection}: ${err.message}`);
      }
    }

    // Reset counters
    console.log('Resetting counters...');
    await db.collection('counters').deleteMany({ _id: { $in: COUNTERS_TO_RESET } });
    
    // 2. RESEED FOUNDATIONAL DATA
    console.log('\n--- PHASE 2: RESEEDING DATA ---');

    // Seed States
    console.log('Seeding States...');
    const seedStates = require('./seed-states-data.js'); // We'll create this file
    await seedStates(db);

    // Seed Sectors
    console.log('Seeding Sector Configuration...');
    const seedSectors = require('./seed-sectors-data.js'); // We'll create this file
    await seedSectors(db, getNextId);

    // 3. CREATE ADMIN
    console.log('\n--- PHASE 3: CREATING ADMIN ---');
    await createDefaultAdmin(db);

    // 4. VERIFICATION
    console.log('\n--- PHASE 4: VERIFICATION ---');
    await verifyReset(db);

    console.log('\n=== RESET COMPLETE SUCCESSFULLY ===');

  } catch (err) {
    console.error('\n!!! RESET FAILED !!!');
    console.error(err);
    process.exit(1);
  } finally {
    await client.close();
  }
}

async function createDefaultAdmin(db) {
  const username = process.env.DEFAULT_ADMIN_USERNAME || 'admin';
  const email = process.env.DEFAULT_ADMIN_EMAIL || 'admin@example.com';
  const password = process.env.DEFAULT_ADMIN_PASSWORD || 'admin123';

  console.log(`Creating default admin: ${username} (${email})`);

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
    gender: 'nonbinary',
    age: 30,
    starting_state: 'DC',
    created_at: now,
    profile_slug: 'admin',
    bio: 'The Boss',
    registration_ip: '127.0.0.1',
    last_login_at: now,
    last_login_ip: '127.0.0.1'
  };

  await db.collection('users').insertOne(user);
  console.log('Default admin created.');
}

async function verifyReset(db) {
  const collections = [
    { name: 'users', min: 1 },
    { name: 'state_metadata', min: 50 },
    { name: 'sector_configs', min: 1 },
    { name: 'product_configs', min: 1 },
    { name: 'resource_configs', min: 1 },
    { name: 'corporations', max: 0 },
    { name: 'messages', max: 0 }
  ];

  for (const check of collections) {
    const count = await db.collection(check.name).countDocuments();
    console.log(`${check.name}: ${count} documents`);
    
    if (check.min !== undefined && count < check.min) {
      throw new Error(`Verification Failed: ${check.name} has ${count} docs, expected at least ${check.min}`);
    }
    if (check.max !== undefined && count > check.max) {
      throw new Error(`Verification Failed: ${check.name} has ${count} docs, expected at most ${check.max}`);
    }
  }
  console.log('All verification checks passed.');
}

// Run if called directly
if (require.main === module) {
  if (process.argv.includes('--force')) {
    main();
  } else {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    rl.question('WARNING: This will WIPE ALL DATA. Type "RESET" to confirm: ', (answer) => {
      rl.close();
      if (answer === 'RESET') {
        main();
      } else {
        console.log('Reset cancelled.');
        process.exit(0);
      }
    });
  }
} else {
  module.exports = main;
}
