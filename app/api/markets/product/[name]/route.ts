import { NextRequest, NextResponse } from 'next/server';
import { connectMongo } from '@/lib/db/mongo';
import { MarketEntryModel } from '@/lib/models/MarketEntry';
import { marketDataService } from '@/lib/services/MarketDataService';
import { businessUnitCalculator } from '@/lib/services/BusinessUnitCalculator';
import {
  PRODUCTS,
  SECTOR_PRODUCTS,
  SECTOR_PRODUCT_DEMANDS,
  getProductInfo,
  Product,
  Sector,
} from '@/lib/constants/sectors';
import { getErrorMessage } from '@/lib/utils';

export async function GET(
  request: NextRequest,
  { params }: { params: { name: string } }
) {
  try {
    await connectMongo();
    const productName = decodeURIComponent(params.name) as Product;

    // Validate product exists
    if (!PRODUCTS.includes(productName)) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = (page - 1) * limit;
    const tab = searchParams.get('tab') || 'suppliers';

    // Get sectors that produce this product
    const producingSectors: Sector[] = [];
    for (const [sector, product] of Object.entries(SECTOR_PRODUCTS)) {
      if (product === productName) {
        producingSectors.push(sector as Sector);
      }
    }

    // Get sectors that demand this product
    const demandingSectors: Sector[] = [];
    for (const [sector, products] of Object.entries(SECTOR_PRODUCT_DEMANDS)) {
      if (products && products.includes(productName)) {
        demandingSectors.push(sector as Sector);
      }
    }

    // Unified supply/demand and price via MarketDataService
    const detail = await marketDataService.getProductDetail(productName);
    const totalSupply = detail.supply;
    const totalDemand = detail.demand;
    const productPrice = detail.price;
    const productInfo = getProductInfo(productName);

    interface MarketListItem {
      corporation_id: number;
      corporation_name: string;
      corporation_logo: string | null;
      sector_type: string;
      state_code: string;
      state_name: string;
      units: number;
      type: 'supplier' | 'demander';
    }

    let listData: MarketListItem[] = [];
    let totalCount = 0;

    if (tab === 'suppliers') {
      // Get top suppliers (corporations producing this product)
      // Note: We use 'production' unit type, unlike resource route which uses 'extraction'
      const result = await MarketEntryModel.getTopProducers(producingSectors, limit, offset, 'production');
      
      listData = result.data.map(row => ({
        corporation_id: row.corporation_id,
        corporation_name: row.corporation_name,
        corporation_logo: row.corporation_logo,
        sector_type: row.sector_type,
        state_code: row.state_code,
        state_name: row.state_name,
        units: row.extraction_units, // The field is named extraction_units in the interface but contains the count we asked for
        type: 'supplier',
      }));
      totalCount = result.total;

    } else {
      // Get demanders - fetch all unit counts and calculate demand
      const allUnits = await MarketEntryModel.getAllCorporationEntryUnits();
      
      // Calculate actual demand per entry
      const entriesWithDemand = allUnits.map<MarketListItem>(row => {
        const counts = {
          production: row.production_units,
          retail: row.retail_units,
          service: row.service_units,
          extraction: row.extraction_units,
        };
        const demand = businessUnitCalculator.computeTotalProductDemand(row.sector_type, productName, counts);
        
        return {
          corporation_id: row.corporation_id,
          corporation_name: row.corporation_name,
          corporation_logo: row.corporation_logo,
          sector_type: row.sector_type,
          state_code: row.state_code,
          state_name: row.state_name,
          units: demand,
          type: 'demander',
        };
      }).filter(entry => entry.units > 0);

      // Sort by demand descending
      entriesWithDemand.sort((a, b) => b.units - a.units);

      // Apply pagination in memory
      totalCount = entriesWithDemand.length;
      listData = entriesWithDemand.slice(offset, offset + limit);
    }

    return NextResponse.json({
      product: productName,
      price: productPrice,
      info: productInfo,
      total_supply: totalSupply,
      total_demand: totalDemand,
      producing_sectors: producingSectors,
      demanding_sectors: demandingSectors,
      [tab]: listData,
      pagination: {
        page,
        limit,
        total: totalCount,
        total_pages: Math.ceil(totalCount / limit),
      },
    });
  } catch (error: unknown) {
    console.error('Get product detail error:', error);
    return NextResponse.json({ error: getErrorMessage(error, 'Failed to fetch product details') }, { status: 500 });
  }
}
