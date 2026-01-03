import { NextRequest, NextResponse } from 'next/server';
import { connectMongo } from '@/lib/db/mongo';
import { getAuthUserId } from '@/lib/auth';
import { CorporationModel } from '@/lib/models/Corporation';
import { UserModel } from '@/lib/models/User';
import { MarketEntryModel } from '@/lib/models/MarketEntry';
import { TransactionModel } from '@/lib/models/Transaction';
import { ACTIONS_CONFIG } from '@/lib/constants/actions';
import { marketDataService } from '@/lib/services/MarketDataService';
import { getErrorMessage } from '@/lib/utils';
import {
  isValidStateCode,
  isValidSector,
  getStateLabel,
  MARKET_ENTRY_COST,
} from '@/lib/constants/sectors';

// POST /api/markets/states/:code/enter - Enter a market
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    await connectMongo();
    const userId = await getAuthUserId(req);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { code } = await params;
    const stateCode = code.toUpperCase();
    const body = await req.json();
    const { sector_type, corporation_id } = body;

    // Validate inputs
    if (!isValidStateCode(stateCode)) {
      return NextResponse.json({ error: 'Invalid state code' }, { status: 400 });
    }

    if (!sector_type || !isValidSector(sector_type)) {
      return NextResponse.json({ error: 'Invalid sector type' }, { status: 400 });
    }

    if (!corporation_id) {
      return NextResponse.json({ error: 'Corporation ID is required' }, { status: 400 });
    }

    // Check if user is CEO of the corporation
    const corporation = await CorporationModel.findById(corporation_id);
    if (!corporation) {
      return NextResponse.json({ error: 'Corporation not found' }, { status: 404 });
    }

    if (corporation.ceo_id !== userId) {
      return NextResponse.json({ error: 'Only the CEO can enter new markets' }, { status: 403 });
    }

    // Check if already in this market
    const existingEntry = await MarketEntryModel.exists(corporation_id, stateCode, sector_type);
    if (existingEntry) {
      return NextResponse.json({ error: 'Already in this market' }, { status: 400 });
    }

    // Check capital
    if (corporation.capital < MARKET_ENTRY_COST) {
      return NextResponse.json({
        error: `Insufficient capital. Need ${MARKET_ENTRY_COST.toLocaleString()}, have ${corporation.capital.toLocaleString()}`,
        required: MARKET_ENTRY_COST,
        available: corporation.capital,
      }, { status: 400 });
    }

    // Check actions
    const userActions = await UserModel.getActions(userId);
    const requiredActions = ACTIONS_CONFIG.COSTS.MARKET_ENTRY;
    if (userActions < requiredActions) {
      return NextResponse.json({
        error: `Insufficient actions. Need ${requiredActions}, have ${userActions}`,
        required: requiredActions,
        available: userActions,
      }, { status: 400 });
    }

    // Deduct capital and actions
    await CorporationModel.update(corporation_id, {
      capital: corporation.capital - MARKET_ENTRY_COST,
    });
    await UserModel.updateActions(userId, -requiredActions);

    // Create market entry
    const marketEntry = await MarketEntryModel.create({
      corporation_id,
      state_code: stateCode,
      sector_type,
    });

    // Record transaction
    await TransactionModel.create({
      transaction_type: 'market_entry',
      amount: MARKET_ENTRY_COST,
      from_user_id: userId,
      corporation_id: corporation_id,
      description: `Entered ${getStateLabel(stateCode) || stateCode} market in ${sector_type} sector`,
      reference_id: marketEntry.id,
      reference_type: 'market_entry',
    });

    try { marketDataService.invalidateAll(); } catch {}

    return NextResponse.json({
      success: true,
      market_entry: marketEntry,
      capital_deducted: MARKET_ENTRY_COST,
      actions_deducted: ACTIONS_CONFIG.COSTS.MARKET_ENTRY,
      new_capital: corporation.capital - MARKET_ENTRY_COST,
    }, { status: 201 });
  } catch (error: unknown) {
    console.error('Enter market error:', error);
    return NextResponse.json({ error: getErrorMessage(error, 'Failed to enter market') }, { status: 500 });
  }
}
