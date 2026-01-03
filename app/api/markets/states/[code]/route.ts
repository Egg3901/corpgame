import { NextRequest, NextResponse } from 'next/server';
import { connectMongo, getDb } from '@/lib/db/mongo';
import { getAuthUserId } from '@/lib/auth';
import { StateMetadataModel } from '@/lib/models/StateMetadata';
import { MarketEntryModel } from '@/lib/models/MarketEntry';
import { CorporationModel } from '@/lib/models/Corporation';
import { BusinessUnitModel } from '@/lib/models/BusinessUnit';
import { normalizeImageUrl } from '@/lib/utils/imageUrl';
import { getErrorMessage } from '@/lib/utils';
import {
  SECTORS,
  SECTOR_RESOURCES,
  isValidStateCode,
  getStateMultiplier,
  getStateSectorCapacity,
  getStateCapacityTier,
  getStateResources,
} from '@/lib/constants/sectors';
import { marketDataService } from '@/lib/services/MarketDataService';

// GET /api/markets/states/:code - Get state details
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    await connectMongo();
    const db = getDb();
    const { code } = await params;
    const stateCode = code.toUpperCase();

    // Validate state code
    if (!isValidStateCode(stateCode)) {
      return NextResponse.json({ error: 'Invalid state code' }, { status: 404 });
    }

    // Get state metadata
    const stateMeta = await StateMetadataModel.findByCode(stateCode);
    if (!stateMeta) {
      return NextResponse.json({ error: 'State not found' }, { status: 404 });
    }

    // Get authenticated user (optional)
    const userId = await getAuthUserId(req).catch(() => null);

    // Get all market entries in this state
    const marketEntries = await MarketEntryModel.findByStateCode(stateCode);

    // Batch fetch corporation details
    const corpIds = [...new Set(marketEntries.map(e => e.corporation_id))];
    const corpMap = new Map<number, { id: number; name: string; logo: string | null }>();

    if (corpIds.length > 0) {
      const corps = await db.collection('corporations').find({
        id: { $in: corpIds }
      }, {
        projection: { id: 1, name: 1, logo: 1 }
      }).toArray();

      for (const corp of corps) {
        corpMap.set(corp.id, {
          id: corp.id,
          name: corp.name,
          logo: normalizeImageUrl(corp.logo),
        });
      }
    }

    // Format markets with corporation info and unit counts
    const markets = await Promise.all(
      marketEntries.map(async (entry) => {
        const units = await BusinessUnitModel.findByMarketEntryId(entry.id);
        const unitCounts = {
          retail: 0,
          production: 0,
          service: 0,
          extraction: 0,
        };
        for (const unit of units) {
          if (unit.unit_type === 'retail') unitCounts.retail += unit.count;
          else if (unit.unit_type === 'production') unitCounts.production += unit.count;
          else if (unit.unit_type === 'service') unitCounts.service += unit.count;
          else if (unit.unit_type === 'extraction') unitCounts.extraction += unit.count;
        }

        return {
          id: entry.id,
          corporation_id: entry.corporation_id,
          state_code: entry.state_code,
          sector_type: entry.sector_type,
          created_at: entry.created_at.toISOString(),
          corporation: corpMap.get(entry.corporation_id) || null,
          units: unitCounts,
        };
      })
    );

    // Get user's corporation if authenticated
    let userCorporation = null;
    let userMarketEntries: Array<{
      id: number;
      corporation_id: number;
      state_code: string;
      sector_type: string;
      created_at: string;
      units: { retail: number; production: number; service: number; extraction: number };
    }> = [];

    if (userId) {
      const userCorps = await CorporationModel.findByCeoId(userId);
      if (userCorps.length > 0) {
        const corp = userCorps[0];
        userCorporation = {
          id: corp.id,
          name: corp.name,
          capital: corp.capital,
        };

        // Get user's market entries in this state
        const entries = await MarketEntryModel.findByCorporationIdWithUnits(corp.id);
        userMarketEntries = entries
          .filter(e => e.state_code === stateCode)
          .map(e => ({
            id: e.id,
            corporation_id: e.corporation_id,
            state_code: e.state_code,
            sector_type: e.sector_type,
            created_at: e.created_at.toISOString(),
            units: {
              retail: e.retail_count || 0,
              production: e.production_count || 0,
              service: e.service_count || 0,
              extraction: e.extraction_count || 0,
            },
          }));
      }
    }

    // Get resource breakdown for this state
    const stateResources = getStateResources(stateCode);
    const commodityData = await marketDataService.getCommoditySummary();

    const resourceInfos = Object.entries(stateResources).map(([resource, amount]) => {
      const commodityPrice = commodityData.summary.find(c => c.resource === resource);
      const currentPrice = commodityPrice?.price?.currentPrice || 0;

      // Calculate state's share of US total using supply data
      const totalUS = commodityData.supply[resource] || 1;
      const stateShareOfUS = totalUS > 0 ? (amount / totalUS) * 100 : 0;

      return {
        resource,
        amount,
        percentage: 100, // Will be calculated relative to state total
        stateShareOfUS,
        currentPrice,
        totalValue: amount * currentPrice,
      };
    });

    // Calculate percentages relative to state total
    const totalStateValue = resourceInfos.reduce((sum, r) => sum + r.totalValue, 0);
    resourceInfos.forEach(r => {
      r.percentage = totalStateValue > 0 ? (r.totalValue / totalStateValue) * 100 : 0;
    });

    const resourceBreakdown = {
      stateCode,
      stateName: stateMeta.name,
      resources: resourceInfos,
      totalResourceValue: totalStateValue,
    };

    // Build sector_resources mapping
    const sectorResources: Record<string, string | null> = {};
    for (const sector of SECTORS) {
      sectorResources[sector] = SECTOR_RESOURCES[sector] || null;
    }

    return NextResponse.json({
      state: {
        code: stateMeta.state_code,
        name: stateMeta.name,
        region: stateMeta.region,
        multiplier: getStateMultiplier(stateCode),
        growth_factor: 1, // Could be calculated like in states list
        capacity: getStateSectorCapacity(stateCode),
        capacity_tier: getStateCapacityTier(stateCode),
        extractable_resources: Object.keys(stateResources),
      },
      markets,
      sectors: [...SECTORS],
      sector_resources: sectorResources,
      resources: resourceBreakdown,
      user_corporation: userCorporation,
      user_market_entries: userMarketEntries,
    });
  } catch (error: unknown) {
    console.error('Get state detail error:', error);
    return NextResponse.json(
      { error: getErrorMessage(error, 'Failed to fetch state details') },
      { status: 500 }
    );
  }
}
