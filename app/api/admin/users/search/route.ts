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

    const { searchParams } = new URL(req.url);
    const query = (searchParams.get('q') || '').trim();

    if (!query) {
      // Return all users if no query (limited)
      const allUsers = await UserModel.getAllUsers();
      const results = allUsers.slice(0, 50).map(u => ({
        id: u.id,
        username: u.username,
        player_name: u.player_name || null,
        profile_image_url: normalizeImageUrl(u.profile_image_url),
      }));
      return NextResponse.json(results);
    }

    // Search by username or player_name (case-insensitive)
    const allUsers = await UserModel.search(query, 20);
    
    const results = allUsers.map(u => ({
        id: u.id,
        username: u.username,
        player_name: u.player_name || null,
        profile_image_url: normalizeImageUrl(u.profile_image_url),
      }));

    return NextResponse.json(results);
  } catch (error: unknown) {
    console.error('Search users error:', error);
    return NextResponse.json({ error: getErrorMessage(error, 'Failed to search users') }, { status: 500 });
  }
}
