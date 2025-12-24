import express, { Request, Response } from 'express';
import { UserModel } from '../models/User';
import { TransactionModel } from '../models/Transaction';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import pool from '../db/connection';

const router = express.Router();

// POST /api/cash/transfer - Transfer cash to another user
router.post('/transfer', authenticateToken, async (req: AuthRequest, res: Response) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const senderId = req.userId!;
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
    const recipient = await UserModel.findById(recipientId);
    if (!recipient) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Recipient not found' });
    }

    // Check sender's cash balance
    const senderCash = await UserModel.getCash(senderId);
    if (senderCash < transferAmount) {
      await client.query('ROLLBACK');
      return res.status(400).json({ 
        error: `Insufficient funds. You have ${senderCash.toLocaleString('en-US', { style: 'currency', currency: 'USD' })} but need ${transferAmount.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}` 
      });
    }

    // Perform atomic transfer
    await UserModel.updateCash(senderId, -transferAmount);
    await UserModel.updateCash(recipientId, transferAmount);

    // Record the transaction
    await TransactionModel.create({
      transaction_type: 'user_transfer',
      amount: transferAmount,
      from_user_id: senderId,
      to_user_id: recipientId,
      description: note ? `Transfer: ${note}` : 'Cash transfer',
    });

    // Get updated balances
    const newSenderCash = await UserModel.getCash(senderId);
    const newRecipientCash = await UserModel.getCash(recipientId);

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
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('Cash transfer error:', error);
    res.status(500).json({ error: error.message || 'Failed to transfer cash' });
  } finally {
    client.release();
  }
});

export default router;

