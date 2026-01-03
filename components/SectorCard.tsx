'use client';

import { Store, Factory, Briefcase, Pickaxe, Building2, Trash2, MapPin } from 'lucide-react';
import { Card, CardHeader, CardBody, CardFooter, Button, Chip, Divider, Tooltip } from "@heroui/react";
import FinancialTooltip from './FinancialTooltip';
import Link from 'next/link';
import type { MarketUnitFlow } from '@/lib/api';

interface SectorCardProps {
  sectorType: string;
  stateCode: string;
  stateName: string;
  stateMultiplier: number;
  stateGrowthFactor?: number;
  enteredDate: string;
  units: {
    retail: number;
    production: number;
    service: number;
    extraction: number;
  };
  corporation?: {
    id: number;
    name: string;
    logo?: string | null;
  } | null;
  canExtract: boolean;
  extractableResources?: string[] | null;
  requiredResource?: string | null;
  producedProduct?: string | null;
  productDemands?: string[] | null;
  revenue?: number;
  profit?: number;
  showActions?: boolean;
  onAbandonUnit?: (unitType: 'retail' | 'production' | 'service' | 'extraction') => void;
  onBuildUnit?: (unitType: 'retail' | 'production' | 'service' | 'extraction') => void;
  abandoningUnit?: string | null;
  building?: string | null;
  canBuild?: boolean;
  buildCost?: number;
  formatCurrency: (value: number) => string;
  calculateUnitProfit: (unitType: 'retail' | 'production' | 'service' | 'extraction') => number;
  UNIT_ECONOMICS: {
    retail: { baseRevenue: number; baseCost: number };
    production: { baseRevenue: number; baseCost: number };
    service: { baseRevenue: number; baseCost: number };
    extraction: { baseRevenue: number; baseCost: number };
  };
  SECTORS_CAN_EXTRACT: Record<string, string[] | null>;
  commodityPrices?: Record<string, { currentPrice: number; basePrice?: number }>;
  productPrices?: Record<string, { currentPrice: number; referenceValue?: number }>;
  EXTRACTION_OUTPUT_RATE?: number;
  unitFlows?: Record<'retail' | 'production' | 'service' | 'extraction', MarketUnitFlow>;
  // FID-20251228-001: Optional config-driven product reference values
  productReferenceValues?: Record<string, number>;
}

export default function SectorCard({
  sectorType,
  stateCode,
  stateName,
  stateMultiplier,
  stateGrowthFactor = 1,
  enteredDate,
  units,
  corporation,
  canExtract,
  extractableResources,
  requiredResource,
  producedProduct,
  productDemands,
  revenue,
  profit,
  showActions = false,
  onAbandonUnit,
  onBuildUnit,
  abandoningUnit = null,
  building = null,
  canBuild = true,
  buildCost = 10000,
  formatCurrency,
  calculateUnitProfit,
  UNIT_ECONOMICS,
  SECTORS_CAN_EXTRACT,
  commodityPrices,
  productPrices,
  EXTRACTION_OUTPUT_RATE = 2.0,
  unitFlows,
  productReferenceValues,
}: SectorCardProps) {
  // FID-20251228-001: Use config-driven values with hardcoded fallback
  const PRODUCT_BASE_PRICES: Record<string, number> = productReferenceValues || {
    'Technology Products': 5000,
    'Manufactured Goods': 1500,
    'Electricity': 200,
    'Food Products': 500,
    'Construction Capacity': 2500,
    'Pharmaceutical Products': 8000,
    'Defense Equipment': 15000,
    'Logistics Capacity': 1000,
    'Steel': 850,
  };

  const BASE_SECTOR_CAPACITY = 15;
  const PRODUCTION_LABOR_COST = 400;
  const PRODUCTION_RESOURCE_CONSUMPTION = 0.5;
  const PRODUCTION_ELECTRICITY_CONSUMPTION = 0.5;
  const PRODUCTION_PRODUCT_CONSUMPTION = 0.5;
  const PRODUCTION_OUTPUT_RATE = 1.0;

  const DEFENSE_WHOLESALE_DISCOUNT = 0.8;
  const DEFENSE_REVENUE_MULTIPLIER = 1.0;
  const RETAIL_WHOLESALE_DISCOUNT = 0.90;
  const SERVICE_WHOLESALE_DISCOUNT = 0.90;

  const isDefense = sectorType === 'Defense';
  const isLightIndustry = sectorType === 'Light Industry';
  const isHeavyIndustry = sectorType === 'Heavy Industry';
  const isMining = sectorType === 'Mining';
  const isRetailSector = sectorType === 'Retail';

  // Production-only sectors cannot build retail/service units
  const isProductionOnly = isLightIndustry || isHeavyIndustry || isMining;
  const showRetail = !isProductionOnly;
  const showProduction = !!producedProduct;
  const showService = true; // Always show service for now
  const showExtraction = canExtract;

  // Placeholder demand factor for retail/service to ensure slight profitability
  const applyDemandFactorCost = (baseCost: number) => baseCost / Math.max(1, stateGrowthFactor);

  const totalUnits = units.retail + units.production + units.service + units.extraction;
  const stateCapacity = Math.floor(BASE_SECTOR_CAPACITY * stateMultiplier);
  const capacityPercentage = stateCapacity > 0 ? (totalUnits / stateCapacity) * 100 : 0;
  const isNearCapacity = capacityPercentage >= 80;
  const isAtCapacity = totalUnits >= stateCapacity;

  const buildProductionFlow = (): MarketUnitFlow | null => {
    if (unitFlows?.production) {
      return unitFlows.production;
    }

    const inputsResources: Record<string, number> = requiredResource
      ? { [requiredResource]: PRODUCTION_RESOURCE_CONSUMPTION }
      : {};

    const inputsProducts: Record<string, number> = {};
    if (PRODUCTION_ELECTRICITY_CONSUMPTION > 0) {
      inputsProducts['Electricity'] = PRODUCTION_ELECTRICITY_CONSUMPTION;
    }
    if (productDemands) {
      productDemands.forEach((product) => {
        inputsProducts[product] = PRODUCTION_PRODUCT_CONSUMPTION;
      });
    }

    const outputsProducts: Record<string, number> = producedProduct
      ? { [producedProduct]: PRODUCTION_OUTPUT_RATE }
      : {};

    return {
      inputs: { resources: inputsResources, products: inputsProducts },
      outputs: { resources: {}, products: outputsProducts },
    };
  };

  const productionFlowRaw = buildProductionFlow();

  const formatRate = (value: number) => {
    return new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(value);
  };

  const formatFlowTotals = (flow: MarketUnitFlow | undefined, unitCount: number) => {
    if (!flow) return null;

    const inputResourceEntries = Object.entries(flow.inputs.resources || {}).filter(([, v]) => v > 0);
    const inputProductEntries = Object.entries(flow.inputs.products || {}).filter(([, v]) => v > 0);
    const outputResourceEntries = Object.entries(flow.outputs.resources || {}).filter(([, v]) => v > 0);
    const outputProductEntries = Object.entries(flow.outputs.products || {}).filter(([, v]) => v > 0);

    if (
      inputResourceEntries.length === 0 &&
      inputProductEntries.length === 0 &&
      outputResourceEntries.length === 0 &&
      outputProductEntries.length === 0
    ) {
      return null;
    }

    return {
      inputs: {
        resources: inputResourceEntries.map(([k, v]) => ({ name: k, perUnit: v, total: v * unitCount })),
        products: inputProductEntries.map(([k, v]) => ({ name: k, perUnit: v, total: v * unitCount })),
      },
      outputs: {
        resources: outputResourceEntries.map(([k, v]) => ({ name: k, perUnit: v, total: v * unitCount })),
        products: outputProductEntries.map(([k, v]) => ({ name: k, perUnit: v, total: v * unitCount })),
      },
    };
  };

  const computeInputCosts = (
    inputs: { resources: Record<string, number>; products: Record<string, number> },
    producedProductContext?: string | null,
    isDefenseSector: boolean = false
  ) => {
    const items: Array<{ name: string; quantity: number; unitPrice: number; costHr: number }> = [];
    Object.entries(inputs.resources || {}).forEach(([name, amount]) => {
      const price = commodityPrices?.[name]?.currentPrice ?? 0;
      items.push({ name, quantity: amount, unitPrice: price, costHr: amount * price });
    });
    Object.entries(inputs.products || {}).forEach(([name, amount]) => {
      const price = productPrices?.[name]?.currentPrice ?? PRODUCT_BASE_PRICES[name] ?? 0;
      let mult = producedProductContext === 'Electricity' && name === 'Electricity' ? 0.1 : 1;

      // Apply Defense wholesale discount for non-electricity products
      if (isDefenseSector && name !== 'Electricity') {
        mult *= DEFENSE_WHOLESALE_DISCOUNT;
      } else if (sectorType === 'Light Industry' && name !== 'Electricity') {
        // Align Light Industry service/retail (if applicable) with retail discount
        mult = RETAIL_WHOLESALE_DISCOUNT;
      }

      items.push({ name, quantity: amount, unitPrice: price * mult, costHr: amount * price * mult });
    });
    return items;
  };

  const computeOutputRevenue = (
    outputs: { resources: Record<string, number>; products: Record<string, number> }
  ) => {
    const items: Array<{ name: string; quantity: number; unitPrice: number; revenueHr: number }> = [];
    Object.entries(outputs.resources || {}).forEach(([name, amount]) => {
      const price = commodityPrices?.[name]?.currentPrice ?? 0;
      items.push({ name, quantity: amount, unitPrice: price, revenueHr: amount * price });
    });
    Object.entries(outputs.products || {}).forEach(([name, amount]) => {
      const price = productPrices?.[name]?.currentPrice ?? PRODUCT_BASE_PRICES[name] ?? 0;
      items.push({ name, quantity: amount, unitPrice: price, revenueHr: amount * price });
    });
    return items;
  };

  // Calculate extraction revenue if commodity prices available
  const getExtractionRevenue = () => {
    if (!extractableResources || extractableResources.length === 0 || !commodityPrices) {
      return UNIT_ECONOMICS.extraction.baseRevenue;
    }
    const resource = extractableResources[0];
    if (commodityPrices[resource]) {
      return commodityPrices[resource].currentPrice * EXTRACTION_OUTPUT_RATE;
    }
    return UNIT_ECONOMICS.extraction.baseRevenue;
  };

  const extractionRevenue = getExtractionRevenue();

  const retailFlow = formatFlowTotals(unitFlows?.retail, units.retail);
  const productionFlow = formatFlowTotals(productionFlowRaw || undefined, units.production);
  const serviceFlow = formatFlowTotals(unitFlows?.service, units.service);
  const extractionFlow = formatFlowTotals(unitFlows?.extraction, units.extraction || 0);

  // Retail dynamic economics
  const retailInputItems = computeInputCosts({
    resources: Object.fromEntries((retailFlow?.inputs.resources || []).map(i => [i.name, i.perUnit])),
    products: Object.fromEntries((retailFlow?.inputs.products || []).map(i => [i.name, i.perUnit]))
  }, null, isDefense);
  
  const retailCostFromFlow = retailInputItems.reduce((sum, it) => sum + it.costHr, 0);
  const retailRevenueFromFlow = (retailFlow?.inputs.products || []).reduce((sum, p) => {
    const price = productPrices?.[p.name]?.currentPrice ?? PRODUCT_BASE_PRICES[p.name] ?? 0;
    const revMult = isDefense && p.name !== 'Electricity' ? DEFENSE_REVENUE_MULTIPLIER : 1.0;
    
    if (isDefense && p.name !== 'Electricity') {
      // Defense revenue is 1.0x wholesale cost (cost is price * perUnit * 0.8)
      return sum + (price * p.perUnit * DEFENSE_WHOLESALE_DISCOUNT * revMult);
    }
    // Normal retail revenue is based on market price (simplified here to match parent)
    return sum + (price * p.perUnit);
  }, 0);

  const retailRevenueHr = retailRevenueFromFlow || UNIT_ECONOMICS.retail.baseRevenue;
  const retailCostHr = (retailCostFromFlow || UNIT_ECONOMICS.retail.baseCost) / Math.max(1, stateGrowthFactor);
  const retailProfit = retailRevenueHr - retailCostHr;

  // Service dynamic economics
  const serviceInputItems = computeInputCosts({
    resources: Object.fromEntries((serviceFlow?.inputs.resources || []).map(i => [i.name, i.perUnit])),
    products: Object.fromEntries((serviceFlow?.inputs.products || []).map(i => [i.name, i.perUnit]))
  }, null, isDefense);

  const serviceCostFromFlow = serviceInputItems.reduce((sum, it) => sum + it.costHr, 0);
  const serviceRevenueFromFlow = (serviceFlow?.inputs.products || []).reduce((sum, p) => {
    const price = productPrices?.[p.name]?.currentPrice ?? PRODUCT_BASE_PRICES[p.name] ?? 0;
    const revMult = isDefense && p.name !== 'Electricity' ? DEFENSE_REVENUE_MULTIPLIER : 1.0;

    if (isDefense && p.name !== 'Electricity') {
      // Defense revenue is 1.0x wholesale cost (cost is price * perUnit * 0.8)
      return sum + (price * p.perUnit * DEFENSE_WHOLESALE_DISCOUNT * revMult);
    }
    return sum + (price * p.perUnit);
  }, 0);

  const serviceRevenueHr = serviceRevenueFromFlow || UNIT_ECONOMICS.service.baseRevenue;
  const serviceCostHr = (serviceCostFromFlow || UNIT_ECONOMICS.service.baseCost) / Math.max(1, stateGrowthFactor);
  const serviceProfit = serviceRevenueHr - serviceCostHr;

  const productionOutputRate = producedProduct
    ? productionFlowRaw?.outputs.products?.[producedProduct] ?? PRODUCTION_OUTPUT_RATE
    : PRODUCTION_OUTPUT_RATE;
  const productionProductPrice = producedProduct
    ? productPrices?.[producedProduct]?.currentPrice ??
      PRODUCT_BASE_PRICES[producedProduct] ??
      UNIT_ECONOMICS.production.baseRevenue
    : 0;
  const productionProductBase = producedProduct
    ? productPrices?.[producedProduct]?.referenceValue ?? PRODUCT_BASE_PRICES[producedProduct] ?? 0
    : 0;

  let productionRevenue = UNIT_ECONOMICS.production.baseRevenue;
  let productionCost = UNIT_ECONOMICS.production.baseCost;

  if (producedProduct) {
    productionRevenue = productionProductBase + (productionProductPrice * productionOutputRate);
    productionCost = PRODUCTION_LABOR_COST;

    const resourceInputs = productionFlowRaw?.inputs.resources || {};
    Object.entries(resourceInputs).forEach(([resource, amount]) => {
      const price = commodityPrices?.[resource]?.currentPrice ?? 0;
      productionCost += amount * price;
    });

    const productInputs = productionFlowRaw?.inputs.products || { Electricity: PRODUCTION_ELECTRICITY_CONSUMPTION };
    Object.entries(productInputs).forEach(([product, amount]) => {
      const price = productPrices?.[product]?.currentPrice ?? PRODUCT_BASE_PRICES[product] ?? 0;
      const costMultiplier = producedProduct === 'Electricity' && product === 'Electricity' ? 0.1 : 1;
      productionCost += amount * price * costMultiplier;
    });
  }

  const productionProfit = productionRevenue - productionCost;
  const productionIsDynamic = Boolean(producedProduct);

  const extractionInputItemsCalc = computeInputCosts({
    resources: Object.fromEntries((extractionFlow?.inputs.resources || []).map(i => [i.name, i.perUnit])),
    products: Object.fromEntries((extractionFlow?.inputs.products || []).map(i => [i.name, i.perUnit]))
  });
  const extractionSupplyCost = extractionInputItemsCalc.reduce((s, it) => s + it.costHr, 0);
  const extractionCost = UNIT_ECONOMICS.extraction.baseCost + extractionSupplyCost;
  const extractionBasePrice = extractableResources && extractableResources.length > 0
    ? commodityPrices?.[extractableResources[0]]?.basePrice ?? 0
    : 0;
  const extractionRevenueWithBase = extractionBasePrice + extractionRevenue;
  const extractionProfit = extractionRevenueWithBase - extractionCost;
  const extractionUnitCost = extractionCost / EXTRACTION_OUTPUT_RATE;

  const renderFlowBadges = (flow: ReturnType<typeof formatFlowTotals>) => {
    if (!flow) return null;

    const inputs = [
      ...flow.inputs.resources.map((i) => ({ name: i.name, perUnit: i.perUnit })),
      ...flow.inputs.products.map((i) => ({ name: i.name, perUnit: i.perUnit })),
    ];
    const outputs = [
      ...flow.outputs.resources.map((i) => ({ name: i.name, perUnit: i.perUnit })),
      ...flow.outputs.products.map((i) => ({ name: i.name, perUnit: i.perUnit })),
    ];

    const maxBadges = 3;
    const inputsToShow = inputs.slice(0, maxBadges);
    const outputsToShow = outputs.slice(0, maxBadges);
    const inputRemainder = Math.max(0, inputs.length - inputsToShow.length);
    const outputRemainder = Math.max(0, outputs.length - outputsToShow.length);

    return (
      <div className="mt-2 flex flex-wrap gap-1">
        {inputsToShow.map((b) => (
          <Chip
            key={`in-${b.name}`}
            size="sm"
            variant="flat"
            color="warning"
            className="text-[10px] h-5"
          >
            {b.name} {formatRate(b.perUnit)}/u/hr
          </Chip>
        ))}
        {inputRemainder > 0 && (
          <Chip size="sm" variant="flat" color="warning" className="text-[10px] h-5 opacity-70">
            +{inputRemainder} in
          </Chip>
        )}
        {outputsToShow.map((b) => (
          <Chip
            key={`out-${b.name}`}
            size="sm"
            variant="flat"
            color="success"
            className="text-[10px] h-5"
          >
            {b.name} {formatRate(b.perUnit)}/u/hr
          </Chip>
        ))}
        {outputRemainder > 0 && (
          <Chip size="sm" variant="flat" color="success" className="text-[10px] h-5 opacity-70">
            +{outputRemainder} out
          </Chip>
        )}
      </div>
    );
  };

  return (
    <Card className="w-full bg-background/60 dark:bg-default-50/50 backdrop-blur-sm border-default-200" shadow="sm">
      <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 pb-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-foreground text-lg">{sectorType}</h3>
            {canExtract && (
              <Chip size="sm" variant="flat" color="warning" className="text-[10px] h-5 gap-1 pl-1">
                <Pickaxe className="w-3 h-3" />
                Extraction
              </Chip>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-default-500">
            <span>Entered {new Date(enteredDate).toLocaleDateString()}</span>
            <span className="hidden sm:inline">•</span>
            <span className={`font-mono ${
              isAtCapacity ? 'text-danger' :
              isNearCapacity ? 'text-warning' :
              'text-default-500'
            }`}>
              {totalUnits}/{stateCapacity} units
            </span>
            {isAtCapacity && (
              <Chip size="sm" color="danger" variant="flat" className="text-[10px] h-5">
                AT CAPACITY
              </Chip>
            )}
            {corporation && (
              <>
                <span className="hidden sm:inline">•</span>
                <Link
                  href={`/corporation/${corporation.id}`}
                  className="flex items-center gap-1 hover:text-primary transition-colors"
                >
                  {corporation.logo ? (
                    <img
                      src={corporation.logo}
                      alt={corporation.name}
                      className="w-4 h-4 rounded object-cover"
                      onError={(e) => { e.currentTarget.src = '/defaultpfp.jpg'; }}
                    />
                  ) : (
                    <Building2 className="w-4 h-4" />
                  )}
                  <span className="truncate max-w-[120px] sm:max-w-none">{corporation.name}</span>
                </Link>
              </>
            )}
            <span className="hidden sm:inline">•</span>
            <Link
              href={`/states/${stateCode}`}
              className="flex items-center gap-1 hover:text-primary transition-colors"
            >
              <MapPin className="w-3 h-3" />
              {stateName}
            </Link>
          </div>
        </div>
        {revenue !== undefined && profit !== undefined && (
          <div className="flex items-center gap-3 sm:gap-4 flex-shrink-0">
            <div className="text-right group relative">
              <p className="text-sm font-bold text-success font-mono">
                {formatCurrency(revenue)}
              </p>
              <p className="text-[10px] sm:text-xs text-default-500">revenue/96h</p>
            </div>
            <div className="text-right group relative">
              <p className={`text-sm font-bold font-mono ${profit >= 0 ? 'text-success' : 'text-danger'}`}>
                {formatCurrency(profit)}
              </p>
              <p className="text-[10px] sm:text-xs text-default-500">profit/96h</p>
            </div>
          </div>
        )}
      </CardHeader>

      <Divider />

      <CardBody>
        <div className={`grid gap-2 sm:gap-3 ${
          [showRetail, showProduction, showService, showExtraction].filter(Boolean).length === 4
            ? 'grid-cols-2 lg:grid-cols-4' :
          [showRetail, showProduction, showService, showExtraction].filter(Boolean).length === 3
            ? 'grid-cols-1 sm:grid-cols-3' :
          [showRetail, showProduction, showService, showExtraction].filter(Boolean).length === 2
            ? 'grid-cols-2' :
          'grid-cols-1'
        }`}>
          {/* Retail */}
          {showRetail && (
            <Card shadow="none" className="border border-default-200 bg-transparent h-full">
              <CardBody className="p-3">
                <div className="flex items-center gap-2 mb-2">
                  <Store className="h-4 w-4 text-pink-500" />
                  <span className="text-sm font-medium text-foreground">Retail</span>
                </div>
                <p className="text-2xl font-bold text-foreground">{units.retail}</p>
                <div className="group relative inline-block mb-2">
                  <p className="text-xs text-success cursor-help">
                    +{formatCurrency(calculateUnitProfit('retail') * units.retail)}/96hr
                  </p>
                  <Tooltip
                    content={
                      <FinancialTooltip
                        title="Retail Financials"
                        revenueHr={retailRevenueHr}
                        costHr={retailCostHr}
                        profitHr={retailProfit}
                        outputSoldUnits={Math.round((retailFlow?.inputs.products || []).reduce((s, p) => s + p.total, 0))}
                        costItems={retailInputItems}
                        note={isDefense ? 'Defense sector: 0.8x wholesale price' : `Growth factor: ${stateGrowthFactor.toFixed(2)}x`}
                      />
                    }
                  >
                     <span className="absolute inset-0" />
                  </Tooltip>
                </div>
                {showActions && (
                  <div className="mt-auto flex gap-1">
                    {onBuildUnit && (
                      <Button
                        size="sm"
                        color="primary"
                        variant="flat"
                        className="flex-1 text-xs font-medium h-7 min-h-0"
                        onPress={() => onBuildUnit('retail')}
                        isDisabled={building === 'retail' || !canBuild || isAtCapacity}
                        isLoading={building === 'retail'}
                      >
                        {isAtCapacity ? 'Full' : `+1 (${formatCurrency(buildCost)})`}
                      </Button>
                    )}
                    {onAbandonUnit && units.retail > 0 && (
                      <Button
                        size="sm"
                        color="danger"
                        variant="light"
                        isIconOnly
                        className="h-7 w-7 min-w-7 min-h-0"
                        onPress={() => onAbandonUnit('retail')}
                        isDisabled={abandoningUnit === 'retail'}
                        isLoading={abandoningUnit === 'retail'}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                )}
              </CardBody>
            </Card>
          )}

          {/* Production */}
          {showProduction && (
            <Card shadow="none" className="border border-default-200 bg-transparent h-full">
              <CardBody className="p-3">
                <div className="flex items-center gap-2 mb-2">
                  <Factory className="h-4 w-4 text-orange-500" />
                  <span className="text-sm font-medium text-foreground">Production</span>
                </div>
                <p className="text-2xl font-bold text-foreground">{units.production}</p>
                <div className="group relative inline-block mb-2">
                  <p className="text-xs text-success cursor-help">
                    +{formatCurrency(calculateUnitProfit('production') * units.production)}/96hr
                  </p>
                  <Tooltip
                    content={
                      <FinancialTooltip
                        title="Production Financials"
                        revenueHr={productionRevenue}
                        costHr={productionCost}
                        profitHr={productionProfit}
                        outputSoldUnits={Math.round(((productionFlow?.outputs.products || []).reduce((s, p) => s + p.total, 0) + (productionFlow?.outputs.resources || []).reduce((s, r) => s + r.total, 0)))}
                        outputItems={computeOutputRevenue({
                          resources: Object.fromEntries((productionFlow?.outputs.resources || []).map(i => [i.name, i.perUnit])),
                          products: Object.fromEntries((productionFlow?.outputs.products || []).map(i => [i.name, i.perUnit]))
                        })}
                        costItems={[
                          ...computeInputCosts({
                            resources: Object.fromEntries((productionFlow?.inputs.resources || []).map(i => [i.name, i.perUnit])),
                            products: Object.fromEntries((productionFlow?.inputs.products || []).map(i => [i.name, i.perUnit]))
                          }, producedProduct),
                          { name: 'Labor/Operations', quantity: 1, unitPrice: PRODUCTION_LABOR_COST, costHr: PRODUCTION_LABOR_COST },
                        ]}
                      />
                    }
                  >
                    <span className="absolute inset-0" />
                  </Tooltip>
                </div>
                {showActions && (
                  <div className="mt-auto flex gap-1">
                    {onBuildUnit && (
                      <Button
                        size="sm"
                        color="primary"
                        variant="flat"
                        className="flex-1 text-xs font-medium h-7 min-h-0"
                        onPress={() => onBuildUnit('production')}
                        isDisabled={building === 'production' || !canBuild || isAtCapacity}
                        isLoading={building === 'production'}
                      >
                        {isAtCapacity ? 'Full' : `+1 (${formatCurrency(buildCost)})`}
                      </Button>
                    )}
                    {onAbandonUnit && units.production > 0 && (
                      <Button
                        size="sm"
                        color="danger"
                        variant="light"
                        isIconOnly
                        className="h-7 w-7 min-w-7 min-h-0"
                        onPress={() => onAbandonUnit('production')}
                        isDisabled={abandoningUnit === 'production'}
                        isLoading={abandoningUnit === 'production'}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                )}
              </CardBody>
            </Card>
          )}

          {/* Service */}
          {showService && (
            <Card shadow="none" className="border border-default-200 bg-transparent h-full">
              <CardBody className="p-3">
                <div className="flex items-center gap-2 mb-2">
                  <Briefcase className="h-4 w-4 text-blue-500" />
                  <span className="text-sm font-medium text-foreground">Service</span>
                </div>
                <p className="text-2xl font-bold text-foreground">{units.service}</p>
                <div className="group relative inline-block mb-2">
                  <p className="text-xs text-success cursor-help">
                    +{formatCurrency(calculateUnitProfit('service') * units.service)}/96hr
                  </p>
                  <Tooltip
                    content={
                      <FinancialTooltip
                        title="Service Financials"
                        revenueHr={serviceRevenueHr}
                        costHr={serviceCostHr}
                        profitHr={serviceProfit}
                        outputSoldUnits={Math.round((serviceFlow?.inputs.products || []).reduce((s, p) => s + p.total, 0))}
                        costItems={serviceInputItems}
                        note={isDefense ? 'Defense sector: 0.8x wholesale price' : `Growth factor: ${stateGrowthFactor.toFixed(2)}x`}
                      />
                    }
                  >
                    <span className="absolute inset-0" />
                  </Tooltip>
                </div>
                {showActions && (
                  <div className="mt-auto flex gap-1">
                    {onBuildUnit && (
                      <Button
                        size="sm"
                        color="primary"
                        variant="flat"
                        className="flex-1 text-xs font-medium h-7 min-h-0"
                        onPress={() => onBuildUnit('service')}
                        isDisabled={building === 'service' || !canBuild || isAtCapacity}
                        isLoading={building === 'service'}
                      >
                        {isAtCapacity ? 'Full' : `+1 (${formatCurrency(buildCost)})`}
                      </Button>
                    )}
                    {onAbandonUnit && units.service > 0 && (
                      <Button
                        size="sm"
                        color="danger"
                        variant="light"
                        isIconOnly
                        className="h-7 w-7 min-w-7 min-h-0"
                        onPress={() => onAbandonUnit('service')}
                        isDisabled={abandoningUnit === 'service'}
                        isLoading={abandoningUnit === 'service'}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                )}
              </CardBody>
            </Card>
          )}

          {/* Extraction */}
          {showExtraction && (
            <Card shadow="none" className="border border-default-200 bg-transparent h-full">
              <CardBody className="p-3">
                <div className="flex items-center gap-2 mb-2">
                  <Pickaxe className="h-4 w-4 text-amber-500" />
                  <span className="text-sm font-medium text-foreground">Extraction</span>
                </div>
                <p className="text-2xl font-bold text-foreground">{units.extraction || 0}</p>
                <div className="group relative inline-block mb-2">
                  <p className="text-xs text-success cursor-help">
                    +{formatCurrency(calculateUnitProfit('extraction') * (units.extraction || 0))}/96hr
                  </p>
                  <Tooltip
                    content={
                      <FinancialTooltip
                        title="Extraction Financials"
                        revenueHr={extractionRevenueWithBase}
                        costHr={extractionCost}
                        profitHr={extractionProfit}
                        outputSoldUnits={Math.round((extractionFlow?.outputs.resources || []).reduce((s, r) => s + r.total, 0))}
                        outputItems={computeOutputRevenue({
                          resources: Object.fromEntries((extractionFlow?.outputs.resources || []).map(i => [i.name, i.perUnit])),
                          products: {}
                        })}
                        costItems={[
                          ...computeInputCosts({
                            resources: Object.fromEntries((extractionFlow?.inputs.resources || []).map(i => [i.name, i.perUnit])),
                            products: Object.fromEntries((extractionFlow?.inputs.products || []).map(i => [i.name, i.perUnit]))
                          }),
                          { name: 'Labor', quantity: 1, unitPrice: UNIT_ECONOMICS.extraction.baseCost, costHr: UNIT_ECONOMICS.extraction.baseCost },
                        ]}
                      />
                    }
                  >
                    <span className="absolute inset-0" />
                  </Tooltip>
                </div>
                {showActions && (
                  <div className="mt-auto flex gap-1">
                    {onBuildUnit && (
                      <Button
                        size="sm"
                        color="primary"
                        variant="flat"
                        className="flex-1 text-xs font-medium h-7 min-h-0"
                        onPress={() => onBuildUnit('extraction')}
                        isDisabled={building === 'extraction' || !canBuild || isAtCapacity}
                        isLoading={building === 'extraction'}
                      >
                        {isAtCapacity ? 'Full' : `+1 (${formatCurrency(buildCost)})`}
                      </Button>
                    )}
                    {onAbandonUnit && (units.extraction || 0) > 0 && (
                      <Button
                        size="sm"
                        color="danger"
                        variant="light"
                        isIconOnly
                        className="h-7 w-7 min-w-7 min-h-0"
                        onPress={() => onAbandonUnit('extraction')}
                        isDisabled={abandoningUnit === 'extraction'}
                        isLoading={abandoningUnit === 'extraction'}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                )}
              </CardBody>
            </Card>
          )}
        </div>

        {(retailFlow || productionFlow || serviceFlow || extractionFlow) && (
          <div className="mt-3 space-y-2">
            {units.retail > 0 && retailFlow && (
              <div>
                <p className="text-xs text-default-500">Retail flows</p>
                {renderFlowBadges(retailFlow)}
              </div>
            )}
            {units.production > 0 && productionFlow && (
              <div>
                <p className="text-xs text-default-500">Production flows</p>
                {renderFlowBadges(productionFlow)}
              </div>
            )}
            {units.service > 0 && serviceFlow && (
              <div>
                <p className="text-xs text-default-500">Service flows</p>
                {renderFlowBadges(serviceFlow)}
              </div>
            )}
            {canExtract && (units.extraction || 0) > 0 && extractionFlow && (
              <div>
                <p className="text-xs text-default-500">Extraction flows</p>
                {renderFlowBadges(extractionFlow)}
              </div>
            )}
          </div>
        )}
      </CardBody>
      <CardFooter>
      </CardFooter>
    </Card>
  );
}
