import { NextRequest, NextResponse } from 'next/server';
import { getAuthUserId } from '@/lib/auth';
import { MarketEntryModel } from '@/lib/models/MarketEntry';
import { CorporationModel } from '@/lib/models/Corporation';
import { BusinessUnitModel } from '@/lib/models/BusinessUnit';
import { TransactionModel } from '@/lib/models/Transaction';
import { updateStockPrice } from '@/lib/utils/valuation';
import { StateMetadataModel } from '@/lib/models/StateMetadata';
import { UserModel } from '@/lib/models/User';
import { ACTIONS_CONFIG } from '@/lib/constants/actions';
import { getErrorMessage } from '@/lib/utils';

// Helper to get state label (name)
async function getStateLabel(stateCode: string): Promise<string> {
  const meta = await StateMetadataModel.findByCode(stateCode);
  return meta?.name || stateCode;
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { entryId: string } }
) {
  try {
    const entryId = parseInt(params.entryId, 10);
    const userId = await getAuthUserId(request);

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (isNaN(entryId)) {
      return NextResponse.json({ error: 'Invalid entry ID' }, { status: 400 });
    }

    const marketEntry = await MarketEntryModel.findById(entryId);
    if (!marketEntry) {
      return NextResponse.json({ error: 'Market entry not found' }, { status: 404 });
    }

    const corporation = await CorporationModel.findById(marketEntry.corporation_id);
    if (!corporation) {
      return NextResponse.json({ error: 'Corporation not found' }, { status: 404 });
    }

    if (corporation.ceo_id !== userId) {
      return NextResponse.json({ error: 'Only the CEO can abandon sectors' }, { status: 403 });
    }

    const unitCounts = await BusinessUnitModel.getUnitCounts(entryId);
    const totalUnits = unitCounts.retail + unitCounts.production + unitCounts.service + unitCounts.extraction;

    // Delete market entry (and cascade delete business units ideally, but we do manual delete in MongoDB often)
    // MarketEntryModel.delete usually just deletes the entry. We should delete units too.
    // Let's check MarketEntryModel.delete. It might not cascade.
    // BusinessUnitModel has deleteByMarketEntryId.
    
    await BusinessUnitModel.deleteByMarketEntryId(entryId);
    await MarketEntryModel.delete(entryId);

    const stateLabel = await getStateLabel(marketEntry.state_code);

    await TransactionModel.create({
      transaction_type: 'sector_abandon',
      amount: 0,
      from_user_id: userId,
      corporation_id: marketEntry.corporation_id,
      description: `Abandoned ${marketEntry.sector_type} sector in ${stateLabel} (${totalUnits} units removed)`,
      reference_id: entryId,
      reference_type: 'market_entry',
    });

    const newStockPrice = await updateStockPrice(marketEntry.corporation_id);

    return NextResponse.json({
      success: true,
      message: `Abandoned ${marketEntry.sector_type} sector in ${stateLabel}`,
      market_entry_id: entryId,
      units_removed: totalUnits,
      new_stock_price: newStockPrice,
    });
  } catch (error: unknown) {
    console.error('Abandon sector error:', error);
    return NextResponse.json({ error: getErrorMessage(error, 'Failed to abandon sector') }, { status: 500 });
  }
}
