import express, { Request, Response } from 'express';
import { UserModel } from '../models/User';

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

    res.json({
      id: user.id,
      profile_id: user.profile_id,
      username: user.username,
      player_name: user.player_name,
      starting_state: user.starting_state,
      gender: user.gender,
      age: user.age,
      profile_slug: user.profile_slug,
      profile_image_url: user.profile_image_url,
      is_admin: user.is_admin,
      created_at: user.created_at,
    });
  } catch (error) {
    console.error('Profile lookup error:', error);
    res.status(500).json({ error: 'Failed to load profile' });
  }
});

export default router;
