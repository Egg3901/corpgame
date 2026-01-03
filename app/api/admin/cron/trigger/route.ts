import { NextRequest, NextResponse } from 'next/server';
import { getAuthUserId } from '@/lib/auth';
import { UserModel } from '@/lib/models/User';

// We'll import these from a cron library once migrated, 
// for now we need to reference the cron logic.
// Ideally, the cron logic should be in lib/cron/actions.ts and be callable.
// I haven't migrated cron logic to lib yet, but I should.
// For now, I will create a placeholder or import if available.
// The user asked to migrate cron jobs to Next.js API routes or Vercel Cron.
// So I should implement the trigger logic here by calling the functions.

// Since I haven't moved server/src/cron/actions.ts to lib/cron/actions.ts yet,
// I will create the lib/cron/actions.ts file now as part of this step, 
// so this route can import it.

import { triggerActionsIncrement, triggerMarketRevenue, triggerCeoSalaries, triggerDividends, triggerPriceHistoryRecording } from '@/lib/cron/actions';
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

    const { type } = await req.json();

    if (type === 'actions') {
      await triggerActionsIncrement();
      return NextResponse.json({ message: 'Actions increment triggered' });
    } else if (type === 'market') {
      await triggerMarketRevenue();
      return NextResponse.json({ message: 'Market revenue triggered' });
    } else if (type === 'salaries') {
      await triggerCeoSalaries();
      return NextResponse.json({ message: 'CEO salaries triggered' });
    } else if (type === 'dividends') {
      await triggerDividends();
      return NextResponse.json({ message: 'Dividends triggered' });
    } else if (type === 'prices') {
      const result = await triggerPriceHistoryRecording();
      return NextResponse.json({ message: 'Price history recorded', ...result });
    } else {
      return NextResponse.json({ error: 'Invalid trigger type. Valid: actions, market, salaries, dividends, prices' }, { status: 400 });
    }
  } catch (error: unknown) {
    console.error('Cron trigger error:', error);
    return NextResponse.json({ error: getErrorMessage(error, 'Failed to trigger cron') }, { status: 500 });
  }
}
