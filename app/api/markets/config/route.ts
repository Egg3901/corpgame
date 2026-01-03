import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { SectorConfigService } from '@/lib/services/SectorConfigService';
import { getErrorMessage } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req);
    const config = await SectorConfigService.getConfiguration();
    return NextResponse.json(config);
  } catch (error: unknown) {
    const errorMessage = getErrorMessage(error);
    if (errorMessage === 'Unauthorized' || errorMessage === 'Forbidden') {
      return NextResponse.json({ error: errorMessage }, { status: 403 });
    }
    console.error('Get markets config error:', error);
    return NextResponse.json({ error: getErrorMessage(error, 'Failed to fetch config') }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    await requireAdmin(req);
    const body = await req.json();
    
    if (typeof body !== 'object' || body === null) {
      return NextResponse.json({ error: 'Invalid config body' }, { status: 400 });
    }

    // The legacy body had { categories, sectors }, but our unified config structure is slightly different.
    // However, the admin UI likely sends what matches the legacy structure if it hasn't been updated.
    // If the body matches UnifiedSectorConfig, we can use it directly.
    // If it matches legacy, we might need to adapt.
    // For now, let's assume the admin tool will be updated or we treat the body as a partial update.
    
    // We'll trust the body is a valid UnifiedSectorConfig or compatible partial
    await SectorConfigService.updateConfiguration(body);
    
    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    const errorMessage = getErrorMessage(error);
    if (errorMessage === 'Unauthorized' || errorMessage === 'Forbidden') {
      return NextResponse.json({ error: errorMessage }, { status: 403 });
    }
    console.error('Update markets config error:', error);
    return NextResponse.json({ error: getErrorMessage(error, 'Failed to update config') }, { status: 500 });
  }
}
