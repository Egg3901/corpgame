import { NextResponse } from 'next/server';
import { SectorConfigService } from '@/lib/services/SectorConfigService';
import { SECTORS, PRODUCTS, RESOURCES } from '@/lib/constants/sectors';
import { getErrorMessage } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const config = await SectorConfigService.getConfiguration();
    
    // Build sector_unit_flows
    const sector_unit_flows: Record<string, any> = {};
    for (const sector of SECTORS) {
      const flows = await SectorConfigService.getUnitFlowsForSector(sector);
      if (flows) {
        sector_unit_flows[sector] = flows;
      }
    }

    // Build product consumers and suppliers
    const product_consumers: Record<string, string[]> = {};
    const product_suppliers: Record<string, string[]> = {};
    
    for (const product of PRODUCTS) {
      const consuming = await SectorConfigService.getSectorsDemandingProduct(product);
      product_consumers[product] = consuming.map(item => item.sector);
      
      const producing = await SectorConfigService.getSectorsProducingProduct(product);
      product_suppliers[product] = producing;
    }

    // Build resource consumers and suppliers
    const resource_consumers: Record<string, string[]> = {};
    const resource_suppliers: Record<string, string[]> = {};
    
    for (const resource of RESOURCES) {
      const consuming = await SectorConfigService.getSectorsDemandingResource(resource);
      resource_consumers[resource] = consuming.map(item => item.sector);
      
      const extracting = await SectorConfigService.getSectorsExtractingResource(resource);
      resource_suppliers[resource] = extracting;
    }

    return NextResponse.json({
      sector_unit_flows,
      product_consumers,
      product_suppliers,
      resource_consumers,
      resource_suppliers,
    });
  } catch (error: unknown) {
    console.error('Get market metadata error:', error);
    return NextResponse.json({ error: getErrorMessage(error, 'Failed to fetch market metadata') }, { status: 500 });
  }
}
