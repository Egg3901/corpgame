import { NextResponse } from 'next/server';
import { marketDataService } from '@/lib/services/MarketDataService';
import { 
  RESOURCES, 
  SECTOR_RESOURCES, 
  SECTOR_PRODUCTS, 
  SECTOR_PRODUCT_DEMANDS,
  PRODUCTS,
  calculateCommodityPrice,
  calculateProductPrice,
  Resource,
  Product
} from '@/lib/constants/sectors';
import { getErrorMessage } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Calculate commodity prices with actual supply/demand
    const { supply: commoditySupply, demand: commodityDemand } = await marketDataService.getCommoditySummary();
    
    const commodities = RESOURCES.map((resource: Resource) => {
      const priceInfo = calculateCommodityPrice(resource, commoditySupply[resource], commodityDemand[resource]);
      return {
        resource,
        basePrice: priceInfo.basePrice,
        currentPrice: priceInfo.currentPrice,
        priceChange: priceInfo.priceChange,
        totalSupply: priceInfo.totalSupply,
        scarcityFactor: priceInfo.scarcityFactor,
        topProducers: priceInfo.topProducers || [],
        demandingSectors: priceInfo.demandingSectors || [],
      };
    });
    
    // Calculate supply for each product
    const { supply: productSupply, demand: productDemand } = await marketDataService.getProductSummary();
    
    // Calculate prices for all products
    const products = PRODUCTS.map((product: Product) => {
      const priceInfo = calculateProductPrice(product, productSupply[product], productDemand[product]);
      return priceInfo;
    });
    
    return NextResponse.json({
      commodities,
      products,
      resources: RESOURCES,
      product_types: PRODUCTS,
      sector_resources: SECTOR_RESOURCES,
      sector_products: SECTOR_PRODUCTS,
      sector_product_demands: SECTOR_PRODUCT_DEMANDS,
      commodity_supply: commoditySupply,
      commodity_demand: commodityDemand,
      product_supply: productSupply,
      product_demand: productDemand,
    });
  } catch (error: unknown) {
    console.error('Get commodities error:', error);
    return NextResponse.json({ error: getErrorMessage(error, 'Failed to fetch commodity prices') }, { status: 500 });
  }
}
