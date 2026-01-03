import { NextRequest, NextResponse } from 'next/server';
import { connectMongo } from '@/lib/db/mongo';
import { ProductPriceHistoryModel } from '@/lib/models/ProductPriceHistory';
import { getErrorMessage } from '@/lib/utils';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  try {
    await connectMongo();
    const { name } = await params;
    const productName = decodeURIComponent(name);
    const searchParams = request.nextUrl.searchParams;
    const hours = parseInt(searchParams.get('hours') || '96', 10);
    const limit = parseInt(searchParams.get('limit') || '1000', 10);
    
    const history = await ProductPriceHistoryModel.findByProductName(
      productName,
      limit,
      hours
    );
    
    return NextResponse.json(history);
  } catch (error: unknown) {
    console.error('Get product price history error:', error);
    return NextResponse.json({ error: getErrorMessage(error, 'Failed to fetch product price history') }, { status: 500 });
  }
}
