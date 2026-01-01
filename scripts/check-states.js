const { MongoClient } = require('mongodb');
const fs = require('fs');
const path = require('path');

// Load env vars manually
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
  console.error('ERROR: MONGODB_URI is not set');
  process.exit(1);
}

async function checkStates() {
  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log('Connected to MongoDB');

    const db = client.db();
    const collection = db.collection('state_metadata');

    const count = await collection.countDocuments();
    console.log(`Total states found: ${count}`);

    if (count > 0) {
      const states = await collection.find({}, { projection: { state_code: 1, name: 1, region: 1 } }).sort({ state_code: 1 }).toArray();
      console.log('States present:');
      states.forEach(s => console.log(`${s.state_code}: ${s.name} (${s.region})`));
      
      // Check for missing states
      const US_STATES = [
        'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
        'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
        'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
        'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
        'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY',
        'DC'
      ];
      
      const foundCodes = new Set(states.map(s => s.state_code));
      const missing = US_STATES.filter(code => !foundCodes.has(code));
      
      if (missing.length > 0) {
        console.log('\nMissing states:', missing.join(', '));
      } else {
        console.log('\nAll 50 states + DC are present.');
      }
    } else {
      console.log('No states found in database.');
    }

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await client.close();
  }
}

checkStates();
