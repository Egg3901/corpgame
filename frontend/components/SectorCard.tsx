'use client';

import { Store, Factory, Briefcase, Pickaxe, Building2, Trash2, MapPin } from 'lucide-react';
import TooltipPanel from './TooltipPanel';
import Link from 'next/link';
import type { MarketUnitFlow } from '@/lib/api';

interface SectorCardProps {
  sectorType: string;
  stateCode: string;
  stateName: string;
  stateMultiplier: number;
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
  onAbandon?: () => void;
  onBuildUnit?: (unitType: 'retail' | 'production' | 'service' | 'extraction') => void;
  abandoning?: boolean;
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
  commodityPrices?: Record<string, { currentPrice: number }>;
  productPrices?: Record<string, { currentPrice: number }>;
  EXTRACTION_OUTPUT_RATE?: number;
  unitFlows?: Record<'retail' | 'production' | 'service' | 'extraction', MarketUnitFlow>;
}

export default function SectorCard({
  sectorType,
  stateCode,
  stateName,
  stateMultiplier,
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
  onAbandon,
  onBuildUnit,
  abandoning = false,
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
}: SectorCardProps) {
  const PRODUCT_BASE_PRICES: Record<string, number> = {
    'Technology Products': 5000,
    'Manufactured Goods': 1500,
    'Electricity': 200,
    'Food Products': 500,
    'Construction Capacity': 2500,
    'Pharmaceutical Products': 8000,
    'Defense Equipment': 15000,
    'Logistics Capacity': 1000,
  };

  const PRODUCTION_LABOR_COST = 400;
  const PRODUCTION_RESOURCE_CONSUMPTION = 0.5;
  const PRODUCTION_ELECTRICITY_CONSUMPTION = 0.5;
  const PRODUCTION_PRODUCT_CONSUMPTION = 0.5;
  const PRODUCTION_OUTPUT_RATE = 1.0;

  const totalUnits = units.retail + units.production + units.service + units.extraction;

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
  const extractionProfit = extractionRevenue - UNIT_ECONOMICS.extraction.baseCost;
  const retailProfit = UNIT_ECONOMICS.retail.baseRevenue - UNIT_ECONOMICS.retail.baseCost;
  const serviceProfit = UNIT_ECONOMICS.service.baseRevenue - UNIT_ECONOMICS.service.baseCost;

  const productionOutputRate = producedProduct
    ? productionFlowRaw?.outputs.products?.[producedProduct] ?? PRODUCTION_OUTPUT_RATE
    : PRODUCTION_OUTPUT_RATE;
  const productionProductPrice = producedProduct
    ? productPrices?.[producedProduct]?.currentPrice ??
      PRODUCT_BASE_PRICES[producedProduct] ??
      UNIT_ECONOMICS.production.baseRevenue
    : 0;

  let productionRevenue = UNIT_ECONOMICS.production.baseRevenue;
  let productionCost = UNIT_ECONOMICS.production.baseCost;

  if (producedProduct) {
    productionRevenue = productionProductPrice * productionOutputRate;
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

  const retailFlow = formatFlowTotals(unitFlows?.retail, units.retail);
  const productionFlow = formatFlowTotals(productionFlowRaw || undefined, units.production);
  const serviceFlow = formatFlowTotals(unitFlows?.service, units.service);
  const extractionFlow = formatFlowTotals(unitFlows?.extraction, units.extraction || 0);

  const renderFlowBadges = (flow: ReturnType<typeof formatFlowTotals>) => {
    if (!flow) return null;

    const inputBadges = [
      ...flow.inputs.resources.map((i) => ({ name: i.name, perUnit: i.perUnit, kind: 'input' as const })),
      ...flow.inputs.products.map((i) => ({ name: i.name, perUnit: i.perUnit, kind: 'input' as const })),
    ];
    const outputBadges = [
      ...flow.outputs.resources.map((i) => ({ name: i.name, perUnit: i.perUnit, kind: 'output' as const })),
      ...flow.outputs.products.map((i) => ({ name: i.name, perUnit: i.perUnit, kind: 'output' as const })),
    ];

    const maxBadges = 3;
    const inputsToShow = inputBadges.slice(0, maxBadges);
    const outputsToShow = outputBadges.slice(0, maxBadges);
    const inputRemainder = Math.max(0, inputBadges.length - inputsToShow.length);
    const outputRemainder = Math.max(0, outputBadges.length - outputsToShow.length);

    if (inputsToShow.length === 0 && outputsToShow.length === 0) return null;

    return (
      <div className="mt-2 flex flex-wrap gap-1">
        {inputsToShow.map((b) => (
          <span
            key={`in-${b.name}`}
            className="px-2 py-0.5 rounded-full text-[10px] bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200"
          >
            {b.name} {formatRate(b.perUnit)}/u/hr
          </span>
        ))}
        {inputRemainder > 0 && (
          <span className="px-2 py-0.5 rounded-full text-[10px] bg-amber-50 dark:bg-amber-900/10 text-amber-700 dark:text-amber-300">
            +{inputRemainder} in
          </span>
        )}
        {outputsToShow.map((b) => (
          <span
            key={`out-${b.name}`}
            className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-200"
          >
            {b.name} {formatRate(b.perUnit)}/u/hr
          </span>
        ))}
        {outputRemainder > 0 && (
          <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-50 dark:bg-emerald-900/10 text-emerald-700 dark:text-emerald-300">
            +{outputRemainder} out
          </span>
        )}
      </div>
    );
  };

  const formatCurrency2 = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const computeInputCosts = (
    inputs: { resources: Record<string, number>; products: Record<string, number> },
    producedProductContext?: string | null
  ) => {
    const items: Array<{ name: string; amount: number; price: number; costHr: number }> = [];
    Object.entries(inputs.resources || {}).forEach(([name, amount]) => {
      const price = commodityPrices?.[name]?.currentPrice ?? 0;
      items.push({ name, amount, price, costHr: amount * price });
    });
    Object.entries(inputs.products || {}).forEach(([name, amount]) => {
      const price = productPrices?.[name]?.currentPrice ?? PRODUCT_BASE_PRICES[name] ?? 0;
      const mult = producedProductContext === 'Electricity' && name === 'Electricity' ? 0.1 : 1;
      items.push({ name, amount, price, costHr: amount * price * mult });
    });
    return items;
  };

  const renderProductionFlowBadges = (flow: ReturnType<typeof formatFlowTotals>) => {
    if (!flow) return null;

    const inputs = [
      ...flow.inputs.resources.map((i) => ({ name: i.name, perUnit: i.perUnit })),
      ...flow.inputs.products.map((i) => ({ name: i.name, perUnit: i.perUnit })),
    ];
    const outputs = [
      ...flow.outputs.resources.map((i) => ({ name: i.name, perUnit: i.perUnit })),
      ...flow.outputs.products.map((i) => ({ name: i.name, perUnit: i.perUnit })),
    ];

    const unitsDemanded = Math.round(flow.inputs.products.reduce((sum, p) => sum + p.total, 0));
    const unitsProduced = Math.round(flow.outputs.products.reduce((sum, p) => sum + p.total, 0));

    const maxBadges = 3;
    const inputsToShow = inputs.slice(0, maxBadges);
    const outputsToShow = outputs.slice(0, maxBadges);
    const inputRemainder = Math.max(0, inputs.length - inputsToShow.length);
    const outputRemainder = Math.max(0, outputs.length - outputsToShow.length);

    return (
      <div className="mt-2 flex flex-wrap gap-1">
        {inputsToShow.map((b) => (
          <div key={`in-${b.name}`} className="relative group">
            <span
              tabIndex={0}
              className="px-2 py-0.5 rounded-full text-[10px] bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200 focus:outline-none"
            >
              {b.name} {formatRate(b.perUnit)}/u/hr
            </span>
            <div className="pointer-events-none absolute left-1/2 -translate-x-1/2 bottom-full mb-2 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-200 z-50">
              <div className="rounded-md px-3 py-2 text-xs shadow-xl border border-gray-700 bg-gray-900 text-white min-w-[120px] text-right font-mono">
                <p>{formatCurrency2(productionRevenue)}</p>
                <p>{formatCurrency2(productionCost)}</p>
                <p>{unitsDemanded}</p>
                <p>{unitsProduced}</p>
              </div>
            </div>
          </div>
        ))}
        {inputRemainder > 0 && (
          <span className="px-2 py-0.5 rounded-full text-[10px] bg-amber-50 dark:bg-amber-900/10 text-amber-700 dark:text-amber-300">
            +{inputRemainder} in
          </span>
        )}
        {outputsToShow.map((b) => (
          <div key={`out-${b.name}`} className="relative group">
            <span
              tabIndex={0}
              className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-200 focus:outline-none"
            >
              {b.name} {formatRate(b.perUnit)}/u/hr
            </span>
            <div className="pointer-events-none absolute left-1/2 -translate-x-1/2 bottom-full mb-2 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-200 z-50">
              <div className="rounded-md px-3 py-2 text-xs shadow-xl border border-gray-700 bg-gray-900 text-white min-w-[120px] text-right font-mono">
                <p>{formatCurrency2(productionRevenue)}</p>
                <p>{formatCurrency2(productionCost)}</p>
                <p>{unitsDemanded}</p>
                <p>{unitsProduced}</p>
              </div>
            </div>
          </div>
        ))}
        {outputRemainder > 0 && (
          <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-50 dark:bg-emerald-900/10 text-emerald-700 dark:text-emerald-300">
            +{outputRemainder} out
          </span>
        )}
      </div>
    );
  };

  return (
    <div className="rounded-xl border border-white/60 bg-white/70 dark:border-gray-800/70 dark:bg-gray-800/60 p-4 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-gray-900 dark:text-white">{sectorType}</h3>
            {canExtract && (
              <span className="text-xs font-normal text-amber-600 dark:text-amber-400 flex items-center gap-1">
                <Pickaxe className="w-3 h-3" />
                Extraction
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
            <span>Entered {new Date(enteredDate).toLocaleDateString()}</span>
            <span>•</span>
            <span>{totalUnits} units</span>
            {corporation && (
              <>
                <span>•</span>
                <Link
                  href={`/corporation/${corporation.id}`}
                  className="flex items-center gap-1 hover:text-corporate-blue dark:hover:text-corporate-blue-light transition-colors"
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
                  <span>{corporation.name}</span>
                </Link>
              </>
            )}
            <span>•</span>
            <Link
              href={`/states/${stateCode}`}
              className="flex items-center gap-1 hover:text-corporate-blue dark:hover:text-corporate-blue-light transition-colors"
            >
              <MapPin className="w-3 h-3" />
              {stateName}
            </Link>
          </div>
        </div>
        {showActions && onAbandon && (
          <button
            onClick={onAbandon}
            disabled={abandoning}
            className="px-3 py-1.5 text-xs bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1 flex-shrink-0"
          >
            {abandoning ? (
              'Abandoning...'
            ) : (
              <>
                <Trash2 className="w-3 h-3" />
                Abandon
              </>
            )}
          </button>
        )}
        {revenue !== undefined && profit !== undefined && (
          <div className="flex items-center gap-4 flex-shrink-0">
            <div className="text-right group relative">
              <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                {formatCurrency(revenue)}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">revenue/96h</p>
            </div>
            <div className="text-right group relative">
              <p className={`text-sm font-bold font-mono ${profit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                {formatCurrency(profit)}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">profit/96h</p>
            </div>
          </div>
        )}
      </div>

      {/* Unit Types - Always 4 columns */}
      <div className="grid grid-cols-4 gap-3">
        {/* Retail */}
        <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-3 group relative">
          <div className="flex items-center gap-2 mb-2">
            <Store className="h-4 w-4 text-pink-500" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Retail</span>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{units.retail}</p>
          <p className="text-xs text-emerald-600 dark:text-emerald-400">
            +{formatCurrency(calculateUnitProfit('retail') * units.retail)}/96hr
          </p>
          {showActions && onBuildUnit && (
            <button
              onClick={() => onBuildUnit('retail')}
              disabled={building === 'retail' || !canBuild}
              className="mt-2 w-full px-2 py-1 text-xs bg-pink-500 text-white rounded hover:bg-pink-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {building === 'retail' ? '...' : `+1 (${formatCurrency(buildCost)})`}
            </button>
          )}
          <TooltipPanel>
            <div className="space-y-2">
              <p className="font-medium">Retail Unit Economics</p>
              <p>Revenue: {formatCurrency(UNIT_ECONOMICS.retail.baseRevenue)}/hr</p>
              <p>Cost: {formatCurrency(UNIT_ECONOMICS.retail.baseCost)}/hr</p>
              <p className="text-emerald-400">Profit: {formatCurrency(retailProfit)}/hr</p>
              {retailFlow && (retailFlow.inputs.products.length > 0 || retailFlow.inputs.resources.length > 0) && (
                <div className="mt-2 grid md:grid-cols-2 gap-3">
                  <div>
                    <p className="text-gray-200 mb-1">Consumes</p>
                    {retailFlow.inputs.resources.map((r) => (
                      <p key={`retail-in-r-${r.name}`} className="text-amber-300">
                        {r.name}: {formatRate(r.perUnit)}/u/hr ({formatRate(r.total)}/hr)
                      </p>
                    ))}
                    {retailFlow.inputs.products.map((p) => (
                      <p key={`retail-in-p-${p.name}`} className="text-amber-300">
                        {p.name}: {formatRate(p.perUnit)}/u/hr ({formatRate(p.total)}/hr)
                      </p>
                    ))}
                  </div>
                  <div>
                    <p className="text-gray-200 mb-1">Input Costs</p>
                    {computeInputCosts({ resources: Object.fromEntries(retailFlow.inputs.resources.map(i => [i.name, i.perUnit])), products: Object.fromEntries(retailFlow.inputs.products.map(i => [i.name, i.perUnit])) }).map((it) => (
                      <div key={`retail-cost-${it.name}`} className="flex justify-between">
                        <span className="text-gray-300">{it.name}</span>
                        <span className="font-mono text-red-300">{formatCurrency2(it.costHr)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <p className="text-gray-400 text-[10px] mt-1">Revenue is flat (no state multiplier)</p>
            </div>
          </TooltipPanel>
        </div>

        {/* Production */}
        <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-3 group relative">
          <div className="flex items-center gap-2 mb-2">
            <Factory className="h-4 w-4 text-orange-500" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Production</span>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{units.production}</p>
          <p className="text-xs text-emerald-600 dark:text-emerald-400">
            +{formatCurrency(calculateUnitProfit('production') * units.production)}/96hr
          </p>
          {showActions && onBuildUnit && (
            <button
              onClick={() => onBuildUnit('production')}
              disabled={building === 'production' || !canBuild}
              className="mt-2 w-full px-2 py-1 text-xs bg-orange-500 text-white rounded hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {building === 'production' ? '...' : `+1 (${formatCurrency(buildCost)})`}
            </button>
          )}
          <TooltipPanel>
            <div className="space-y-2">
              <p className="font-medium">Production Unit Economics</p>
              {productionIsDynamic && producedProduct ? (
                <>
                  <p>
                    Revenue: {productionOutputRate} u/hr @ {formatCurrency(productionProductPrice)}/unit
                  </p>
                  <p className="text-gray-400">= {formatCurrency(productionRevenue)}/hr</p>
                  <p>Cost: {formatCurrency(productionCost)}/hr</p>
                  <p className="text-emerald-400">Profit: {formatCurrency(productionProfit)}/hr</p>
                  <p className="text-emerald-400 mt-1">Produces: {producedProduct}</p>
                  {producedProduct === 'Electricity' && (
                    <p className="text-amber-300 text-[10px]">
                      Electricity input cost uses 0.1x multiplier for generation
                    </p>
                  )}
                  {productionFlow && (productionFlow.inputs.products.length > 0 || productionFlow.inputs.resources.length > 0) && (
                    <div className="mt-2 grid md:grid-cols-2 gap-3">
                      <div>
                        <p className="text-gray-200 mb-1">Consumes</p>
                        {productionFlow.inputs.resources.map((r) => (
                          <p key={`prod-in-r-${r.name}`} className="text-amber-300">
                            {r.name}: {formatRate(r.perUnit)}/u/hr ({formatRate(r.total)}/hr)
                          </p>
                        ))}
                        {productionFlow.inputs.products.map((p) => (
                          <p key={`prod-in-p-${p.name}`} className="text-amber-300">
                            {p.name}: {formatRate(p.perUnit)}/u/hr ({formatRate(p.total)}/hr)
                          </p>
                        ))}
                      </div>
                      <div>
                        <p className="text-gray-200 mb-1">Input Costs</p>
                        {computeInputCosts({ resources: Object.fromEntries(productionFlow.inputs.resources.map(i => [i.name, i.perUnit])), products: Object.fromEntries(productionFlow.inputs.products.map(i => [i.name, i.perUnit])) }, producedProduct).map((it) => (
                          <div key={`prod-cost-${it.name}`} className="flex justify-between">
                            <span className="text-gray-300">{it.name}</span>
                            <span className="font-mono text-red-300">{formatCurrency2(it.costHr)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {productionFlow && (productionFlow.outputs.products.length > 0 || productionFlow.outputs.resources.length > 0) && (
                    <div className="mt-2">
                      <p className="text-gray-200">Produces:</p>
                      {productionFlow.outputs.resources.map((r) => (
                        <p key={`prod-out-r-${r.name}`} className="text-emerald-300">
                          {r.name}: {formatRate(r.perUnit)}/unit/hr ({formatRate(r.total)}/hr)
                        </p>
                      ))}
                      {productionFlow.outputs.products.map((p) => (
                        <p key={`prod-out-p-${p.name}`} className="text-emerald-300">
                          {p.name}: {formatRate(p.perUnit)}/unit/hr ({formatRate(p.total)}/hr)
                        </p>
                      ))}
                    </div>
                  )}
                  <p className="text-gray-400 text-[10px] mt-1">Revenue based on product prices (no state multiplier)</p>
                </>
              ) : (
                <>
                  <p>Revenue: {formatCurrency(UNIT_ECONOMICS.production.baseRevenue)}/hr</p>
                  <p>Cost: {formatCurrency(UNIT_ECONOMICS.production.baseCost)}/hr</p>
                  <p className="text-emerald-400">
                    Profit: {formatCurrency(UNIT_ECONOMICS.production.baseRevenue - UNIT_ECONOMICS.production.baseCost)}/hr
                  </p>
                  {producedProduct && <p className="text-emerald-400 mt-1">Produces: {producedProduct}</p>}
                  {requiredResource && <p className="text-amber-400 mt-1">Requires: {requiredResource}</p>}
                  {productionFlow && (productionFlow.inputs.products.length > 0 || productionFlow.inputs.resources.length > 0) && (
                    <div className="mt-2">
                      <p className="text-gray-200">Consumes:</p>
                      {productionFlow.inputs.resources.map((r) => (
                        <p key={`prod-in-r-${r.name}`} className="text-amber-300">
                          {r.name}: {formatRate(r.perUnit)}/unit/hr ({formatRate(r.total)}/hr)
                        </p>
                      ))}
                      {productionFlow.inputs.products.map((p) => (
                        <p key={`prod-in-p-${p.name}`} className="text-amber-300">
                          {p.name}: {formatRate(p.perUnit)}/unit/hr ({formatRate(p.total)}/hr)
                        </p>
                      ))}
                    </div>
                  )}
                  {productionFlow && (productionFlow.outputs.products.length > 0 || productionFlow.outputs.resources.length > 0) && (
                    <div className="mt-2">
                      <p className="text-gray-200">Produces:</p>
                      {productionFlow.outputs.resources.map((r) => (
                        <p key={`prod-out-r-${r.name}`} className="text-emerald-300">
                          {r.name}: {formatRate(r.perUnit)}/unit/hr ({formatRate(r.total)}/hr)
                        </p>
                      ))}
                      {productionFlow.outputs.products.map((p) => (
                        <p key={`prod-out-p-${p.name}`} className="text-emerald-300">
                          {p.name}: {formatRate(p.perUnit)}/unit/hr ({formatRate(p.total)}/hr)
                        </p>
                      ))}
                    </div>
                  )}
                  <p className="text-gray-400 text-[10px] mt-1">Revenue is flat (no state multiplier)</p>
                </>
              )}
            </div>
          </TooltipPanel>
        </div>

        {/* Service */}
        <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-3 group relative">
          <div className="flex items-center gap-2 mb-2">
            <Briefcase className="h-4 w-4 text-blue-500" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Service</span>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{units.service}</p>
          <p className="text-xs text-emerald-600 dark:text-emerald-400">
            +{formatCurrency(calculateUnitProfit('service') * units.service)}/96hr
          </p>
          {showActions && onBuildUnit && (
            <button
              onClick={() => onBuildUnit('service')}
              disabled={building === 'service' || !canBuild}
              className="mt-2 w-full px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {building === 'service' ? '...' : `+1 (${formatCurrency(buildCost)})`}
            </button>
          )}
          <TooltipPanel>
            <div className="space-y-2">
              <p className="font-medium">Service Unit Economics</p>
              <p>Revenue: {formatCurrency(UNIT_ECONOMICS.service.baseRevenue)}/hr</p>
              <p>Cost: {formatCurrency(UNIT_ECONOMICS.service.baseCost)}/hr</p>
              <p className="text-emerald-400">Profit: {formatCurrency(serviceProfit)}/hr</p>
              {serviceFlow && (serviceFlow.inputs.products.length > 0 || serviceFlow.inputs.resources.length > 0) && (
                <div className="mt-2 grid md:grid-cols-2 gap-3">
                  <div>
                    <p className="text-gray-200 mb-1">Consumes</p>
                    {serviceFlow.inputs.resources.map((r) => (
                      <p key={`svc-in-r-${r.name}`} className="text-amber-300">
                        {r.name}: {formatRate(r.perUnit)}/u/hr ({formatRate(r.total)}/hr)
                      </p>
                    ))}
                    {serviceFlow.inputs.products.map((p) => (
                      <p key={`svc-in-p-${p.name}`} className="text-amber-300">
                        {p.name}: {formatRate(p.perUnit)}/u/hr ({formatRate(p.total)}/hr)
                      </p>
                    ))}
                  </div>
                  <div>
                    <p className="text-gray-200 mb-1">Input Costs</p>
                    {computeInputCosts({ resources: Object.fromEntries(serviceFlow.inputs.resources.map(i => [i.name, i.perUnit])), products: Object.fromEntries(serviceFlow.inputs.products.map(i => [i.name, i.perUnit])) }).map((it) => (
                      <div key={`svc-cost-${it.name}`} className="flex justify-between">
                        <span className="text-gray-300">{it.name}</span>
                        <span className="font-mono text-red-300">{formatCurrency2(it.costHr)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <p className="text-gray-400 text-[10px] mt-1">Revenue is flat (no state multiplier)</p>
            </div>
          </TooltipPanel>
        </div>

        {/* Extraction - frosted if sector doesn't support it */}
        <div className={`rounded-lg border p-3 group relative ${
          canExtract 
            ? 'border-gray-200 dark:border-gray-700' 
            : 'border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/30'
        }`}>
          <div className={`flex items-center gap-2 mb-2 ${!canExtract ? 'opacity-40' : ''}`}>
            <Pickaxe className={`h-4 w-4 ${canExtract ? 'text-amber-500' : 'text-gray-400'}`} />
            <span className={`text-sm font-medium ${canExtract ? 'text-gray-700 dark:text-gray-300' : 'text-gray-400 dark:text-gray-600'}`}>Extraction</span>
          </div>
          {canExtract ? (
            <>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{units.extraction || 0}</p>
              <p className="text-xs text-emerald-600 dark:text-emerald-400">
                +{formatCurrency(calculateUnitProfit('extraction') * (units.extraction || 0))}/96hr
              </p>
              {showActions && onBuildUnit && (
                <button
                  onClick={() => onBuildUnit('extraction')}
                  disabled={building === 'extraction' || !canBuild}
                  className="mt-2 w-full px-2 py-1 text-xs bg-amber-500 text-white rounded hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {building === 'extraction' ? '...' : `+1 (${formatCurrency(buildCost)})`}
                </button>
              )}
            </>
          ) : (
            <>
              <p className="text-2xl font-bold text-gray-300 dark:text-gray-600">—</p>
              <p className="text-xs text-gray-400 dark:text-gray-600">
                Not available
              </p>
              {showActions && (
                <div className="mt-2 w-full px-2 py-1 text-xs text-gray-400 dark:text-gray-600 text-center">
                  Unavailable
                </div>
              )}
            </>
          )}
          <TooltipPanel>
            <div className="space-y-2">
              {canExtract ? (
                <>
                  <p className="font-medium">Extraction Unit Economics</p>
                  {commodityPrices && extractableResources && extractableResources.length > 0 ? (
                    <>
                      <p>Revenue: {EXTRACTION_OUTPUT_RATE} × {formatCurrency(commodityPrices[extractableResources[0]]?.currentPrice || 0)}/unit</p>
                      <p className="text-gray-400">= {formatCurrency(extractionRevenue)}/hr</p>
                    </>
                  ) : (
                    <p>Revenue: ${UNIT_ECONOMICS.extraction.baseRevenue}/hr (base)</p>
                  )}
                  <p>Cost: ${UNIT_ECONOMICS.extraction.baseCost}/hr</p>
                  <p className="text-emerald-400">Profit: ${extractionProfit.toFixed(0)}/hr</p>
                  <p className="text-amber-400 mt-1">Extracts: {extractableResources?.join(', ')}</p>
                  {extractionFlow && (extractionFlow.inputs.products.length > 0 || extractionFlow.inputs.resources.length > 0) && (
                    <div className="mt-2 grid md:grid-cols-2 gap-3">
                      <div>
                        <p className="text-gray-200 mb-1">Consumes</p>
                        {extractionFlow.inputs.resources.map((r) => (
                          <p key={`ext-in-r-${r.name}`} className="text-amber-300">
                            {r.name}: {formatRate(r.perUnit)}/u/hr ({formatRate(r.total)}/hr)
                          </p>
                        ))}
                        {extractionFlow.inputs.products.map((p) => (
                          <p key={`ext-in-p-${p.name}`} className="text-amber-300">
                            {p.name}: {formatRate(p.perUnit)}/u/hr ({formatRate(p.total)}/hr)
                          </p>
                        ))}
                      </div>
                      <div>
                        <p className="text-gray-200 mb-1">Input Costs</p>
                        {computeInputCosts({ resources: Object.fromEntries(extractionFlow.inputs.resources.map(i => [i.name, i.perUnit])), products: Object.fromEntries(extractionFlow.inputs.products.map(i => [i.name, i.perUnit])) }).map((it) => (
                          <div key={`ext-cost-${it.name}`} className="flex justify-between">
                            <span className="text-gray-300">{it.name}</span>
                            <span className="font-mono text-red-300">{formatCurrency2(it.costHr)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {extractionFlow && (extractionFlow.outputs.products.length > 0 || extractionFlow.outputs.resources.length > 0) && (
                    <div className="mt-2">
                      <p className="text-gray-200">Produces:</p>
                      {extractionFlow.outputs.resources.map((r) => (
                        <p key={`ext-out-r-${r.name}`} className="text-emerald-300">
                          {r.name}: {formatRate(r.perUnit)}/unit/hr ({formatRate(r.total)}/hr)
                        </p>
                      ))}
                      {extractionFlow.outputs.products.map((p) => (
                        <p key={`ext-out-p-${p.name}`} className="text-emerald-300">
                          {p.name}: {formatRate(p.perUnit)}/unit/hr ({formatRate(p.total)}/hr)
                        </p>
                      ))}
                    </div>
                  )}
                  <p className="text-gray-400 text-[10px] mt-1">Revenue based on commodity prices (no state multiplier)</p>
                </>
              ) : (
                <>
                  <p className="font-medium text-gray-400">Extraction Not Available</p>
                  <p className="text-gray-400">{sectorType} sector cannot extract resources</p>
                  <p className="text-gray-500 mt-1 text-[10px]">Available: Mining, Energy, Agriculture,<br/>Manufacturing, Construction, Pharmaceuticals</p>
                </>
              )}
            </div>
          </TooltipPanel>
        </div>
      </div>

      {(retailFlow || productionFlow || serviceFlow || extractionFlow) && (
        <div className="mt-3 space-y-2">
          {units.retail > 0 && retailFlow && (
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Retail flows</p>
              {renderFlowBadges(retailFlow)}
            </div>
          )}
          {units.production > 0 && productionFlow && (
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Production flows</p>
              {renderProductionFlowBadges(productionFlow)}
            </div>
          )}
          {units.service > 0 && serviceFlow && (
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Service flows</p>
              {renderFlowBadges(serviceFlow)}
            </div>
          )}
          {canExtract && (units.extraction || 0) > 0 && extractionFlow && (
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Extraction flows</p>
              {renderFlowBadges(extractionFlow)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

