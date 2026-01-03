import { NextRequest, NextResponse } from 'next/server';
import { resolveExpiredProposals } from '@/lib/cron/actions';
import { GameSettingsModel } from '@/lib/models/GameSettings';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  // Verify the request is from Vercel Cron
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Check if cron is enabled
    const cronEnabled = await GameSettingsModel.isCronEnabled();
    if (!cronEnabled) {
      return NextResponse.json({ message: 'Cron is disabled', skipped: true });
    }

    await resolveExpiredProposals();
    return NextResponse.json({
      success: true,
      job: 'proposals',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[Cron/Proposals] Error:', error);
    return NextResponse.json(
      { error: 'Failed to resolve proposals', details: String(error) },
      { status: 500 }
    );
  }
}
