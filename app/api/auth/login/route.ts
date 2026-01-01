import { NextRequest, NextResponse } from 'next/server';
import { UserModel, User } from '@/lib/models/User';
import { BannedIpModel } from '@/lib/models/BannedIp';
import { getClientIp } from '@/lib/utils/requestIp';
import { normalizeImageUrl } from '@/lib/utils/imageUrl';
import { connectMongo } from '@/lib/db/mongo';
import { signAccessToken, signRefreshToken } from '@/lib/auth/jwt';
import { getErrorMessage } from '@/lib/utils';
import { LoginSchema } from '@/lib/validations/auth';

export async function POST(req: NextRequest) {
  try {
    await connectMongo();
    const body = await req.json();
    
    // Zod validation
    const validated = LoginSchema.safeParse(body);
    if (!validated.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validated.error.issues },
        { status: 400 }
      );
    }
    
    const { username, email, password } = validated.data;
    const clientIp = getClientIp(req);

    if (await BannedIpModel.isIpBanned(clientIp)) {
      return NextResponse.json({ error: 'This IP is banned' }, { status: 403 });
    }

    const identifier = (email || username || '').trim();

    // Find user by email first, fallback to username
    let user: User | null = null;
    try {
      if (email) {
        user = await UserModel.findByEmail(identifier);
      }
      if (!user) {
        user = await UserModel.findByUsername(identifier);
      }
    } catch (dbError: unknown) {
      console.error('Database error during user lookup:', dbError);
      return NextResponse.json({ 
        error: 'Database error during login',
        details: process.env.NODE_ENV !== 'production' ? getErrorMessage(dbError) : undefined
      }, { status: 500 });
    }

    if (!user) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    // Ensure user has required fields
    if (!user || !user.id) {
      console.error('Invalid user object returned from database');
      return NextResponse.json({ error: 'Database error: Invalid user data' }, { status: 500 });
    }

    if (!user.password_hash) {
      console.error('User found but password_hash is missing:', { 
        userId: user.id, 
        email: user.email, 
        username: user.username,
        hasPasswordHash: !!user.password_hash,
      });
      return NextResponse.json({ error: 'User data is corrupted. Please contact support.' }, { status: 500 });
    }

    if (user.is_banned) {
      return NextResponse.json({ error: user.banned_reason || 'Account is banned' }, { status: 403 });
    }

    const isValidPassword = await UserModel.verifyPassword(password, user.password_hash);
    if (!isValidPassword) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    // Rate limit check (basic)
    if (user.last_login_at) {
      const lastLoginTime = new Date(user.last_login_at).getTime();
      const now = new Date().getTime();
      if (now - lastLoginTime < 1000) { // 1 second cooldown
        return NextResponse.json({ error: 'Too many login attempts. Please wait.' }, { status: 429 });
      }
    }

    await UserModel.updateLastLogin(user.id, clientIp);

    const tokenPayload = { userId: user.id, email: user.email, username: user.username, is_admin: user.is_admin };
    const token = signAccessToken(tokenPayload);
    const refreshToken = signRefreshToken(tokenPayload);

    return NextResponse.json({
      token,
      refreshToken, // Return refresh token if client wants to use it
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
  } catch (error: unknown) {
    const errorMessage = getErrorMessage(error, 'Unknown error');
    console.error('Login error:', errorMessage);
    
    return NextResponse.json({ 
      error: 'Internal server error',
      details: process.env.NODE_ENV !== 'production' ? errorMessage : undefined
    }, { status: 500 });
  }
}
