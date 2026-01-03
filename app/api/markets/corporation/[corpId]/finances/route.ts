import { NextRequest, NextResponse } from 'next/server';
import { connectMongo } from '@/lib/db/mongo';
import { CorporationModel } from '@/lib/models/Corporation';
import { MarketEntryModel } from '@/lib/models/MarketEntry';
import { calculateBalanceSheet } from '@/lib/utils/valuation';
import { StateMetadataModel } from '@/lib/models/StateMetadata';
import { getErrorMessage } from '@/lib/utils';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ corpId: string }> }
) {
  try {
    await connectMongo();
    const { corpId: corpIdParam } = await params;
    const corpId = parseInt(corpIdParam, 10);

    if (isNaN(corpId)) {
      return NextResponse.json({ error: 'Invalid corporation ID' }, { status: 400 });
    }

    const corporation = await CorporationModel.findById(corpId);
    if (!corporation) {
      return NextResponse.json({ error: 'Corporation not found' }, { status: 404 });
    }

    // Parse corporation data for income statement calculation
    const ceoSalary = typeof corporation.ceo_salary === 'string'
      ? parseFloat(corporation.ceo_salary)
      : (corporation.ceo_salary || 0);
    const dividendPercentage = typeof corporation.dividend_percentage === 'string'
      ? parseFloat(corporation.dividend_percentage)
      : (corporation.dividend_percentage || 0);
    const specialDividendLastAmount = typeof corporation.special_dividend_last_amount === 'string'
      ? parseFloat(corporation.special_dividend_last_amount as string)
      : (corporation.special_dividend_last_amount || null);

    // Calculate finances with full income statement (CEO salary subtracted before dividends)
    const [finances, balanceSheet] = await Promise.all([
      MarketEntryModel.calculateCorporationFinances(corpId, undefined, {
        ceo_salary: ceoSalary,
        dividend_percentage: dividendPercentage,
        shares: corporation.shares || 1,
        special_dividend_last_paid_at: corporation.special_dividend_last_paid_at,
        special_dividend_last_amount: specialDividendLastAmount,
      }),
      calculateBalanceSheet(corpId),
    ]);

    const entries = await MarketEntryModel.findByCorporationIdWithUnits(corpId);
    
    const stateCodes = [...new Set(entries.map(e => e.state_code))];
    
    let stateMetadataMap: Record<string, { name: string; multiplier: number }> = {};
    if (stateCodes.length > 0) {
      // Use StateMetadataModel to fetch state info
      const stateMetadata = await StateMetadataModel.findAll();
      for (const meta of stateMetadata) {
        if (stateCodes.includes(meta.state_code)) {
          stateMetadataMap[meta.state_code] = {
            name: meta.name || meta.state_code,
            multiplier: typeof meta.population_multiplier === 'string' 
              ? parseFloat(meta.population_multiplier) 
              : (meta.population_multiplier || 1),
          };
        }
      }
    }

    const marketsWithDetails = entries.map((entry) => {
      const stateMeta = stateMetadataMap[entry.state_code];
      return {
        ...entry,
        state_name: stateMeta?.name || entry.state_code,
        state_multiplier: stateMeta?.multiplier || 1,
      };
    });

    return NextResponse.json({
      corporation_id: corpId,
      finances,
      balance_sheet: balanceSheet,
      market_entries: marketsWithDetails,
    });
  } catch (error: unknown) {
    console.error('Get corporation finances error:', error);
    return NextResponse.json({ error: getErrorMessage(error, 'Failed to fetch corporation finances') }, { status: 500 });
  }
}
