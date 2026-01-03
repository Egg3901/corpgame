import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { SectorConfigModel } from '@/lib/models/SectorConfig';
import { getErrorMessage } from '@/lib/utils';

export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req);

    const [sectors, unitConfigs, inputs, outputs, products, resources] = await Promise.all([
      SectorConfigModel.getAllSectors(),
      SectorConfigModel.getAllUnitConfigs(),
      SectorConfigModel.getAllInputs(),
      SectorConfigModel.getAllOutputs(),
      SectorConfigModel.getAllProducts(),
      SectorConfigModel.getAllResources(),
    ]);

    return NextResponse.json({
      sectors,
      unitConfigs,
      inputs,
      outputs,
      products,
      resources,
    });
  } catch (error: unknown) {
    const errorMessage = getErrorMessage(error);
    if (errorMessage === 'Unauthorized' || errorMessage === 'Forbidden') {
      return NextResponse.json({ error: errorMessage }, { status: 401 });
    }
    console.error('Failed to get admin config:', error);
    return NextResponse.json({ error: getErrorMessage(error, 'Failed to get admin configuration') }, { status: 500 });
  }
}
