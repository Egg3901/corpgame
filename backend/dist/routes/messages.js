"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const Message_1 = require("../models/Message");
const User_1 = require("../models/User");
const ReportedChat_1 = require("../models/ReportedChat");
const auth_1 = require("../middleware/auth");
const imageUrl_1 = require("../utils/imageUrl");
const router = express_1.default.Router();
// POST /api/messages - Send a new message
router.post('/', auth_1.authenticateToken, async (req, res) => {
    try {
        const senderId = req.userId;
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
        const recipient = await User_1.UserModel.findById(recipientId);
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
        const message = await Message_1.MessageModel.create({
            sender_id: senderId,
            recipient_id: recipientId,
            subject: subject || null,
            body: body.trim(),
        });
        res.status(201).json(message);
    }
    catch (error) {
        console.error('Send message error:', error);
        res.status(500).json({ error: error.message || 'Failed to send message' });
    }
});
// GET /api/messages - Get user's messages
router.get('/', auth_1.authenticateToken, async (req, res) => {
    try {
        const userId = req.userId;
        const { type, limit, offset, include_read } = req.query;
        const messageLimit = limit ? parseInt(limit, 10) : 50;
        const messageOffset = offset ? parseInt(offset, 10) : 0;
        const includeRead = include_read !== 'false';
        let messages;
        if (type === 'sent') {
            messages = await Message_1.MessageModel.findBySenderId(userId, messageLimit, messageOffset);
        }
        else if (type === 'conversations') {
            const conversations = await Message_1.MessageModel.getUserConversations(userId);
            return res.json(conversations);
        }
        else {
            // Default: received messages
            messages = await Message_1.MessageModel.findByRecipientId(userId, messageLimit, messageOffset, includeRead);
        }
        res.json(messages);
    }
    catch (error) {
        console.error('Get messages error:', error);
        res.status(500).json({ error: error.message || 'Failed to fetch messages' });
    }
});
// GET /api/messages/unread/count - Get unread message count
router.get('/unread/count', auth_1.authenticateToken, async (req, res) => {
    try {
        const userId = req.userId;
        const count = await Message_1.MessageModel.getUnreadCount(userId);
        res.json({ count });
    }
    catch (error) {
        console.error('Get unread count error:', error);
        res.status(500).json({ error: error.message || 'Failed to get unread count' });
    }
});
// GET /api/messages/conversation/:userId - Get conversation with specific user
router.get('/conversation/:userId', auth_1.authenticateToken, async (req, res) => {
    try {
        const userId = req.userId;
        const otherUserId = parseInt(req.params.userId, 10);
        const limit = req.query.limit ? parseInt(req.query.limit, 10) : 50;
        const offset = req.query.offset ? parseInt(req.query.offset, 10) : 0;
        if (isNaN(otherUserId)) {
            return res.status(400).json({ error: 'Invalid user ID' });
        }
        const messages = await Message_1.MessageModel.findConversation(userId, otherUserId, limit, offset);
        res.json(messages);
    }
    catch (error) {
        console.error('Get conversation error:', error);
        res.status(500).json({ error: error.message || 'Failed to fetch conversation' });
    }
});
// GET /api/messages/:id - Get a specific message
router.get('/:id', auth_1.authenticateToken, async (req, res) => {
    try {
        const userId = req.userId;
        const messageId = parseInt(req.params.id, 10);
        if (isNaN(messageId)) {
            return res.status(400).json({ error: 'Invalid message ID' });
        }
        const message = await Message_1.MessageModel.findById(messageId);
        if (!message) {
            return res.status(404).json({ error: 'Message not found' });
        }
        // Check if user is sender or recipient
        if (message.sender_id !== userId && message.recipient_id !== userId) {
            return res.status(403).json({ error: 'Access denied' });
        }
        // If user is recipient and message is unread, mark as read
        if (message.recipient_id === userId && !message.read) {
            await Message_1.MessageModel.markAsRead(messageId, userId);
            message.read = true;
        }
        // Fetch sender and recipient details
        const sender = await User_1.UserModel.findById(message.sender_id);
        const recipient = await User_1.UserModel.findById(message.recipient_id);
        const messageWithUsers = {
            ...message,
            sender: sender ? {
                id: sender.id,
                profile_id: sender.profile_id,
                username: sender.username,
                player_name: sender.player_name,
                profile_image_url: (0, imageUrl_1.normalizeImageUrl)(sender.profile_image_url),
            } : null,
            recipient: recipient ? {
                id: recipient.id,
                profile_id: recipient.profile_id,
                username: recipient.username,
                player_name: recipient.player_name,
                profile_image_url: (0, imageUrl_1.normalizeImageUrl)(recipient.profile_image_url),
            } : null,
        };
        res.json(messageWithUsers);
    }
    catch (error) {
        console.error('Get message error:', error);
        res.status(500).json({ error: error.message || 'Failed to fetch message' });
    }
});
// PATCH /api/messages/:id/read - Mark message as read
router.patch('/:id/read', auth_1.authenticateToken, async (req, res) => {
    try {
        const userId = req.userId;
        const messageId = parseInt(req.params.id, 10);
        if (isNaN(messageId)) {
            return res.status(400).json({ error: 'Invalid message ID' });
        }
        const message = await Message_1.MessageModel.findById(messageId);
        if (!message) {
            return res.status(404).json({ error: 'Message not found' });
        }
        // Check if user is recipient
        if (message.recipient_id !== userId) {
            return res.status(403).json({ error: 'Only recipient can mark message as read' });
        }
        await Message_1.MessageModel.markAsRead(messageId, userId);
        res.json({ success: true });
    }
    catch (error) {
        console.error('Mark as read error:', error);
        res.status(500).json({ error: error.message || 'Failed to mark message as read' });
    }
});
// PATCH /api/messages/conversation/:userId/read - Mark all messages in conversation as read
router.patch('/conversation/:userId/read', auth_1.authenticateToken, async (req, res) => {
    try {
        const userId = req.userId;
        const otherUserId = parseInt(req.params.userId, 10);
        if (isNaN(otherUserId)) {
            return res.status(400).json({ error: 'Invalid user ID' });
        }
        await Message_1.MessageModel.markAllAsRead(userId, otherUserId);
        res.json({ success: true });
    }
    catch (error) {
        console.error('Mark conversation as read error:', error);
        res.status(500).json({ error: error.message || 'Failed to mark conversation as read' });
    }
});
// POST /api/messages/conversation/:userId/report - Report a conversation
router.post('/conversation/:userId/report', auth_1.authenticateToken, async (req, res) => {
    try {
        const reporterId = req.userId;
        const reportedUserId = parseInt(req.params.userId, 10);
        const { reason } = req.body;
        if (isNaN(reportedUserId)) {
            return res.status(400).json({ error: 'Invalid user ID' });
        }
        if (reporterId === reportedUserId) {
            return res.status(400).json({ error: 'Cannot report yourself' });
        }
        // Validate reported user exists
        const reportedUser = await User_1.UserModel.findById(reportedUserId);
        if (!reportedUser) {
            return res.status(404).json({ error: 'Reported user not found' });
        }
        // Validate reason length if provided
        if (reason !== undefined && reason !== null) {
            if (typeof reason !== 'string' || reason.length > 2000) {
                return res.status(400).json({ error: 'Reason cannot exceed 2000 characters' });
            }
        }
        const report = await ReportedChat_1.ReportedChatModel.create({
            reporter_id: reporterId,
            reported_user_id: reportedUserId,
            reason: reason ? reason.trim() : null,
        });
        res.status(201).json({
            success: true,
            report_id: report.id,
            message: 'Conversation reported successfully',
        });
    }
    catch (error) {
        console.error('Report conversation error:', error);
        res.status(500).json({ error: error.message || 'Failed to report conversation' });
    }
});
// DELETE /api/messages/:id - Delete a message
router.delete('/:id', auth_1.authenticateToken, async (req, res) => {
    try {
        const userId = req.userId;
        const messageId = parseInt(req.params.id, 10);
        if (isNaN(messageId)) {
            return res.status(400).json({ error: 'Invalid message ID' });
        }
        const deleted = await Message_1.MessageModel.delete(messageId, userId);
        if (!deleted) {
            return res.status(404).json({ error: 'Message not found or access denied' });
        }
        res.json({ success: true });
    }
    catch (error) {
        console.error('Delete message error:', error);
        res.status(500).json({ error: error.message || 'Failed to delete message' });
    }
});
exports.default = router;
