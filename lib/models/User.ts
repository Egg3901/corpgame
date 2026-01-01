import bcrypt from 'bcryptjs';
import { getDb, getNextId } from '../db/mongo';
import { ACTIONS_CONFIG } from '../constants/actions';

export interface User {
  id: number;
  profile_id: number;
  email: string;
  username: string;
  player_name?: string;
  gender?: 'm' | 'f' | 'nonbinary';
  age?: number;
  starting_state?: string;
  is_admin?: boolean;
  profile_slug: string;
  profile_image_url?: string | null;
  bio?: string;
  cash?: number;
  actions?: number;
  registration_ip?: string;
  last_login_ip?: string;
  last_login_at?: Date;
  last_seen_at?: Date;
  is_banned?: boolean;
  banned_at?: Date;
  banned_reason?: string;
  banned_by?: number;
  password_hash: string;
  created_at: Date;
}

export interface UserInput {
  email: string;
  username: string;
  password: string;
  player_name?: string;
  gender?: 'm' | 'f' | 'nonbinary';
  age?: number;
  starting_state?: string;
  is_admin?: boolean;
  profile_slug?: string;
  profile_image_url?: string | null;
  bio?: string;
  registration_ip?: string;
  last_login_ip?: string;
  last_login_at?: Date;
}

const slugify = (value: string): string => {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'player';
};

export class UserModel {
  static async generateProfileSlug(base: string): Promise<string> {
    const initial = slugify(base);
    let candidate = initial;
    let suffix = 1;

    while (true) {
      const existing = await getDb().collection('users').findOne({ profile_slug: candidate }, { projection: { id: 1 } });
      if (!existing) {
        return candidate;
      }
      candidate = `${initial}-${suffix}`;
      suffix += 1;
    }
  }

  static async create(userData: UserInput): Promise<User> {
    const { email, username, password, player_name, gender, age, starting_state, is_admin = false, bio } = userData;
    const password_hash = await bcrypt.hash(password, 10);
    const profile_slug = userData.profile_slug || await UserModel.generateProfileSlug(username);

    // Convert empty strings to null for optional fields
    const cleanPlayerName = player_name && player_name.trim() !== '' ? player_name.trim() : null;
    const cleanGender = (gender && gender.trim() !== '' && ['m', 'f', 'nonbinary'].includes(gender)) ? gender as 'm' | 'f' | 'nonbinary' : null;
    const cleanAge = age !== undefined && age !== null ? age : null;
    const cleanStartingState = starting_state && starting_state.trim() !== '' ? starting_state.trim() : null;
    const cleanBio = bio && bio.trim() !== '' ? bio.trim() : 'I\'m a new user, say hi!';
    
    const db = getDb();
    const now = new Date();
    const id = await getNextId('users_id');
    const profile_id = await getNextId('users_profile_id');
    const normalizedEmail = email.trim();
    const normalizedUsername = username.trim();
    const usernameLower = normalizedUsername.toLowerCase();
    const doc: User & { email_lower: string; username_lower: string } = {
      id,
      profile_id,
      email: normalizedEmail,
      username: usernameLower,
      player_name: cleanPlayerName ?? undefined,
      gender: cleanGender ?? undefined,
      age: cleanAge ?? undefined,
      starting_state: cleanStartingState ?? undefined,
      is_admin,
      profile_slug,
      profile_image_url: userData.profile_image_url ?? null,
      bio: cleanBio ?? undefined,
      cash: 500000.0,
      actions: 20, // Initialize with 20 action points
      registration_ip: userData.registration_ip || undefined,
      last_login_ip: userData.last_login_ip || undefined,
      last_login_at: userData.last_login_at || undefined,
      last_seen_at: undefined,
      is_banned: false,
      banned_at: undefined,
      banned_reason: undefined,
      banned_by: undefined,
      password_hash,
      created_at: now,
      email_lower: normalizedEmail.toLowerCase(),
      username_lower: usernameLower,
    };

    await db.collection('users').insertOne(doc);
    return doc;
  }

  static async findByEmail(email: string): Promise<User | null> {
    const normalized = (email || '').trim();
    if (!normalized) return null;
    return await getDb().collection<User>('users').findOne({ email_lower: normalized.toLowerCase() });
  }

  static async findByUsername(username: string): Promise<User | null> {
    const normalized = (username || '').trim();
    if (!normalized) return null;
    return await getDb().collection<User>('users').findOne({ username_lower: normalized.toLowerCase() });
  }

  static async findByIds(ids: number[]): Promise<User[]> {
    if (ids.length === 0) return [];
    return await getDb().collection<User>('users').find({ id: { $in: ids } }).toArray();
  }

  static async findById(id: number): Promise<User | null> {
    return await getDb().collection<User>('users').findOne({ id });
  }

  static async findByProfileId(profileId: number): Promise<User | null> {
    return await getDb().collection<User>('users').findOne({ profile_id: profileId });
  }

  static async findBySlug(slug: string): Promise<User | null> {
    const normalized = (slug || '').trim();
    if (!normalized) return null;
    return await getDb().collection<User>('users').findOne({ profile_slug: normalized });
  }

  static async updateLastLogin(userId: number, ip: string): Promise<void> {
    await getDb().collection<User>('users').updateOne(
      { id: userId },
      { $set: { last_login_ip: ip, last_login_at: new Date() } }
    );
  }

  static async updateLastSeen(userId: number): Promise<void> {
    await getDb().collection<User>('users').updateOne(
      { id: userId },
      { $set: { last_seen_at: new Date() } }
    );
  }

  static async banUser(userId: number, reason: string | null, adminId: number | null): Promise<void> {
    await getDb().collection<User>('users').updateOne(
      { id: userId },
      {
        $set: {
          is_banned: true,
          banned_at: new Date(),
          banned_reason: reason ?? undefined,
          banned_by: adminId ?? undefined,
        },
      }
    );
  }

  static async unbanUser(userId: number): Promise<void> {
    await getDb().collection<User>('users').updateOne(
      { id: userId },
      { $set: { is_banned: false }, $unset: { banned_at: '', banned_reason: '', banned_by: '' } }
    );
  }

  static async deleteUser(userId: number): Promise<void> {
    await getDb().collection<User>('users').deleteOne({ id: userId });
  }

  static async banUsersByIp(ip: string, reason: string | null, adminId: number | null): Promise<void> {
    const now = new Date();
    const banned_reason = reason ?? 'Banned by IP';
    await getDb().collection<User>('users').updateMany(
      { $or: [{ registration_ip: ip }, { last_login_ip: ip }] },
      {
        $set: {
          is_banned: true,
          banned_at: now,
          banned_reason,
          ...(adminId != null ? { banned_by: adminId } : {}),
        },
      }
    );
  }

  static async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  static async updateProfileImage(userId: number, imageUrl: string | null): Promise<void> {
    await getDb().collection<User>('users').updateOne(
      { id: userId },
      { $set: { profile_image_url: imageUrl } }
    );
  }

  static async updateBio(userId: number, bio: string): Promise<void> {
    await getDb().collection<User>('users').updateOne(
      { id: userId },
      { $set: { bio } }
    );
  }

  static async getAllUsers(): Promise<User[]> {
    return await getDb().collection<User>('users').find({}, { sort: { created_at: -1 } }).toArray();
  }

  static async search(query: string, limit: number = 20): Promise<User[]> {
    const db = getDb();
    const regex = { $regex: query, $options: 'i' };
    return db.collection<User>('users')
      .find({
        $or: [
          { username: regex },
          { player_name: regex }
        ]
      })
      .limit(limit)
      .toArray();
  }

  static async toggleAdminStatus(userId: number): Promise<User> {
    const result = await getDb().collection<User>('users').findOneAndUpdate(
      { id: userId },
      [{ $set: { is_admin: { $not: ['$is_admin'] } } }],
      { returnDocument: 'after' }
    );
    if (!result) throw new Error('User not found');
    return result;
  }

  static async updateCash(userId: number, amount: number): Promise<User> {
    const result = await getDb().collection<User>('users').findOneAndUpdate(
      { id: userId },
      [
        {
          $set: {
            cash: { $max: [0, { $add: [{ $ifNull: ['$cash', 0] }, amount] }] },
          },
        },
      ],
      { returnDocument: 'after' }
    );
    if (!result) throw new Error('User not found');
    return result;
  }

  static async getCash(userId: number): Promise<number> {
    const user = await getDb().collection<User>('users').findOne({ id: userId }, { projection: { cash: 1 } });
    if (!user) throw new Error('User not found');
    return user.cash ?? 0;
  }

  static async getActions(userId: number): Promise<number> {
    const user = await getDb().collection<User>('users').findOne({ id: userId }, { projection: { actions: 1 } });
    if (!user) throw new Error('User not found');
    return user.actions ?? 0;
  }

  static async updateActions(userId: number, amount: number): Promise<number> {
    const result = await getDb().collection<User>('users').findOneAndUpdate(
      { id: userId },
      [
        {
          $set: {
            actions: { $max: [0, { $add: [{ $ifNull: ['$actions', 0] }, amount] }] },
          },
        },
      ],
      { returnDocument: 'after', projection: { actions: 1 } }
    );
    if (!result) throw new Error('User not found');
    return result.actions ?? 0;
  }

  static async addCashToAll(amount: number): Promise<{ updated: number }> {
    const result = await getDb().collection<User>('users').updateMany(
      {},
      [
        {
          $set: {
            cash: { $max: [0, { $add: [{ $ifNull: ['$cash', 0] }, amount] }] },
          },
        },
      ]
    );
    return { updated: result.modifiedCount };
  }

  static async incrementAllUsersActions(baseAmount: number, ceoUserIds: number[]): Promise<{ updated: number }> {
    const db = getDb();
    const ceoIncrement = baseAmount + ACTIONS_CONFIG.HOURLY_CEO_BONUS; // 2 + 1 = 3
    const regularIncrement = baseAmount; // 2

    // Update CEOs
    if (ceoUserIds.length > 0) {
      await db.collection<User>('users').updateMany(
        { id: { $in: ceoUserIds } },
        [
          {
            $set: {
              actions: {
                $min: [
                  ACTIONS_CONFIG.MAX_ACTIONS_CEO,
                  { $add: [{ $ifNull: ['$actions', 0] }, ceoIncrement] }
                ]
              }
            }
          }
        ]
      );
    }

    // Update Non-CEOs
    await db.collection<User>('users').updateMany(
      { id: { $nin: ceoUserIds } },
      [
        {
          $set: {
            actions: {
              $min: [
                ACTIONS_CONFIG.MAX_ACTIONS_DEFAULT,
                { $add: [{ $ifNull: ['$actions', 0] }, regularIncrement] }
              ]
            }
          }
        }
      ]
    );

    const updated = await db.collection<User>('users').countDocuments();
    return { updated };
  }
}
