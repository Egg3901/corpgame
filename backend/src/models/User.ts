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
}

export class UserModel {
  static async create(userData: UserInput): Promise<User> {
    const { email, username, password, player_name, gender, age, starting_state } = userData;
    const password_hash = await bcrypt.hash(password, 10);
    
    // Convert empty strings to null for optional fields
    const cleanPlayerName = player_name && player_name.trim() !== '' ? player_name.trim() : null;
    const cleanGender = gender && gender.trim() !== '' ? gender.trim() : null;
    const cleanAge = age !== undefined && age !== null ? age : null;
    const cleanStartingState = starting_state && starting_state.trim() !== '' ? starting_state.trim() : null;
    
    const result = await pool.query(
      'INSERT INTO users (email, username, password_hash, player_name, gender, age, starting_state) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id, email, username, player_name, gender, age, starting_state, created_at',
      [email.trim(), username.trim(), password_hash, cleanPlayerName, cleanGender, cleanAge, cleanStartingState]
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

  static async findById(id: number): Promise<User | null> {
    const result = await pool.query(
      'SELECT id, email, username, player_name, gender, age, starting_state, created_at FROM users WHERE id = $1',
      [id]
    );
    
    return result.rows[0] || null;
  }

  static async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }
}

