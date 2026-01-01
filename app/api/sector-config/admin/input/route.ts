import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { SectorConfigModel, UnitType } from '@/lib/models/SectorConfig';
import { SectorConfigService } from '@/lib/services/SectorConfigService';
import { getErrorMessage } from '@/lib/utils';

export async function POST(req: NextRequest) {
  try {
    await requireAdmin(req);
    const body = await req.json();
    const { sectorName, unitType, inputName, inputType, consumptionRate } = body;

    // Validation
    if (!sectorName || !unitType || !inputName || !inputType || consumptionRate === undefined) {
      return NextResponse.json({ error: 'Missing required fields: sectorName, unitType, inputName, inputType, consumptionRate' }, { status: 400 });
    }

    if (consumptionRate <= 0) {
      return NextResponse.json({ error: 'Consumption rate must be positive' }, { status: 400 });
    }

    if (!['resource', 'product'].includes(inputType)) {
      return NextResponse.json({ error: 'Input type must be resource or product' }, { status: 400 });
    }

    const validUnitTypes: UnitType[] = ['production', 'retail', 'service', 'extraction'];
    if (!validUnitTypes.includes(unitType as UnitType)) {
      return NextResponse.json({ error: 'Invalid unit type' }, { status: 400 });
    }

    const created = await SectorConfigModel.createInput({
      sectorName,
      unitType: unitType as UnitType,
      inputName,
      inputType,
      consumptionRate: Number(consumptionRate),
    });

    SectorConfigService.invalidateCache();
    return NextResponse.json({ id: created.id, message: 'Input created successfully', input: created }, { status: 201 });
  } catch (error: unknown) {
    const errorMessage = getErrorMessage(error);
    if (errorMessage === 'Unauthorized' || errorMessage === 'Forbidden') {
      return NextResponse.json({ error: errorMessage }, { status: 401 });
    }
    console.error('Failed to create input:', error);
    return NextResponse.json({ error: getErrorMessage(error, 'Failed to create input') }, { status: 500 });
  }
}
