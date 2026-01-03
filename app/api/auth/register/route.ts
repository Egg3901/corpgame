import { NextRequest, NextResponse } from 'next/server';
import { UserModel, UserInput } from '@/lib/models/User';
import { getErrorMessage } from '@/lib/utils';
import { BannedIpModel } from '@/lib/models/BannedIp';
import { getClientIp } from '@/lib/utils/requestIp';
import { normalizeImageUrl } from '@/lib/utils/imageUrl';
import { MessageModel } from '@/lib/models/Message';
import { connectMongo } from '@/lib/db/mongo';
import { signAccessToken, signRefreshToken } from '@/lib/auth/jwt';
import { CorporationService } from '@/lib/services/CorporationService';
import { RegisterSchema } from '@/lib/validations/auth';

// Force Node.js runtime (required for MongoDB and crypto)
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    await connectMongo();
    const body = await req.json();
    
    // Zod validation
    const validated = RegisterSchema.safeParse(body);
    if (!validated.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validated.error.issues },
        { status: 400 }
      );
    }
    
    const { email, username, password, player_name, gender, age, starting_state } = validated.data;
    const registrationSecret = body.registration_secret as string | undefined;
    const adminSecretAttempt = body.admin_secret as string | undefined;
    const clientIp = getClientIp(req);

    if (await BannedIpModel.isIpBanned(clientIp)) {
      return NextResponse.json({ error: 'Registrations from this IP are blocked' }, { status: 403 });
    }

    const requiredRegistrationSecret = (process.env.REGISTRATION_SECRET || '').trim();
    if (requiredRegistrationSecret && requiredRegistrationSecret.length > 0) {
      if (!registrationSecret) {
        return NextResponse.json({ error: 'Registration secret is required' }, { status: 403 });
      }
      if (registrationSecret !== requiredRegistrationSecret) {
        return NextResponse.json({ error: 'Invalid registration secret' }, { status: 403 });
      }
    }

    const adminSecretEnv = (process.env.ADMIN_SECRET || '').trim();
    const isAdmin = !!(adminSecretEnv && adminSecretEnv.length > 0 && adminSecretAttempt === adminSecretEnv);

    // Check if user already exists
    const existingUser = await UserModel.findByEmail(email);
    if (existingUser) {
      return NextResponse.json({ error: 'User with this email already exists' }, { status: 400 });
    }

    // Check if username already exists (case-insensitive)
    const existingUsername = await UserModel.findByUsername(username);
    if (existingUsername) {
      return NextResponse.json({ error: 'Username already taken' }, { status: 400 });
    }

    // Create new user
    const user = await UserModel.create({ 
      email, 
      username, 
      password,
      player_name,
      gender,
      age,
      starting_state,
      is_admin: isAdmin,
      registration_ip: clientIp,
      last_login_ip: clientIp,
      last_login_at: new Date()
    });

    // Auto-create corporation for new player
    try {
      await CorporationService.createForUser({
        id: user.id,
        player_name: user.player_name || user.username,
        starting_state: user.starting_state || starting_state || 'Unknown',
        username: user.username
      });
    } catch (corpError: unknown) {
      console.error('Failed to auto-create corporation:', corpError);
      // We don't fail registration, just log it. 
      // User can create corp manually later.
    }

    // Generate token
    const tokenPayload = { userId: user.id, email: user.email, username: user.username, is_admin: user.is_admin };
    const token = signAccessToken(tokenPayload);
    const refreshToken = signRefreshToken(tokenPayload);

    // Send welcome message to new user
    try {
      await MessageModel.create({
        sender_id: user.id,
        recipient_id: user.id,
        subject: '🎉 Welcome to Corporate Warfare!',
        body: `Hello ${user.player_name || user.username}!\n\nWelcome to Corporate Warfare! We're thrilled to have you join our community of aspiring business moguls.\n\nHere are some tips to get started:\n\n• Visit your Profile to customize your avatar and bio\n• Check out the Stock Market to start investing in corporations\n• Create your own Corporation and become a CEO\n• Explore different States & Markets to expand your business empire\n• Use the Portfolio page to track your investments\n\nGood luck on your journey to corporate success!\n\n— The Corporate Warfare Team`,
      });
    } catch (msgError: unknown) {
      // Don't fail registration if welcome message fails
      console.error('Failed to send welcome message:', msgError);
    }

    return NextResponse.json({
      token,
      refreshToken,
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
    }, { status: 201 });
  } catch (error: unknown) {
    console.error('Registration error:', error);
    
    // Handle MongoDB duplicate key error
    if (typeof error === 'object' && error !== null && 'code' in error && (error as { code: number }).code === 11000) {
      return NextResponse.json({ error: 'Username or email already exists' }, { status: 400 });
    }
    
    return NextResponse.json({ 
      error: getErrorMessage(error, 'Failed to register user')
    }, { status: 500 });
  }
}
