import { NextRequest, NextResponse } from 'next/server';
import { getAuthUserId } from '@/lib/auth';
import { UserModel } from '@/lib/models/User';
import { normalizeImageUrl } from '@/lib/utils/imageUrl';
import { getErrorMessage } from '@/lib/utils';
import { connectMongo } from '@/lib/db/mongo';

export async function GET(req: NextRequest) {
  try {
    await connectMongo();
    const userId = await getAuthUserId(req);
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await UserModel.findById(userId);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({
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
      cash: user.cash || 0,
      actions: user.actions || 0,
      registration_ip: user.registration_ip,
      last_login_ip: user.last_login_ip,
      last_login_at: user.last_login_at,
      is_banned: user.is_banned,
      banned_at: user.banned_at,
      banned_reason: user.banned_reason,
      created_at: user.created_at,
    });
  } catch (error: unknown) {
    console.error('Get user error:', error);
    return NextResponse.json({ error: getErrorMessage(error, 'Internal server error') }, { status: 500 });
  }
}
