import express, { Request, Response } from 'express';
import { UserModel } from '../models/User';

const router = express.Router();

router.get('/:slug', async (req: Request, res: Response) => {
  try {
    const slug = req.params.slug.toLowerCase();
    const user = await UserModel.findBySlug(slug);

    if (!user) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    res.json({
      id: user.id,
      username: user.username,
      player_name: user.player_name,
      starting_state: user.starting_state,
      gender: user.gender,
      age: user.age,
      profile_slug: user.profile_slug,
      is_admin: user.is_admin,
      created_at: user.created_at,
    });
  } catch (error) {
    console.error('Profile lookup error:', error);
    res.status(500).json({ error: 'Failed to load profile' });
  }
});

export default router;
