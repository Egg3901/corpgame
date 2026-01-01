import { NextRequest, NextResponse } from 'next/server';
import { SectorConfigService } from '@/lib/services/SectorConfigService';
import { getErrorMessage } from '@/lib/utils';

export async function GET(req: NextRequest) {
  try {
    const legacy = await SectorConfigService.toLegacyFormat();
    return NextResponse.json(legacy);
  } catch (error: unknown) {
    console.error('Failed to get legacy config:', error);
    return NextResponse.json({ error: getErrorMessage(error, 'Failed to get legacy configuration') }, { status: 500 });
  }
}
