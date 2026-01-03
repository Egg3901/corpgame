import { NextRequest, NextResponse } from 'next/server';
import { connectMongo } from '@/lib/db/mongo';
import { getAuthUserId } from '@/lib/auth';
import { MarketEntryModel } from '@/lib/models/MarketEntry';
import { CorporationModel } from '@/lib/models/Corporation';
import { BusinessUnitModel, UnitType } from '@/lib/models/BusinessUnit';
import { TransactionModel } from '@/lib/models/Transaction';
import { updateStockPrice } from '@/lib/utils/valuation';
import { StateMetadataModel } from '@/lib/models/StateMetadata';
import { getErrorMessage } from '@/lib/utils';

// Helper to get state label (name)
async function getStateLabel(stateCode: string): Promise<string> {
  const meta = await StateMetadataModel.findByCode(stateCode);
  return meta?.name || stateCode;
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { entryId: string; unitType: string } }
) {
  try {
    await connectMongo();
    const entryId = parseInt(params.entryId, 10);
    const unitType = params.unitType as UnitType;
    const userId = await getAuthUserId(request);

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (isNaN(entryId)) {
      return NextResponse.json({ error: 'Invalid entry ID' }, { status: 400 });
    }

    const validUnitTypes = ['retail', 'production', 'service', 'extraction'];
    if (!validUnitTypes.includes(unitType)) {
      return NextResponse.json({ error: 'Invalid unit type' }, { status: 400 });
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
      return NextResponse.json({ error: 'Only the CEO can abandon units' }, { status: 403 });
    }

    // Get current unit count
    const unitCounts = await BusinessUnitModel.getUnitCounts(entryId);
    const currentCount = unitCounts[unitType];

    if (currentCount <= 0) {
      return NextResponse.json({ error: `No ${unitType} units to abandon` }, { status: 400 });
    }

    // Remove one unit
    await BusinessUnitModel.removeUnit(entryId, unitType, 1);

    const stateLabel = await getStateLabel(marketEntry.state_code);

    // Record transaction
    await TransactionModel.create({
      transaction_type: 'unit_abandon',
      amount: 0,
      from_user_id: userId,
      corporation_id: marketEntry.corporation_id,
      description: `Abandoned 1 ${unitType} unit in ${marketEntry.sector_type} sector (${stateLabel})`,
      reference_id: entryId,
      reference_type: 'market_entry',
    });

    // Recalculate stock price
    const newStockPrice = await updateStockPrice(marketEntry.corporation_id);

    // Get updated unit counts
    const updatedCounts = await BusinessUnitModel.getUnitCounts(entryId);

    return NextResponse.json({
      success: true,
      message: `Abandoned 1 ${unitType} unit`,
      market_entry_id: entryId,
      unit_type: unitType,
      units_remaining: updatedCounts[unitType],
      new_stock_price: newStockPrice,
    });
  } catch (error: unknown) {
    console.error('Abandon unit error:', error);
    return NextResponse.json({ error: getErrorMessage(error, 'Failed to abandon unit') }, { status: 500 });
  }
}
