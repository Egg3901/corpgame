import { NextRequest, NextResponse } from 'next/server';
import { getAuthUserId } from '@/lib/auth';
import { UserModel } from '@/lib/models/User';
import { TransactionModel } from '@/lib/models/Transaction';
import { getErrorMessage } from '@/lib/utils';
import { CashTransferSchema } from '@/lib/validations/users';

export async function POST(req: NextRequest) {
  try {
    const userId = await getAuthUserId(req);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    
    // Zod validation
    const validated = CashTransferSchema.safeParse(body);
    if (!validated.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validated.error.issues },
        { status: 400 }
      );
    }
    
    const { toUserId: recipientId, amount: transferAmount, description: note } = validated.data;

    if (userId === recipientId) {
      return NextResponse.json({ error: 'Cannot transfer cash to yourself' }, { status: 400 });
    }

    // Validate recipient exists
    const recipient = await UserModel.findById(recipientId);
    if (!recipient) {
      return NextResponse.json({ error: 'Recipient not found' }, { status: 404 });
    }

    // Check sender's cash balance
    const senderCash = await UserModel.getCash(userId);
    if (senderCash < transferAmount) {
      return NextResponse.json({ 
        error: `Insufficient funds. You have ${senderCash.toLocaleString('en-US', { style: 'currency', currency: 'USD' })} but need ${transferAmount.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}` 
      }, { status: 400 });
    }

    // Perform transfer
    // In MongoDB, we don't have multi-document transactions without replica set (usually). 
    // We'll do it sequentially for now, or use session if available.
    // For simplicity/migration speed, we'll do sequential updates.
    // Ideally: decrease sender, increase recipient.
    
    // Decrease sender
    await UserModel.updateCash(userId, -transferAmount);
    
    // Increase recipient
    try {
      await UserModel.updateCash(recipientId, transferAmount);
    } catch (err: unknown) {
      // If recipient update fails, try to refund sender (manual rollback)
      console.error('Failed to credit recipient, refunding sender...', err);
      await UserModel.updateCash(userId, transferAmount);
      throw err;
    }

    // Record the transaction
    await TransactionModel.create({
      transaction_type: 'user_transfer',
      amount: transferAmount,
      from_user_id: userId,
      to_user_id: recipientId,
      description: note ? `Transfer: ${note}` : 'Cash transfer',
    });

    // Get updated balances
    const newSenderCash = await UserModel.getCash(userId);
    const newRecipientCash = await UserModel.getCash(recipientId);

    return NextResponse.json({
      success: true,
      amount: transferAmount,
      sender_id: userId,
      recipient_id: recipientId,
      sender_new_balance: newSenderCash,
      recipient_new_balance: newRecipientCash,
      note: note || null,
    });
  } catch (error: unknown) {
    console.error('Cash transfer error:', error);
    return NextResponse.json({ error: getErrorMessage(error, 'Failed to transfer cash') }, { status: 500 });
  }
}
