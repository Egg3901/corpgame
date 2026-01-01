import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { CorporationModel } from '@/lib/models/Corporation';
import { MarketEntryModel } from '@/lib/models/MarketEntry';
import { marketDataService, MarketItemSummary } from '@/lib/services/MarketDataService';
import { calculateStockPrice, calculateBalanceSheet } from '@/lib/utils/valuation';
import { SectorConfigService } from '@/lib/services/SectorConfigService';
import CorporationDashboard from '@/components/corporation/CorporationDashboard';
import { MarketMetadataResponse } from '@/lib/api';

// Force dynamic rendering since data changes frequently
export const dynamic = 'force-dynamic';

interface PageProps {
  params: {
    id: string;
  };
}

export default async function CorporationPage({ params }: PageProps) {
  const corpId = parseInt(params.id, 10);

  if (isNaN(corpId)) {
    notFound();
  }

  // Fetch all required data in parallel
  const [
    corporation,
    finances,
    balanceSheet,
    entries,
    commoditySummary,
    productSummary,
    sectorConfig,
    valuation
  ] = await Promise.all([
    CorporationModel.findById(corpId),
    MarketEntryModel.calculateCorporationFinances(corpId),
    calculateBalanceSheet(corpId),
    MarketEntryModel.findByCorporationIdWithUnits(corpId),
    marketDataService.getCommoditySummary(),
    marketDataService.getProductSummary(),
    SectorConfigService.getConfiguration(),
    calculateStockPrice(corpId).catch(() => null)
  ]);

  if (!corporation) {
    notFound();
  }

  // Format commodity prices for the dashboard
  const commodityPrices: Record<string, any> = {};
  commoditySummary.summary.forEach((item: MarketItemSummary) => {
    commodityPrices[item.resource || ''] = item.price;
  });

  // Format product prices for the dashboard
  const productPrices: Record<string, any> = {};
  productSummary.summary.forEach((item: MarketItemSummary) => {
    productPrices[item.product || ''] = item.price;
  });

  // Fetch market metadata (sector flows, etc.)
  // We can construct this from SectorConfigService
  const [
    sectorUnitFlows,
    productConsumers,
    productSuppliers,
    resourceConsumers,
    resourceSuppliers
  ] = await Promise.all([
    // Construct flows for all sectors
    Promise.all(Object.keys(sectorConfig.sectors).map(async (sector) => {
      const flows = await SectorConfigService.getUnitFlowsForSector(sector);
      return { sector, flows };
    })).then(results => {
      const flowMap: Record<string, any> = {};
      results.forEach(({ sector, flows }) => {
        if (flows) flowMap[sector] = flows;
      });
      return flowMap;
    }),
    
    // Product consumers
    Promise.all(Object.keys(sectorConfig.products).map(async (product) => {
      const consumers = await SectorConfigService.getSectorsDemandingProduct(product);
      return { product, consumers: consumers.map(c => c.sector) };
    })).then(results => {
      const map: Record<string, string[]> = {};
      results.forEach(({ product, consumers }) => map[product] = consumers);
      return map;
    }),

    // Product suppliers
    Promise.all(Object.keys(sectorConfig.products).map(async (product) => {
      const suppliers = await SectorConfigService.getSectorsProducingProduct(product);
      return { product, suppliers };
    })).then(results => {
      const map: Record<string, string[]> = {};
      results.forEach(({ product, suppliers }) => map[product] = suppliers);
      return map;
    }),

    // Resource consumers
    Promise.all(Object.keys(sectorConfig.resources).map(async (resource) => {
      const consumers = await SectorConfigService.getSectorsDemandingResource(resource);
      return { resource, consumers: consumers.map(c => c.sector) };
    })).then(results => {
      const map: Record<string, string[]> = {};
      results.forEach(({ resource, consumers }) => map[resource] = consumers);
      return map;
    }),

    // Resource suppliers
    Promise.all(Object.keys(sectorConfig.resources).map(async (resource) => {
      const suppliers = await SectorConfigService.getSectorsExtractingResource(resource);
      return { resource, suppliers };
    })).then(results => {
      const map: Record<string, string[]> = {};
      results.forEach(({ resource, suppliers }) => map[resource] = suppliers);
      return map;
    })
  ]);

  const marketMetadata: MarketMetadataResponse = {
    sector_unit_flows: sectorUnitFlows,
    product_consumers: productConsumers,
    product_suppliers: productSuppliers,
    resource_consumers: resourceConsumers,
    resource_suppliers: resourceSuppliers
  };

  // Convert MongoDB dates to strings/numbers if necessary, but passing objects to Client Component
  // requires them to be serializable.
  // MongoDB objects often have `_id` and Dates which need serialization.
  // We'll trust Next.js to handle simple Dates, but complex objects might need JSON.parse(JSON.stringify())
  // or manual mapping.
  // Specifically, CorporationModel.findById returns an object that might have Date fields.
  // Next.js Server Components can pass Dates to Client Components.
  
  // However, `MarketEntryModel.calculateCorporationFinances` returns an object with methods? No, usually POJO.
  // Let's ensure everything is serializable.
  
  return (
    <Suspense fallback={<div className="p-8 text-center">Loading corporation data...</div>}>
      <CorporationDashboard
        initialCorporation={JSON.parse(JSON.stringify(corporation))}
        initialFinances={JSON.parse(JSON.stringify(finances))}
        initialBalanceSheet={JSON.parse(JSON.stringify(balanceSheet))}
        initialMarketEntries={JSON.parse(JSON.stringify(entries))}
        initialCommodityPrices={JSON.parse(JSON.stringify(commodityPrices))}
        initialProductPrices={JSON.parse(JSON.stringify(productPrices))}
        initialMarketMetadata={JSON.parse(JSON.stringify(marketMetadata))}
        initialStockValuation={JSON.parse(JSON.stringify(valuation))}
        sectorConfig={JSON.parse(JSON.stringify(sectorConfig))}
      />
    </Suspense>
  );
}
