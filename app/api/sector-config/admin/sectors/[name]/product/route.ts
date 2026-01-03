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
    const { producedProduct } = body;

    if (!producedProduct) {
      return NextResponse.json({ error: 'producedProduct is required' }, { status: 400 });
    }

    const updated = await SectorConfigModel.updateSector(name, {
      produced_product: producedProduct,
    });

    if (!updated) {
      return NextResponse.json({ error: 'Sector not found' }, { status: 404 });
    }

    SectorConfigService.invalidateCache();
    return NextResponse.json({ message: 'Produced product updated successfully', sector: updated });
  } catch (error: unknown) {
    const errorMessage = getErrorMessage(error);
    if (errorMessage === 'Unauthorized' || errorMessage === 'Forbidden') {
      return NextResponse.json({ error: errorMessage }, { status: 401 });
    }
    console.error('Failed to update produced product:', error);
    return NextResponse.json({ error: getErrorMessage(error, 'Failed to update produced product') }, { status: 500 });
  }
}
