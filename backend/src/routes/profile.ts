import express, { Request, Response } from 'express';
import { UserModel } from '../models/User';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { normalizeImageUrl } from '../utils/imageUrl';

const router = express.Router();

router.get('/:idOrSlug', async (req: Request, res: Response) => {
  try {
    const idOrSlug = req.params.idOrSlug;
    const isNumericId = /^\d+$/.test(idOrSlug);
    const user = isNumericId
      ? await UserModel.findByProfileId(Number(idOrSlug))
      : await UserModel.findBySlug(idOrSlug.toLowerCase());

    if (!user) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    // Determine if user is online (active within last 5 minutes)
    const isOnline = user.last_seen_at 
      ? (Date.now() - new Date(user.last_seen_at).getTime()) < 5 * 60 * 1000
      : false;

    res.json({
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
      cash: user.cash || 0,
      is_admin: user.is_admin,
      last_seen_at: user.last_seen_at,
      is_online: isOnline,
      created_at: user.created_at,
    });
  } catch (error) {
    console.error('Profile lookup error:', error);
    res.status(500).json({ error: 'Failed to load profile' });
  }
});

router.patch('/update', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { bio } = req.body;

    if (bio !== undefined) {
      // Validate bio length
      if (typeof bio !== 'string' || bio.length > 500) {
        return res.status(400).json({ error: 'Bio must be a string with maximum 500 characters' });
      }
      await UserModel.updateBio(userId, bio);
    }

    // Return updated user data
    const updatedUser = await UserModel.findById(userId);
    if (!updatedUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Determine if user is online (active within last 5 minutes)
    const isOnline = updatedUser.last_seen_at 
      ? (Date.now() - new Date(updatedUser.last_seen_at).getTime()) < 5 * 60 * 1000
      : false;

    res.json({
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
      is_admin: updatedUser.is_admin,
      last_seen_at: updatedUser.last_seen_at,
      is_online: isOnline,
      created_at: updatedUser.created_at,
    });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

export default router;
