import { NextRequest, NextResponse } from 'next/server';
import { SharePriceHistoryModel } from '@/lib/models/SharePriceHistory';
import { getErrorMessage } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const corporationId = parseInt(params.id, 10);

    if (isNaN(corporationId)) {
      return NextResponse.json({ error: 'Invalid corporation ID' }, { status: 400 });
    }

    const limit = parseInt(req.nextUrl.searchParams.get('limit') || '100', 10);
    
    const history = await SharePriceHistoryModel.findByCorporationId(corporationId, limit);

    return NextResponse.json(history);
  } catch (error: unknown) {
    console.error('Get share history error:', error);
    return NextResponse.json({ error: getErrorMessage(error, 'Failed to fetch share history') }, { status: 500 });
  }
}
