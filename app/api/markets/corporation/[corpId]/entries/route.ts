import { NextRequest, NextResponse } from 'next/server';
import { MarketEntryModel } from '@/lib/models/MarketEntry';
import { StateMetadataModel } from '@/lib/models/StateMetadata';
import { getErrorMessage } from '@/lib/utils';

export async function GET(
  request: NextRequest,
  { params }: { params: { corpId: string } }
) {
  try {
    const corpId = parseInt(params.corpId, 10);
    
    if (isNaN(corpId)) {
      return NextResponse.json({ error: 'Invalid corporation ID' }, { status: 400 });
    }

    const entries = await MarketEntryModel.findByCorporationIdWithUnits(corpId);

    const stateCodes = [...new Set(entries.map(e => e.state_code))];
    
    let stateMetadataMap: Record<string, { name: string; region: string; multiplier: number }> = {};
    if (stateCodes.length > 0) {
      const stateMetadata = await StateMetadataModel.findAll();
      for (const meta of stateMetadata) {
        if (stateCodes.includes(meta.state_code)) {
          stateMetadataMap[meta.state_code] = {
            name: meta.name || meta.state_code,
            region: meta.region || 'Unknown',
            multiplier: typeof meta.population_multiplier === 'string'
              ? parseFloat(meta.population_multiplier)
              : (meta.population_multiplier || 1),
          };
        }
      }
    }

    const marketsWithDetails = entries.map((entry) => {
      const stateMeta = stateMetadataMap[entry.state_code];
      return {
        ...entry,
        state_name: stateMeta?.name || entry.state_code,
        state_region: stateMeta?.region || 'Unknown',
        state_multiplier: stateMeta?.multiplier || 1,
      };
    });

    return NextResponse.json(marketsWithDetails);
  } catch (error: unknown) {
    console.error('Get corporation entries error:', error);
    return NextResponse.json({ error: getErrorMessage(error, 'Failed to fetch corporation market entries') }, { status: 500 });
  }
}
