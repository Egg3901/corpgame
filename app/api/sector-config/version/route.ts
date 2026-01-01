import { NextRequest, NextResponse } from 'next/server';
import { SectorConfigService } from '@/lib/services/SectorConfigService';
import { getErrorMessage } from '@/lib/utils';

export async function GET(req: NextRequest) {
  try {
    const version = await SectorConfigService.getConfigVersion();
    return NextResponse.json({ version });
  } catch (error: unknown) {
    console.error('Failed to get config version:', error);
    return NextResponse.json({ error: getErrorMessage(error, 'Failed to get config version') }, { status: 500 });
  }
}
