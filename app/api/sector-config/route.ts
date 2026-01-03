import { NextRequest, NextResponse } from 'next/server';
import { SectorConfigService } from '@/lib/services/SectorConfigService';
import { getErrorMessage } from '@/lib/utils';

export async function GET(req: NextRequest) {
  try {
    const config = await SectorConfigService.getConfiguration();

    // Support ETag-based caching
    const clientVersion = req.headers.get('if-none-match');
    if (clientVersion === config.version) {
      return new NextResponse(null, { status: 304 });
    }

    const response = NextResponse.json(config);
    response.headers.set('ETag', config.version);
    response.headers.set('Cache-Control', 'public, max-age=60');
    return response;
  } catch (error: unknown) {
    console.error('Failed to get sector config:', error);
    return NextResponse.json({ error: getErrorMessage(error, 'Failed to get sector configuration') }, { status: 500 });
  }
}
