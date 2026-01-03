import { NextRequest, NextResponse } from 'next/server';
import { MarketEntryModel } from '@/lib/models/MarketEntry';
import { BusinessUnitCalculator } from '@/lib/services/BusinessUnitCalculator';
import { 
  PRODUCTS, 
  SECTOR_PRODUCTS, 
  PRODUCTION_OUTPUT_RATE, 
  type Sector, 
  type Product 
} from '@/lib/constants/sectors';
import { getErrorMessage } from '@/lib/utils';

export async function GET(
  request: NextRequest,
  { params }: { params: { name: string } }
) {
  try {
    const productName = decodeURIComponent(params.name) as Product;

    // Validate product exists
    if (!PRODUCTS.includes(productName)) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    const businessUnitCalculator = new BusinessUnitCalculator();

    // Get sectors that produce this product
    const producingSectors: Sector[] = [];
    for (const [sector, product] of Object.entries(SECTOR_PRODUCTS)) {
      if (product === productName) {
        producingSectors.push(sector as Sector);
      }
    }

    // Get top 10 suppliers aggregated by corporation
    const suppliersData = await MarketEntryModel.getTopProductSuppliers(producingSectors, 10);
    
    // Get total supply units to calculate "others"
    const totalProductionUnits = await MarketEntryModel.getTotalSectorProductionUnits(producingSectors);

    // Format suppliers response
    const suppliers = suppliersData.map(row => ({
      corporation_id: row.corporation_id,
      corporation_name: row.corporation_name,
      corporation_logo: row.corporation_logo,
      value: row.production_units * PRODUCTION_OUTPUT_RATE,
    }));

    const totalSupply = totalProductionUnits * PRODUCTION_OUTPUT_RATE;
    const top10SuppliersValue = suppliers.reduce((sum, p) => sum + p.value, 0);

    // Get all corporations with their unit counts for demand calculation
    const allCorpUnitCounts = await MarketEntryModel.getAllCorporationUnitCounts();

    // Calculate demand per corporation (aggregated across all their sectors)
    const demandByCorp: Record<number, { corporation_id: number; corporation_name: string; corporation_logo: string | null; value: number }> = {};
    
    for (const row of allCorpUnitCounts) {
      const counts = {
        production: row.production_units,
        retail: row.retail_units,
        service: row.service_units,
        extraction: row.extraction_units,
      };
      
      const demand = businessUnitCalculator.computeTotalProductDemand(row.sector_type, productName, counts);
      
      if (demand > 0) {
        if (!demandByCorp[row.corporation_id]) {
          demandByCorp[row.corporation_id] = {
            corporation_id: row.corporation_id,
            corporation_name: row.corporation_name,
            corporation_logo: row.corporation_logo,
            value: 0,
          };
        }
        demandByCorp[row.corporation_id].value += demand;
      }
    }

    // Sort demanders by value and take top 10
    const demanders = Object.values(demandByCorp)
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);

    const totalDemand = Object.values(demandByCorp).reduce((sum, d) => sum + d.value, 0);
    const top10DemandersValue = demanders.reduce((sum, d) => sum + d.value, 0);

    return NextResponse.json({
      product: productName,
      suppliers: {
        data: suppliers,
        others: Math.max(0, totalSupply - top10SuppliersValue),
        total: totalSupply,
      },
      demanders: {
        data: demanders,
        others: Math.max(0, totalDemand - top10DemandersValue),
        total: totalDemand,
      },
    });
  } catch (error: unknown) {
    console.error('Get product pie data error:', error);
    return NextResponse.json({ error: getErrorMessage(error, 'Failed to fetch product pie data') }, { status: 500 });
  }
}
