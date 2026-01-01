import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { SectorConfigModel } from '@/lib/models/SectorConfig';
import { SectorConfigService } from '@/lib/services/SectorConfigService';
import { getErrorMessage } from '@/lib/utils';

export async function PUT(
  req: NextRequest,
  { params }: { params: { name: string } }
) {
  try {
    await requireAdmin(req);
    const { name } = params;
    const body = await req.json();
    const { base_price } = body;

    if (base_price === undefined || isNaN(Number(base_price))) {
      return NextResponse.json({ error: 'base_price is required and must be a number' }, { status: 400 });
    }

    const updated = await SectorConfigModel.updateResource(name, {
      base_price: Number(base_price),
    });

    if (!updated) {
      return NextResponse.json({ error: 'Resource not found' }, { status: 404 });
    }

    SectorConfigService.invalidateCache();
    return NextResponse.json(updated);
  } catch (error: unknown) {
    const errorMessage = getErrorMessage(error);
    if (errorMessage === 'Unauthorized' || errorMessage === 'Forbidden') {
      return NextResponse.json({ error: errorMessage }, { status: 401 });
    }
    console.error('Failed to update resource:', error);
    return NextResponse.json({ error: getErrorMessage(error, 'Failed to update resource') }, { status: 500 });
  }
}
