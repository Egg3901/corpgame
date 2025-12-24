'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import AppNavigation from '@/components/AppNavigation';
import { marketsAPI, StateDetailResponse, authAPI } from '@/lib/api';
import {
  MapPin,
  Building2,
  TrendingUp,
  DollarSign,
  ArrowLeft,
  Store,
  Factory,
  Briefcase,
  Plus,
  ChevronDown,
  Droplets,
  Package,
  Cpu,
  Zap,
  Wheat,
  Trees,
  FlaskConical,
  Gem,
  Pickaxe,
  HelpCircle,
} from 'lucide-react';

// Resource icon mapping
const RESOURCE_ICONS: Record<string, React.ReactNode> = {
  'Oil': <Droplets className="w-4 h-4" />,
  'Steel': <Package className="w-4 h-4" />,
  'Rare Earth': <Cpu className="w-4 h-4" />,
  'Copper': <Zap className="w-4 h-4" />,
  'Fertile Land': <Wheat className="w-4 h-4" />,
  'Lumber': <Trees className="w-4 h-4" />,
  'Chemical Compounds': <FlaskConical className="w-4 h-4" />,
};

// Resource color mapping for pie chart segments
const RESOURCE_COLORS: Record<string, string> = {
  'Oil': '#1e293b',           // slate-800
  'Steel': '#52525b',         // zinc-600
  'Rare Earth': '#7c3aed',    // violet-600
  'Copper': '#ea580c',        // orange-600
  'Fertile Land': '#65a30d',  // lime-600
  'Lumber': '#b45309',        // amber-700
  'Chemical Compounds': '#0891b2', // cyan-600
};

const RESOURCE_BG_COLORS: Record<string, string> = {
  'Oil': 'bg-slate-800',
  'Steel': 'bg-zinc-600',
  'Rare Earth': 'bg-violet-600',
  'Copper': 'bg-orange-600',
  'Fertile Land': 'bg-lime-600',
  'Lumber': 'bg-amber-700',
  'Chemical Compounds': 'bg-cyan-600',
};

// Unit economics constants (must match backend)
const UNIT_ECONOMICS = {
  retail: { baseRevenue: 500, baseCost: 300 },
  production: { baseRevenue: 800, baseCost: 600 },
  service: { baseRevenue: 400, baseCost: 200 },
  extraction: { baseRevenue: 1000, baseCost: 700 },  // High revenue, high cost
};

// Sectors that can build extraction units and what they can extract (must match backend SECTOR_EXTRACTION)
const SECTORS_CAN_EXTRACT: Record<string, string[] | null> = {
  'Technology': null,
  'Finance': null,
  'Healthcare': null,
  'Manufacturing': ['Steel'],
  'Energy': ['Oil'],
  'Retail': null,
  'Real Estate': null,
  'Transportation': null,
  'Media': null,
  'Telecommunications': null,
  'Agriculture': ['Fertile Land', 'Lumber'],
  'Defense': null,
  'Hospitality': null,
  'Construction': ['Lumber'],
  'Pharmaceuticals': ['Chemical Compounds'],
  'Mining': ['Steel', 'Copper', 'Rare Earth'],
};

// Check if a sector can extract
const sectorCanExtract = (sector: string): boolean => {
  const resources = SECTORS_CAN_EXTRACT[sector];
  return resources !== null && resources.length > 0;
};

const MARKET_ENTRY_COST = 50000;
const BUILD_UNIT_COST = 10000;
const DISPLAY_PERIOD_HOURS = 96;
const BASE_SECTOR_CAPACITY = 15;  // Base units per sector, multiplied by state multiplier

// SVG Pie Chart Component
function ResourcePieChart({ resources }: { resources: Array<{ resource: string; percentage: number }> }) {
  if (resources.length === 0) return null;

  let cumulativePercentage = 0;
  const segments = resources.map((r, idx) => {
    const startPercentage = cumulativePercentage;
    cumulativePercentage += r.percentage;
    return {
      ...r,
      startPercentage,
      endPercentage: cumulativePercentage,
      color: RESOURCE_COLORS[r.resource] || '#6b7280',
    };
  });

  // SVG pie chart using conic gradient approach with path arcs
  const size = 180;
  const center = size / 2;
  const radius = 70;
  const innerRadius = 40;

  const polarToCartesian = (cx: number, cy: number, r: number, angle: number) => {
    const rad = (angle - 90) * Math.PI / 180;
    return {
      x: cx + r * Math.cos(rad),
      y: cy + r * Math.sin(rad),
    };
  };

  const describeArc = (cx: number, cy: number, outerR: number, innerR: number, startAngle: number, endAngle: number) => {
    const startOuter = polarToCartesian(cx, cy, outerR, startAngle);
    const endOuter = polarToCartesian(cx, cy, outerR, endAngle);
    const startInner = polarToCartesian(cx, cy, innerR, endAngle);
    const endInner = polarToCartesian(cx, cy, innerR, startAngle);
    
    const largeArcFlag = endAngle - startAngle <= 180 ? 0 : 1;

    return [
      'M', startOuter.x, startOuter.y,
      'A', outerR, outerR, 0, largeArcFlag, 1, endOuter.x, endOuter.y,
      'L', startInner.x, startInner.y,
      'A', innerR, innerR, 0, largeArcFlag, 0, endInner.x, endInner.y,
      'Z'
    ].join(' ');
  };

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="drop-shadow-lg">
      {/* Background circle */}
      <circle cx={center} cy={center} r={radius} fill="#f3f4f6" className="dark:fill-gray-700" />
      
      {/* Pie segments */}
      {segments.map((segment, idx) => {
        const startAngle = (segment.startPercentage / 100) * 360;
        const endAngle = (segment.endPercentage / 100) * 360;
        
        // Handle case where segment is nearly 100%
        const adjustedEndAngle = Math.min(endAngle, startAngle + 359.9);
        
        if (segment.percentage < 0.5) return null; // Skip tiny segments
        
        return (
          <path
            key={segment.resource}
            d={describeArc(center, center, radius, innerRadius, startAngle, adjustedEndAngle)}
            fill={segment.color}
            className="transition-all duration-300 hover:opacity-80"
            style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.1))' }}
          />
        );
      })}
      
      {/* Center circle for donut effect */}
      <circle cx={center} cy={center} r={innerRadius} fill="white" className="dark:fill-gray-800" />
      
      {/* Center icon */}
      <g transform={`translate(${center - 12}, ${center - 12})`}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400 dark:text-gray-500">
          <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
        </svg>
      </g>
    </svg>
  );
}

export default function StateDetailPage() {
  const params = useParams();
  const router = useRouter();
  const stateCode = (params.code as string)?.toUpperCase();

  const [stateData, setStateData] = useState<StateDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedSector, setSelectedSector] = useState<string>('');
  const [entering, setEntering] = useState(false);
  const [building, setBuilding] = useState<string | null>(null);
  const [userActions, setUserActions] = useState<number>(0);

  useEffect(() => {
    const fetchData = async () => {
      if (!stateCode) {
        setError('Invalid state code');
        setLoading(false);
        return;
      }

      try {
        const [stateResult, meResult] = await Promise.all([
          marketsAPI.getState(stateCode),
          authAPI.getMe().catch(() => null),
        ]);
        setStateData(stateResult);
        if (meResult) {
          setUserActions(meResult.actions || 0);
        }
      } catch (err: any) {
        console.error('Failed to fetch state:', err);
        setError(err.response?.data?.error || 'Failed to load state');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [stateCode]);

  const handleEnterMarket = async () => {
    if (!stateData?.user_corporation || !selectedSector) return;

    setEntering(true);
    try {
      await marketsAPI.enterMarket(stateCode, selectedSector, stateData.user_corporation.id);
      // Refresh data
      const newData = await marketsAPI.getState(stateCode);
      setStateData(newData);
      setSelectedSector('');
      // Update user actions
      const me = await authAPI.getMe().catch(() => null);
      if (me) setUserActions(me.actions || 0);
      alert(`Successfully entered ${stateData.state.name} ${selectedSector} market!`);
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to enter market');
    } finally {
      setEntering(false);
    }
  };

  const handleBuildUnit = async (entryId: number, unitType: 'retail' | 'production' | 'service' | 'extraction') => {
    if (!stateData?.user_corporation) return;

    setBuilding(`${entryId}-${unitType}`);
    try {
      await marketsAPI.buildUnit(entryId, unitType);
      // Refresh data
      const newData = await marketsAPI.getState(stateCode);
      setStateData(newData);
      // Update user actions
      const me = await authAPI.getMe().catch(() => null);
      if (me) setUserActions(me.actions || 0);
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to build unit');
    } finally {
      setBuilding(null);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const getMultiplierColor = (multiplier: number) => {
    if (multiplier >= 4.0) return 'text-emerald-600 dark:text-emerald-400';
    if (multiplier >= 3.0) return 'text-blue-600 dark:text-blue-400';
    if (multiplier >= 2.0) return 'text-amber-600 dark:text-amber-400';
    return 'text-gray-600 dark:text-gray-400';
  };

  // Calculate state capacity (units allowed per sector)
  const getStateCapacity = (multiplier: number) => {
    return Math.floor(BASE_SECTOR_CAPACITY * multiplier);
  };

  // Unit revenue is now flat (no state multiplier)
  const calculateUnitRevenue = (unitType: 'retail' | 'production' | 'service' | 'extraction') => {
    const hourly = UNIT_ECONOMICS[unitType].baseRevenue;
    return hourly * DISPLAY_PERIOD_HOURS;
  };

  const calculateUnitCost = (unitType: 'retail' | 'production' | 'service' | 'extraction') => {
    const hourly = UNIT_ECONOMICS[unitType].baseCost;
    return hourly * DISPLAY_PERIOD_HOURS;
  };

  const calculateUnitProfit = (unitType: 'retail' | 'production' | 'service' | 'extraction') => {
    return calculateUnitRevenue(unitType) - calculateUnitCost(unitType);
  };

  // Get total units for a market entry
  const getTotalUnits = (units: { retail: number; production: number; service: number; extraction: number }) => {
    return units.retail + units.production + units.service + units.extraction;
  };

  // Get sectors user is already in
  const userSectorsInState = stateData?.user_market_entries?.map((e) => e.sector_type) || [];
  const availableSectors = stateData?.sectors?.filter((s) => !userSectorsInState.includes(s)) || [];

  if (loading) {
    return (
      <AppNavigation>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-lg text-gray-600 dark:text-gray-200">Loading state...</div>
        </div>
      </AppNavigation>
    );
  }

  if (error || !stateData) {
    return (
      <AppNavigation>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <p className="text-xl text-red-600 dark:text-red-400 mb-4">{error || 'State not found'}</p>
            <Link href="/states" className="text-corporate-blue hover:underline">
              Return to States
            </Link>
          </div>
        </div>
      </AppNavigation>
    );
  }

  const { state, markets, user_corporation, user_market_entries } = stateData;

  return (
    <AppNavigation>
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 space-y-6">
        {/* Back Button */}
        <Link
          href="/states"
          className="inline-flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-corporate-blue dark:hover:text-corporate-blue-light transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to States
        </Link>

        {/* Header */}
        <div className="relative rounded-2xl border border-gray-200/50 dark:border-gray-700/50 bg-gradient-to-br from-white via-white to-gray-50/50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800/50 shadow-2xl overflow-hidden backdrop-blur-sm">
          <div className="absolute inset-0 bg-gradient-to-br from-corporate-blue/5 via-transparent to-corporate-blue-light/5 dark:from-corporate-blue/10 dark:via-transparent dark:to-corporate-blue-dark/10 pointer-events-none" />
          <div className="relative p-6">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-corporate-blue/10 dark:bg-corporate-blue/20">
                  <MapPin className="h-8 w-8 text-corporate-blue dark:text-corporate-blue-light" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{state.name}</h1>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="px-2 py-0.5 text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-full">
                      {state.region}
                    </span>
                    <span className={`text-lg font-bold ${getMultiplierColor(state.multiplier)} group relative cursor-help`}>
                      {getStateCapacity(state.multiplier)} unit capacity
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-10 pointer-events-none">
                        <div className="bg-gray-900 text-white text-xs rounded-lg px-3 py-2 whitespace-nowrap shadow-lg">
                          <p className="font-medium">State Unit Capacity</p>
                          <p>{BASE_SECTOR_CAPACITY} base × {state.multiplier.toFixed(1)}x = {getStateCapacity(state.multiplier)} units/sector</p>
                          <p className="text-gray-400 mt-1">Higher = larger market with more room for units</p>
                        </div>
                      </div>
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Enter Market Section (CEO only) */}
            {user_corporation && availableSectors.length > 0 && (
              <div className="relative rounded-2xl border border-gray-200/50 dark:border-gray-700/50 bg-gradient-to-br from-white via-white to-gray-50/50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800/50 shadow-xl overflow-hidden backdrop-blur-sm">
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-transparent to-emerald-500/5 dark:from-emerald-500/10 dark:via-transparent dark:to-emerald-500/10 pointer-events-none" />
                <div className="relative p-6">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                    Enter New Market
                  </h2>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Select Sector
                      </label>
                      <div className="relative">
                        <select
                          value={selectedSector}
                          onChange={(e) => setSelectedSector(e.target.value)}
                          className="w-full appearance-none px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-corporate-blue focus:border-transparent pr-10"
                        >
                          <option value="">Choose a sector...</option>
                          {availableSectors.map((sector) => (
                            <option key={sector} value={sector}>
                              {sector}
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
                      </div>
                    </div>

                    {selectedSector && (
                      <div className="rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20 p-4">
                        <p className="text-sm text-emerald-800 dark:text-emerald-200 font-medium mb-2">
                          Enter {state.name} {selectedSector} Market
                        </p>
                        <div className="text-xs text-emerald-700 dark:text-emerald-300 space-y-1">
                          <p>Cost: {formatCurrency(MARKET_ENTRY_COST)} capital + 1 action</p>
                          <p>Your capital: {formatCurrency(user_corporation.capital)}</p>
                          <p>Your actions: {userActions}</p>
                        </div>
                      </div>
                    )}

                    <button
                      onClick={handleEnterMarket}
                      disabled={!selectedSector || entering || user_corporation.capital < MARKET_ENTRY_COST || userActions < 1}
                      className="w-full px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-semibold flex items-center justify-center gap-2"
                    >
                      {entering ? (
                        'Entering Market...'
                      ) : (
                        <>
                          <Plus className="h-5 w-5" />
                          Enter {state.name} {selectedSector || '[Select Sector]'} Market
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* User's Market Entries */}
            {user_corporation && user_market_entries && user_market_entries.length > 0 && (
              <div className="relative rounded-2xl border border-gray-200/50 dark:border-gray-700/50 bg-gradient-to-br from-white via-white to-gray-50/50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800/50 shadow-xl overflow-hidden backdrop-blur-sm">
                <div className="absolute inset-0 bg-gradient-to-br from-corporate-blue/5 via-transparent to-corporate-blue-light/5 dark:from-corporate-blue/10 dark:via-transparent dark:to-corporate-blue-dark/10 pointer-events-none" />
                <div className="relative p-6">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-corporate-blue" />
                    Your Markets in {state.name}
                  </h2>
                  <div className="space-y-4">
                    {user_market_entries.map((entry) => (
                      <div
                        key={entry.id}
                        className="rounded-xl border border-white/60 bg-white/70 dark:border-gray-800/70 dark:bg-gray-800/60 p-4 shadow-sm"
                      >
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="font-semibold text-gray-900 dark:text-white">{entry.sector_type}</h3>
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            Entered {new Date(entry.created_at).toLocaleDateString()}
                          </span>
                        </div>

                        {/* Unit Types - Always 4 columns, frost extraction if not supported */}
                        <div className="grid grid-cols-4 gap-3">
                          {/* Retail */}
                          <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-3 group relative">
                            <div className="flex items-center gap-2 mb-2">
                              <Store className="h-4 w-4 text-pink-500" />
                              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Retail</span>
                            </div>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white">{entry.units.retail}</p>
                            <p className="text-xs text-emerald-600 dark:text-emerald-400">
                              +{formatCurrency(calculateUnitProfit('retail') * entry.units.retail)}/96hr
                            </p>
                            <button
                              onClick={() => handleBuildUnit(entry.id, 'retail')}
                              disabled={building === `${entry.id}-retail` || user_corporation.capital < BUILD_UNIT_COST || userActions < 1 || getTotalUnits(entry.units) >= getStateCapacity(state.multiplier)}
                              className="mt-2 w-full px-2 py-1 text-xs bg-pink-500 text-white rounded hover:bg-pink-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                              {building === `${entry.id}-retail` ? '...' : `+1 (${formatCurrency(BUILD_UNIT_COST)})`}
                            </button>
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-10 pointer-events-none">
                              <div className="bg-gray-900 text-white text-xs rounded-lg px-3 py-2 whitespace-nowrap shadow-lg">
                                <p className="font-medium">Retail Unit Economics</p>
                                <p>Revenue: ${UNIT_ECONOMICS.retail.baseRevenue}/hr</p>
                                <p>Cost: ${UNIT_ECONOMICS.retail.baseCost}/hr</p>
                                <p className="text-emerald-400">Profit: ${(UNIT_ECONOMICS.retail.baseRevenue - UNIT_ECONOMICS.retail.baseCost)}/hr</p>
                              </div>
                            </div>
                          </div>

                          {/* Production */}
                          <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-3 group relative">
                            <div className="flex items-center gap-2 mb-2">
                              <Factory className="h-4 w-4 text-orange-500" />
                              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Production</span>
                            </div>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white">{entry.units.production}</p>
                            <p className="text-xs text-emerald-600 dark:text-emerald-400">
                              +{formatCurrency(calculateUnitProfit('production') * entry.units.production)}/96hr
                            </p>
                            <button
                              onClick={() => handleBuildUnit(entry.id, 'production')}
                              disabled={building === `${entry.id}-production` || user_corporation.capital < BUILD_UNIT_COST || userActions < 1 || getTotalUnits(entry.units) >= getStateCapacity(state.multiplier)}
                              className="mt-2 w-full px-2 py-1 text-xs bg-orange-500 text-white rounded hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                              {building === `${entry.id}-production` ? '...' : `+1 (${formatCurrency(BUILD_UNIT_COST)})`}
                            </button>
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-10 pointer-events-none">
                              <div className="bg-gray-900 text-white text-xs rounded-lg px-3 py-2 whitespace-nowrap shadow-lg">
                                <p className="font-medium">Production Unit Economics</p>
                                <p>Revenue: varies by sector output</p>
                                <p>Cost: labor + commodity inputs</p>
                                <p className="text-gray-400">Dynamic pricing based on market</p>
                              </div>
                            </div>
                          </div>

                          {/* Service */}
                          <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-3 group relative">
                            <div className="flex items-center gap-2 mb-2">
                              <Briefcase className="h-4 w-4 text-blue-500" />
                              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Service</span>
                            </div>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white">{entry.units.service}</p>
                            <p className="text-xs text-emerald-600 dark:text-emerald-400">
                              +{formatCurrency(calculateUnitProfit('service') * entry.units.service)}/96hr
                            </p>
                            <button
                              onClick={() => handleBuildUnit(entry.id, 'service')}
                              disabled={building === `${entry.id}-service` || user_corporation.capital < BUILD_UNIT_COST || userActions < 1 || getTotalUnits(entry.units) >= getStateCapacity(state.multiplier)}
                              className="mt-2 w-full px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                              {building === `${entry.id}-service` ? '...' : `+1 (${formatCurrency(BUILD_UNIT_COST)})`}
                            </button>
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-10 pointer-events-none">
                              <div className="bg-gray-900 text-white text-xs rounded-lg px-3 py-2 whitespace-nowrap shadow-lg">
                                <p className="font-medium">Service Unit Economics</p>
                                <p>Revenue: ${UNIT_ECONOMICS.service.baseRevenue}/hr</p>
                                <p>Cost: ${UNIT_ECONOMICS.service.baseCost}/hr</p>
                                <p className="text-emerald-400">Profit: ${(UNIT_ECONOMICS.service.baseRevenue - UNIT_ECONOMICS.service.baseCost)}/hr</p>
                              </div>
                            </div>
                          </div>

                          {/* Extraction - frosted if sector doesn't support it */}
                          <div className={`rounded-lg border p-3 group relative ${
                            sectorCanExtract(entry.sector_type) 
                              ? 'border-gray-200 dark:border-gray-700' 
                              : 'border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/30'
                          }`}>
                            <div className={`flex items-center gap-2 mb-2 ${!sectorCanExtract(entry.sector_type) ? 'opacity-40' : ''}`}>
                              <Pickaxe className={`h-4 w-4 ${sectorCanExtract(entry.sector_type) ? 'text-amber-500' : 'text-gray-400'}`} />
                              <span className={`text-sm font-medium ${sectorCanExtract(entry.sector_type) ? 'text-gray-700 dark:text-gray-300' : 'text-gray-400 dark:text-gray-600'}`}>Extraction</span>
                            </div>
                            {sectorCanExtract(entry.sector_type) ? (
                              <>
                                <p className="text-2xl font-bold text-gray-900 dark:text-white">{entry.units.extraction || 0}</p>
                                <p className="text-xs text-emerald-600 dark:text-emerald-400">
                                  +{formatCurrency(calculateUnitProfit('extraction') * (entry.units.extraction || 0))}/96hr
                                </p>
                                <button
                                  onClick={() => handleBuildUnit(entry.id, 'extraction')}
                                  disabled={building === `${entry.id}-extraction` || user_corporation.capital < BUILD_UNIT_COST || userActions < 1 || getTotalUnits(entry.units) >= getStateCapacity(state.multiplier)}
                                  className="mt-2 w-full px-2 py-1 text-xs bg-amber-500 text-white rounded hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                  {building === `${entry.id}-extraction` ? '...' : `+1 (${formatCurrency(BUILD_UNIT_COST)})`}
                                </button>
                              </>
                            ) : (
                              <>
                                <p className="text-2xl font-bold text-gray-300 dark:text-gray-600">—</p>
                                <p className="text-xs text-gray-400 dark:text-gray-600">
                                  Not available
                                </p>
                                <div className="mt-2 w-full px-2 py-1 text-xs text-gray-400 dark:text-gray-600 text-center">
                                  Unavailable
                                </div>
                              </>
                            )}
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-10 pointer-events-none">
                              <div className="bg-gray-900 text-white text-xs rounded-lg px-3 py-2 whitespace-nowrap shadow-lg">
                                {sectorCanExtract(entry.sector_type) ? (
                                  <>
                                    <p className="font-medium">Extraction Unit Economics</p>
                                    <p>Revenue: ${UNIT_ECONOMICS.extraction.baseRevenue}/hr × {state.multiplier.toFixed(1)}x</p>
                                    <p>Cost: ${UNIT_ECONOMICS.extraction.baseCost}/hr</p>
                                    <p className="text-emerald-400">Profit: ${(UNIT_ECONOMICS.extraction.baseRevenue * state.multiplier - UNIT_ECONOMICS.extraction.baseCost).toFixed(0)}/hr</p>
                                    <p className="text-amber-400 mt-1">Extracts: {SECTORS_CAN_EXTRACT[entry.sector_type]?.join(', ')}</p>
                                  </>
                                ) : (
                                  <>
                                    <p className="font-medium text-gray-400">Extraction Not Available</p>
                                    <p className="text-gray-400">{entry.sector_type} sector cannot extract resources</p>
                                    <p className="text-gray-500 mt-1 text-[10px]">Available: Mining, Energy, Agriculture,<br/>Manufacturing, Construction, Pharmaceuticals</p>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* All Markets in State */}
            <div className="relative rounded-2xl border border-gray-200/50 dark:border-gray-700/50 bg-gradient-to-br from-white via-white to-gray-50/50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800/50 shadow-xl overflow-hidden backdrop-blur-sm">
              <div className="absolute inset-0 bg-gradient-to-br from-corporate-blue/5 via-transparent to-corporate-blue-light/5 dark:from-corporate-blue/10 dark:via-transparent dark:to-corporate-blue-dark/10 pointer-events-none" />
              <div className="relative p-6">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                  All Corporations in {state.name}
                </h2>
                {markets.length === 0 ? (
                  <p className="text-gray-500 dark:text-gray-400 text-center py-8">
                    No corporations have entered this market yet. Be the first!
                  </p>
                ) : (
                  <div className="space-y-3">
                    {markets.map((market) => {
                      const totalUnits = market.units.retail + market.units.production + market.units.service + (market.units.extraction || 0);
                      const canExtract = sectorCanExtract(market.sector_type);
                      return (
                        <div
                          key={market.id}
                          className="flex items-center justify-between rounded-xl border border-white/60 bg-white/70 dark:border-gray-800/70 dark:bg-gray-800/60 p-4 shadow-sm"
                        >
                          <div className="flex items-center gap-3">
                            {market.corporation?.logo ? (
                              <img
                                src={market.corporation.logo}
                                alt={market.corporation.name || 'Corp'}
                                className="w-10 h-10 rounded-lg object-cover"
                                onError={(e) => {
                                  e.currentTarget.src = '/defaultpfp.jpg';
                                }}
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-lg bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                                <Building2 className="h-5 w-5 text-gray-400" />
                              </div>
                            )}
                            <div>
                              <Link
                                href={`/corporation/${market.corporation?.id}`}
                                className="font-semibold text-gray-900 dark:text-white hover:text-corporate-blue dark:hover:text-corporate-blue-light transition-colors"
                              >
                                {market.corporation?.name || 'Unknown Corporation'}
                              </Link>
                              <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                                {market.sector_type}
                                {canExtract && (
                                  <span className="text-amber-500">
                                    <Pickaxe className="w-3 h-3 inline" />
                                  </span>
                                )}
                              </p>
                            </div>
                          </div>
                          <div className="text-right group relative">
                            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                              {totalUnits} unit{totalUnits !== 1 ? 's' : ''}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1 justify-end">
                              <span className="text-pink-500">{market.units.retail}R</span>
                              <span className="text-gray-300 dark:text-gray-600">/</span>
                              <span className="text-orange-500">{market.units.production}P</span>
                              <span className="text-gray-300 dark:text-gray-600">/</span>
                              <span className="text-blue-500">{market.units.service}S</span>
                              <span className="text-gray-300 dark:text-gray-600">/</span>
                              <span className={canExtract ? 'text-amber-500' : 'text-gray-300 dark:text-gray-600'}>
                                {canExtract ? (market.units.extraction || 0) : '—'}E
                              </span>
                            </p>
                            <div className="absolute bottom-full right-0 mb-2 hidden group-hover:block z-10 pointer-events-none">
                              <div className="bg-gray-900 text-white text-xs rounded-lg px-3 py-2 whitespace-nowrap shadow-lg text-left">
                                <p className="font-medium mb-1">{market.sector_type} Units</p>
                                <p className="text-pink-400">Retail: {market.units.retail}</p>
                                <p className="text-orange-400">Production: {market.units.production}</p>
                                <p className="text-blue-400">Service: {market.units.service}</p>
                                <p className={canExtract ? 'text-amber-400' : 'text-gray-500'}>
                                  Extraction: {canExtract ? (market.units.extraction || 0) : 'N/A'}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Natural Resources */}
            {stateData.resources && stateData.resources.resources.length > 0 && (
              <div className="relative rounded-2xl border border-gray-200/50 dark:border-gray-700/50 bg-gradient-to-br from-white via-white to-gray-50/50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800/50 shadow-xl overflow-hidden backdrop-blur-sm">
                <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 via-transparent to-amber-500/5 dark:from-amber-500/10 dark:via-transparent dark:to-amber-500/10 pointer-events-none" />
                <div className="relative p-6">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <Gem className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                    Natural Resources
                  </h3>
                  
                  {/* Pie Chart */}
                  <div className="flex justify-center mb-4">
                    <ResourcePieChart 
                      resources={stateData.resources.resources.map(r => ({
                        resource: r.resource,
                        percentage: r.percentage,
                      }))} 
                    />
                  </div>

                  {/* Total Value */}
                  <div className="text-center mb-4 pb-4 border-b border-gray-200 dark:border-gray-700 group relative">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Total Resource Value</p>
                    <p className="text-xl font-bold text-amber-600 dark:text-amber-400 cursor-help">
                      {formatCurrency(stateData.resources.totalResourceValue)}
                    </p>
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-10 pointer-events-none">
                      <div className="bg-gray-900 text-white text-xs rounded-lg px-3 py-2 whitespace-nowrap shadow-lg">
                        <p className="font-medium">Total Resource Value</p>
                        <p className="text-gray-300">Sum of all resources × current commodity prices</p>
                        <p className="text-gray-400 mt-1">Prices fluctuate based on supply/demand</p>
                      </div>
                    </div>
                  </div>

                  {/* Resource List */}
                  <div className="space-y-3">
                    {stateData.resources.resources.map((resource) => (
                      <div
                        key={resource.resource}
                        className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors group relative"
                      >
                        {/* Color indicator */}
                        <div 
                          className={`w-3 h-3 rounded-full flex-shrink-0 ${RESOURCE_BG_COLORS[resource.resource] || 'bg-gray-500'}`}
                        />
                        
                        {/* Icon */}
                        <div className="text-gray-500 dark:text-gray-400 flex-shrink-0">
                          {RESOURCE_ICONS[resource.resource] || <Package className="w-4 h-4" />}
                        </div>
                        
                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-gray-900 dark:text-white truncate">
                              {resource.resource}
                            </span>
                            <span className="text-sm font-mono text-gray-600 dark:text-gray-400 cursor-help">
                              {resource.percentage.toFixed(1)}%
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                            <span className="cursor-help">{resource.amount.toLocaleString()} units</span>
                            <span className="text-amber-600 dark:text-amber-400 cursor-help">
                              {formatCurrency(resource.currentPrice)}/unit
                            </span>
                          </div>
                          <div className="text-xs text-gray-400 dark:text-gray-500 cursor-help">
                            {resource.stateShareOfUS.toFixed(1)}% of US supply
                          </div>
                        </div>
                        
                        {/* Tooltip */}
                        <div className="absolute left-0 right-0 bottom-full mb-2 hidden group-hover:block z-10 pointer-events-none">
                          <div className="bg-gray-900 text-white text-xs rounded-lg px-3 py-2 shadow-lg mx-2">
                            <p className="font-medium text-amber-400">{resource.resource}</p>
                            <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-1">
                              <p className="text-gray-300">Units:</p>
                              <p className="text-white">{resource.amount.toLocaleString()}</p>
                              <p className="text-gray-300">State share:</p>
                              <p className="text-white">{resource.percentage.toFixed(1)}% of state</p>
                              <p className="text-gray-300">US share:</p>
                              <p className="text-white">{resource.stateShareOfUS.toFixed(1)}% of nation</p>
                              <p className="text-gray-300">Price/unit:</p>
                              <p className="text-amber-400">{formatCurrency(resource.currentPrice)}</p>
                              <p className="text-gray-300">Total value:</p>
                              <p className="text-emerald-400">{formatCurrency(resource.totalValue)}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Link to commodities */}
                  <Link
                    href="/stock-market"
                    className="mt-4 block text-center text-sm text-corporate-blue hover:text-corporate-blue-dark dark:text-corporate-blue-light dark:hover:text-corporate-blue transition-colors"
                  >
                    View All Commodities →
                  </Link>
                </div>
              </div>
            )}

            {/* No Resources */}
            {(!stateData.resources || stateData.resources.resources.length === 0) && (
              <div className="relative rounded-2xl border border-gray-200/50 dark:border-gray-700/50 bg-gradient-to-br from-white via-white to-gray-50/50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800/50 shadow-xl overflow-hidden backdrop-blur-sm">
                <div className="relative p-6 text-center">
                  <Gem className="h-10 w-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">No Natural Resources</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    This state has limited natural resource production. Focus on service and retail sectors.
                  </p>
                </div>
              </div>
            )}

            {/* Unit Economics */}
            <div className="relative rounded-2xl border border-gray-200/50 dark:border-gray-700/50 bg-gradient-to-br from-white via-white to-gray-50/50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800/50 shadow-xl overflow-hidden backdrop-blur-sm">
              <div className="absolute inset-0 bg-gradient-to-br from-corporate-blue/5 via-transparent to-corporate-blue-light/5 dark:from-corporate-blue/10 dark:via-transparent dark:to-corporate-blue-dark/10 pointer-events-none" />
              <div className="relative p-6">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-corporate-blue" />
                  Unit Economics
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                  Revenue/profit per unit (96-hour period) in {state.name}
                </p>
                <div className="space-y-4">
                  {/* Retail */}
                  <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Store className="h-4 w-4 text-pink-500" />
                      <span className="font-medium text-gray-700 dark:text-gray-300">Retail</span>
                    </div>
                    <div className="text-sm space-y-1">
                      <p className="text-gray-600 dark:text-gray-400">
                        Revenue: <span className="text-emerald-600 dark:text-emerald-400">{formatCurrency(calculateUnitRevenue('retail'))}</span>
                      </p>
                      <p className="text-gray-600 dark:text-gray-400">
                        Cost: <span className="text-red-600 dark:text-red-400">{formatCurrency(calculateUnitCost('retail'))}</span>
                      </p>
                      <p className="font-semibold text-gray-900 dark:text-white">
                        Profit: <span className="text-emerald-600 dark:text-emerald-400">{formatCurrency(calculateUnitProfit('retail'))}</span>
                      </p>
                    </div>
                  </div>

                  {/* Production */}
                  <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Factory className="h-4 w-4 text-orange-500" />
                      <span className="font-medium text-gray-700 dark:text-gray-300">Production</span>
                    </div>
                    <div className="text-sm space-y-1">
                      <p className="text-gray-600 dark:text-gray-400">
                        Revenue: <span className="text-amber-600 dark:text-amber-400">Dynamic</span>
                      </p>
                      <p className="text-gray-600 dark:text-gray-400">
                        Cost: <span className="text-amber-600 dark:text-amber-400">Dynamic</span>
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Based on commodity inputs & product outputs
                      </p>
                    </div>
                  </div>

                  {/* Service */}
                  <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Briefcase className="h-4 w-4 text-blue-500" />
                      <span className="font-medium text-gray-700 dark:text-gray-300">Service</span>
                    </div>
                    <div className="text-sm space-y-1">
                      <p className="text-gray-600 dark:text-gray-400">
                        Revenue: <span className="text-emerald-600 dark:text-emerald-400">{formatCurrency(calculateUnitRevenue('service'))}</span>
                      </p>
                      <p className="text-gray-600 dark:text-gray-400">
                        Cost: <span className="text-red-600 dark:text-red-400">{formatCurrency(calculateUnitCost('service'))}</span>
                      </p>
                      <p className="font-semibold text-gray-900 dark:text-white">
                        Profit: <span className="text-emerald-600 dark:text-emerald-400">{formatCurrency(calculateUnitProfit('service'))}</span>
                      </p>
                    </div>
                  </div>

                  {/* Extraction */}
                  <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Pickaxe className="h-4 w-4 text-amber-500" />
                      <span className="font-medium text-gray-700 dark:text-gray-300">Extraction</span>
                    </div>
                    <div className="text-sm space-y-1">
                      <p className="text-gray-600 dark:text-gray-400">
                        Revenue: <span className="text-amber-600 dark:text-amber-400">Dynamic</span>
                      </p>
                      <p className="text-gray-600 dark:text-gray-400">
                        Cost: <span className="text-red-600 dark:text-red-400">{formatCurrency(calculateUnitCost('extraction'))}</span>
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Revenue based on commodity prices
                      </p>
                    </div>
                    <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">
                      Available in: Mining, Energy, Agriculture, Manufacturing, Construction, Pharmaceuticals
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Costs Info */}
            <div className="relative rounded-2xl border border-gray-200/50 dark:border-gray-700/50 bg-gradient-to-br from-white via-white to-gray-50/50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800/50 shadow-xl overflow-hidden backdrop-blur-sm p-6">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Action Costs</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Enter Market</span>
                  <span className="font-medium text-gray-900 dark:text-white">{formatCurrency(MARKET_ENTRY_COST)} + 1 action</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Build Unit</span>
                  <span className="font-medium text-gray-900 dark:text-white">{formatCurrency(BUILD_UNIT_COST)} + 1 action</span>
                </div>
              </div>
            </div>

            {/* Corp Info */}
            {user_corporation && (
              <div className="relative rounded-2xl border border-gray-200/50 dark:border-gray-700/50 bg-gradient-to-br from-white via-white to-gray-50/50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800/50 shadow-xl overflow-hidden backdrop-blur-sm p-6">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Your Corporation</h3>
                <div className="space-y-2">
                  <p className="font-medium text-gray-900 dark:text-white">{user_corporation.name}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Capital: <span className="font-semibold text-emerald-600 dark:text-emerald-400">{formatCurrency(user_corporation.capital)}</span>
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Actions: <span className="font-semibold text-amber-600 dark:text-amber-400">{userActions}</span>
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppNavigation>
  );
}

