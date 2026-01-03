const { MongoClient } = require('mongodb');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

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

async function getNextId(db, sequenceName) {
  const result = await db.collection('counters').findOneAndUpdate(
    { _id: sequenceName },
    { $inc: { seq: 1 } },
    { upsert: true, returnDocument: 'after' }
  );
  return result.seq;
}

async function logAudit(db, action, details) {
  await db.collection('audit_logs').insertOne({
    action,
    actor_id: 'admin-cli',
    actor_ip: 'localhost',
    target_type: 'system',
    details,
    created_at: new Date()
  });
}

async function listAdmins(db) {
  const admins = await db.collection('users').find({ is_admin: true }).toArray();
  if (admins.length === 0) {
    console.log('No admin accounts found.');
  } else {
    console.log('Admin Accounts:');
    console.table(admins.map(a => ({ id: a.id, username: a.username, email: a.email, last_login: a.last_login_at })));
  }
}

async function createAdmin(db, username, email, password) {
  const existing = await db.collection('users').findOne({ 
    $or: [{ username: username.toLowerCase() }, { email: email.toLowerCase() }] 
  });

  if (existing) {
    console.error(`User with username '${username}' or email '${email}' already exists.`);
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
    player_name: username, // Default
    cash: 10000000, // Admins get more starting cash for testing
    actions: 100,
    created_at: now,
    profile_slug: username.toLowerCase().replace(/[^a-z0-9]/g, '-'),
    bio: 'System Administrator'
  };

  await db.collection('users').insertOne(user);
  await logAudit(db, 'ADMIN_CREATE', { username, email });
  console.log(`Admin user '${username}' created successfully.`);
}

async function promoteUser(db, username) {
  const user = await db.collection('users').findOne({ username_lower: username.toLowerCase() });
  if (!user) {
    console.error(`User '${username}' not found.`);
    return;
  }

  if (user.is_admin) {
    console.log(`User '${username}' is already an admin.`);
    return;
  }

  await db.collection('users').updateOne(
    { _id: user._id },
    { $set: { is_admin: true } }
  );
  await logAudit(db, 'ADMIN_PROMOTE', { target_user: username });
  console.log(`User '${username}' promoted to admin.`);
}

async function demoteUser(db, username) {
  const user = await db.collection('users').findOne({ username_lower: username.toLowerCase() });
  if (!user) {
    console.error(`User '${username}' not found.`);
    return;
  }

  if (!user.is_admin) {
    console.log(`User '${username}' is not an admin.`);
    return;
  }

  // Prevent demoting the last admin? Maybe warning.
  const adminCount = await db.collection('users').countDocuments({ is_admin: true });
  if (adminCount <= 1) {
    console.error('Cannot demote the last admin account.');
    return;
  }

  await db.collection('users').updateOne(
    { _id: user._id },
    { $set: { is_admin: false } }
  );
  await logAudit(db, 'ADMIN_DEMOTE', { target_user: username });
  console.log(`User '${username}' demoted from admin.`);
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  try {
    await client.connect();
    const db = client.db();

    switch (command) {
      case 'list':
        await listAdmins(db);
        break;
      case 'create':
        if (args.length < 4) {
          console.log('Usage: node admin-manager.js create <username> <email> <password>');
        } else {
          await createAdmin(db, args[1], args[2], args[3]);
        }
        break;
      case 'promote':
        if (args.length < 2) {
          console.log('Usage: node admin-manager.js promote <username>');
        } else {
          await promoteUser(db, args[1]);
        }
        break;
      case 'demote':
        if (args.length < 2) {
          console.log('Usage: node admin-manager.js demote <username>');
        } else {
          await demoteUser(db, args[1]);
        }
        break;
      default:
        console.log(`
Corporate Game Admin Manager
============================
Usage:
  node scripts/admin-manager.js list
  node scripts/admin-manager.js create <username> <email> <password>
  node scripts/admin-manager.js promote <username>
  node scripts/admin-manager.js demote <username>
        `);
    }
  } catch (err) {
    console.error('An error occurred:', err);
  } finally {
    await client.close();
  }
}

main();
