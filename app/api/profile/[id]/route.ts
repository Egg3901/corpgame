import { NextRequest, NextResponse } from 'next/server';
import { UserModel } from '@/lib/models/User';
import { normalizeImageUrl } from '@/lib/utils/imageUrl';
import { connectMongo } from '@/lib/db/mongo';
import { getErrorMessage } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectMongo();
    const { id: idOrSlug } = await params;
    let user;

    // Try to parse as ID first
    const idParam = parseInt(idOrSlug, 10);
    if (!isNaN(idParam)) {
      // 1. Prioritize profile_id as it's the public identifier
      user = await UserModel.findByProfileId(idParam);
      
      // 2. Fallback to internal ID if not found
      if (!user) {
        user = await UserModel.findById(idParam);
      }
    }

    // If not found or not an ID, try as slug
    if (!user) {
      user = await UserModel.findBySlug(idOrSlug);
    }

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Determine if user is online (active within last 5 minutes)
    const isOnline = user.last_seen_at 
      ? (Date.now() - new Date(user.last_seen_at).getTime()) < 5 * 60 * 1000
      : false;

    // Return public profile data
    return NextResponse.json({
      id: user.id,
      profile_id: user.profile_id,
      username: user.username,
      player_name: user.player_name,
      starting_state: user.starting_state,
      gender: user.gender,
      age: user.age,
      profile_slug: user.profile_slug,
      profile_image_url: normalizeImageUrl(user.profile_image_url),
      bio: user.bio,
      actions: user.actions ?? 0,
      is_admin: user.is_admin,
      last_seen_at: user.last_seen_at,
      is_online: isOnline,
      created_at: user.created_at,
    });
  } catch (error: unknown) {
    console.error('Get profile error:', error);
    return NextResponse.json({ error: getErrorMessage(error, 'Failed to fetch profile') }, { status: 500 });
  }
}
