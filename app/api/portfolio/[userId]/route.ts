import { NextRequest, NextResponse } from 'next/server';
import { ShareholderModel } from '@/lib/models/Shareholder';
import { CorporationModel } from '@/lib/models/Corporation';
import { calculateStockPrice } from '@/lib/utils/valuation';
import { UserModel } from '@/lib/models/User';
import { getErrorMessage } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const userId = parseInt(params.userId, 10);

    if (isNaN(userId)) {
      return NextResponse.json({ error: 'Invalid user ID' }, { status: 400 });
    }

    // Check if user exists
    const user = await UserModel.findById(userId);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get shareholders
    const holdings = await ShareholderModel.findByUserId(userId);
    
    // Filter out zero shares (if any exist)
    const activeHoldings = holdings.filter(h => h.shares > 0);
    
    if (activeHoldings.length === 0) {
      return NextResponse.json([]);
    }

    // Get corporations details
    const corpIds = activeHoldings.map(h => h.corporation_id);
    const corporations = await CorporationModel.findByIds(corpIds);
    const corpMap = new Map(corporations.map(c => [c.id, c]));

    // Calculate valuations in parallel
    const valuations = await Promise.all(
      activeHoldings.map(async (holding) => {
        const corp = corpMap.get(holding.corporation_id);
        if (!corp) return null;

        const valuation = await calculateStockPrice(holding.corporation_id);
        
        return {
          corporation_id: holding.corporation_id,
          corporation_name: corp.name,
          corporation_logo: corp.logo,
          shares: holding.shares,
          current_price: valuation.calculatedPrice,
          total_value: holding.shares * valuation.calculatedPrice,
          price_change_pct: valuation.hasTradeHistory ? ((valuation.calculatedPrice - valuation.tradeWeightedPrice) / valuation.tradeWeightedPrice) * 100 : 0 // Simplified change metric
        };
      })
    );

    // Filter nulls
    const portfolio = valuations.filter(v => v !== null);

    return NextResponse.json(portfolio);
  } catch (error: unknown) {
    console.error('Get portfolio error:', error);
    return NextResponse.json({ error: getErrorMessage(error, 'Failed to fetch portfolio') }, { status: 500 });
  }
}
