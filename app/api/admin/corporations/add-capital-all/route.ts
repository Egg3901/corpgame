import { NextRequest, NextResponse } from 'next/server';
import { getAuthUserId } from '@/lib/auth';
import { UserModel } from '@/lib/models/User';
import { CorporationModel } from '@/lib/models/Corporation';
import { getErrorMessage } from '@/lib/utils';
import { getDb } from '@/lib/db/mongo';

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

    console.log(`[Admin] Adding $${parsedAmount.toLocaleString()} capital to all corporations by user:`, userId);

    // Update all corporations' capital
    const result = await getDb().collection('corporations').updateMany(
      {},
      [
        {
          $set: {
            capital: { $max: [0, { $add: [{ $ifNull: ['$capital', 0] }, parsedAmount] }] }
          }
        }
      ]
    );

    return NextResponse.json({
      success: true,
      corporations_updated: result.modifiedCount,
      amount: parsedAmount,
      message: `Added $${parsedAmount.toLocaleString()} capital to ${result.modifiedCount} corporations`,
    });
  } catch (error: unknown) {
    console.error('Add capital to all corporations error:', error);
    return NextResponse.json({ error: getErrorMessage(error, 'Failed to add capital to all corporations') }, { status: 500 });
  }
}
