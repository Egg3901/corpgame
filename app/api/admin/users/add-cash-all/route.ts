import { NextRequest, NextResponse } from 'next/server';
import { getAuthUserId } from '@/lib/auth';
import { UserModel } from '@/lib/models/User';
import { getErrorMessage } from '@/lib/utils';

export async function POST(req: NextRequest) {
  try {
    const userId = await getAuthUserId(req);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await UserModel.findById(userId);
    if (!user || !user.is_admin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { amount } = await req.json();
    const parsedAmount = parseFloat(amount);

    if (isNaN(parsedAmount) || parsedAmount === 0) {
      return NextResponse.json({ error: 'Amount must be a non-zero number' }, { status: 400 });
    }

    console.log(`[Admin] Adding $${parsedAmount.toLocaleString()} to all users by user:`, userId);

    // Add cash to all users
    const result = await UserModel.addCashToAll(parsedAmount);

    return NextResponse.json({
      success: true,
      message: `Successfully added $${parsedAmount.toLocaleString()} to ${result.updated} users`,
      users_updated: result.updated,
      amount: parsedAmount
    });
  } catch (error: unknown) {
    console.error('Add cash to all error:', error);
    return NextResponse.json({ error: getErrorMessage(error, 'Failed to add cash to all users') }, { status: 500 });
  }
}
