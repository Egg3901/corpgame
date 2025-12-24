'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import AppNavigation from '@/components/AppNavigation';
import { marketsAPI, ResourceDetailResponse } from '@/lib/api';
import {
  ArrowLeft,
  Building2,
  MapPin,
  TrendingUp,
  TrendingDown,
  Droplets,
  Package,
  Cpu,
  Zap,
  Wheat,
  Trees,
  FlaskConical,
  Factory,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

// Resource icon mapping
const RESOURCE_ICONS: Record<string, React.ReactNode> = {
  'Oil': <Droplets className="w-6 h-6" />,
  'Steel': <Package className="w-6 h-6" />,
  'Rare Earth': <Cpu className="w-6 h-6" />,
  'Copper': <Zap className="w-6 h-6" />,
  'Fertile Land': <Wheat className="w-6 h-6" />,
  'Lumber': <Trees className="w-6 h-6" />,
  'Chemical Compounds': <FlaskConical className="w-6 h-6" />,
};

// Resource color mapping
const RESOURCE_COLORS: Record<string, { bg: string; text: string; headerBg: string }> = {
  'Oil': { bg: 'bg-slate-100 dark:bg-slate-900/50', text: 'text-slate-700 dark:text-slate-300', headerBg: 'bg-slate-900' },
  'Steel': { bg: 'bg-zinc-100 dark:bg-zinc-900/50', text: 'text-zinc-700 dark:text-zinc-300', headerBg: 'bg-zinc-600' },
  'Rare Earth': { bg: 'bg-violet-100 dark:bg-violet-900/50', text: 'text-violet-700 dark:text-violet-300', headerBg: 'bg-violet-600' },
  'Copper': { bg: 'bg-orange-100 dark:bg-orange-900/50', text: 'text-orange-700 dark:text-orange-300', headerBg: 'bg-orange-600' },
  'Fertile Land': { bg: 'bg-lime-100 dark:bg-lime-900/50', text: 'text-lime-700 dark:text-lime-300', headerBg: 'bg-lime-600' },
  'Lumber': { bg: 'bg-amber-100 dark:bg-amber-900/50', text: 'text-amber-700 dark:text-amber-300', headerBg: 'bg-amber-700' },
  'Chemical Compounds': { bg: 'bg-cyan-100 dark:bg-cyan-900/50', text: 'text-cyan-700 dark:text-cyan-300', headerBg: 'bg-cyan-600' },
};

export default function CommodityDetailPage() {
  const params = useParams();
  const resourceName = decodeURIComponent(params.name as string);

  const [data, setData] = useState<ResourceDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const result = await marketsAPI.getResourceDetail(resourceName, page, 10);
        setData(result);
      } catch (err: any) {
        console.error('Failed to fetch resource:', err);
        setError(err.response?.data?.error || 'Failed to load resource');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [resourceName, page]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('en-US').format(value);
  };

  const colors = RESOURCE_COLORS[resourceName] || { bg: 'bg-gray-100', text: 'text-gray-700', headerBg: 'bg-gray-600' };
  const icon = RESOURCE_ICONS[resourceName] || <Package className="w-6 h-6" />;

  if (loading && !data) {
    return (
      <AppNavigation>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-lg text-gray-600 dark:text-gray-200">Loading resource data...</div>
        </div>
      </AppNavigation>
    );
  }

  if (error || !data) {
    return (
      <AppNavigation>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <p className="text-xl text-red-600 dark:text-red-400 mb-4">{error || 'Resource not found'}</p>
            <Link href="/stock-market" className="text-corporate-blue hover:underline">
              Return to Stock Market
            </Link>
          </div>
        </div>
      </AppNavigation>
    );
  }

  const priceChange = ((data.price.currentPrice - data.price.basePrice) / data.price.basePrice) * 100;
  const isPositive = priceChange >= 0;

  return (
    <AppNavigation>
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 space-y-6">
        {/* Back Button */}
        <Link
          href="/stock-market"
          className="inline-flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-corporate-blue dark:hover:text-corporate-blue-light transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Stock Market
        </Link>

        {/* Header */}
        <div className={`relative rounded-2xl ${colors.headerBg} text-white shadow-2xl overflow-hidden`}>
          <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-black/20 pointer-events-none" />
          <div className="relative p-6 sm:p-8">
            <div className="flex items-center gap-4 mb-6">
              <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
                {icon}
              </div>
              <div>
                <p className="text-sm font-medium text-white/70 uppercase tracking-wider">Raw Resource</p>
                <h1 className="text-3xl sm:text-4xl font-bold">{resourceName}</h1>
              </div>
            </div>

            {/* Price Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                <p className="text-sm text-white/70">Current Price</p>
                <p className="text-2xl font-bold font-mono">{formatCurrency(data.price.currentPrice)}</p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                <p className="text-sm text-white/70">Base Price</p>
                <p className="text-2xl font-bold font-mono">{formatCurrency(data.price.basePrice)}</p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                <p className="text-sm text-white/70">Change</p>
                <p className={`text-2xl font-bold font-mono flex items-center gap-1 ${isPositive ? 'text-emerald-300' : 'text-red-300'}`}>
                  {isPositive ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
                  {isPositive ? '+' : ''}{priceChange.toFixed(2)}%
                </p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                <p className="text-sm text-white/70">Scarcity</p>
                <p className="text-2xl font-bold">
                  {data.price.scarcityFactor >= 1.5 ? 'High' : data.price.scarcityFactor >= 1.0 ? 'Normal' : 'Low'}
                  <span className="text-sm font-mono ml-2 text-white/70">({data.price.scarcityFactor.toFixed(2)}x)</span>
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Supply & Demand */}
            <div className="relative rounded-2xl border border-gray-200/50 dark:border-gray-700/50 bg-gradient-to-br from-white via-white to-gray-50/50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800/50 shadow-xl overflow-hidden backdrop-blur-sm">
              <div className="relative p-6">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Supply & Demand</h2>
                <div className="grid grid-cols-2 gap-6">
                  <div className={`rounded-xl p-6 ${colors.bg}`}>
                    <p className={`text-sm font-medium ${colors.text} mb-1`}>Total Supply</p>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white font-mono">
                      {formatNumber(data.total_supply)}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">units available</p>
                  </div>
                  <div className="rounded-xl p-6 bg-orange-100 dark:bg-orange-900/30">
                    <p className="text-sm font-medium text-orange-700 dark:text-orange-300 mb-1">Total Demand</p>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white font-mono">
                      {formatNumber(data.total_demand)}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">units required</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Top Demanders Table */}
            <div className="relative rounded-2xl border border-gray-200/50 dark:border-gray-700/50 bg-gradient-to-br from-white via-white to-gray-50/50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800/50 shadow-xl overflow-hidden backdrop-blur-sm">
              <div className="relative p-6">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <Factory className="w-5 h-5 text-corporate-blue" />
                  Top Demanders
                </h2>
                
                {data.suppliers.length === 0 ? (
                  <div className="text-center py-12">
                    <Factory className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                    <p className="text-gray-500 dark:text-gray-400">No corporations currently demanding this resource</p>
                  </div>
                ) : (
                  <>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-gray-200 dark:border-gray-700">
                            <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Corporation</th>
                            <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Sector</th>
                            <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Location</th>
                            <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Units</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
                          {data.suppliers.map((supplier, idx) => (
                            <tr key={`${supplier.corporation_id}-${supplier.state_code}-${idx}`} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                              <td className="py-3 px-4">
                                <Link
                                  href={`/corporation/${supplier.corporation_id}`}
                                  className="flex items-center gap-3 hover:text-corporate-blue dark:hover:text-corporate-blue-light transition-colors"
                                >
                                  {supplier.corporation_logo ? (
                                    <img
                                      src={supplier.corporation_logo}
                                      alt={supplier.corporation_name}
                                      className="w-8 h-8 rounded-lg object-cover"
                                      onError={(e) => { e.currentTarget.src = '/defaultpfp.jpg'; }}
                                    />
                                  ) : (
                                    <div className="w-8 h-8 rounded-lg bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                                      <Building2 className="w-4 h-4 text-gray-400" />
                                    </div>
                                  )}
                                  <span className="font-medium text-gray-900 dark:text-white">{supplier.corporation_name}</span>
                                </Link>
                              </td>
                              <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">{supplier.sector_type}</td>
                              <td className="py-3 px-4">
                                <Link
                                  href={`/states/${supplier.state_code}`}
                                  className="inline-flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400 hover:text-corporate-blue dark:hover:text-corporate-blue-light transition-colors"
                                >
                                  <MapPin className="w-3 h-3" />
                                  {supplier.state_name}
                                </Link>
                              </td>
                              <td className="py-3 px-4 text-right font-mono font-semibold text-gray-900 dark:text-white">
                                {supplier.production_units}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Pagination */}
                    {data.pagination.total_pages > 1 && (
                      <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Page {data.pagination.page} of {data.pagination.total_pages} ({data.pagination.total} total)
                        </p>
                        <div className="flex gap-2">
                          <button
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            disabled={page === 1}
                            className="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors flex items-center gap-1"
                          >
                            <ChevronLeft className="w-4 h-4" />
                            Prev
                          </button>
                          <button
                            onClick={() => setPage(p => Math.min(data.pagination.total_pages, p + 1))}
                            disabled={page === data.pagination.total_pages}
                            className="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors flex items-center gap-1"
                          >
                            Next
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Top Producing States */}
            <div className="relative rounded-2xl border border-gray-200/50 dark:border-gray-700/50 bg-gradient-to-br from-white via-white to-gray-50/50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800/50 shadow-xl overflow-hidden backdrop-blur-sm">
              <div className="relative p-6">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-corporate-blue" />
                  Top Producing States
                </h3>
                <div className="space-y-3">
                  {data.info.topStates.map((state, idx) => (
                    <Link
                      key={state.stateCode}
                      href={`/states/${state.stateCode}`}
                      className="flex items-center justify-between p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-corporate-blue/30 dark:hover:border-corporate-blue/30 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                          idx === 0 ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300' :
                          idx === 1 ? 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300' :
                          idx === 2 ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300' :
                          'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                        }`}>
                          {idx + 1}
                        </span>
                        <span className="font-medium text-gray-900 dark:text-white">{state.stateName}</span>
                      </div>
                      <div className="text-right">
                        <p className="font-mono font-semibold text-gray-900 dark:text-white">{formatNumber(state.amount)}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{state.percentage.toFixed(1)}%</p>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            </div>

            {/* Demanding Sectors */}
            <div className="relative rounded-2xl border border-gray-200/50 dark:border-gray-700/50 bg-gradient-to-br from-white via-white to-gray-50/50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800/50 shadow-xl overflow-hidden backdrop-blur-sm">
              <div className="relative p-6">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Demanding Sectors</h3>
                <div className="flex flex-wrap gap-2">
                  {data.demanding_sectors.map((sector) => (
                    <span
                      key={sector}
                      className="px-3 py-1.5 rounded-full text-sm font-medium bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300"
                    >
                      {sector}
                    </span>
                  ))}
                </div>
                {data.demanding_sectors.length === 0 && (
                  <p className="text-sm text-gray-500 dark:text-gray-400">No sectors demand this resource</p>
                )}
              </div>
            </div>

            {/* Price Info */}
            <div className="relative rounded-2xl border border-gray-200/50 dark:border-gray-700/50 bg-gradient-to-br from-white via-white to-gray-50/50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800/50 shadow-xl overflow-hidden backdrop-blur-sm">
              <div className="relative p-6">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Price Formula</h3>
                <div className="space-y-2 text-sm">
                  <p className="text-gray-600 dark:text-gray-400">
                    Price = Base × Scarcity Factor
                  </p>
                  <p className="text-gray-600 dark:text-gray-400">
                    Scarcity = Reference / Actual Supply
                  </p>
                  <div className="mt-4 p-3 rounded-lg bg-gray-100 dark:bg-gray-800">
                    <p className="font-mono text-xs text-gray-700 dark:text-gray-300">
                      {formatCurrency(data.price.basePrice)} × {data.price.scarcityFactor.toFixed(2)} = {formatCurrency(data.price.currentPrice)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppNavigation>
  );
}

