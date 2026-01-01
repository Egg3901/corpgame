import { NextRequest, NextResponse } from 'next/server';
import { getAuthUserId } from '@/lib/auth';
import { UserModel } from '@/lib/models/User';
import { normalizeImageUrl } from '@/lib/utils/imageUrl';
import { getErrorMessage } from '@/lib/utils';

export async function GET(req: NextRequest) {
  try {
    const userId = await getAuthUserId(req);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await UserModel.findById(userId);
    if (!user || !user.is_admin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const users = await UserModel.getAllUsers();

    const response = users.map((u) => ({
      id: u.id,
      profile_id: u.profile_id,
      email: u.email,
      username: u.username,
      player_name: u.player_name,
      gender: u.gender,
      age: u.age,
      starting_state: u.starting_state,
      is_admin: u.is_admin,
      profile_slug: u.profile_slug,
      profile_image_url: normalizeImageUrl(u.profile_image_url),
      bio: u.bio,
      registration_ip: u.registration_ip,
      last_login_ip: u.last_login_ip,
      last_login_at: u.last_login_at ? u.last_login_at.toISOString() : undefined,
      is_banned: u.is_banned,
      banned_at: u.banned_at ? u.banned_at.toISOString() : undefined,
      banned_reason: u.banned_reason,
      banned_by: u.banned_by,
      created_at: u.created_at.toISOString(),
    }));

    return NextResponse.json(response);
  } catch (error: unknown) {
    console.error('Admin users list error:', error);
    return NextResponse.json(
      { error: getErrorMessage(error, 'Failed to fetch users') },
      { status: 500 }
    );
  }
}
