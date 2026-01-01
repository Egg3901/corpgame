import { NextRequest, NextResponse } from 'next/server';
import { getAuthUserId } from '@/lib/auth';
import { UserModel } from '@/lib/models/User';
import { CorporationModel } from '@/lib/models/Corporation';
import { getErrorMessage } from '@/lib/utils';
import { updateStockPrice } from '@/lib/utils/valuation';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const userId = await getAuthUserId(req);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await UserModel.findById(userId);
    if (!user || !user.is_admin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const corpId = parseInt(params.id, 10);
    const { amount } = await req.json();
    const parsedAmount = parseFloat(amount);

    if (isNaN(corpId)) {
      return NextResponse.json({ error: 'Invalid corporation ID' }, { status: 400 });
    }

    if (isNaN(parsedAmount) || parsedAmount === 0) {
      return NextResponse.json({ error: 'Amount must be a non-zero number' }, { status: 400 });
    }

    const corporation = await CorporationModel.findById(corpId);
    if (!corporation) {
      return NextResponse.json({ error: 'Corporation not found' }, { status: 404 });
    }

    console.log(`[Admin] Adding $${parsedAmount.toLocaleString()} capital to corporation ${corpId} by admin:`, userId);

    const oldCapital = typeof corporation.capital === 'string' ? parseFloat(corporation.capital) : corporation.capital;
    const newCapital = Math.max(0, oldCapital + parsedAmount);

    await CorporationModel.update(corpId, { capital: newCapital });

    // Recalculate stock price after capital change
    const newPrice = await updateStockPrice(corpId);

    return NextResponse.json({
      success: true,
      corporation_id: corpId,
      corporation_name: corporation.name,
      old_capital: oldCapital,
      new_capital: newCapital,
      new_share_price: newPrice,
      amount: parsedAmount,
      message: `Added $${parsedAmount.toLocaleString()} capital to ${corporation.name}`,
    });
  } catch (error: unknown) {
    console.error('Add capital to corporation error:', error);
    return NextResponse.json({ error: getErrorMessage(error, 'Failed to add capital to corporation') }, { status: 500 });
  }
}
