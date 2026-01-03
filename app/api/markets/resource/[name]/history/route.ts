import { NextRequest, NextResponse } from 'next/server';
import { connectMongo } from '@/lib/db/mongo';
import { CommodityPriceHistoryModel } from '@/lib/models/CommodityPriceHistory';
import { getErrorMessage } from '@/lib/utils';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  try {
    await connectMongo();
    const { name } = await params;
    const resourceName = decodeURIComponent(name);
    const searchParams = request.nextUrl.searchParams;
    const hours = parseInt(searchParams.get('hours') || '96', 10);
    const limit = parseInt(searchParams.get('limit') || '1000', 10);
    
    const history = await CommodityPriceHistoryModel.findByResourceName(
      resourceName,
      limit,
      hours
    );
    
    return NextResponse.json(history);
  } catch (error: unknown) {
    console.error('Get commodity price history error:', error);
    return NextResponse.json({ error: getErrorMessage(error, 'Failed to fetch commodity price history') }, { status: 500 });
  }
}
