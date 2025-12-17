import express, { Request, Response } from 'express';
import { authenticateToken, requireAdmin, AuthRequest } from '../middleware/auth';
import { BannedIpModel } from '../models/BannedIp';
import { UserModel } from '../models/User';
import { ReportedChatModel } from '../models/ReportedChat';
import { MessageModel } from '../models/Message';
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

// GET /api/admin/conversation/:userId1/:userId2 - Admin-only: View conversation between any two users
router.get('/conversation/:userId1/:userId2', async (req: AuthRequest, res: Response) => {
  try {
    const userId1 = parseInt(req.params.userId1, 10);
    const userId2 = parseInt(req.params.userId2, 10);
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 100;
    const offset = req.query.offset ? parseInt(req.query.offset as string, 10) : 0;

    if (isNaN(userId1) || isNaN(userId2)) {
      return res.status(400).json({ error: 'Invalid user IDs' });
    }

    // Verify both users exist
    const user1 = await UserModel.findById(userId1);
    const user2 = await UserModel.findById(userId2);

    if (!user1 || !user2) {
      return res.status(404).json({ error: 'One or both users not found' });
    }

    // Get conversation messages
    const messages = await MessageModel.findConversation(userId1, userId2, limit, offset);

    // Normalize image URLs
    const normalizedMessages = messages.map(msg => ({
      ...msg,
      sender: msg.sender ? {
        ...msg.sender,
        profile_image_url: normalizeImageUrl(msg.sender.profile_image_url),
      } : null,
      recipient: msg.recipient ? {
        ...msg.recipient,
        profile_image_url: normalizeImageUrl(msg.recipient.profile_image_url),
      } : null,
    }));

    res.json({
      messages: normalizedMessages,
      user1: {
        id: user1.id,
        profile_id: user1.profile_id,
        username: user1.username,
        player_name: user1.player_name,
        profile_image_url: normalizeImageUrl(user1.profile_image_url),
      },
      user2: {
        id: user2.id,
        profile_id: user2.profile_id,
        username: user2.username,
        player_name: user2.player_name,
        profile_image_url: normalizeImageUrl(user2.profile_image_url),
      },
    });
  } catch (error) {
    console.error('Admin view conversation error:', error);
    res.status(500).json({ error: 'Failed to fetch conversation' });
  }
});

export default router;
