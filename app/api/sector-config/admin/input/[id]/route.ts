import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { SectorConfigModel } from '@/lib/models/SectorConfig';
import { SectorConfigService } from '@/lib/services/SectorConfigService';
import { getErrorMessage } from '@/lib/utils';

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAdmin(req);
    const id = parseInt(params.id);
    const body = await req.json();
    const { consumption_rate } = body;

    if (consumption_rate === undefined || isNaN(Number(consumption_rate))) {
      return NextResponse.json({ error: 'consumption_rate is required and must be a number' }, { status: 400 });
    }

    const updated = await SectorConfigModel.updateInput(id, Number(consumption_rate));

    if (!updated) {
      return NextResponse.json({ error: 'Input not found' }, { status: 404 });
    }

    SectorConfigService.invalidateCache();
    return NextResponse.json(updated);
  } catch (error: unknown) {
    const errorMessage = getErrorMessage(error);
    if (errorMessage === 'Unauthorized' || errorMessage === 'Forbidden') {
      return NextResponse.json({ error: errorMessage }, { status: 401 });
    }
    console.error('Failed to update input:', error);
    return NextResponse.json({ error: getErrorMessage(error, 'Failed to update input') }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAdmin(req);
    const id = parseInt(params.id);

    if (isNaN(id)) {
      return NextResponse.json({ error: 'Invalid input ID' }, { status: 400 });
    }

    await SectorConfigModel.deleteInput(id);
    SectorConfigService.invalidateCache();
    return NextResponse.json({ message: 'Input deleted successfully' });
  } catch (error: unknown) {
    const errorMessage = getErrorMessage(error);
    if (errorMessage === 'Unauthorized' || errorMessage === 'Forbidden') {
      return NextResponse.json({ error: errorMessage }, { status: 401 });
    }
    console.error('Failed to delete input:', error);
    return NextResponse.json({ error: getErrorMessage(error, 'Failed to delete input') }, { status: 500 });
  }
}
