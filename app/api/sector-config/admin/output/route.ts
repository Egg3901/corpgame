import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { SectorConfigModel, UnitType } from '@/lib/models/SectorConfig';
import { SectorConfigService } from '@/lib/services/SectorConfigService';
import { getErrorMessage } from '@/lib/utils';

export async function POST(req: NextRequest) {
  try {
    await requireAdmin(req);
    const body = await req.json();
    const { sectorName, unitType, outputName, outputType, outputRate } = body;

    // Validation
    if (!sectorName || !unitType || !outputName || !outputType || outputRate === undefined) {
      return NextResponse.json({ error: 'Missing required fields: sectorName, unitType, outputName, outputType, outputRate' }, { status: 400 });
    }

    if (outputRate <= 0) {
      return NextResponse.json({ error: 'Output rate must be positive' }, { status: 400 });
    }

    if (!['resource', 'product'].includes(outputType)) {
      return NextResponse.json({ error: 'Output type must be resource or product' }, { status: 400 });
    }

    const validUnitTypes: UnitType[] = ['production', 'retail', 'service', 'extraction'];
    if (!validUnitTypes.includes(unitType as UnitType)) {
      return NextResponse.json({ error: 'Invalid unit type' }, { status: 400 });
    }

    const created = await SectorConfigModel.createOutput({
      sectorName,
      unitType: unitType as UnitType,
      outputName,
      outputType,
      outputRate: Number(outputRate),
    });

    SectorConfigService.invalidateCache();
    return NextResponse.json({ id: created.id, message: 'Output created successfully', output: created }, { status: 201 });
  } catch (error: unknown) {
    const errorMessage = getErrorMessage(error);
    if (errorMessage === 'Unauthorized' || errorMessage === 'Forbidden') {
      return NextResponse.json({ error: errorMessage }, { status: 401 });
    }
    console.error('Failed to create output:', error);
    return NextResponse.json({ error: getErrorMessage(error, 'Failed to create output') }, { status: 500 });
  }
}
