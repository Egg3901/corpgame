import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { SectorConfigModel } from '@/lib/models/SectorConfig';
import { SectorConfigService } from '@/lib/services/SectorConfigService';
import { getErrorMessage } from '@/lib/utils';

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  try {
    await requireAdmin(req);
    const { name } = await params;
    const body = await req.json();
    const { is_enabled, is_production_only, can_extract, produced_product, primary_resource } = body;

    const updated = await SectorConfigModel.updateSector(name, {
      is_enabled,
      is_production_only,
      can_extract,
      produced_product,
      primary_resource,
    });

    if (!updated) {
      return NextResponse.json({ error: 'Sector not found or no changes' }, { status: 404 });
    }

    SectorConfigService.invalidateCache();
    return NextResponse.json(updated);
  } catch (error: unknown) {
    const errorMessage = getErrorMessage(error);
    if (errorMessage === 'Unauthorized' || errorMessage === 'Forbidden') {
      return NextResponse.json({ error: errorMessage }, { status: 401 });
    }
    console.error('Failed to update sector:', error);
    return NextResponse.json({ error: getErrorMessage(error, 'Failed to update sector') }, { status: 500 });
  }
}
