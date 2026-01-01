import { NextRequest, NextResponse } from 'next/server';
import { getAuthUserId } from '@/lib/auth';
import { UserModel } from '@/lib/models/User';
import { getErrorMessage } from '@/lib/utils';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const userId = await getAuthUserId(req);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const adminUser = await UserModel.findById(userId);
    if (!adminUser || !adminUser.is_admin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const targetUserId = parseInt(params.id, 10);
    const { amount } = await req.json();
    const parsedAmount = parseFloat(amount);

    if (isNaN(targetUserId)) {
      return NextResponse.json({ error: 'Invalid user ID' }, { status: 400 });
    }

    if (isNaN(parsedAmount) || parsedAmount === 0) {
      return NextResponse.json({ error: 'Amount must be a non-zero number' }, { status: 400 });
    }

    const user = await UserModel.findById(targetUserId);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    console.log(`[Admin] Adding $${parsedAmount.toLocaleString()} to user ${targetUserId} by admin:`, userId);

    const oldCash = user.cash || 0;
    const updatedUser = await UserModel.updateCash(targetUserId, parsedAmount);
    const newCash = updatedUser.cash || 0;

    return NextResponse.json({
      success: true,
      user_id: targetUserId,
      username: user.username,
      player_name: user.player_name,
      old_cash: oldCash,
      new_cash: newCash,
      amount: parsedAmount,
      message: `Added $${parsedAmount.toLocaleString()} to ${user.player_name || user.username}`,
    });
  } catch (error: unknown) {
    console.error('Add cash to user error:', error);
    return NextResponse.json({ error: getErrorMessage(error, 'Failed to add cash to user') }, { status: 500 });
  }
}
