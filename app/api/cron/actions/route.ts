import { NextRequest, NextResponse } from 'next/server';
import { triggerActionsIncrement } from '@/lib/cron/actions';
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

    const result = await triggerActionsIncrement();
    return NextResponse.json({
      success: true,
      job: 'actions',
      updated: result.updated,
      ceoCount: result.ceoCount,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[Cron/Actions] Error:', error);
    return NextResponse.json(
      { error: 'Failed to process actions increment', details: String(error) },
      { status: 500 }
    );
  }
}
