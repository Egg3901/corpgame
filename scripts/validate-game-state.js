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
          const value = match[2].trim().replace(/^['"]|['"]$/g, ''); // Remove quotes
          process.env[key] = value;
        }
      });
      console.log('Loaded .env.local');
    } else {
      console.log('.env.local not found');
    }
  } catch (error) {
    console.error('Error loading .env.local:', error);
  }
}

loadEnv();

async function validateGameState() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('MONGODB_URI not found');
    process.exit(1);
  }

  const client = new MongoClient(uri);
  const issues = [];

  try {
    await client.connect();
    console.log('Connected to MongoDB. Starting validation...\n');
    const db = client.db();

    // 1. Validate Users
    console.log('--- Validating Users ---');
    const users = await db.collection('users').find({}).toArray();
    console.log(`Checked ${users.length} users.`);
    users.forEach(user => {
        if (user.actions < 0) {
            issues.push(`User ${user.id} (${user.email}) has negative actions: ${user.actions}`);
        }
    });

    // 2. Validate Corporations
    console.log('--- Validating Corporations ---');
    const corps = await db.collection('corporations').find({}).toArray();
    console.log(`Checked ${corps.length} corporations.`);
    const corpIds = new Set(corps.map(c => c.id));
    
    corps.forEach(corp => {
        // Check CEO existence
        if (corp.ceo_id) {
            const ceo = users.find(u => u.id === corp.ceo_id);
            if (!ceo) {
                issues.push(`Corporation ${corp.id} (${corp.name}) has non-existent CEO ID: ${corp.ceo_id}`);
            }
        }
    });

    // 3. Validate Market Entries
    console.log('--- Validating Market Entries ---');
    const entries = await db.collection('market_entries').find({}).toArray();
    console.log(`Checked ${entries.length} market entries.`);
    const entryIds = new Set(entries.map(e => e.id));

    entries.forEach(entry => {
        if (!corpIds.has(entry.corporation_id)) {
            issues.push(`Market Entry ${entry.id} references non-existent Corporation ID: ${entry.corporation_id}`);
        }
        // Basic state code format check (length 2)
        if (!entry.state_code || entry.state_code.length !== 2) {
            issues.push(`Market Entry ${entry.id} has invalid state code: ${entry.state_code}`);
        }
    });

    // 4. Validate Business Units
    console.log('--- Validating Business Units ---');
    const units = await db.collection('business_units').find({}).toArray();
    console.log(`Checked ${units.length} business units.`);
    
    units.forEach(unit => {
        if (!entryIds.has(unit.market_entry_id)) {
            issues.push(`Business Unit ${unit.id} references non-existent Market Entry ID: ${unit.market_entry_id}`);
        }
        if (unit.count < 0) {
            issues.push(`Business Unit ${unit.id} has negative count: ${unit.count}`);
        }
    });

    // 5. Validate State Metadata
    console.log('--- Validating State Metadata ---');
    const stateCount = await db.collection('state_metadata').countDocuments();
    console.log(`Found ${stateCount} state metadata records.`);
    if (stateCount !== 51) {
        issues.push(`Expected 51 state metadata records, found ${stateCount}`);
    }

    // Report
    console.log('\n=== Validation Report ===');
    if (issues.length === 0) {
        console.log('✅ No issues found. Game state is valid.');
    } else {
        console.log(`❌ Found ${issues.length} issues:`);
        issues.forEach(issue => console.log(`- ${issue}`));
    }

  } catch (error) {
    console.error('Validation Error:', error);
  } finally {
    await client.close();
  }
}

validateGameState();
