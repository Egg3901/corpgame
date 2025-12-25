'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import AppNavigation from '@/components/AppNavigation';
import { marketsAPI, StatesListResponse, StateInfo } from '@/lib/api';
import { MapPin, ChevronDown, ChevronRight, TrendingUp, Building2 } from 'lucide-react';

export default function StatesPage() {
  const [statesData, setStatesData] = useState<StatesListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedRegions, setExpandedRegions] = useState<Set<string>>(new Set());

  useEffect(() => {
    const fetchStates = async () => {
      try {
        const data = await marketsAPI.getStates();
        setStatesData(data);
        // Expand all regions by default
        setExpandedRegions(new Set(data.regions));
      } catch (err: any) {
        console.error('Failed to fetch states:', err);
        setError('Failed to load states');
      } finally {
        setLoading(false);
      }
    };

    fetchStates();
  }, []);

  const toggleRegion = (region: string) => {
    setExpandedRegions((prev) => {
      const next = new Set(prev);
      if (next.has(region)) {
        next.delete(region);
      } else {
        next.add(region);
      }
      return next;
    });
  };

  const getMultiplierColor = (multiplier: number) => {
    if (multiplier >= 4.0) return 'text-emerald-600 dark:text-emerald-400';
    if (multiplier >= 3.0) return 'text-blue-600 dark:text-blue-400';
    if (multiplier >= 2.0) return 'text-amber-600 dark:text-amber-400';
    return 'text-gray-600 dark:text-gray-400';
  };

  const getMultiplierBg = (multiplier: number) => {
    if (multiplier >= 4.0) return 'bg-emerald-100 dark:bg-emerald-900/30';
    if (multiplier >= 3.0) return 'bg-blue-100 dark:bg-blue-900/30';
    if (multiplier >= 2.0) return 'bg-amber-100 dark:bg-amber-900/30';
    return 'bg-gray-100 dark:bg-gray-800';
  };

  if (loading) {
    return (
      <AppNavigation>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-lg text-gray-600 dark:text-gray-200">Loading states...</div>
        </div>
      </AppNavigation>
    );
  }

  if (error || !statesData) {
    return (
      <AppNavigation>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <p className="text-xl text-red-600 dark:text-red-400 mb-4">{error || 'Failed to load states'}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-corporate-blue text-white rounded-lg hover:bg-corporate-blue-dark"
            >
              Retry
            </button>
          </div>
        </div>
      </AppNavigation>
    );
  }

  return (
    <AppNavigation>
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 space-y-6">
        {/* Header */}
        <div className="relative rounded-2xl border border-gray-200/50 dark:border-gray-700/50 bg-gradient-to-br from-white via-white to-gray-50/50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800/50 shadow-2xl overflow-hidden backdrop-blur-sm">
          <div className="absolute inset-0 bg-gradient-to-br from-corporate-blue/5 via-transparent to-corporate-blue-light/5 dark:from-corporate-blue/10 dark:via-transparent dark:to-corporate-blue-dark/10 pointer-events-none" />
          <div className="relative p-6">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-corporate-blue/10 dark:bg-corporate-blue/20">
                <MapPin className="h-7 w-7 text-corporate-blue dark:text-corporate-blue-light" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">United States Markets</h1>
                <p className="text-gray-600 dark:text-gray-400">
                  {statesData.total_states} states across {statesData.regions.length} regions
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Info Banner */}
        <div className="rounded-xl border border-corporate-blue/20 bg-corporate-blue/5 dark:bg-corporate-blue/10 p-4">
          <div className="flex items-start gap-3">
            <TrendingUp className="h-5 w-5 text-corporate-blue dark:text-corporate-blue-light mt-0.5" />
            <div>
              <p className="text-sm font-medium text-corporate-blue dark:text-corporate-blue-light">Market Multipliers</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                States with higher population multipliers generate more revenue per business unit. 
                Click on a state to enter markets and build retail, production, or service units.
              </p>
            </div>
          </div>
        </div>

        {/* Regions */}
        <div className="space-y-4">
          {statesData.regions.map((region) => {
            const states = statesData.states_by_region[region] || [];
            const isExpanded = expandedRegions.has(region);

            return (
              <div
                key={region}
                className="relative rounded-2xl border border-gray-200/50 dark:border-gray-700/50 bg-gradient-to-br from-white via-white to-gray-50/50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800/50 shadow-xl overflow-hidden backdrop-blur-sm"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-corporate-blue/5 via-transparent to-corporate-blue-light/5 dark:from-corporate-blue/10 dark:via-transparent dark:to-corporate-blue-dark/10 pointer-events-none" />
                
                {/* Region Header */}
                <button
                  onClick={() => toggleRegion(region)}
                  className="relative w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl font-bold text-gray-900 dark:text-white">{region}</span>
                    <span className="px-2 py-0.5 text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-full">
                      {states.length} states
                    </span>
                  </div>
                  {isExpanded ? (
                    <ChevronDown className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                  ) : (
                    <ChevronRight className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                  )}
                </button>

                {/* States Grid */}
                {isExpanded && (
                  <div className="relative border-t border-gray-200/50 dark:border-gray-700/50">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 p-6">
                      {states.map((state) => (
                        <Link
                          key={state.code}
                          href={`/states/${state.code}`}
                          className="group relative rounded-xl border border-white/60 bg-white/70 dark:border-gray-800/70 dark:bg-gray-800/60 p-4 shadow-sm hover:shadow-md hover:border-corporate-blue/30 dark:hover:border-corporate-blue/30 transition-all"
                        >
                          <div className="flex items-start justify-between">
                            <div>
                              <h3 className="font-semibold text-gray-900 dark:text-white group-hover:text-corporate-blue dark:group-hover:text-corporate-blue-light transition-colors">
                                {state.name}
                              </h3>
                              <p className="text-xs text-gray-500 dark:text-gray-400">{state.code}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className={`px-2 py-1 rounded-lg text-xs font-bold ${getMultiplierBg(state.multiplier)} ${getMultiplierColor(state.multiplier)}`}>
                                {state.multiplier.toFixed(1)}x
                              </div>
                              {typeof state.growth_factor === 'number' && (
                                <div className="px-2 py-1 rounded-lg text-xs font-bold bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300">
                                  Growth {state.growth_factor.toFixed(2)}x
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="mt-3 flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                            <Building2 className="h-3 w-3" />
                            <span>Click to view markets</span>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="relative rounded-2xl border border-gray-200/50 dark:border-gray-700/50 bg-gradient-to-br from-white via-white to-gray-50/50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800/50 shadow-xl overflow-hidden backdrop-blur-sm p-6">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Multiplier Legend</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="flex items-center gap-2">
              <span className={`px-2 py-1 rounded-lg text-xs font-bold ${getMultiplierBg(4.0)} ${getMultiplierColor(4.0)}`}>4.0x+</span>
              <span className="text-sm text-gray-600 dark:text-gray-400">Major Market</span>
            </div>
            <div className="flex items-center gap-2">
              <span className={`px-2 py-1 rounded-lg text-xs font-bold ${getMultiplierBg(3.0)} ${getMultiplierColor(3.0)}`}>3.0-3.9x</span>
              <span className="text-sm text-gray-600 dark:text-gray-400">Large Market</span>
            </div>
            <div className="flex items-center gap-2">
              <span className={`px-2 py-1 rounded-lg text-xs font-bold ${getMultiplierBg(2.0)} ${getMultiplierColor(2.0)}`}>2.0-2.9x</span>
              <span className="text-sm text-gray-600 dark:text-gray-400">Medium Market</span>
            </div>
            <div className="flex items-center gap-2">
              <span className={`px-2 py-1 rounded-lg text-xs font-bold ${getMultiplierBg(1.0)} ${getMultiplierColor(1.0)}`}>1.0-1.9x</span>
              <span className="text-sm text-gray-600 dark:text-gray-400">Small Market</span>
            </div>
          </div>
        </div>
      </div>
    </AppNavigation>
  );
}


