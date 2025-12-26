'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import AppNavigation from '@/components/AppNavigation';
import { marketsAPI, StatesListResponse, StateInfo } from '@/lib/api';
import { MapPin, ChevronDown, ChevronRight, TrendingUp, Building2 } from 'lucide-react';

type SortOption = 'region' | 'capacity' | 'resources';

export default function StatesPage() {
  const [statesData, setStatesData] = useState<StatesListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedRegions, setExpandedRegions] = useState<Set<string>>(new Set());
  const [sortBy, setSortBy] = useState<SortOption>('region');
  const [selectedResources, setSelectedResources] = useState<Set<string>>(new Set());

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

  const getCapacityTierColor = (tier?: string) => {
    if (tier === 'High') return 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300';
    if (tier === 'Medium') return 'bg-blue-500/20 text-blue-700 dark:text-blue-300';
    if (tier === 'Low') return 'bg-amber-500/20 text-amber-700 dark:text-amber-300';
    return 'bg-gray-500/20 text-gray-700 dark:text-gray-300';
  };

  // Get sorted states based on sort option
  const getSortedStates = () => {
    if (!statesData) return {};

    const allStates = Object.values(statesData.states_by_region).flat();

    switch (sortBy) {
      case 'capacity': {
        // Group by capacity tier
        const tierGroups: Record<string, StateInfo[]> = {
          'High Capacity': [],
          'Medium Capacity': [],
          'Low Capacity': [],
        };
        allStates.forEach(state => {
          const tier = state.capacity_tier || 'Low';
          tierGroups[`${tier} Capacity`].push(state);
        });
        // Sort within each tier by name
        Object.keys(tierGroups).forEach(tier => {
          tierGroups[tier].sort((a, b) => a.name.localeCompare(b.name));
        });
        return tierGroups;
      }
      case 'resources': {
        // Group by primary resource (most abundant)
        const resourceGroups: Record<string, StateInfo[]> = {};
        allStates.forEach(state => {
          const resources = state.extractable_resources || [];
          const primaryResource = resources[0] || 'No Resources';
          if (!resourceGroups[primaryResource]) {
            resourceGroups[primaryResource] = [];
          }
          resourceGroups[primaryResource].push(state);
        });
        // Sort within each group by name
        Object.keys(resourceGroups).forEach(resource => {
          resourceGroups[resource].sort((a, b) => a.name.localeCompare(b.name));
        });
        return resourceGroups;
      }
      default: // 'region'
        return statesData.states_by_region;
    }
  };

  const getFilteredStates = (states: Record<string, StateInfo[]>) => {
    if (selectedResources.size === 0) return states;

    const filtered: Record<string, StateInfo[]> = {};

    Object.entries(states).forEach(([group, stateList]) => {
      const matchingStates = stateList.filter(state => {
        const stateResources = state.extractable_resources || [];
        return Array.from(selectedResources).some(resource =>
          stateResources.includes(resource)
        );
      });

      if (matchingStates.length > 0) {
        filtered[group] = matchingStates;
      }
    });

    return filtered;
  };

  const sortedGroups = getFilteredStates(getSortedStates());
  const groupNames = sortBy === 'region' ? statesData?.regions || [] : Object.keys(sortedGroups);

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
                  {Object.values(sortedGroups).flat().length} states
                  {selectedResources.size > 0 && ` (filtered from ${statesData.total_states})`}
                  {' across '}{Object.keys(sortedGroups).length} {sortBy === 'region' ? 'regions' : 'groups'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Info Banner & Sort Controls */}
        <div className="grid md:grid-cols-3 gap-4">
          <div className="rounded-xl border border-corporate-blue/20 bg-corporate-blue/5 dark:bg-corporate-blue/10 p-4">
            <div className="flex items-start gap-3">
              <TrendingUp className="h-5 w-5 text-corporate-blue dark:text-corporate-blue-light mt-0.5" />
              <div>
                <p className="text-sm font-medium text-corporate-blue dark:text-corporate-blue-light">Market Multipliers & Capacity</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  States with higher multipliers have more capacity for business units.
                  Click on a state to enter markets and build units.
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-gray-200/50 dark:border-gray-700/50 bg-white dark:bg-gray-900 p-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Sort States By
            </label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-corporate-blue focus:border-transparent"
            >
              <option value="region">Region (Default)</option>
              <option value="capacity">Capacity (High/Medium/Low)</option>
              <option value="resources">Resources Available</option>
            </select>
          </div>

          {/* Resource Filter */}
          <div className="rounded-xl border border-gray-200/50 dark:border-gray-700/50 bg-white dark:bg-gray-900 p-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Filter by Resources
            </label>
            <div className="grid grid-cols-2 gap-2">
              {['Oil', 'Steel', 'Rare Earth', 'Copper', 'Fertile Land', 'Lumber', 'Chemical Compounds'].map(resource => (
                <label key={resource} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedResources.has(resource)}
                    onChange={(e) => {
                      const next = new Set(selectedResources);
                      if (e.target.checked) {
                        next.add(resource);
                      } else {
                        next.delete(resource);
                      }
                      setSelectedResources(next);
                    }}
                    className="rounded border-gray-300 dark:border-gray-600 text-corporate-blue focus:ring-corporate-blue"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">{resource}</span>
                </label>
              ))}
            </div>
            {selectedResources.size > 0 && (
              <button
                onClick={() => setSelectedResources(new Set())}
                className="mt-3 text-sm text-corporate-blue hover:text-corporate-blue-dark underline"
              >
                Clear all filters
              </button>
            )}
          </div>
        </div>

        {/* Grouped States */}
        <div className="space-y-4">
          {groupNames.map((groupName) => {
            const states = sortedGroups[groupName] || [];
            const isExpanded = expandedRegions.has(groupName);

            return (
              <div
                key={groupName}
                className="relative rounded-2xl border border-gray-200/50 dark:border-gray-700/50 bg-gradient-to-br from-white via-white to-gray-50/50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800/50 shadow-xl overflow-hidden backdrop-blur-sm"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-corporate-blue/5 via-transparent to-corporate-blue-light/5 dark:from-corporate-blue/10 dark:via-transparent dark:to-corporate-blue-dark/10 pointer-events-none" />

                {/* Group Header */}
                <button
                  onClick={() => toggleRegion(groupName)}
                  className="relative w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl font-bold text-gray-900 dark:text-white">{groupName}</span>
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
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <h3 className="font-semibold text-gray-900 dark:text-white group-hover:text-corporate-blue dark:group-hover:text-corporate-blue-light transition-colors">
                                {state.name}
                              </h3>
                              <p className="text-xs text-gray-500 dark:text-gray-400">{state.code}</p>
                            </div>
                            <div className={`px-2 py-1 rounded-lg text-xs font-bold ${getMultiplierBg(state.multiplier)} ${getMultiplierColor(state.multiplier)}`}>
                              {state.multiplier.toFixed(1)}x
                            </div>
                          </div>

                          {/* Capacity Badge */}
                          {state.capacity_tier && (
                            <div className="mb-2">
                              <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${getCapacityTierColor(state.capacity_tier)}`}>
                                {state.capacity_tier} Capacity ({state.capacity} units)
                              </span>
                            </div>
                          )}

                          {/* Resource Badges */}
                          {state.extractable_resources && state.extractable_resources.length > 0 && (
                            <div className="flex flex-wrap gap-1 mb-2">
                              {state.extractable_resources.slice(0, 3).map(resource => (
                                <span key={resource} className="inline-block px-1.5 py-0.5 rounded text-[10px] font-medium bg-purple-500/20 text-purple-700 dark:text-purple-300">
                                  {resource}
                                </span>
                              ))}
                              {state.extractable_resources.length > 3 && (
                                <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-medium bg-gray-500/20 text-gray-700 dark:text-gray-300">
                                  +{state.extractable_resources.length - 3}
                                </span>
                              )}
                            </div>
                          )}

                          <div className="mt-2 flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
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


