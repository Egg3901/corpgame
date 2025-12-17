import express, { Request, Response } from 'express';
import { authenticateToken, requireAdmin, AuthRequest } from '../middleware/auth';
import { BannedIpModel } from '../models/BannedIp';
import { UserModel } from '../models/User';
import { ReportedChatModel } from '../models/ReportedChat';
import { normalizeImageUrl } from '../utils/imageUrl';

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

router.get('/users', async (req: AuthRequest, res: Response) => {
  try {
    const users = await UserModel.getAllUsers();
    // Don't return password_hash
    const sanitizedUsers = users.map(({ password_hash, ...user }) => user);
    res.json(sanitizedUsers);
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Failed to get users' });
  }
});

router.patch('/users/:id/admin', async (req: AuthRequest, res: Response) => {
  try {
    const userId = parseInt(req.params.id, 10);
    if (isNaN(userId)) {
      return res.status(400).json({ error: 'Invalid user id' });
    }

    if (req.userId === userId) {
      return res.status(400).json({ error: 'You cannot change your own admin status' });
    }

    const updatedUser = await UserModel.toggleAdminStatus(userId);
    const { password_hash, ...sanitizedUser } = updatedUser;
    res.json(sanitizedUser);
  } catch (error) {
    console.error('Toggle admin status error:', error);
    res.status(500).json({ error: 'Failed to toggle admin status' });
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

// GET /api/admin/reported-chats - Get all reported chats
router.get('/reported-chats', async (req: AuthRequest, res: Response) => {
  try {
    const { include_reviewed } = req.query;
    const includeReviewed = include_reviewed === 'true';
    
    const reportedChats = await ReportedChatModel.findAll(includeReviewed);
    
    // Normalize image URLs
    const normalizedChats = reportedChats.map(chat => ({
      ...chat,
      reporter: chat.reporter ? {
        ...chat.reporter,
        profile_image_url: normalizeImageUrl(chat.reporter.profile_image_url),
      } : null,
      reported_user: chat.reported_user ? {
        ...chat.reported_user,
        profile_image_url: normalizeImageUrl(chat.reported_user.profile_image_url),
      } : null,
    }));
    
    res.json(normalizedChats);
  } catch (error) {
    console.error('Get reported chats error:', error);
    res.status(500).json({ error: 'Failed to get reported chats' });
  }
});

// DELETE /api/admin/reported-chats/:id - Mark reported chat as reviewed (clear from display)
router.delete('/reported-chats/:id', async (req: AuthRequest, res: Response) => {
  try {
    const reportId = parseInt(req.params.id, 10);
    if (isNaN(reportId)) {
      return res.status(400).json({ error: 'Invalid report id' });
    }

    const reviewed = await ReportedChatModel.markAsReviewed(reportId, req.userId!);
    if (!reviewed) {
      return res.status(404).json({ error: 'Report not found' });
    }

    res.json({ message: 'Report marked as reviewed', report: reviewed });
  } catch (error) {
    console.error('Mark report as reviewed error:', error);
    res.status(500).json({ error: 'Failed to mark report as reviewed' });
  }
});

export default router;
