import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { SectorConfigModel, UnitType } from '@/lib/models/SectorConfig';
import { SectorConfigService } from '@/lib/services/SectorConfigService';
import { getErrorMessage } from '@/lib/utils';

export async function PUT(
  req: NextRequest,
  { params }: { params: { sector: string; unitType: string } }
) {
  try {
    await requireAdmin(req);
    const { sector, unitType } = params;
    const validUnitTypes: UnitType[] = ['production', 'retail', 'service', 'extraction'];

    if (!validUnitTypes.includes(unitType as UnitType)) {
      return NextResponse.json({ error: 'Invalid unit type' }, { status: 400 });
    }

    const body = await req.json();
    const { is_enabled, base_revenue, base_cost, labor_cost, output_rate } = body;

    const updated = await SectorConfigModel.updateUnitConfig(sector, unitType as UnitType, {
      is_enabled,
      base_revenue: base_revenue !== undefined ? Number(base_revenue) : undefined,
      base_cost: base_cost !== undefined ? Number(base_cost) : undefined,
      labor_cost: labor_cost !== undefined ? Number(labor_cost) : undefined,
      output_rate: output_rate !== undefined ? Number(output_rate) : undefined,
    });

    if (!updated) {
      return NextResponse.json({ error: 'Unit config not found or no changes' }, { status: 404 });
    }

    SectorConfigService.invalidateCache();
    return NextResponse.json(updated);
  } catch (error: unknown) {
    const errorMessage = getErrorMessage(error);
    if (errorMessage === 'Unauthorized' || errorMessage === 'Forbidden') {
      return NextResponse.json({ error: errorMessage }, { status: 401 });
    }
    console.error('Failed to update unit config:', error);
    return NextResponse.json({ error: getErrorMessage(error, 'Failed to update unit config') }, { status: 500 });
  }
}
