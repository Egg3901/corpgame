import { NextRequest, NextResponse } from 'next/server';
import { triggerCeoSalaries } from '@/lib/cron/actions';
import { GameSettingsModel } from '@/lib/models/GameSettings';
import { connectMongo } from '@/lib/db/mongo';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  // Verify the request is from Vercel Cron
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await connectMongo();

    // Check if cron is enabled
    const cronEnabled = await GameSettingsModel.isCronEnabled();
    if (!cronEnabled) {
      return NextResponse.json({ message: 'Cron is disabled', skipped: true });
    }

    const result = await triggerCeoSalaries();
    return NextResponse.json({
      success: true,
      job: 'salaries',
      ceos_paid: result.ceos_paid,
      total_paid: result.total_paid,
      salaries_zeroed: result.salaries_zeroed,
      skipped_recently_paid: result.skipped_recently_paid,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[Cron/Salaries] Error:', error);
    return NextResponse.json(
      { error: 'Failed to process CEO salaries', details: String(error) },
      { status: 500 }
    );
  }
}
