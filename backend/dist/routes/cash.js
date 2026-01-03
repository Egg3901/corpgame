"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const User_1 = require("../models/User");
const Transaction_1 = require("../models/Transaction");
const auth_1 = require("../middleware/auth");
const connection_1 = __importDefault(require("../db/connection"));
const router = express_1.default.Router();
// POST /api/cash/transfer - Transfer cash to another user
router.post('/transfer', auth_1.authenticateToken, async (req, res) => {
    const client = await connection_1.default.connect();
    try {
        await client.query('BEGIN');
        const senderId = req.userId;
        const { recipient_id, amount, note } = req.body;
        // Validate input
        if (!recipient_id || amount === undefined) {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'recipient_id and amount are required' });
        }
        const recipientId = typeof recipient_id === 'string' ? parseInt(recipient_id, 10) : recipient_id;
        const transferAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
        if (isNaN(recipientId)) {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'Invalid recipient_id' });
        }
        if (isNaN(transferAmount) || transferAmount <= 0) {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'Amount must be a positive number' });
        }
        if (senderId === recipientId) {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'Cannot transfer cash to yourself' });
        }
        // Validate recipient exists
        const recipient = await User_1.UserModel.findById(recipientId);
        if (!recipient) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Recipient not found' });
        }
        // Check sender's cash balance
        const senderCash = await User_1.UserModel.getCash(senderId);
        if (senderCash < transferAmount) {
            await client.query('ROLLBACK');
            return res.status(400).json({
                error: `Insufficient funds. You have ${senderCash.toLocaleString('en-US', { style: 'currency', currency: 'USD' })} but need ${transferAmount.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}`
            });
        }
        // Perform atomic transfer
        await User_1.UserModel.updateCash(senderId, -transferAmount);
        await User_1.UserModel.updateCash(recipientId, transferAmount);
        // Record the transaction
        await Transaction_1.TransactionModel.create({
            transaction_type: 'user_transfer',
            amount: transferAmount,
            from_user_id: senderId,
            to_user_id: recipientId,
            description: note ? `Transfer: ${note}` : 'Cash transfer',
        });
        // Get updated balances
        const newSenderCash = await User_1.UserModel.getCash(senderId);
        const newRecipientCash = await User_1.UserModel.getCash(recipientId);
        await client.query('COMMIT');
        res.json({
            success: true,
            amount: transferAmount,
            sender_id: senderId,
            recipient_id: recipientId,
            sender_new_balance: newSenderCash,
            recipient_new_balance: newRecipientCash,
            note: note || null,
        });
    }
    catch (error) {
        await client.query('ROLLBACK');
        console.error('Cash transfer error:', error);
        res.status(500).json({ error: error.message || 'Failed to transfer cash' });
    }
    finally {
        client.release();
    }
});
exports.default = router;
