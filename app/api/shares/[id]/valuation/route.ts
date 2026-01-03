import { NextRequest, NextResponse } from 'next/server';
import { CorporationModel } from '@/lib/models/Corporation';
import { calculateStockPrice, calculateBalanceSheet } from '@/lib/utils/valuation';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const corporationId = parseInt(id, 10);

    if (isNaN(corporationId)) {
      return NextResponse.json({ error: 'Invalid corporation ID' }, { status: 400 });
    }

    const corporation = await CorporationModel.findById(corporationId);
    if (!corporation) {
      return NextResponse.json({ error: 'Corporation not found' }, { status: 404 });
    }

    const [valuation, balanceSheet] = await Promise.all([
      calculateStockPrice(corporationId),
      calculateBalanceSheet(corporationId),
    ]);

    return NextResponse.json({
      corporation_id: corporationId,
      current_price: corporation.share_price,
      valuation: {
        book_value: valuation.bookValue,
        earnings_value: valuation.earningsValue,
        dividend_yield: valuation.dividendYield,
        cash_per_share: valuation.cashPerShare,
        trade_weighted_price: valuation.tradeWeightedPrice,
        fundamental_value: valuation.fundamentalValue,
        calculated_price: valuation.calculatedPrice,
        recent_trade_count: valuation.recentTradeCount,
        has_trade_history: valuation.hasTradeHistory,
        annual_profit: valuation.annualProfit,
        annual_dividend_per_share: valuation.annualDividendPerShare,
      },
      balance_sheet: balanceSheet,
    });
  } catch (error: unknown) {
    console.error('Get valuation error:', error);
    return NextResponse.json({ error: 'Failed to fetch valuation' }, { status: 500 });
  }
}
