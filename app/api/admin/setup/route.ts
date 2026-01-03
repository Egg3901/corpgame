import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { UserModel } from '@/lib/models/User';
import { AuditLogModel } from '@/lib/models/AuditLog';
import { connectMongo } from '@/lib/db/mongo';
import { getClientIp } from '@/lib/utils/requestIp';

export async function POST(req: NextRequest) {
  try {
    await connectMongo();
    
    // 1. Check if admin creation is allowed via env var
    if (process.env.ALLOW_ADMIN_CREATION !== 'true') {
      return NextResponse.json(
        { error: 'Admin creation is currently disabled.' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { username, email, password, setup_token } = body;
    const clientIp = getClientIp(req);

    // 2. Validate Setup Token (MFA factor 1: Something you have/know from server config)
    const envSetupToken = process.env.ADMIN_SETUP_TOKEN;
    if (!envSetupToken || setup_token !== envSetupToken) {
      await AuditLogModel.log({
        action: 'ADMIN_SETUP_FAILED',
        actor_ip: clientIp,
        target_type: 'system',
        details: { reason: 'Invalid setup token', username }
      });
      return NextResponse.json({ error: 'Invalid setup token.' }, { status: 403 });
    }

    // 3. Validate Input
    if (!username || !email || !password || password.length < 8) {
      return NextResponse.json(
        { error: 'Invalid input. Password must be at least 8 characters.' },
        { status: 400 }
      );
    }

    // 4. Check existence
    const existingUser = await UserModel.findByEmail(email);
    if (existingUser) {
      return NextResponse.json({ error: 'User already exists.' }, { status: 400 });
    }

    // 5. Create Admin User
    // We use UserModel.create but need to override is_admin. 
    // Since UserModel.create might not expose is_admin override easily in UserInput (it does, checked User.ts), 
    // we can use it directly.
    
    // However, UserInput interface in User.ts:
    // export interface UserInput { ... is_admin?: boolean; ... }
    // It is supported.

    const newUser = await UserModel.create({
      username,
      email,
      password,
      is_admin: true,
      player_name: 'Admin',
      starting_state: 'DC', // Default
      registration_ip: clientIp,
      last_login_ip: clientIp,
      last_login_at: new Date()
    });

    // 6. Audit Log
    await AuditLogModel.log({
      action: 'ADMIN_SETUP_SUCCESS',
      actor_id: newUser.id,
      actor_ip: clientIp,
      target_id: newUser.id,
      target_type: 'user',
      details: { username, email }
    });

    return NextResponse.json({ 
      success: true, 
      message: 'Admin account created successfully.',
      user: { id: newUser.id, username: newUser.username }
    });

  } catch (err: unknown) {
    console.error('Admin setup error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
