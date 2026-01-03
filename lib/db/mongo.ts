import { Db, MongoClient } from 'mongodb';

declare global {
  var _mongoClient: MongoClient | undefined;
  var _mongoDb: Db | undefined;
}

let mongoClient: MongoClient | null = null;
let mongoDb: Db | null = null;

const getMongoUri = (): string => {
  const uri = (process.env.MONGODB_URI || '').trim();
  if (!uri) {
    throw new Error('Missing MONGODB_URI');
  }
  return uri;
};

const getDbName = (): string => {
  const explicit = (process.env.MONGODB_DB || '').trim();
  if (explicit) return explicit;

  const uri = getMongoUri();
  const parsed = new URL(uri);
  const pathname = (parsed.pathname || '').replace(/^\//, '').trim();
  if (pathname) return pathname;

  throw new Error('Missing MONGODB_DB and no db name in MONGODB_URI');
};

export const connectMongo = async (): Promise<Db> => {
  if (mongoDb && mongoClient) return mongoDb;

  if (process.env.NODE_ENV !== 'production' && globalThis._mongoDb && globalThis._mongoClient) {
    mongoDb = globalThis._mongoDb;
    mongoClient = globalThis._mongoClient;
    return globalThis._mongoDb;
  }

  const uri = getMongoUri();
  const client = new MongoClient(uri);
  await client.connect();

  const db = client.db(getDbName());
  mongoClient = client;
  mongoDb = db;
  
  if (process.env.NODE_ENV !== 'production') {
    globalThis._mongoClient = client;
    globalThis._mongoDb = db;
  }
  
  return db;
};

export const getMongoClient = (): MongoClient => {
  if (mongoClient) return mongoClient;
  
  if (process.env.NODE_ENV !== 'production' && globalThis._mongoClient) {
    mongoClient = globalThis._mongoClient;
    return globalThis._mongoClient;
  }

  throw new Error('Mongo client not connected');
};

export const getDb = (): Db => {
  if (mongoDb) return mongoDb;

  if (process.env.NODE_ENV !== 'production' && globalThis._mongoDb) {
    mongoDb = globalThis._mongoDb;
    return globalThis._mongoDb;
  }

  throw new Error('Mongo DB not connected');
};

export const getNextId = async (sequenceName: string): Promise<number> => {
  const db = getDb();
  const result = await db.collection<{ _id: string; seq: number }>('counters').findOneAndUpdate(
    { _id: sequenceName },
    { $inc: { seq: 1 } },
    { upsert: true, returnDocument: 'after' }
  );

  if (!result) {
    throw new Error(`Failed to increment sequence ${sequenceName}`);
  }

  return result.seq;
};

export const ensureMongoIndexes = async (): Promise<void> => {
  const db = getDb();

  await db.collection('users').createIndex({ id: 1 }, { unique: true });
  await db.collection('users').createIndex({ email_lower: 1 }, { unique: true });
  await db.collection('users').createIndex({ username_lower: 1 }, { unique: true });
  await db.collection('users').createIndex({ profile_slug: 1 }, { unique: true });
  await db.collection('users').createIndex({ profile_id: 1 }, { unique: true });
  await db.collection('users').createIndex({ created_at: -1 });

  await db.collection('banned_ips').createIndex({ ip_address: 1 }, { unique: true });

  await db.collection('corporations').createIndex({ ceo_id: 1 });
  await db.collection('corporations').createIndex({ created_at: -1 });

  await db.collection('shareholders').createIndex({ corporation_id: 1 });
  await db.collection('shareholders').createIndex({ user_id: 1 });
  await db.collection('shareholders').createIndex({ corporation_id: 1, user_id: 1 }, { unique: true });

  await db.collection('share_transactions').createIndex({ corporation_id: 1, created_at: -1 });
  await db.collection('share_transactions').createIndex({ user_id: 1, created_at: -1 });

  await db.collection('share_price_history').createIndex({ corporation_id: 1, recorded_at: -1 });

  await db.collection('market_entries').createIndex(
    { corporation_id: 1, state_code: 1, sector_type: 1 },
    { unique: true }
  );
  await db.collection('market_entries').createIndex({ corporation_id: 1, created_at: -1 });
  await db.collection('market_entries').createIndex({ state_code: 1, created_at: -1 });

  await db.collection('business_units').createIndex({ market_entry_id: 1 });
  await db.collection('business_units').createIndex({ market_entry_id: 1, unit_type: 1 }, { unique: true });

  await db.collection('messages').createIndex({ id: 1 }, { unique: true });
  await db.collection('messages').createIndex({ recipient_id: 1, read: 1 });
  await db.collection('messages').createIndex({ recipient_id: 1, created_at: -1 });
  await db.collection('messages').createIndex({ sender_id: 1, created_at: -1 });

  await db.collection('reported_chats').createIndex({ reviewed: 1, created_at: -1 });
  await db.collection('reported_chats').createIndex({ reporter_id: 1, created_at: -1 });
  await db.collection('reported_chats').createIndex({ reported_user_id: 1, created_at: -1 });

  await db.collection('transactions').createIndex({ created_at: -1 });
  await db.collection('transactions').createIndex({ transaction_type: 1 });
  await db.collection('transactions').createIndex({ from_user_id: 1, created_at: -1 });
  await db.collection('transactions').createIndex({ to_user_id: 1, created_at: -1 });
  await db.collection('transactions').createIndex({ corporation_id: 1, created_at: -1 });

  await db.collection('corporate_actions').createIndex({ corporation_id: 1, expires_at: 1 });
  await db.collection('corporate_actions').createIndex({ expires_at: 1 });

  await db.collection('commodity_price_history').createIndex({ commodity_name: 1, recorded_at: -1 });
  await db.collection('product_price_history').createIndex({ product_name: 1, recorded_at: -1 });

  await db.collection('sector_configs').createIndex({ sector_name: 1, unit_type: 1 }, { unique: true });
  await db.collection('board_proposals').createIndex({ corporation_id: 1, created_at: -1 });
  await db.collection('board_votes').createIndex({ proposal_id: 1 });
};
