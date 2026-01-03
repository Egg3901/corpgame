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
    const { reference_value, min_price } = body;

    const updated = await SectorConfigModel.updateProduct(name, {
      reference_value: reference_value !== undefined ? Number(reference_value) : undefined,
      min_price: min_price !== undefined ? Number(min_price) : undefined,
    });

    if (!updated) {
      return NextResponse.json({ error: 'Product not found or no changes' }, { status: 404 });
    }

    SectorConfigService.invalidateCache();
    return NextResponse.json(updated);
  } catch (error: unknown) {
    const errorMessage = getErrorMessage(error);
    if (errorMessage === 'Unauthorized' || errorMessage === 'Forbidden') {
      return NextResponse.json({ error: errorMessage }, { status: 401 });
    }
    console.error('Failed to update product:', error);
    return NextResponse.json({ error: getErrorMessage(error, 'Failed to update product') }, { status: 500 });
  }
}
