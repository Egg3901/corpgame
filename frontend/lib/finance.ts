import type { MarketUnitFlow, MarketUnitType } from '@/lib/api';

export type SectorUnits = {
  retail?: number;
  production?: number;
  service?: number;
  extraction?: number;
};

export type PriceMap = Record<string, { currentPrice: number }>;

export type UnitEconomics = {
  retail: { baseRevenue: number; baseCost: number };
  production: { baseRevenue: number; baseCost: number };
  service: { baseRevenue: number; baseCost: number };
  extraction: { baseRevenue: number; baseCost: number };
};

export type FixedCosts = {
  ceoSalary?: number;
  overhead?: number;
  perPeriod?: number;
};

export type SectorStatement = {
  sector: string;
  revenue: number;
  variableCosts: number;
  fixedCosts: number;
  netIncome: number;
  unitBreakdown: Record<MarketUnitType, { revenue: number; cost: number; units: number; producedUnits: number; demandedUnits: number }>;
};

export type ConsolidatedStatement = {
  revenue: number;
  variableCosts: number;
  fixedCosts: number;
  netIncome: number;
  sectors: SectorStatement[];
  periodHours: number;
  errors: string[];
};

type ComputeParams = {
  entries: Array<{ sector_type: string; retail_count?: number; production_count?: number; service_count?: number; extraction_count?: number }>;
  sectorUnitFlows: Record<string, Record<MarketUnitType, MarketUnitFlow>>;
  commodityPrices: PriceMap;
  productPrices: PriceMap;
  unitEconomics: UnitEconomics;
  periodHours?: number;
  fixedCosts?: FixedCosts;
};

const clampNonNegative = (n: number) => (isFinite(n) && n > 0 ? n : 0);

export function computeFinancialStatements(params: ComputeParams): ConsolidatedStatement {
  const errors: string[] = [];
  const periodHours = params.periodHours && params.periodHours > 0 ? Math.floor(params.periodHours) : 96;
  const unitEconomics = params.unitEconomics;
  const flows = params.sectorUnitFlows || {};
  const commodityPrices = params.commodityPrices || {};
  const productPrices = params.productPrices || {};
  const fixedCosts = params.fixedCosts || {};

  const sectors: SectorStatement[] = [];

  params.entries.forEach((entry, idx) => {
    const sector = entry.sector_type;
    if (!sector || !flows[sector]) {
      errors.push(`missing_flow_${sector || idx}`);
    }

    const units: SectorUnits = {
      retail: clampNonNegative(entry.retail_count || 0),
      production: clampNonNegative(entry.production_count || 0),
      service: clampNonNegative(entry.service_count || 0),
      extraction: clampNonNegative(entry.extraction_count || 0),
    };

    const sectorFlow = flows[sector] || { retail: { inputs: { resources: {}, products: {} }, outputs: { resources: {}, products: {} } }, production: { inputs: { resources: {}, products: {} }, outputs: { resources: {}, products: {} } }, service: { inputs: { resources: {}, products: {} }, outputs: { resources: {}, products: {} } }, extraction: { inputs: { resources: {}, products: {} }, outputs: { resources: {}, products: {} } } };

    let revenue = 0;
    let variableCosts = 0;
    const unitBreakdown: Record<MarketUnitType, { revenue: number; cost: number; units: number; producedUnits: number; demandedUnits: number }> = {
      retail: { revenue: 0, cost: 0, units: units.retail || 0, producedUnits: 0, demandedUnits: 0 },
      production: { revenue: 0, cost: 0, units: units.production || 0, producedUnits: 0, demandedUnits: 0 },
      service: { revenue: 0, cost: 0, units: units.service || 0, producedUnits: 0, demandedUnits: 0 },
      extraction: { revenue: 0, cost: 0, units: units.extraction || 0, producedUnits: 0, demandedUnits: 0 },
    };

    if ((units.retail || 0) > 0) {
      const r = unitEconomics.retail.baseRevenue * periodHours * (units.retail || 0);
      const c = unitEconomics.retail.baseCost * periodHours * (units.retail || 0);
      revenue += r;
      variableCosts += c;
      unitBreakdown.retail.revenue += r;
      unitBreakdown.retail.cost += c;
    }

    if ((units.production || 0) > 0) {
      const flow = sectorFlow.production;
      let unitRevenuePerHour = unitEconomics.production.baseRevenue;
      let unitCostPerHour = unitEconomics.production.baseCost;

      const producedProduct = Object.keys(flow.outputs.products || {})[0] || null;
      if (producedProduct) {
        const outputRate = flow.outputs.products[producedProduct] || 0;
        const productPrice = productPrices[producedProduct]?.currentPrice || 0;
        unitRevenuePerHour = productPrice * outputRate;

        unitCostPerHour = 0;
        Object.entries(flow.inputs.resources || {}).forEach(([resource, amount]) => {
          const price = commodityPrices[resource]?.currentPrice || 0;
          unitCostPerHour += amount * price;
        });
        Object.entries(flow.inputs.products || {}).forEach(([product, amount]) => {
          const price = productPrices[product]?.currentPrice || 0;
          unitCostPerHour += amount * price;
        });
      }

      const r = unitRevenuePerHour * periodHours * (units.production || 0);
      const c = unitCostPerHour * periodHours * (units.production || 0);
      revenue += r;
      variableCosts += c;
      unitBreakdown.production.revenue += r;
      unitBreakdown.production.cost += c;
      unitBreakdown.production.producedUnits = Math.round((flow.outputs.products && producedProduct ? (flow.outputs.products[producedProduct] || 0) : 0) * (units.production || 0) * periodHours);
      unitBreakdown.production.demandedUnits = Math.round(Object.values(flow.inputs.products || {}).reduce((s, v) => s + v, 0) * (units.production || 0) * periodHours);
    }

    if ((units.service || 0) > 0) {
      const r = unitEconomics.service.baseRevenue * periodHours * (units.service || 0);
      const c = unitEconomics.service.baseCost * periodHours * (units.service || 0);
      revenue += r;
      variableCosts += c;
      unitBreakdown.service.revenue += r;
      unitBreakdown.service.cost += c;
    }

    if ((units.extraction || 0) > 0) {
      const flow = sectorFlow.extraction;
      const producedResource = Object.keys(flow.outputs.resources || {})[0] || null;
      let unitRevenuePerHour = unitEconomics.extraction.baseRevenue;
      let unitCostPerHour = unitEconomics.extraction.baseCost;
      if (producedResource) {
        const outputRate = flow.outputs.resources[producedResource] || 0;
        const price = commodityPrices[producedResource]?.currentPrice || 0;
        unitRevenuePerHour = price * outputRate;
      }
      const r = unitRevenuePerHour * periodHours * (units.extraction || 0);
      const c = unitCostPerHour * periodHours * (units.extraction || 0);
      revenue += r;
      variableCosts += c;
      unitBreakdown.extraction.revenue += r;
      unitBreakdown.extraction.cost += c;
      unitBreakdown.extraction.producedUnits = Math.round((flow.outputs.resources && producedResource ? (flow.outputs.resources[producedResource] || 0) : 0) * (units.extraction || 0) * periodHours);
      unitBreakdown.extraction.demandedUnits = 0;
    }

    const sectorFixedCosts = clampNonNegative(fixedCosts.perPeriod || 0);
    const fixed = sectorFixedCosts;
    const net = revenue - (variableCosts + fixed);

    sectors.push({
      sector,
      revenue,
      variableCosts,
      fixedCosts: fixed,
      netIncome: net,
      unitBreakdown,
    });
  });

  const consolidatedRevenue = sectors.reduce((s, x) => s + x.revenue, 0);
  const consolidatedVariable = sectors.reduce((s, x) => s + x.variableCosts, 0);
  const corporateFixed = clampNonNegative((fixedCosts.ceoSalary || 0) + (fixedCosts.overhead || 0));
  const consolidatedFixed = sectors.reduce((s, x) => s + x.fixedCosts, 0) + corporateFixed;
  const consolidatedNet = consolidatedRevenue - (consolidatedVariable + consolidatedFixed);

  return {
    revenue: consolidatedRevenue,
    variableCosts: consolidatedVariable,
    fixedCosts: consolidatedFixed,
    netIncome: consolidatedNet,
    sectors,
    periodHours,
    errors,
  };
}

