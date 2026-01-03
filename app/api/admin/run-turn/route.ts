import { NextRequest, NextResponse } from 'next/server';
import { getAuthUserId } from '@/lib/auth';
import { UserModel } from '@/lib/models/User';
import { triggerActionsIncrement, triggerMarketRevenue, triggerCeoSalaries } from '@/lib/cron/actions';
import { getErrorMessage } from '@/lib/utils';
import { connectMongo } from '@/lib/db/mongo';

export async function POST(req: NextRequest) {
  try {
    await connectMongo();
    const userId = await getAuthUserId(req);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await UserModel.findById(userId);
    if (!user || !user.is_admin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Run all turn actions in sequence
    const actionsResult = await triggerActionsIncrement();
    const marketResult = await triggerMarketRevenue();
    const salariesResult = await triggerCeoSalaries();

    return NextResponse.json({
      success: true,
      actions: {
        users_updated: actionsResult.updated,
        ceo_count: actionsResult.ceoCount,
      },
      market_revenue: {
        corporations_processed: marketResult.processed,
        total_profit: marketResult.totalProfit,
      },
      ceo_salaries: salariesResult,
    });
  } catch (error: unknown) {
    console.error('Run turn error:', error);
    return NextResponse.json({ error: getErrorMessage(error, 'Failed to run turn') }, { status: 500 });
  }
}
