import pool from '../db/connection';
import bcrypt from 'bcryptjs';

export interface User {
  id: number;
  email: string;
  username: string;
  player_name?: string;
  gender?: 'm' | 'f' | 'nonbinary';
  age?: number;
  starting_state?: string;
  is_admin?: boolean;
  profile_slug: string;
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
    const { email, username, password, player_name, gender, age, starting_state, is_admin = false } = userData;
    const password_hash = await bcrypt.hash(password, 10);
    const profile_slug = userData.profile_slug || await UserModel.generateProfileSlug(username);
    
    // Convert empty strings to null for optional fields
    const cleanPlayerName = player_name && player_name.trim() !== '' ? player_name.trim() : null;
    const cleanGender = gender && gender.trim() !== '' ? gender.trim() : null;
    const cleanAge = age !== undefined && age !== null ? age : null;
    const cleanStartingState = starting_state && starting_state.trim() !== '' ? starting_state.trim() : null;
    
    const result = await pool.query(
      'INSERT INTO users (email, username, password_hash, player_name, gender, age, starting_state, is_admin, profile_slug) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id, email, username, player_name, gender, age, starting_state, is_admin, profile_slug, created_at',
      [email.trim(), username.trim(), password_hash, cleanPlayerName, cleanGender, cleanAge, cleanStartingState, is_admin, profile_slug]
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
      'SELECT id, email, username, player_name, gender, age, starting_state, is_admin, profile_slug, created_at FROM users WHERE id = $1',
      [id]
    );
    
    return result.rows[0] || null;
  }

  static async findBySlug(slug: string): Promise<User | null> {
    const result = await pool.query(
      'SELECT id, email, username, player_name, gender, age, starting_state, is_admin, profile_slug, created_at FROM users WHERE profile_slug = $1',
      [slug]
    );
    
    return result.rows[0] || null;
  }

  static async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }
}
