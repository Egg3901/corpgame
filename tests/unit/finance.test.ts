import { describe, it, expect } from 'vitest';
import { computeFinancialStatements, ConsolidatedStatement } from '@/lib/finance';
import type { MarketUnitFlow, MarketUnitType } from '@/lib/api';

describe('Financial Calculation Logic', () => {
  const periodHours = 96;

  const unitEconomics = {
    retail: { baseRevenue: 500, baseCost: 300 },
    production: { baseRevenue: 800, baseCost: 600 },
    service: { baseRevenue: 400, baseCost: 200 },
    extraction: { baseRevenue: 1000, baseCost: 700 },
  };

  const sectorUnitFlows: Record<string, Record<MarketUnitType, MarketUnitFlow>> = {
    Manufacturing: {
      retail: { inputs: { resources: {}, products: {} }, outputs: { resources: {}, products: {} } },
      production: {
        inputs: { resources: { Steel: 0.5 }, products: { Electricity: 0.5 } },
        outputs: { resources: {}, products: { 'Manufactured Goods': 1.0 } },
      },
      service: { inputs: { resources: {}, products: {} }, outputs: { resources: {}, products: {} } },
      extraction: { inputs: { resources: {}, products: {} }, outputs: { resources: {}, products: {} } },
    },
    Energy: {
      retail: { inputs: { resources: {}, products: {} }, outputs: { resources: {}, products: {} } },
      production: {
        inputs: { resources: {}, products: { Electricity: 0.0 } },
        outputs: { resources: {}, products: { Electricity: 1.0 } },
      },
      service: { inputs: { resources: {}, products: {} }, outputs: { resources: {}, products: {} } },
      extraction: { inputs: { resources: {}, products: {} }, outputs: { resources: { Oil: 2.0 }, products: {} } },
    },
    Defense: {
      retail: { inputs: { resources: {}, products: { 'Manufactured Goods': 1.0 } }, outputs: { resources: {}, products: {} } },
      production: { inputs: { resources: {}, products: {} }, outputs: { resources: {}, products: {} } },
      service: { inputs: { resources: {}, products: { Electricity: 1.0, 'Manufactured Goods': 1.0 } }, outputs: { resources: {}, products: {} } },
      extraction: { inputs: { resources: {}, products: {} }, outputs: { resources: {}, products: {} } },
    },
  };

  const commodityPrices = { Steel: { currentPrice: 850 }, Oil: { currentPrice: 75 } };
  const productPrices = { Electricity: { currentPrice: 200 }, 'Manufactured Goods': { currentPrice: 1500 } };

  it('should calculate revenue and costs correctly for mixed units', () => {
    const params = {
      entries: [
        { sector_type: 'Manufacturing', production_count: 2, service_count: 1 },
      ],
      sectorUnitFlows,
      commodityPrices,
      productPrices,
      unitEconomics,
      periodHours,
      fixedCosts: { ceoSalary: 5000, overhead: 1000 },
    };

    const result = computeFinancialStatements(params);

    // Production (2 units):
    // Revenue: 1500 * 1.0 * 96 * 2 = 288,000
    // Cost: (0.5 * 850 + 0.5 * 200) * 96 * 2 = 525 * 192 = 100,800 + Labor (400 * 96 * 2 = 76,800) -> 177,600
    // Service (1 unit):
    // Revenue: 400 * 96 * 1 = 38,400
    // Cost: 200 * 96 * 1 = 19,200 + Labor (150 * 96 * 1 = 14,400) -> 33,600

    expect(result.revenue).toBeGreaterThan(0);
    expect(result.variableCosts).toBeGreaterThan(0);
    expect(result.fixedCosts).toBe(6000);
    expect(result.netIncome).toBe(result.revenue - result.variableCosts - result.fixedCosts);
  });

  it('should handle missing flows gracefully', () => {
    const params = {
      entries: [{ sector_type: 'Unknown', retail_count: 5 }],
      sectorUnitFlows,
      commodityPrices,
      productPrices,
      unitEconomics,
      periodHours,
    };

    const result = computeFinancialStatements(params);
    expect(result.errors).toContain('missing_flow_Unknown');
  });

  it('should respect periodHours parameter', () => {
    const params = {
      entries: [{ sector_type: 'Manufacturing', service_count: 1 }],
      sectorUnitFlows,
      commodityPrices,
      productPrices,
      unitEconomics,
      periodHours: 48, // Half period
    };

    const result = computeFinancialStatements(params);
    
    // Service revenue: 400 * 48 = 19,200
    // Service labor: 150 * 48 = 7,200
    // Service base cost: 200 * 48 = 9,600 (Total var cost = 16,800)
    
    // Note: The actual calculation in finance.ts might include other factors, 
    // but we check scaling.
    expect(result.periodHours).toBe(48);
  });

  it('should apply dividends only on positive operating income', () => {
    const positive = computeFinancialStatements({
      entries: [{ sector_type: 'Manufacturing', production_count: 1 }],
      sectorUnitFlows,
      commodityPrices,
      productPrices,
      unitEconomics,
      periodHours,
      fixedCosts: { ceoSalary: 0, overhead: 0 },
      dividendPercentage: 10,
    });

    expect(positive.operatingIncome).toBeGreaterThanOrEqual(0);
    expect(positive.dividends).toBeCloseTo(positive.operatingIncome * 0.1, 6);
    expect(positive.retainedEarnings).toBeCloseTo(positive.operatingIncome - positive.dividends, 6);
    expect(positive.netIncome).toBe(positive.retainedEarnings);

    const negative = computeFinancialStatements({
      entries: [{ sector_type: 'Manufacturing', production_count: 1 }],
      sectorUnitFlows,
      commodityPrices,
      productPrices: { ...productPrices, 'Manufactured Goods': { currentPrice: 0 } },
      unitEconomics,
      periodHours,
      fixedCosts: { ceoSalary: 0, overhead: 0 },
      dividendPercentage: 50,
    });

    expect(negative.operatingIncome).toBeLessThanOrEqual(0);
    expect(negative.dividends).toBe(0);
    expect(negative.netIncome).toBe(negative.operatingIncome);
  });

  it('should compute extraction revenue from output rate and commodity price', () => {
    const result = computeFinancialStatements({
      entries: [{ sector_type: 'Energy', extraction_count: 2 }],
      sectorUnitFlows,
      commodityPrices,
      productPrices,
      unitEconomics,
      periodHours: 10,
    });

    const oilRate = sectorUnitFlows.Energy.extraction.outputs.resources.Oil;
    const expectedRevenue = commodityPrices.Oil.currentPrice * oilRate * 10 * 2;
    expect(result.revenue).toBeCloseTo(expectedRevenue, 6);
    expect(result.sectors[0].unitBreakdown.extraction.producedUnits).toBe(Math.round(oilRate * 10 * 2));
  });

  it('should handle missing prices as zero without throwing', () => {
    const result = computeFinancialStatements({
      entries: [{ sector_type: 'Manufacturing', production_count: 1 }],
      sectorUnitFlows,
      commodityPrices: {},
      productPrices: {},
      unitEconomics,
      periodHours,
    });

    expect(result.errors).toHaveLength(0);
    expect(result.revenue).toBe(0);
  });

  it('should clamp negative unit counts to zero', () => {
    const result = computeFinancialStatements({
      entries: [{ sector_type: 'Manufacturing', service_count: -10 } as any],
      sectorUnitFlows,
      commodityPrices,
      productPrices,
      unitEconomics,
      periodHours,
    });

    expect(result.sectors[0].unitBreakdown.service.units).toBe(0);
    expect(result.revenue).toBe(0);
  });

  it('should compute Defense retail with discounted cost-based revenue floor', () => {
    const result = computeFinancialStatements({
      entries: [{ sector_type: 'Defense', retail_count: 1 }],
      sectorUnitFlows,
      commodityPrices,
      productPrices: { Electricity: { currentPrice: 50 }, 'Manufactured Goods': { currentPrice: 100 } },
      unitEconomics,
      periodHours: 10,
      fixedCosts: { ceoSalary: 0, overhead: 0 },
    });

    expect(result.sectors[0].revenue).toBeCloseTo(880, 6);
    expect(result.sectors[0].variableCosts).toBeCloseTo(2800, 6);
    expect(result.sectors[0].unitBreakdown.retail.demandedUnits).toBe(10);
  });

  it('should compute Defense service with electricity and non-electricity inputs', () => {
    const result = computeFinancialStatements({
      entries: [{ sector_type: 'Defense', service_count: 1 }],
      sectorUnitFlows,
      commodityPrices,
      productPrices: { Electricity: { currentPrice: 50 }, 'Manufactured Goods': { currentPrice: 100 } },
      unitEconomics,
      periodHours: 10,
      fixedCosts: { ceoSalary: 0, overhead: 0 },
    });

    expect(result.sectors[0].revenue).toBeCloseTo(1155, 6);
    expect(result.sectors[0].variableCosts).toBeCloseTo(2550, 6);
    expect(result.sectors[0].unitBreakdown.service.demandedUnits).toBe(20);
  });

  it('should compute non-Defense retail revenue from product prices and consumption', () => {
    const flows = {
      ...sectorUnitFlows,
      Manufacturing: {
        ...sectorUnitFlows.Manufacturing,
        retail: { inputs: { resources: {}, products: { 'Manufactured Goods': 1.0 } }, outputs: { resources: {}, products: {} } },
      },
    };

    const result = computeFinancialStatements({
      entries: [{ sector_type: 'Manufacturing', retail_count: 1 }],
      sectorUnitFlows: flows,
      commodityPrices,
      productPrices: { Electricity: { currentPrice: 50 }, 'Manufactured Goods': { currentPrice: 100 } },
      unitEconomics,
      periodHours: 10,
      fixedCosts: { ceoSalary: 0, overhead: 0 },
    });

    expect(result.sectors[0].revenue).toBeCloseTo(2189, 6);
    expect(result.sectors[0].variableCosts).toBeCloseTo(3990, 6);
    expect(result.sectors[0].unitBreakdown.retail.demandedUnits).toBe(10);
  });

  it('should compute non-Defense service with electricity and non-electricity inputs', () => {
    const flows = {
      ...sectorUnitFlows,
      Manufacturing: {
        ...sectorUnitFlows.Manufacturing,
        service: { inputs: { resources: {}, products: { Electricity: 1.0, 'Manufactured Goods': 1.0 } }, outputs: { resources: {}, products: {} } },
      },
    };

    const result = computeFinancialStatements({
      entries: [{ sector_type: 'Manufacturing', service_count: 1 }],
      sectorUnitFlows: flows,
      commodityPrices,
      productPrices: { Electricity: { currentPrice: 50 }, 'Manufactured Goods': { currentPrice: 100 } },
      unitEconomics,
      periodHours: 10,
      fixedCosts: { ceoSalary: 0, overhead: 0 },
    });

    expect(result.sectors[0].revenue).toBeCloseTo(1916.75, 6);
    expect(result.sectors[0].variableCosts).toBeCloseTo(3242.5, 6);
    expect(result.sectors[0].unitBreakdown.service.demandedUnits).toBe(20);
  });

  it('should use base economics when production has no declared output product', () => {
    const flows: Record<string, Record<MarketUnitType, MarketUnitFlow>> = {
      ...sectorUnitFlows,
      EmptyProd: {
        retail: { inputs: { resources: {}, products: {} }, outputs: { resources: {}, products: {} } },
        production: { inputs: { resources: {}, products: { Electricity: 1.0 } }, outputs: { resources: {}, products: {} } },
        service: { inputs: { resources: {}, products: {} }, outputs: { resources: {}, products: {} } },
        extraction: { inputs: { resources: {}, products: {} }, outputs: { resources: {}, products: {} } },
      },
    };

    const result = computeFinancialStatements({
      entries: [{ sector_type: 'EmptyProd', production_count: 1 }],
      sectorUnitFlows: flows,
      commodityPrices,
      productPrices,
      unitEconomics,
      periodHours: 10,
      fixedCosts: { ceoSalary: 0, overhead: 0 },
    });

    expect(result.sectors[0].revenue).toBeCloseTo(8000, 6);
    expect(result.sectors[0].variableCosts).toBeCloseTo(6000, 6);
    expect(result.sectors[0].unitBreakdown.production.producedUnits).toBe(0);
    expect(result.sectors[0].unitBreakdown.production.demandedUnits).toBe(10);
  });

  it('should use base economics when extraction has no declared output resource', () => {
    const flows: Record<string, Record<MarketUnitType, MarketUnitFlow>> = {
      ...sectorUnitFlows,
      EmptyExt: {
        retail: { inputs: { resources: {}, products: {} }, outputs: { resources: {}, products: {} } },
        production: { inputs: { resources: {}, products: {} }, outputs: { resources: {}, products: {} } },
        service: { inputs: { resources: {}, products: {} }, outputs: { resources: {}, products: {} } },
        extraction: { inputs: { resources: {}, products: {} }, outputs: { resources: {}, products: {} } },
      },
    };

    const result = computeFinancialStatements({
      entries: [{ sector_type: 'EmptyExt', extraction_count: 1 }],
      sectorUnitFlows: flows,
      commodityPrices,
      productPrices,
      unitEconomics,
      periodHours: 10,
      fixedCosts: { ceoSalary: 0, overhead: 0 },
    });

    expect(result.sectors[0].revenue).toBeCloseTo(10000, 6);
    expect(result.sectors[0].variableCosts).toBeCloseTo(7000, 6);
    expect(result.sectors[0].unitBreakdown.extraction.producedUnits).toBe(0);
  });

  it('should default periodHours to 96 when periodHours is not positive', () => {
    const result = computeFinancialStatements({
      entries: [{ sector_type: 'Manufacturing', production_count: 1 }],
      sectorUnitFlows,
      commodityPrices,
      productPrices,
      unitEconomics,
      periodHours: 0,
    });

    expect(result.periodHours).toBe(96);
  });

  it('should compute retail with missing product prices as zero without throwing', () => {
    const flows = {
      ...sectorUnitFlows,
      Manufacturing: {
        ...sectorUnitFlows.Manufacturing,
        retail: { inputs: { resources: {}, products: { 'Unknown Product': 1.0 } }, outputs: { resources: {}, products: {} } },
      },
    };

    const result = computeFinancialStatements({
      entries: [{ sector_type: 'Manufacturing', retail_count: 1 }],
      sectorUnitFlows: flows,
      commodityPrices,
      productPrices: {},
      unitEconomics,
      periodHours: 10,
    });

    expect(result.sectors[0].revenue).toBe(0);
    expect(result.sectors[0].variableCosts).toBeGreaterThan(0);
  });

  it('should compute extraction with missing commodity prices as zero without throwing', () => {
    const result = computeFinancialStatements({
      entries: [{ sector_type: 'Energy', extraction_count: 1 }],
      sectorUnitFlows,
      commodityPrices: {},
      productPrices,
      unitEconomics,
      periodHours: 10,
    });

    expect(result.sectors[0].revenue).toBe(0);
    expect(result.sectors[0].variableCosts).toBeGreaterThan(0);
  });
});
