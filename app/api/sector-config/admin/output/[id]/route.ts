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
    const { output_rate } = body;

    if (output_rate === undefined || isNaN(Number(output_rate))) {
      return NextResponse.json({ error: 'output_rate is required and must be a number' }, { status: 400 });
    }

    const updated = await SectorConfigModel.updateOutput(id, Number(output_rate));

    if (!updated) {
      return NextResponse.json({ error: 'Output not found' }, { status: 404 });
    }

    SectorConfigService.invalidateCache();
    return NextResponse.json(updated);
  } catch (error: unknown) {
    const errorMessage = getErrorMessage(error);
    if (errorMessage === 'Unauthorized' || errorMessage === 'Forbidden') {
      return NextResponse.json({ error: errorMessage }, { status: 401 });
    }
    console.error('Failed to update output:', error);
    return NextResponse.json({ error: getErrorMessage(error, 'Failed to update output') }, { status: 500 });
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
      return NextResponse.json({ error: 'Invalid output ID' }, { status: 400 });
    }

    await SectorConfigModel.deleteOutput(id);
    SectorConfigService.invalidateCache();
    return NextResponse.json({ message: 'Output deleted successfully' });
  } catch (error: unknown) {
    const errorMessage = getErrorMessage(error);
    if (errorMessage === 'Unauthorized' || errorMessage === 'Forbidden') {
      return NextResponse.json({ error: errorMessage }, { status: 401 });
    }
    console.error('Failed to delete output:', error);
    return NextResponse.json({ error: getErrorMessage(error, 'Failed to delete output') }, { status: 500 });
  }
}
