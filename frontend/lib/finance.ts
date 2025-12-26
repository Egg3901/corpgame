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
  operatingIncome: number;  // Revenue - Variable Costs - Fixed Costs (before dividends)
  dividends: number;        // Operating Income * dividend_percentage
  retainedEarnings: number; // Operating Income - Dividends
  netIncome: number;        // Same as retainedEarnings for compatibility
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
  dividendPercentage?: number;  // 0-100, percentage of operating income paid as dividends
};

const clampNonNegative = (n: number) => (isFinite(n) && n > 0 ? n : 0);

// Defense sector constants (must match backend)
const DEFENSE_WHOLESALE_DISCOUNT = 0.8;
const DEFENSE_REVENUE_ON_COST_MULTIPLIER = 1.0;
const RETAIL_PRODUCT_CONSUMPTION = 2.0;
const SERVICE_PRODUCT_CONSUMPTION = 1.5;
const SERVICE_ELECTRICITY_CONSUMPTION = 0.5;
const RETAIL_WHOLESALE_DISCOUNT = 0.995;
const SERVICE_WHOLESALE_DISCOUNT = 0.995;
const RETAIL_MIN_GROSS_MARGIN_PCT = 0.1;
const SERVICE_MIN_GROSS_MARGIN_PCT = 0.1;
const UNIT_LABOR_COSTS = {
  retail: 200,
  production: 400,
  service: 150,
  extraction: 250,
};

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
      const flow = sectorFlow.retail;
      const laborCost = UNIT_LABOR_COSTS.retail;
      let totalProductCost = 0;
      let revenueRaw = 0;

      const productDemands = Object.keys(flow.inputs.products || {});
      productDemands.forEach((product) => {
        const productPrice = productPrices[product]?.currentPrice || 0;
        let consumedAmount = RETAIL_PRODUCT_CONSUMPTION;
        if (sector === 'Defense') {
          consumedAmount = 1.0;
        }

        let discount = RETAIL_WHOLESALE_DISCOUNT;
        if (sector === 'Defense') {
          discount = DEFENSE_WHOLESALE_DISCOUNT;
        }

        const productCost = productPrice * consumedAmount * discount;
        totalProductCost += productCost;

        if (sector === 'Defense') {
          revenueRaw += productCost * DEFENSE_REVENUE_ON_COST_MULTIPLIER;
        } else {
          revenueRaw += productPrice * consumedAmount;
        }
      });

      const minRevenue = totalProductCost * (1 + RETAIL_MIN_GROSS_MARGIN_PCT);
      const unitRevenuePerHour = Math.max(revenueRaw, minRevenue);
      const unitCostPerHour = laborCost + totalProductCost;

      const r = unitRevenuePerHour * periodHours * (units.retail || 0);
      const c = unitCostPerHour * periodHours * (units.retail || 0);
      revenue += r;
      variableCosts += c;
      unitBreakdown.retail.revenue += r;
      unitBreakdown.retail.cost += c;
      unitBreakdown.retail.demandedUnits = Math.round(Object.values(flow.inputs.products || {}).reduce((s, v) => s + v, 0) * (units.retail || 0) * periodHours);
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
      const flow = sectorFlow.service;
      const laborCost = UNIT_LABOR_COSTS.service;
      let totalProductCost = 0;
      let revenueRaw = 0;

      const productDemands = Object.keys(flow.inputs.products || {});
      productDemands.forEach((product) => {
        const productPrice = productPrices[product]?.currentPrice || 0;
        let consumedAmount = product === 'Electricity' ? SERVICE_ELECTRICITY_CONSUMPTION : SERVICE_PRODUCT_CONSUMPTION;
        
        if (sector === 'Defense' && product !== 'Electricity') {
          consumedAmount = 1.0;
        } else if (sector === 'Manufacturing' && product !== 'Electricity') {
          consumedAmount = 0.5;
        }

        let discount = product === 'Electricity' ? 1.0 : SERVICE_WHOLESALE_DISCOUNT;
        if (sector === 'Defense' && product !== 'Electricity') {
          discount = DEFENSE_WHOLESALE_DISCOUNT;
        } else if (sector === 'Manufacturing') {
          // Align Manufacturing service with retail discount
          discount = RETAIL_WHOLESALE_DISCOUNT;
        }

        const productCost = productPrice * consumedAmount * discount;
        totalProductCost += productCost;

        if (sector === 'Defense' && product !== 'Electricity') {
          revenueRaw += productCost * DEFENSE_REVENUE_ON_COST_MULTIPLIER;
        } else {
          revenueRaw += productPrice * consumedAmount;
        }
      });

      const minRevenue = totalProductCost * (1 + SERVICE_MIN_GROSS_MARGIN_PCT);
      const unitRevenuePerHour = Math.max(revenueRaw, minRevenue);
      const unitCostPerHour = laborCost + totalProductCost;

      const r = unitRevenuePerHour * periodHours * (units.service || 0);
      const c = unitCostPerHour * periodHours * (units.service || 0);
      revenue += r;
      variableCosts += c;
      unitBreakdown.service.revenue += r;
      unitBreakdown.service.cost += c;
      unitBreakdown.service.demandedUnits = Math.round(Object.values(flow.inputs.products || {}).reduce((s, v) => s + v, 0) * (units.service || 0) * periodHours);
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

  // Operating Income = Revenue - Variable Costs - Fixed Costs (before dividends)
  const operatingIncome = consolidatedRevenue - (consolidatedVariable + consolidatedFixed);

  // Calculate dividends (only on positive operating income)
  const divPercent = clampNonNegative(params.dividendPercentage || 0);
  const dividends = operatingIncome > 0 ? operatingIncome * (divPercent / 100) : 0;

  // Retained Earnings = Operating Income - Dividends
  const retainedEarnings = operatingIncome - dividends;

  return {
    revenue: consolidatedRevenue,
    variableCosts: consolidatedVariable,
    fixedCosts: consolidatedFixed,
    operatingIncome,
    dividends,
    retainedEarnings,
    netIncome: retainedEarnings,  // For backwards compatibility
    sectors,
    periodHours,
    errors,
  };
}

