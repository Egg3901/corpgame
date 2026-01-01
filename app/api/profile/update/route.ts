import { NextRequest, NextResponse } from 'next/server';
import { getAuthUserId } from '@/lib/auth';
import { UserModel } from '@/lib/models/User';
import { normalizeImageUrl } from '@/lib/utils/imageUrl';
import { getErrorMessage } from '@/lib/utils';
import { UpdateProfileSchema } from '@/lib/validations/users';

export async function PATCH(req: NextRequest) {
  const userId = await getAuthUserId(req);
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    
    // Zod validation
    const validated = UpdateProfileSchema.safeParse(body);
    if (!validated.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validated.error.issues },
        { status: 400 }
      );
    }
    
    const { bio } = validated.data;

    if (bio !== undefined) {
      await UserModel.updateBio(userId, bio);
    }

    // Return updated user data
    const updatedUser = await UserModel.findById(userId);
    if (!updatedUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Determine if user is online (active within last 5 minutes)
    const isOnline = updatedUser.last_seen_at 
      ? (Date.now() - new Date(updatedUser.last_seen_at).getTime()) < 5 * 60 * 1000
      : false;

    return NextResponse.json({
      id: updatedUser.id,
      profile_id: updatedUser.profile_id,
      username: updatedUser.username,
      player_name: updatedUser.player_name,
      starting_state: updatedUser.starting_state,
      gender: updatedUser.gender,
      age: updatedUser.age,
      profile_slug: updatedUser.profile_slug,
      profile_image_url: normalizeImageUrl(updatedUser.profile_image_url),
      bio: updatedUser.bio,
      cash: updatedUser.cash || 0,
      actions: updatedUser.actions || 0,
      is_admin: updatedUser.is_admin,
      last_seen_at: updatedUser.last_seen_at,
      is_online: isOnline,
      created_at: updatedUser.created_at,
    });
  } catch (error: unknown) {
    console.error('Profile update error:', error);
    return NextResponse.json({ error: getErrorMessage(error, 'Failed to update profile') }, { status: 500 });
  }
}
