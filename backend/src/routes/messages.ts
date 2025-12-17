import express, { Request, Response } from 'express';
import { MessageModel } from '../models/Message';
import { UserModel } from '../models/User';
import { ReportedChatModel } from '../models/ReportedChat';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { normalizeImageUrl } from '../utils/imageUrl';

const router = express.Router();

// POST /api/messages - Send a new message
router.post('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const senderId = req.userId!;
    const { recipient_id, subject, body } = req.body;

    if (!recipient_id || !body) {
      return res.status(400).json({ error: 'recipient_id and body are required' });
    }

    if (typeof recipient_id !== 'number' && typeof recipient_id !== 'string') {
      return res.status(400).json({ error: 'Invalid recipient_id' });
    }

    const recipientId = typeof recipient_id === 'string' ? parseInt(recipient_id, 10) : recipient_id;

    if (isNaN(recipientId)) {
      return res.status(400).json({ error: 'Invalid recipient_id' });
    }

    if (senderId === recipientId) {
      return res.status(400).json({ error: 'Cannot send message to yourself' });
    }

    // Validate recipient exists
    const recipient = await UserModel.findById(recipientId);
    if (!recipient) {
      return res.status(404).json({ error: 'Recipient not found' });
    }

    // Validate body length
    if (typeof body !== 'string' || body.trim().length === 0) {
      return res.status(400).json({ error: 'Message body cannot be empty' });
    }

    if (body.length > 10000) {
      return res.status(400).json({ error: 'Message body cannot exceed 10000 characters' });
    }

    // Validate subject length if provided
    if (subject !== undefined && subject !== null) {
      if (typeof subject !== 'string' || subject.length > 255) {
        return res.status(400).json({ error: 'Subject cannot exceed 255 characters' });
      }
    }

    const message = await MessageModel.create({
      sender_id: senderId,
      recipient_id: recipientId,
      subject: subject || null,
      body: body.trim(),
    });

    res.status(201).json(message);
  } catch (error: any) {
    console.error('Send message error:', error);
    res.status(500).json({ error: error.message || 'Failed to send message' });
  }
});

// GET /api/messages - Get user's messages
router.get('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { type, limit, offset, include_read } = req.query;

    const messageLimit = limit ? parseInt(limit as string, 10) : 50;
    const messageOffset = offset ? parseInt(offset as string, 10) : 0;
    const includeRead = include_read !== 'false';

    let messages;

    if (type === 'sent') {
      messages = await MessageModel.findBySenderId(userId, messageLimit, messageOffset);
    } else if (type === 'conversations') {
      const conversations = await MessageModel.getUserConversations(userId);
      return res.json(conversations);
    } else {
      // Default: received messages
      messages = await MessageModel.findByRecipientId(userId, messageLimit, messageOffset, includeRead);
    }

    res.json(messages);
  } catch (error: any) {
    console.error('Get messages error:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch messages' });
  }
});

// GET /api/messages/unread/count - Get unread message count
router.get('/unread/count', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const count = await MessageModel.getUnreadCount(userId);
    res.json({ count });
  } catch (error: any) {
    console.error('Get unread count error:', error);
    res.status(500).json({ error: error.message || 'Failed to get unread count' });
  }
});

// GET /api/messages/conversation/:userId - Get conversation with specific user
router.get('/conversation/:userId', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const otherUserId = parseInt(req.params.userId, 10);
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;
    const offset = req.query.offset ? parseInt(req.query.offset as string, 10) : 0;

    if (isNaN(otherUserId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    const messages = await MessageModel.findConversation(userId, otherUserId, limit, offset);
    res.json(messages);
  } catch (error: any) {
    console.error('Get conversation error:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch conversation' });
  }
});

// GET /api/messages/:id - Get a specific message
router.get('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const messageId = parseInt(req.params.id, 10);

    if (isNaN(messageId)) {
      return res.status(400).json({ error: 'Invalid message ID' });
    }

    const message = await MessageModel.findById(messageId);
    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    // Check if user is sender or recipient
    if (message.sender_id !== userId && message.recipient_id !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // If user is recipient and message is unread, mark as read
    if (message.recipient_id === userId && !message.read) {
      await MessageModel.markAsRead(messageId, userId);
      message.read = true;
    }

    // Fetch sender and recipient details
    const sender = await UserModel.findById(message.sender_id);
    const recipient = await UserModel.findById(message.recipient_id);

    const messageWithUsers = {
      ...message,
      sender: sender ? {
        id: sender.id,
        profile_id: sender.profile_id,
        username: sender.username,
        player_name: sender.player_name,
        profile_image_url: normalizeImageUrl(sender.profile_image_url),
      } : null,
      recipient: recipient ? {
        id: recipient.id,
        profile_id: recipient.profile_id,
        username: recipient.username,
        player_name: recipient.player_name,
        profile_image_url: normalizeImageUrl(recipient.profile_image_url),
      } : null,
    };

    res.json(messageWithUsers);
  } catch (error: any) {
    console.error('Get message error:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch message' });
  }
});

// PATCH /api/messages/:id/read - Mark message as read
router.patch('/:id/read', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const messageId = parseInt(req.params.id, 10);

    if (isNaN(messageId)) {
      return res.status(400).json({ error: 'Invalid message ID' });
    }

    const message = await MessageModel.findById(messageId);
    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    // Check if user is recipient
    if (message.recipient_id !== userId) {
      return res.status(403).json({ error: 'Only recipient can mark message as read' });
    }

    await MessageModel.markAsRead(messageId, userId);
    res.json({ success: true });
  } catch (error: any) {
    console.error('Mark as read error:', error);
    res.status(500).json({ error: error.message || 'Failed to mark message as read' });
  }
});

// PATCH /api/messages/conversation/:userId/read - Mark all messages in conversation as read
router.patch('/conversation/:userId/read', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const otherUserId = parseInt(req.params.userId, 10);

    if (isNaN(otherUserId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    await MessageModel.markAllAsRead(userId, otherUserId);
    res.json({ success: true });
  } catch (error: any) {
    console.error('Mark conversation as read error:', error);
    res.status(500).json({ error: error.message || 'Failed to mark conversation as read' });
  }
});

// POST /api/messages/conversation/:userId/report - Report a conversation
router.post('/conversation/:userId/report', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const reporterId = req.userId!;
    const reportedUserId = parseInt(req.params.userId, 10);
    const { reason } = req.body;

    if (isNaN(reportedUserId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    if (reporterId === reportedUserId) {
      return res.status(400).json({ error: 'Cannot report yourself' });
    }

    // Validate reported user exists
    const reportedUser = await UserModel.findById(reportedUserId);
    if (!reportedUser) {
      return res.status(404).json({ error: 'Reported user not found' });
    }

    // Validate reason length if provided
    if (reason !== undefined && reason !== null) {
      if (typeof reason !== 'string' || reason.length > 2000) {
        return res.status(400).json({ error: 'Reason cannot exceed 2000 characters' });
      }
    }

    const report = await ReportedChatModel.create({
      reporter_id: reporterId,
      reported_user_id: reportedUserId,
      reason: reason ? reason.trim() : null,
    });

    res.status(201).json({
      success: true,
      report_id: report.id,
      message: 'Conversation reported successfully',
    });
  } catch (error: any) {
    console.error('Report conversation error:', error);
    res.status(500).json({ error: error.message || 'Failed to report conversation' });
  }
});

// DELETE /api/messages/:id - Delete a message
router.delete('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const messageId = parseInt(req.params.id, 10);

    if (isNaN(messageId)) {
      return res.status(400).json({ error: 'Invalid message ID' });
    }

    const deleted = await MessageModel.delete(messageId, userId);
    if (!deleted) {
      return res.status(404).json({ error: 'Message not found or access denied' });
    }

    res.json({ success: true });
  } catch (error: any) {
    console.error('Delete message error:', error);
    res.status(500).json({ error: error.message || 'Failed to delete message' });
  }
});

export default router;

