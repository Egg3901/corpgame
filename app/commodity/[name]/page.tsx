'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import AppNavigation from '@/components/AppNavigation';
import { marketsAPI, ResourceDetailResponse, MarketMetadataResponse, ResourcePieDataResponse, ResourceSupplierDemander } from '@/lib/api';
import { formatPriceLocalized, formatNumberLocalized, categorizeDemandLevel } from '@/lib/marketUtils';
import PriceChart from '@/components/PriceChart';
import CommodityPieChart from '@/components/CommodityPieChart';
import ProductionChainDiagram from '@/components/ProductionChainDiagram';
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
  PieChart,
  List,
} from 'lucide-react';
import { Select, SelectItem } from "@heroui/react";
import { getErrorMessage } from '@/lib/utils';

// Resource icon mapping
const RESOURCE_ICONS: Record<string, React.ReactNode> = {
  'Oil': <Droplets className="w-6 h-6" />,
  'Iron Ore': <Factory className="w-6 h-6" />,
  'Steel': <Package className="w-6 h-6" />,
  'Rare Earth': <Cpu className="w-6 h-6" />,
  'Copper': <Zap className="w-6 h-6" />,
  'Fertile Land': <Wheat className="w-6 h-6" />,
  'Lumber': <Trees className="w-6 h-6" />,
  'Chemical Compounds': <FlaskConical className="w-6 h-6" />,
  'Coal': <Factory className="w-6 h-6" />,
};

// Resource color mapping
const RESOURCE_COLORS: Record<string, { bg: string; text: string; headerBg: string }> = {
  'Oil': { bg: 'bg-slate-100 dark:bg-slate-900/50', text: 'text-slate-700 dark:text-slate-300', headerBg: 'bg-slate-900' },
  'Iron Ore': { bg: 'bg-red-100 dark:bg-red-900/50', text: 'text-red-700 dark:text-red-300', headerBg: 'bg-red-700' },
  'Steel': { bg: 'bg-zinc-100 dark:bg-zinc-900/50', text: 'text-zinc-700 dark:text-zinc-300', headerBg: 'bg-zinc-600' },
  'Rare Earth': { bg: 'bg-violet-100 dark:bg-violet-900/50', text: 'text-violet-700 dark:text-violet-300', headerBg: 'bg-violet-600' },
  'Copper': { bg: 'bg-orange-100 dark:bg-orange-900/50', text: 'text-orange-700 dark:text-orange-300', headerBg: 'bg-orange-600' },
  'Fertile Land': { bg: 'bg-lime-100 dark:bg-lime-900/50', text: 'text-lime-700 dark:text-lime-300', headerBg: 'bg-lime-600' },
  'Lumber': { bg: 'bg-amber-100 dark:bg-amber-900/50', text: 'text-amber-700 dark:text-amber-300', headerBg: 'bg-amber-700' },
  'Chemical Compounds': { bg: 'bg-cyan-100 dark:bg-cyan-900/50', text: 'text-cyan-700 dark:text-cyan-300', headerBg: 'bg-cyan-600' },
  'Coal': { bg: 'bg-stone-100 dark:bg-stone-900/50', text: 'text-stone-700 dark:text-stone-300', headerBg: 'bg-stone-800' },
};

export default function CommodityDetailPage() {
  const params = useParams();
  const resourceName = decodeURIComponent(params.name as string);

  const [data, setData] = useState<ResourceDetailResponse | null>(null);
  const [marketMetadata, setMarketMetadata] = useState<MarketMetadataResponse | null>(null);
  const [pieData, setPieData] = useState<ResourcePieDataResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState<'producers' | 'demanders'>('demanders');
  const [refreshing, setRefreshing] = useState(false);
  const [showPieCharts, setShowPieCharts] = useState(false);
  const locale = typeof navigator !== 'undefined' ? navigator.language : 'en-US';

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const result = await marketsAPI.getResourceDetail(resourceName, page, 10, filter);
        setData(result);
      } catch (err: unknown) {
        console.error('Failed to fetch resource:', err);
        setError(getErrorMessage(err, 'Failed to load resource'));
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [resourceName, page, filter]);

  useEffect(() => {
    marketsAPI.getMarketMetadata().then(setMarketMetadata).catch(() => null);
    const interval = setInterval(async () => {
      try {
        setRefreshing(true);
        const result = await marketsAPI.getResourceDetail(resourceName, page, 10, filter);
        setData(result);
        if (showPieCharts) {
          const pie = await marketsAPI.getResourcePieData(resourceName);
          setPieData(pie);
        }
      } catch {
      } finally {
        setRefreshing(false);
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [showPieCharts, resourceName, page, filter]);

  // Fetch pie data when showPieCharts is enabled
  useEffect(() => {
    if (showPieCharts && !pieData) {
      marketsAPI.getResourcePieData(resourceName).then(setPieData).catch(() => null);
    }
  }, [showPieCharts, resourceName, pieData]);

  const formatCurrency = (value: number) => formatPriceLocalized(value, locale);
  const formatNumber = (value: number) => formatNumberLocalized(value, locale);

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
  const supplyingSectors = marketMetadata?.resource_suppliers?.[resourceName] || [];
  const demandingSectors = marketMetadata?.resource_consumers?.[resourceName] || data.demanding_sectors;
  const demandLevel = categorizeDemandLevel(data.total_supply, data.total_demand);

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
                  {(data.price.scarcityFactor ?? 1) >= 1.5 ? 'High' : (data.price.scarcityFactor ?? 1) >= 1.0 ? 'Normal' : 'Low'}
                  <span className="text-sm font-mono ml-2 text-white/70">({(data.price.scarcityFactor ?? 1).toFixed(2)}x)</span>
                </p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                <p className="text-sm text-white/70">Demand Level</p>
                <p className={`text-2xl font-bold ${demandLevel === 'high' ? 'text-amber-300' : demandLevel === 'medium' ? 'text-yellow-200' : 'text-emerald-300'}`}>
                  {demandLevel.toUpperCase()}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Production Chain Diagram */}
        <ProductionChainDiagram type="resource" name={resourceName} />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Price Chart */}
            <PriceChart
              currentPrice={data.price.currentPrice}
              fetchHistory={async (hours, limit) => {
                const history = await marketsAPI.getResourcePriceHistory(resourceName, hours, limit);
                return history.map(h => ({
                  price: typeof h.price === 'string' ? parseFloat(h.price) : h.price,
                  recorded_at: h.recorded_at,
                  supply: typeof h.supply === 'string' ? parseFloat(h.supply) : h.supply,
                  demand: typeof h.demand === 'string' ? parseFloat(h.demand) : h.demand,
                }));
              }}
              title={`${resourceName} Price`}
            />

            {/* Supply & Demand */}
            <div className="relative rounded-2xl border border-gray-200/50 dark:border-gray-700/50 bg-gradient-to-br from-white via-white to-gray-50/50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800/50 shadow-xl overflow-hidden backdrop-blur-sm">
              <div className="relative p-6">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Supply & Demand</h2>
                {refreshing && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Refreshing data…</p>
                )}
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

            {/* View Toggle + Top Producers/Demanders */}
            <div className="relative rounded-2xl border border-gray-200/50 dark:border-gray-700/50 bg-gradient-to-br from-white via-white to-gray-50/50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800/50 shadow-xl overflow-hidden backdrop-blur-sm">
              <div className="relative p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <Factory className="w-5 h-5 text-corporate-blue" />
                    {filter === 'producers' ? 'Top Producers' : 'Top Demanders'}
                  </h2>
                  <div className="flex items-center gap-3">
                    {/* View Toggle */}
                    <div className="flex items-center gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-lg">
                      <button
                        onClick={() => setShowPieCharts(false)}
                        className={`p-2 rounded-md transition-all duration-200 ${
                          !showPieCharts
                            ? 'bg-white dark:bg-gray-700 text-corporate-blue dark:text-corporate-blue-light shadow-sm'
                            : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                        }`}
                        title="Table View"
                      >
                        <List className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setShowPieCharts(true)}
                        className={`p-2 rounded-md transition-all duration-200 ${
                          showPieCharts
                            ? 'bg-white dark:bg-gray-700 text-corporate-blue dark:text-corporate-blue-light shadow-sm'
                            : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                        }`}
                        title="Chart View"
                      >
                        <PieChart className="w-4 h-4" />
                      </button>
                    </div>
                    {/* Filter Dropdown - only visible in table view */}
                    {!showPieCharts && (
                      <Select
                        selectedKeys={[filter]}
                        onChange={(e) => {
                          setFilter(e.target.value as 'producers' | 'demanders');
                          setPage(1);
                        }}
                        className="w-40"
                        classNames={{
                          trigger: "h-10 min-h-10 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600",
                          value: "text-sm font-medium text-gray-900 dark:text-white"
                        }}
                        aria-label="Filter corporations"
                        labelPlacement="outside"
                        disallowEmptySelection
                      >
                        <SelectItem key="demanders">Top Demanders</SelectItem>
                        <SelectItem key="producers">Top Producers</SelectItem>
                      </Select>
                    )}
                  </div>
                </div>

                {/* Pie Charts View */}
                {showPieCharts ? (
                  <div className="grid md:grid-cols-2 gap-6">
                    <CommodityPieChart
                      title="Top Producers"
                      data={pieData?.producers.data || []}
                      others={pieData?.producers.others || 0}
                      total={pieData?.producers.total || 0}
                      type="producers"
                      valueLabel="Production"
                    />
                    <CommodityPieChart
                      title="Top Demanders"
                      data={pieData?.demanders.data || []}
                      others={pieData?.demanders.others || 0}
                      total={pieData?.demanders.total || 0}
                      type="demanders"
                      valueLabel="Demand"
                    />
                  </div>
                ) : (
                  /* Table View */
                  <>
                    {(filter === 'demanders' ? data.demanders : data.producers).length === 0 ? (
                      <div className="text-center py-12">
                        <Factory className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                        <p className="text-gray-500 dark:text-gray-400">
                          No corporations currently {filter === 'demanders' ? 'demanding' : 'producing'} this resource
                        </p>
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
                                  <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                    {filter === 'producers' ? 'Extraction Units' : 'Production Units'}
                                  </th>
                                  {filter === 'producers' && (
                                    <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Production Level</th>
                                  )}
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
                                {(filter === 'demanders' ? data.demanders : data.producers).map((item, idx) => {
                                  const itemAsProducer = item as ResourceDetailResponse['producers'][number];
                                  const itemAsDemander = item as ResourceSupplierDemander;

                                  return (
                                  <tr key={`${item.corporation_id}-${item.state_code}-${idx}`} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                                    <td className="py-3 px-4">
                                      <Link
                                        href={`/corporation/${item.corporation_id}`}
                                        className="flex items-center gap-3 hover:text-corporate-blue dark:hover:text-corporate-blue-light transition-colors"
                                      >
                                        {item.corporation_logo ? (
                                          <img
                                            src={item.corporation_logo}
                                            alt={item.corporation_name}
                                            className="w-8 h-8 rounded-lg object-cover"
                                            onError={(e) => { e.currentTarget.src = '/defaultpfp.jpg'; }}
                                          />
                                        ) : (
                                          <div className="w-8 h-8 rounded-lg bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                                            <Building2 className="w-4 h-4 text-gray-400" />
                                          </div>
                                        )}
                                        <span className="font-medium text-gray-900 dark:text-white">{item.corporation_name}</span>
                                      </Link>
                                    </td>
                                    <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400">{item.sector_type}</td>
                                    <td className="py-3 px-4">
                                      <Link
                                        href={`/states/${item.state_code}`}
                                        className="inline-flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400 hover:text-corporate-blue dark:hover:text-corporate-blue-light transition-colors"
                                      >
                                        <MapPin className="w-3 h-3" />
                                        {item.state_name}
                                      </Link>
                                    </td>
                                    <td className="py-3 px-4 text-right font-mono font-semibold text-gray-900 dark:text-white">
                                      {filter === 'producers' ? itemAsProducer.extraction_units : itemAsDemander.production_units}
                                    </td>
                                    {filter === 'producers' && (
                                      <td className="py-3 px-4 text-right font-mono text-sm text-gray-600 dark:text-gray-400">
                                        {formatNumber(itemAsProducer.production_level)}
                                      </td>
                                    )}
                                  </tr>
                                );
                                })}
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
                    </>
                  )}
                {/* End of conditional view */}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Top Producing States (by actual production) */}
            <div className="relative rounded-2xl border border-gray-200/50 dark:border-gray-700/50 bg-gradient-to-br from-white via-white to-gray-50/50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800/50 shadow-xl overflow-hidden backdrop-blur-sm">
              <div className="relative p-6">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-corporate-blue" />
                  Top Producing States
                </h3>
                <div className="space-y-3">
                  {data.top_producing_states.length === 0 ? (
                    <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">No production yet</p>
                  ) : (
                    data.top_producing_states.map((state) => (
                      <Link
                        key={state.stateCode}
                        href={`/states/${state.stateCode}`}
                        className="flex items-center justify-between p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-corporate-blue/30 dark:hover:border-corporate-blue/30 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                            state.rank === 1 ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300' :
                            state.rank === 2 ? 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300' :
                            state.rank === 3 ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300' :
                            'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                          }`}>
                            {state.rank}
                          </span>
                          <span className="font-medium text-gray-900 dark:text-white">{state.stateName}</span>
                        </div>
                        <div className="text-right">
                          <p className="font-mono font-semibold text-gray-900 dark:text-white">{formatNumber(state.productionLevel)}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{state.extractionUnits} units</p>
                        </div>
                      </Link>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Resource-Rich States - only show if data exists */}
            {data.info.topStates && data.info.topStates.length > 0 && (
              <div className="relative rounded-2xl border border-gray-200/50 dark:border-gray-700/50 bg-gradient-to-br from-white via-white to-gray-50/50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800/50 shadow-xl overflow-hidden backdrop-blur-sm">
                <div className="relative p-6">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-corporate-blue" />
                    Resource-Rich States
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
            )}

            {/* Supplying Sectors */}
            <div className="relative rounded-2xl border border-gray-200/50 dark:border-gray-700/50 bg-gradient-to-br from-white via-white to-gray-50/50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800/50 shadow-xl overflow-hidden backdrop-blur-sm">
              <div className="relative p-6">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Supplying Sectors</h3>
                <div className="flex flex-wrap gap-2">
                  {supplyingSectors.map((sector) => (
                    <span
                      key={sector}
                      className={`px-3 py-1.5 rounded-full text-sm font-medium ${colors.bg} ${colors.text}`}
                    >
                      {sector}
                    </span>
                  ))}
                </div>
                {supplyingSectors.length === 0 && (
                  <p className="text-sm text-gray-500 dark:text-gray-400">No sectors supply this resource</p>
                )}
              </div>
            </div>

            {/* Demanding Sectors */}
            <div className="relative rounded-2xl border border-gray-200/50 dark:border-gray-700/50 bg-gradient-to-br from-white via-white to-gray-50/50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800/50 shadow-xl overflow-hidden backdrop-blur-sm">
              <div className="relative p-6">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Demanding Sectors</h3>
                <div className="flex flex-wrap gap-2">
                  {demandingSectors.map((sector) => (
                    <span
                      key={sector}
                      className="px-3 py-1.5 rounded-full text-sm font-medium bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300"
                    >
                      {sector}
                    </span>
                  ))}
                </div>
                {demandingSectors.length === 0 && (
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
                      {formatCurrency(data.price.basePrice)} × {(data.price.scarcityFactor ?? 1).toFixed(2)} = {formatCurrency(data.price.currentPrice)}
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


