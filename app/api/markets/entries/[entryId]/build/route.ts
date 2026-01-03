import { NextRequest, NextResponse } from 'next/server';
import { connectMongo } from '@/lib/db/mongo';
import { getAuthUserId } from '@/lib/auth';
import { CorporationModel } from '@/lib/models/Corporation';
import { UserModel } from '@/lib/models/User';
import { MarketEntryModel } from '@/lib/models/MarketEntry';
import { BusinessUnitModel, UnitType } from '@/lib/models/BusinessUnit';
import { TransactionModel } from '@/lib/models/Transaction';
import { SectorConfigService } from '@/lib/services/SectorConfigService';
import { marketDataService } from '@/lib/services/MarketDataService';
import { ACTIONS_CONFIG } from '@/lib/constants/actions';
import { getErrorMessage } from '@/lib/utils';
import {
  UNIT_TYPES,
  BUILD_UNIT_COST,
  canBuildUnit,
  canBuildMoreUnits,
  Sector,
  CorpFocus
} from '@/lib/constants/sectors';

// POST /api/markets/entries/:entryId/build - Build a unit
export async function POST(
  req: NextRequest,
  { params }: { params: { entryId: string } }
) {
  try {
    await connectMongo();
    const userId = await getAuthUserId(req);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const entryId = parseInt(params.entryId, 10);
    if (isNaN(entryId)) {
      return NextResponse.json({ error: 'Invalid entry ID' }, { status: 400 });
    }

    const body = await req.json();
    const { unit_type } = body;

    if (!unit_type || !UNIT_TYPES.includes(unit_type)) {
      return NextResponse.json({ error: 'Invalid unit type. Must be retail, production, service, or extraction' }, { status: 400 });
    }

    // Get market entry
    const marketEntry = await MarketEntryModel.findById(entryId);
    if (!marketEntry) {
      return NextResponse.json({ error: 'Market entry not found' }, { status: 404 });
    }

    // Check if user is CEO of the corporation
    const corporation = await CorporationModel.findById(marketEntry.corporation_id);
    if (!corporation) {
      return NextResponse.json({ error: 'Corporation not found' }, { status: 404 });
    }

    if (corporation.ceo_id !== userId) {
      return NextResponse.json({ error: 'Only the CEO can build units' }, { status: 403 });
    }

    // Check if sector allows this unit type
    // @ts-ignore - UnifiedSectorConfig has different structure, need to fix SectorConfigService type
    const sectorConfig = await SectorConfigService.getConfiguration();
    
    // Check if can build this unit type
    if (!canBuildUnit(marketEntry.sector_type as Sector, corporation.focus as CorpFocus, unit_type as UnitType)) {
      return NextResponse.json({ error: `Cannot build ${unit_type} units in ${marketEntry.sector_type} sector with ${corporation.focus} focus` }, { status: 400 });
    }

    // Check capacity
    const currentUnits = await BusinessUnitModel.getUnitCounts(entryId);
    const totalUnits = Object.values(currentUnits).reduce((a, b) => a + b, 0);
    const capacityCheck = canBuildMoreUnits(marketEntry.state_code, totalUnits);

    if (!capacityCheck.allowed) {
      return NextResponse.json({ 
        error: `Capacity limit reached for ${marketEntry.state_code}. Max ${capacityCheck.capacity} units allowed.`,
        capacity: capacityCheck.capacity
      }, { status: 400 });
    }

    // Check capital
    if (corporation.capital < BUILD_UNIT_COST) {
      return NextResponse.json({
        error: `Insufficient capital. Need ${BUILD_UNIT_COST.toLocaleString()}, have ${corporation.capital.toLocaleString()}`,
        required: BUILD_UNIT_COST,
        available: corporation.capital,
      }, { status: 400 });
    }

    // Check actions
    const userActions = await UserModel.getActions(userId);
    const requiredActions = ACTIONS_CONFIG.COSTS.BUILD_UNIT;
    if (userActions < requiredActions) {
      return NextResponse.json({
        error: `Insufficient actions. Need ${requiredActions}, have ${userActions}`,
        required: requiredActions,
        available: userActions,
      }, { status: 400 });
    }

    // Deduct capital and actions
    await CorporationModel.update(corporation.id, {
      capital: corporation.capital - BUILD_UNIT_COST,
    });
    await UserModel.updateActions(userId, -requiredActions);

    // Create/Update business unit
    const businessUnit = await BusinessUnitModel.incrementUnit(
      entryId,
      unit_type as UnitType
    );

    // Record transaction
    await TransactionModel.create({
      transaction_type: 'unit_build',
      amount: BUILD_UNIT_COST,
      from_user_id: userId,
      corporation_id: corporation.id,
      description: `Built ${unit_type} unit in ${marketEntry.state_code} (${marketEntry.sector_type})`,
      reference_id: businessUnit.id,
      reference_type: 'business_unit',
    });

    try { marketDataService.invalidateAll(); } catch {}

    return NextResponse.json({
      success: true,
      business_unit: businessUnit,
      capital_deducted: BUILD_UNIT_COST,
      actions_deducted: ACTIONS_CONFIG.COSTS.BUILD_UNIT,
      new_capital: corporation.capital - BUILD_UNIT_COST,
      remaining_capacity: capacityCheck.remaining - 1,
    }, { status: 201 });
  } catch (error: unknown) {
    console.error('Build unit error:', error);
    return NextResponse.json({ error: getErrorMessage(error, 'Failed to build unit') }, { status: 500 });
  }
}
