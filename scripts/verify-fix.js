const { MongoClient } = require('mongodb');
const fs = require('fs');
const path = require('path');

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

async function verify() {
  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');
    const db = client.db();

    // 1. Simulate findByProfileId(1)
    console.log('Testing findByProfileId(1)...');
    const userByProfile = await db.collection('users').findOne({ profile_id: 1 });
    
    if (userByProfile) {
      console.log('✅ Found user by profile_id: 1');
      console.log(`   User ID: ${userByProfile.id}`);
      console.log(`   Username: ${userByProfile.username}`);
    } else {
      console.error('❌ Failed to find user by profile_id: 1');
    }

    // 2. Simulate findById(1)
    console.log('Testing findById(1)...');
    const userById = await db.collection('users').findOne({ id: 1 });
    
    if (userById) {
      console.log('Found user by id: 1 (Unexpected but possible)');
    } else {
      console.log('✅ Correctly did NOT find user by id: 1 (since user has id: 2)');
    }

    // 3. Simulate History Route Logic
    console.log('\n--- Simulating History Route Logic for User 2 ---');
    const userId = 2;
    const transactions = await db.collection('transactions').aggregate([
      { $match: { $or: [{ from_user_id: userId }, { to_user_id: userId }] } },
      { $limit: 10 },
      // Simplified lookup for test
      {
        $lookup: {
          from: 'corporations',
          localField: 'corporation_id',
          foreignField: 'id',
          as: 'corpArr'
        }
      },
      { $unwind: { path: '$corpArr', preserveNullAndEmptyArrays: true } },
      {
         $project: {
             transaction_type: 1,
             corporation_id: 1,
             created_at: 1,
             corporation: {
                 name: '$corpArr.name'
             }
         }
      }
    ]).toArray();

    console.log(`Found ${transactions.length} transactions`);

    const history = transactions
      .filter(tx => tx.corporation_id && tx.corporation)
      .map(tx => {
        let type = 'other';
        if (tx.transaction_type === 'corp_founding') {
          type = 'founded';
        }
        
        if (type === 'other') return null;

        return {
          type,
          corporation_id: tx.corporation_id,
          corporation_name: tx.corporation.name,
          date: tx.created_at
        };
      })
      .filter(Boolean);

    console.log('Transformed History:', JSON.stringify(history, null, 2));

  } catch (err) {
    console.error('Verify failed:', err);
  } finally {
    await client.close();
  }
}

verify();
