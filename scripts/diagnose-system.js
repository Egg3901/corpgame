const { MongoClient } = require('mongodb');
const fs = require('fs');
const path = require('path');

// Load env vars manually since we're not using next-env/dotenv here for simplicity
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
      console.log('Loaded .env.local');
    } else {
      console.log('No .env.local found');
    }
  } catch (e) {
    console.error('Error loading .env.local:', e);
  }
}

loadEnv();

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error('ERROR: MONGODB_URI is not set in environment or .env.local');
  process.exit(1);
}

console.log('Connecting to MongoDB...');
// Mask credentials in logs
const maskedUri = uri.replace(/:\/\/([^:]+):([^@]+)@/, '://***:***@');
console.log(`URI: ${maskedUri}`);

async function diagnose() {
  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log('✅ Connected successfully to server');

    const db = client.db();
    console.log(`Using database: ${db.databaseName}`);

    // 1. List Collections
    const collections = await db.listCollections().toArray();
    console.log('\n--- Collections ---');
    console.log(collections.map(c => c.name).join(', '));

    // 2. Check Counters
    console.log('\n--- Counters Collection ---');
    const counters = await db.collection('counters').find({}).toArray();
    console.log('Documents:', JSON.stringify(counters, null, 2));

    // 3. Check Users
    console.log('\n--- Users Collection ---');
    const userCount = await db.collection('users').countDocuments();
    console.log(`Total Users: ${userCount}`);
    
    const users = await db.collection('users').find({}).toArray();
    console.log('User IDs present:', users.map(u => ({ id: u.id, username: u.username, email: u.email })));

    if (users.length > 0) {
      console.log('Sample User (first one):');
      console.log(JSON.stringify(users[0], null, 2));
    } else {
      console.log('⚠️ NO USERS FOUND. This explains "User not found" errors.');
    }

    // 4. Test Sequence Increment
    console.log('\n--- Testing Sequence Increment ---');
    try {
      const result = await db.collection('counters').findOneAndUpdate(
        { _id: 'test_seq' },
        { $inc: { seq: 1 } },
        { upsert: true, returnDocument: 'after' }
      );
      console.log('Increment result:', JSON.stringify(result, null, 2));
      console.log('✅ Sequence increment works (Driver compatibility check passed)');
    } catch (e) {
      console.error('❌ Sequence increment FAILED:', e.message);
    }

  } catch (err) {
    console.error('❌ Diagnosis FAILED:', err);
  } finally {
    await client.close();
  }
}

diagnose();
