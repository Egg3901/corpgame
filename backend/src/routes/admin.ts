import express, { Request, Response } from 'express';
import { authenticateToken, requireAdmin, AuthRequest } from '../middleware/auth';
import { BannedIpModel } from '../models/BannedIp';
import { UserModel } from '../models/User';

const router = express.Router();

router.use(authenticateToken, requireAdmin);

router.post('/ban-ip', async (req: AuthRequest, res: Response) => {
  try {
    const { ip, reason } = req.body;
    if (!ip || typeof ip !== 'string') {
      return res.status(400).json({ error: 'IP address is required' });
    }

    await BannedIpModel.banIp(ip, reason || null, req.userId || null);
    await UserModel.banUsersByIp(BannedIpModel.normalize(ip), reason || null, req.userId || null);

    res.json({ message: `IP ${ip} banned` });
  } catch (error) {
    console.error('Ban IP error:', error);
    res.status(500).json({ error: 'Failed to ban IP' });
  }
});

router.post('/users/:id/ban', async (req: AuthRequest, res: Response) => {
  try {
    const userId = parseInt(req.params.id, 10);
    if (isNaN(userId)) {
      return res.status(400).json({ error: 'Invalid user id' });
    }

    if (req.userId === userId) {
      return res.status(400).json({ error: 'You cannot ban yourself' });
    }

    const { reason } = req.body;
    await UserModel.banUser(userId, reason || null, req.userId || null);
    res.json({ message: 'User banned' });
  } catch (error) {
    console.error('Ban user error:', error);
    res.status(500).json({ error: 'Failed to ban user' });
  }
});

router.delete('/users/:id', async (req: AuthRequest, res: Response) => {
  try {
    const userId = parseInt(req.params.id, 10);
    if (isNaN(userId)) {
      return res.status(400).json({ error: 'Invalid user id' });
    }

    if (req.userId === userId) {
      return res.status(400).json({ error: 'You cannot delete yourself' });
    }

    await UserModel.deleteUser(userId);
    res.json({ message: 'User deleted' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

export default router;
