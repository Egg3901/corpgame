import express, { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { UserModel, UserInput } from '../models/User';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import pool from '../db/connection';
import { BannedIpModel } from '../models/BannedIp';
import { getClientIp } from '../utils/requestIp';
import { normalizeImageUrl } from '../utils/imageUrl';

const router = express.Router();

// Register new user
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { email, username, password, player_name, gender, age, starting_state }: UserInput = req.body;
    const registrationSecret = (req.body?.registration_secret as string | undefined)?.trim();
    const adminSecretAttempt = (req.body?.admin_secret as string | undefined)?.trim();
    const clientIp = getClientIp(req);

    // Validate required fields
    if (!email || !username || !password) {
      return res.status(400).json({ error: 'Email, username, and password are required' });
    }

    // Trim and validate email
    const trimmedEmail = email.trim();
    if (!trimmedEmail || !trimmedEmail.includes('@')) {
      return res.status(400).json({ error: 'Valid email is required' });
    }

    // Trim and validate username
    const trimmedUsername = username.trim();
    if (!trimmedUsername || trimmedUsername.length < 3) {
      return res.status(400).json({ error: 'Username must be at least 3 characters' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    // Validate required registration fields
    if (!player_name || player_name.trim() === '') {
      return res.status(400).json({ error: 'Player name is required' });
    }

    if (!gender || !['m', 'f', 'nonbinary'].includes(gender)) {
      return res.status(400).json({ error: 'Gender must be m, f, or nonbinary' });
    }

    if (!age || age < 18 || age > 80) {
      return res.status(400).json({ error: 'Age must be between 18 and 80' });
    }

    if (!starting_state || starting_state.trim() === '') {
      return res.status(400).json({ error: 'Starting state is required' });
    }

    if (await BannedIpModel.isIpBanned(clientIp)) {
      return res.status(403).json({ error: 'Registrations from this IP are blocked' });
    }

    const requiredRegistrationSecret = (process.env.REGISTRATION_SECRET || '').trim();
    if (requiredRegistrationSecret && requiredRegistrationSecret.length > 0) {
      if (!registrationSecret) {
        return res.status(403).json({ error: 'Registration secret is required' });
      }
      if (registrationSecret !== requiredRegistrationSecret) {
        return res.status(403).json({ error: 'Invalid registration secret' });
      }
    }

    const adminSecretEnv = (process.env.ADMIN_SECRET || '').trim();
    const isAdmin = !!(adminSecretEnv && adminSecretEnv.length > 0 && adminSecretAttempt === adminSecretEnv);

    // Check if user already exists
    const existingUser = await UserModel.findByEmail(trimmedEmail);
    if (existingUser) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }

    // Check if username already exists
    const existingUsername = await pool.query('SELECT id FROM users WHERE username = $1', [trimmedUsername]);
    if (existingUsername.rows.length > 0) {
      return res.status(400).json({ error: 'Username already taken' });
    }

    // Create new user
    const user = await UserModel.create({ 
      email: trimmedEmail, 
      username: trimmedUsername, 
      password,
      player_name: player_name.trim(),
      gender,
      age,
      starting_state: starting_state.trim(),
      is_admin: isAdmin,
      registration_ip: clientIp,
      last_login_ip: clientIp,
      last_login_at: new Date()
    });

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, email: user.email, username: user.username },
      process.env.JWT_SECRET || 'fallback-secret',
      { expiresIn: '24h' }
    );

    res.status(201).json({
      token,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        player_name: user.player_name,
        gender: user.gender,
        age: user.age,
        starting_state: user.starting_state,
        is_admin: user.is_admin,
        profile_id: user.profile_id,
        profile_slug: user.profile_slug,
        profile_image_url: normalizeImageUrl(user.profile_image_url),
        registration_ip: user.registration_ip,
        last_login_ip: user.last_login_ip,
        last_login_at: user.last_login_at,
        is_banned: user.is_banned,
      },
    });
  } catch (error: any) {
    console.error('Registration error:', error);
    console.error('Error stack:', error.stack);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      detail: error.detail,
      constraint: error.constraint,
      table: error.table,
      column: error.column
    });
    
    if (error.code === '23505') {
      return res.status(400).json({ error: 'Username or email already exists' });
    }
    
    // Provide more helpful error messages
    if (error.code === '42P01') {
      return res.status(500).json({ error: 'Database table does not exist. Please run migrations.' });
    }
    if (error.code === '42703') {
      return res.status(500).json({ error: 'Database column does not exist. Please run migration 002.' });
    }
    if (error.code === '28P01' || error.code === '3D000') {
      return res.status(500).json({ error: 'Database connection failed. Check DATABASE_URL in .env' });
    }
    
    // Log full error for debugging
    const errorMessage = error.message || 'Unknown error';
    res.status(500).json({ 
      error: 'Internal server error',
      details: process.env.NODE_ENV !== 'production' ? errorMessage : undefined
    });
  }
});

// Login user
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { username, email, password } = req.body;
    const clientIp = getClientIp(req);

    if (!password) {
      return res.status(400).json({ error: 'Password is required' });
    }

    if (await BannedIpModel.isIpBanned(clientIp)) {
      return res.status(403).json({ error: 'This IP is banned' });
    }

    const identifier = (email || username || '').trim();
    if (!identifier) {
      return res.status(400).json({ error: 'Email or username is required' });
    }

    // Find user by email first, fallback to username
    let user = email ? await UserModel.findByEmail(identifier) : null;
    if (!user) {
      user = await UserModel.findByUsername(identifier);
    }

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (user.is_banned) {
      return res.status(403).json({ error: user.banned_reason || 'Account is banned' });
    }

    const isValidPassword = await UserModel.verifyPassword(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    await UserModel.updateLastLogin(user.id, clientIp);

    const token = jwt.sign(
      { userId: user.id, email: user.email, username: user.username },
      process.env.JWT_SECRET || 'fallback-secret',
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        player_name: user.player_name,
        gender: user.gender,
        age: user.age,
        starting_state: user.starting_state,
        is_admin: user.is_admin,
        profile_id: user.profile_id,
        profile_slug: user.profile_slug,
        profile_image_url: normalizeImageUrl(user.profile_image_url),
        is_banned: user.is_banned,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get current user (protected route)
router.get('/me', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const user = await UserModel.findById(req.userId!);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      id: user.id,
      email: user.email,
      username: user.username,
      player_name: user.player_name,
      gender: user.gender,
      age: user.age,
      starting_state: user.starting_state,
      is_admin: user.is_admin,
      profile_id: user.profile_id,
      profile_slug: user.profile_slug,
      profile_image_url: normalizeImageUrl(user.profile_image_url),
      registration_ip: user.registration_ip,
      last_login_ip: user.last_login_ip,
      last_login_at: user.last_login_at,
      is_banned: user.is_banned,
      banned_at: user.banned_at,
      banned_reason: user.banned_reason,
      created_at: user.created_at,
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
