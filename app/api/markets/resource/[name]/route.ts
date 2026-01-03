import { NextRequest, NextResponse } from 'next/server';
import { connectMongo } from '@/lib/db/mongo';
import { MarketEntryModel } from '@/lib/models/MarketEntry';
import { marketDataService } from '@/lib/services/MarketDataService';
import {
  RESOURCES,
  SECTOR_EXTRACTION,
  SECTOR_RESOURCES,
  Sector,
  Resource,
  getResourceInfo,
  EXTRACTION_OUTPUT_RATE,
  PRODUCTION_RESOURCE_CONSUMPTION,
  RESOURCE_BASE_PRICES,
} from '@/lib/constants/sectors';
import { getErrorMessage } from '@/lib/utils';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  try {
    await connectMongo();
    const { name } = await params;
    const resourceName = decodeURIComponent(name) as Resource;

    // Validate resource exists
    if (!RESOURCES.includes(resourceName)) {
      return NextResponse.json({ error: 'Resource not found' }, { status: 404 });
    }

    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = (page - 1) * limit;
    const filter = searchParams.get('filter') || 'demanders'; // 'producers' or 'demanders'

    // Get sectors that extract this resource
    const extractingSectors = Object.keys(SECTOR_EXTRACTION).filter(s => {
      const extractable = SECTOR_EXTRACTION[s as Sector];
      return extractable && extractable.includes(resourceName);
    }) as Sector[];

    // Get extraction units for sectors that extract this resource
    const extractionUnitsBySector = await MarketEntryModel.getUnitsBySector(extractingSectors, 'extraction');

    // Unified supply/demand via MarketDataService
    const detail = await marketDataService.getCommodityDetail(resourceName);
    const actualSupply = detail.supply;

    // Get top producing states by actual extraction units
    const topProducingStates = (await MarketEntryModel.getTopProducingStates(extractingSectors, 5)).map((row, idx) => ({
      stateCode: row.state_code,
      stateName: row.state_name || row.state_code,
      extractionUnits: row.extraction_units,
      productionLevel: row.extraction_units * EXTRACTION_OUTPUT_RATE,
      rank: idx + 1,
    }));

    // Get production units for sectors that demand this resource
    const demandingSectors: Sector[] = [];
    for (const [sector, resource] of Object.entries(SECTOR_RESOURCES)) {
      if (resource === resourceName) {
        demandingSectors.push(sector as Sector);
      }
    }

    // Unified demand and price
    const actualDemand = detail.demand;
    const resourceInfo = getResourceInfo(resourceName);

    // Calculate full price info including scarcityFactor and basePrice
    const basePrice = RESOURCE_BASE_PRICES[resourceName] || 100;
    const scarcityFactor = actualDemand / Math.max(0.01, actualSupply) || 1;
    const commodityPrice = {
      currentPrice: detail.price.currentPrice,
      basePrice,
      scarcityFactor,
    };

    // Get top producers (corporations extracting this resource) or top demanders based on filter
    let listData = [];
    let totalCount = 0;

    if (filter === 'producers') {
      const result = await MarketEntryModel.getTopProducers(extractingSectors, limit, offset);
      listData = result.data.map(row => ({
        corporation_id: row.corporation_id,
        corporation_name: row.corporation_name,
        corporation_logo: row.corporation_logo,
        sector_type: row.sector_type,
        state_code: row.state_code,
        state_name: row.state_name,
        extraction_units: row.extraction_units,
        production_level: row.extraction_units * EXTRACTION_OUTPUT_RATE,
      }));
      totalCount = result.total;
    } else {
      const result = await MarketEntryModel.getTopDemanders(demandingSectors, limit, offset);
      listData = result.data.map(row => ({
        corporation_id: row.corporation_id,
        corporation_name: row.corporation_name,
        corporation_logo: row.corporation_logo,
        sector_type: row.sector_type,
        state_code: row.state_code,
        state_name: row.state_name,
        production_units: row.production_units,
        resource_demand: row.production_units * PRODUCTION_RESOURCE_CONSUMPTION,
      }));
      totalCount = result.total;
    }

    const totalDemand = actualDemand;

    return NextResponse.json({
      resource: resourceName,
      price: commodityPrice,
      info: resourceInfo,
      total_supply: actualSupply,
      total_demand: totalDemand,
      demanding_sectors: demandingSectors,
      top_producing_states: topProducingStates,
      demanders: filter === 'demanders' ? listData : [],
      producers: filter === 'producers' ? listData : [],
      filter,
      pagination: {
        page,
        limit,
        total: totalCount,
        total_pages: Math.ceil(totalCount / limit),
      },
    });

  } catch (error: unknown) {
    console.error('Get resource detail error:', error);
    return NextResponse.json({ error: getErrorMessage(error, 'Failed to fetch resource details') }, { status: 500 });
  }
}
