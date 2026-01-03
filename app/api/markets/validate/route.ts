import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { marketDataService } from '@/lib/services/MarketDataService';
import { getErrorMessage } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req);
    const result = await marketDataService.validateAndAudit();
    return NextResponse.json({ ok: true, result });
  } catch (error: unknown) {
    const errorMessage = getErrorMessage(error);
    if (errorMessage === 'Unauthorized' || errorMessage === 'Forbidden') {
      return NextResponse.json({ error: errorMessage }, { status: 403 });
    }
    console.error('Market validation error:', error);
    return NextResponse.json({ error: getErrorMessage(error, 'Failed to run validation') }, { status: 500 });
  }
}
