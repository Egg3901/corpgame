import pool from '../db/connection';
import bcrypt from 'bcryptjs';

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
  registration_ip?: string;
  last_login_ip?: string;
  last_login_at?: Date;
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
      const existing = await pool.query('SELECT id FROM users WHERE profile_slug = $1', [candidate]);
      if (existing.rows.length === 0) {
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
    const cleanGender = gender && gender.trim() !== '' ? gender.trim() : null;
    const cleanAge = age !== undefined && age !== null ? age : null;
    const cleanStartingState = starting_state && starting_state.trim() !== '' ? starting_state.trim() : null;
    const cleanBio = bio && bio.trim() !== '' ? bio.trim() : 'I\'m a new user, say hi!';
    
    const result = await pool.query(
      `INSERT INTO users (
        email, username, password_hash, player_name, gender, age, starting_state,
        is_admin, profile_slug, bio, registration_ip, last_login_ip, last_login_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING id, profile_id, email, username, player_name, gender, age, starting_state, is_admin,
        profile_slug, bio, registration_ip, last_login_ip, last_login_at, created_at`,
      [
        email.trim(),
        username.trim(),
        password_hash,
        cleanPlayerName,
        cleanGender,
        cleanAge,
        cleanStartingState,
        is_admin,
        profile_slug,
        cleanBio,
        userData.registration_ip || null,
        userData.last_login_ip || null,
        userData.last_login_at || null
      ]
    );
    
    return {
      ...result.rows[0],
      password_hash,
    };
  }

  static async findByEmail(email: string): Promise<User | null> {
    const result = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );
    
    return result.rows[0] || null;
  }

  static async findByUsername(username: string): Promise<User | null> {
    const result = await pool.query(
      'SELECT * FROM users WHERE username = $1',
      [username]
    );
    
    return result.rows[0] || null;
  }

  static async findById(id: number): Promise<User | null> {
    const result = await pool.query(
      `SELECT id, profile_id, email, username, player_name, gender, age, starting_state, is_admin,
        profile_slug, profile_image_url, bio, registration_ip, last_login_ip, last_login_at,
        is_banned, banned_at, banned_reason, banned_by, created_at
      FROM users WHERE id = $1`,
      [id]
    );

    return result.rows[0] || null;
  }

  static async findByProfileId(profileId: number): Promise<User | null> {
    const result = await pool.query(
      `SELECT id, profile_id, email, username, player_name, gender, age, starting_state, is_admin,
        profile_slug, profile_image_url, bio, registration_ip, last_login_ip, last_login_at,
        is_banned, banned_at, banned_reason, banned_by, created_at
      FROM users WHERE profile_id = $1`,
      [profileId]
    );

    return result.rows[0] || null;
  }

  static async findBySlug(slug: string): Promise<User | null> {
    const result = await pool.query(
      `SELECT id, profile_id, email, username, player_name, gender, age, starting_state, is_admin,
        profile_slug, profile_image_url, bio, registration_ip, last_login_ip, last_login_at,
        is_banned, banned_at, banned_reason, banned_by, created_at
      FROM users WHERE profile_slug = $1`,
      [slug]
    );

    return result.rows[0] || null;
  }

  static async updateLastLogin(userId: number, ip: string): Promise<void> {
    await pool.query(
      'UPDATE users SET last_login_ip = $1, last_login_at = NOW() WHERE id = $2',
      [ip, userId]
    );
  }

  static async banUser(userId: number, reason: string | null, adminId: number | null): Promise<void> {
    await pool.query(
      `UPDATE users
       SET is_banned = TRUE,
           banned_at = NOW(),
           banned_reason = $1,
           banned_by = $2
       WHERE id = $3`,
      [reason, adminId, userId]
    );
  }

  static async unbanUser(userId: number): Promise<void> {
    await pool.query(
      `UPDATE users
       SET is_banned = FALSE,
           banned_at = NULL,
           banned_reason = NULL,
           banned_by = NULL
       WHERE id = $1`,
      [userId]
    );
  }

  static async deleteUser(userId: number): Promise<void> {
    await pool.query('DELETE FROM users WHERE id = $1', [userId]);
  }

  static async banUsersByIp(ip: string, reason: string | null, adminId: number | null): Promise<void> {
    await pool.query(
      `UPDATE users
       SET is_banned = TRUE,
           banned_at = NOW(),
           banned_reason = COALESCE($2, banned_reason, 'Banned by IP'),
           banned_by = COALESCE($3, banned_by)
       WHERE registration_ip = $1 OR last_login_ip = $1`,
      [ip, reason, adminId]
    );
  }

  static async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  static async updateProfileImage(userId: number, imageUrl: string | null): Promise<void> {
    await pool.query(
      'UPDATE users SET profile_image_url = $1 WHERE id = $2',
      [imageUrl, userId]
    );
  }

  static async updateBio(userId: number, bio: string): Promise<void> {
    await pool.query(
      'UPDATE users SET bio = $1 WHERE id = $2',
      [bio, userId]
    );
  }

  static async getAllUsers(): Promise<User[]> {
    const result = await pool.query(
      `SELECT id, profile_id, email, username, player_name, gender, age, starting_state, is_admin,
        profile_slug, profile_image_url, bio, registration_ip, last_login_ip, last_login_at,
        is_banned, banned_at, banned_reason, banned_by, created_at
      FROM users
      ORDER BY created_at DESC`
    );
    return result.rows;
  }

  static async toggleAdminStatus(userId: number): Promise<User> {
    const result = await pool.query(
      `UPDATE users 
       SET is_admin = NOT is_admin 
       WHERE id = $1
       RETURNING id, profile_id, email, username, player_name, gender, age, starting_state, is_admin,
         profile_slug, profile_image_url, bio, registration_ip, last_login_ip, last_login_at,
         is_banned, banned_at, banned_reason, banned_by, created_at`,
      [userId]
    );
    if (result.rows.length === 0) {
      throw new Error('User not found');
    }
    return result.rows[0];
  }

  static async updateCash(userId: number, amount: number): Promise<User> {
    const result = await pool.query(
      `UPDATE users 
       SET cash = GREATEST(0, cash + $1)
       WHERE id = $2
       RETURNING *`,
      [amount, userId]
    );
    if (result.rows.length === 0) {
      throw new Error('User not found');
    }
    return result.rows[0];
  }

  static async getCash(userId: number): Promise<number> {
    const result = await pool.query(
      'SELECT cash FROM users WHERE id = $1',
      [userId]
    );
    if (result.rows.length === 0) {
      throw new Error('User not found');
    }
    const cash = result.rows[0].cash;
    return typeof cash === 'string' ? parseFloat(cash) : cash;
  }
}

