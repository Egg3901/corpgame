'use client';

import { Store, Factory, Briefcase, Pickaxe, Building2, Trash2, MapPin } from 'lucide-react';
import Link from 'next/link';

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
  EXTRACTION_OUTPUT_RATE?: number;
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
  EXTRACTION_OUTPUT_RATE = 2.0,
}: SectorCardProps) {
  const totalUnits = units.retail + units.production + units.service + units.extraction;

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
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-50 pointer-events-none">
            <div className="bg-gray-900 text-white text-xs rounded-lg px-3 py-2 whitespace-nowrap shadow-xl border border-gray-700">
              <p className="font-medium">Retail Unit Economics</p>
              <p>Revenue: ${UNIT_ECONOMICS.retail.baseRevenue}/hr</p>
              <p>Cost: ${UNIT_ECONOMICS.retail.baseCost}/hr</p>
              <p className="text-emerald-400">Profit: ${(UNIT_ECONOMICS.retail.baseRevenue - UNIT_ECONOMICS.retail.baseCost)}/hr</p>
              <p className="text-gray-400 text-[10px] mt-1">Revenue is flat (no state multiplier)</p>
            </div>
          </div>
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
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-50 pointer-events-none">
            <div className="bg-gray-900 text-white text-xs rounded-lg px-3 py-2 whitespace-nowrap shadow-xl border border-gray-700">
              <p className="font-medium">Production Unit Economics</p>
              <p>Revenue: varies by output prices</p>
              <p>Cost: labor + input commodities</p>
              <p className="text-emerald-400">Profit: varies</p>
              {requiredResource && <p className="text-amber-400 mt-1">Requires: {requiredResource}</p>}
              {producedProduct && <p className="text-emerald-400 mt-1">Produces: {producedProduct}</p>}
              <p className="text-gray-400 text-[10px] mt-1">Revenue based on market prices (no state multiplier)</p>
            </div>
          </div>
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
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-50 pointer-events-none">
            <div className="bg-gray-900 text-white text-xs rounded-lg px-3 py-2 whitespace-nowrap shadow-xl border border-gray-700">
              <p className="font-medium">Service Unit Economics</p>
              <p>Revenue: ${UNIT_ECONOMICS.service.baseRevenue}/hr</p>
              <p>Cost: ${UNIT_ECONOMICS.service.baseCost}/hr</p>
              <p className="text-emerald-400">Profit: ${(UNIT_ECONOMICS.service.baseRevenue - UNIT_ECONOMICS.service.baseCost)}/hr</p>
              <p className="text-gray-400 text-[10px] mt-1">Revenue is flat (no state multiplier)</p>
            </div>
          </div>
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
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-50 pointer-events-none">
            <div className="bg-gray-900 text-white text-xs rounded-lg px-3 py-2 whitespace-nowrap shadow-xl border border-gray-700">
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
          </div>
        </div>
      </div>
    </div>
  );
}

