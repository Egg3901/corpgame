'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import AppNavigation from '@/components/AppNavigation';
import { marketsAPI, ProductDetailResponse, MarketMetadataResponse, ProductPieDataResponse } from '@/lib/api';
import { formatPriceLocalized, formatNumberLocalized, categorizeDemandLevel } from '@/lib/marketUtils';
import PriceChart from '@/components/PriceChart';
import CommodityPieChart from '@/components/CommodityPieChart';
import {
  ArrowLeft,
  Building2,
  MapPin,
  TrendingUp,
  TrendingDown,
  Package,
  Cpu,
  Zap,
  Wheat,
  HardHat,
  Pill,
  Shield,
  Truck,
  Factory,
  ChevronLeft,
  ChevronRight,
  Users,
  PieChart,
  List,
} from 'lucide-react';

// Product icon mapping
const PRODUCT_ICONS: Record<string, React.ReactNode> = {
  'Manufactured Goods': <Package className="w-6 h-6" />,
  'Electricity': <Zap className="w-6 h-6" />,
  'Food Products': <Wheat className="w-6 h-6" />,
  'Construction Capacity': <HardHat className="w-6 h-6" />,
  'Pharmaceutical Products': <Pill className="w-6 h-6" />,
  'Defense Equipment': <Shield className="w-6 h-6" />,
  'Logistics Capacity': <Truck className="w-6 h-6" />,
  'Technology Products': <Cpu className="w-6 h-6" />,
};

// Product color mapping
const PRODUCT_COLORS: Record<string, { bg: string; text: string; headerBg: string }> = {
  'Manufactured Goods': { bg: 'bg-indigo-100 dark:bg-indigo-900/50', text: 'text-indigo-700 dark:text-indigo-300', headerBg: 'bg-gradient-to-br from-indigo-600 to-indigo-800' },
  'Electricity': { bg: 'bg-yellow-100 dark:bg-yellow-900/50', text: 'text-yellow-700 dark:text-yellow-300', headerBg: 'bg-gradient-to-br from-yellow-500 to-amber-700' },
  'Food Products': { bg: 'bg-green-100 dark:bg-green-900/50', text: 'text-green-700 dark:text-green-300', headerBg: 'bg-gradient-to-br from-green-600 to-emerald-800' },
  'Construction Capacity': { bg: 'bg-orange-100 dark:bg-orange-900/50', text: 'text-orange-700 dark:text-orange-300', headerBg: 'bg-gradient-to-br from-orange-600 to-amber-800' },
  'Pharmaceutical Products': { bg: 'bg-rose-100 dark:bg-rose-900/50', text: 'text-rose-700 dark:text-rose-300', headerBg: 'bg-gradient-to-br from-rose-600 to-pink-800' },
  'Defense Equipment': { bg: 'bg-slate-200 dark:bg-slate-800/50', text: 'text-slate-700 dark:text-slate-300', headerBg: 'bg-gradient-to-br from-slate-700 to-slate-900' },
  'Logistics Capacity': { bg: 'bg-blue-100 dark:bg-blue-900/50', text: 'text-blue-700 dark:text-blue-300', headerBg: 'bg-gradient-to-br from-blue-600 to-blue-800' },
  'Technology Products': { bg: 'bg-violet-100 dark:bg-violet-900/50', text: 'text-violet-700 dark:text-violet-300', headerBg: 'bg-gradient-to-br from-violet-600 to-purple-800' },
};

type Tab = 'suppliers' | 'demanders';

export default function ProductDetailPage() {
  const params = useParams();
  const productName = decodeURIComponent(params.name as string);

  const [data, setData] = useState<ProductDetailResponse | null>(null);
  const [marketMetadata, setMarketMetadata] = useState<MarketMetadataResponse | null>(null);
  const [pieData, setPieData] = useState<ProductPieDataResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<Tab>('suppliers');
  const [page, setPage] = useState(1);
  const [refreshing, setRefreshing] = useState(false);
  const [showPieCharts, setShowPieCharts] = useState(false);
  const locale = typeof navigator !== 'undefined' ? navigator.language : 'en-US';

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const result = await marketsAPI.getProductDetail(productName, page, 10, activeTab);
        setData(result);
      } catch (err: any) {
        console.error('Failed to fetch product:', err);
        setError(err.response?.data?.error || 'Failed to load product');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [productName, page, activeTab]);

  useEffect(() => {
    marketsAPI.getMarketMetadata().then(setMarketMetadata).catch(() => null);
    const interval = setInterval(async () => {
      try {
        setRefreshing(true);
        const result = await marketsAPI.getProductDetail(productName, page, 10, activeTab);
        setData(result);
        if (showPieCharts) {
          const pie = await marketsAPI.getProductPieData(productName);
          setPieData(pie);
        }
      } catch {
      } finally {
        setRefreshing(false);
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [showPieCharts]);

  // Fetch pie data when showPieCharts is enabled
  useEffect(() => {
    if (showPieCharts && !pieData) {
      marketsAPI.getProductPieData(productName).then(setPieData).catch(() => null);
    }
  }, [showPieCharts, productName, pieData]);

  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab);
    setPage(1);
  };

  const formatCurrency = (value: number) => formatPriceLocalized(value, locale);
  const formatNumber = (value: number) => formatNumberLocalized(value, locale);

  const colors = PRODUCT_COLORS[productName] || { bg: 'bg-gray-100', text: 'text-gray-700', headerBg: 'bg-gradient-to-br from-gray-600 to-gray-800' };
  const icon = PRODUCT_ICONS[productName] || <Package className="w-6 h-6" />;

  if (loading && !data) {
    return (
      <AppNavigation>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-lg text-gray-600 dark:text-gray-200">Loading product data...</div>
        </div>
      </AppNavigation>
    );
  }

  if (error || !data) {
    return (
      <AppNavigation>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <p className="text-xl text-red-600 dark:text-red-400 mb-4">{error || 'Product not found'}</p>
            <Link href="/stock-market" className="text-corporate-blue hover:underline">
              Return to Stock Market
            </Link>
          </div>
        </div>
      </AppNavigation>
    );
  }

  // Calculate price info
  const priceChange = data.price.referenceValue > 0 
    ? ((data.price.currentPrice - data.price.referenceValue) / data.price.referenceValue) * 100
    : 0;
  const isPositive = priceChange >= 0;
  const listData = activeTab === 'suppliers' ? data.suppliers || [] : data.demanders || [];
  const supplyingSectors = marketMetadata?.product_suppliers?.[productName] || data.producing_sectors;
  const demandingSectors = marketMetadata?.product_consumers?.[productName] || data.demanding_sectors;
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
                <p className="text-sm font-medium text-white/70 uppercase tracking-wider">Manufactured Product</p>
                <h1 className="text-3xl sm:text-4xl font-bold">{productName}</h1>
              </div>
            </div>

            {/* Price Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                <p className="text-sm text-white/70">Current Price</p>
                <p className="text-2xl font-bold font-mono">{formatCurrency(data.price.currentPrice)}</p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                <p className="text-sm text-white/70">Reference Value</p>
                <p className="text-2xl font-bold font-mono">{formatCurrency(data.price.referenceValue)}</p>
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
            {/* Price Chart */}
            <PriceChart
              currentPrice={data.price.currentPrice}
              fetchHistory={async (hours, limit) => {
                const history = await marketsAPI.getProductPriceHistory(productName, hours, limit);
                return history.map(h => ({
                  price: typeof h.price === 'string' ? parseFloat(h.price) : h.price,
                  recorded_at: h.recorded_at,
                  supply: typeof h.supply === 'string' ? parseFloat(h.supply) : h.supply,
                  demand: typeof h.demand === 'string' ? parseFloat(h.demand) : h.demand,
                }));
              }}
              title={`${productName} Price`}
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
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">units produced</p>
                  </div>
                  <div className="rounded-xl p-6 bg-orange-100 dark:bg-orange-900/30">
                    <p className="text-sm font-medium text-orange-700 dark:text-orange-300 mb-1">Total Demand</p>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white font-mono">
                      {formatNumber(data.total_demand)}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">units required</p>
                  </div>
                </div>
                
                {/* Supply/Demand Bar */}
                <div className="mt-6">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${data.total_supply >= data.total_demand ? 'bg-emerald-500' : 'bg-orange-500'} transition-all duration-500`}
                      style={{ width: `${Math.min(100, data.total_demand > 0 ? (data.total_supply / data.total_demand) * 100 : 100)}%` }}
                    />
                  </div>
                  <div className="flex justify-between mt-2 text-xs text-gray-500 dark:text-gray-400">
                    <span>Supply Coverage: {data.total_demand > 0 ? ((data.total_supply / data.total_demand) * 100).toFixed(1) : 100}%</span>
                    <span>{demandLevel === 'high' ? 'Shortage' : demandLevel === 'medium' ? 'Balanced' : 'Surplus'}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* View Toggle + Top Suppliers/Demanders */}
            <div className="relative rounded-2xl border border-gray-200/50 dark:border-gray-700/50 bg-gradient-to-br from-white via-white to-gray-50/50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800/50 shadow-xl overflow-hidden backdrop-blur-sm">
              <div className="relative p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <Factory className="w-5 h-5 text-corporate-blue" />
                    {activeTab === 'suppliers' ? 'Top Suppliers' : 'Top Demanders'}
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
                    {/* Tab buttons - only visible in table view */}
                    {!showPieCharts && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleTabChange('suppliers')}
                          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                            activeTab === 'suppliers'
                              ? 'bg-corporate-blue text-white'
                              : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                          }`}
                        >
                          <Factory className="w-3 h-3" />
                          Suppliers
                        </button>
                        <button
                          onClick={() => handleTabChange('demanders')}
                          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                            activeTab === 'demanders'
                              ? 'bg-orange-600 text-white'
                              : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                          }`}
                        >
                          <Users className="w-3 h-3" />
                          Demanders
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Pie Charts View */}
                {showPieCharts ? (
                  <div className="grid md:grid-cols-2 gap-6">
                    <CommodityPieChart
                      title="Top Suppliers"
                      data={pieData?.suppliers.data || []}
                      others={pieData?.suppliers.others || 0}
                      total={pieData?.suppliers.total || 0}
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
                    {listData.length === 0 ? (
                      <div className="text-center py-12">
                        <Factory className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                        <p className="text-gray-500 dark:text-gray-400">
                          No corporations currently {activeTab === 'suppliers' ? 'producing' : 'demanding'} this product
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
                                  {activeTab === 'suppliers' ? 'Production' : 'Demand'}
                                </th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
                              {listData.map((item, idx) => (
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
                                    {item.units}
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
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Producing Sectors */}
            <div className="relative rounded-2xl border border-gray-200/50 dark:border-gray-700/50 bg-gradient-to-br from-white via-white to-gray-50/50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800/50 shadow-xl overflow-hidden backdrop-blur-sm">
              <div className="relative p-6">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <Factory className="h-5 w-5 text-corporate-blue" />
                  Producing Sectors
                </h3>
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
                  <p className="text-sm text-gray-500 dark:text-gray-400">No sectors produce this product</p>
                )}
              </div>
            </div>

            {/* Demanding Sectors */}
            <div className="relative rounded-2xl border border-gray-200/50 dark:border-gray-700/50 bg-gradient-to-br from-white via-white to-gray-50/50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800/50 shadow-xl overflow-hidden backdrop-blur-sm">
              <div className="relative p-6">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <Users className="h-5 w-5 text-orange-600" />
                  Demanding Sectors
                </h3>
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
                  <p className="text-sm text-gray-500 dark:text-gray-400">No sectors demand this product</p>
                )}
              </div>
            </div>

            {/* Input Resource */}
            {data.info.inputResource && (
              <div className="relative rounded-2xl border border-gray-200/50 dark:border-gray-700/50 bg-gradient-to-br from-white via-white to-gray-50/50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800/50 shadow-xl overflow-hidden backdrop-blur-sm">
                <div className="relative p-6">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Input Resource</h3>
                  <Link
                    href={`/commodity/${encodeURIComponent(data.info.inputResource)}`}
                    className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-corporate-blue/30 dark:hover:border-corporate-blue/30 transition-colors"
                  >
                    <Package className="w-5 h-5 text-corporate-blue" />
                    <span className="font-medium text-gray-900 dark:text-white">{data.info.inputResource}</span>
                  </Link>
                </div>
              </div>
            )}

            {/* Price Info */}
            <div className="relative rounded-2xl border border-gray-200/50 dark:border-gray-700/50 bg-gradient-to-br from-white via-white to-gray-50/50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800/50 shadow-xl overflow-hidden backdrop-blur-sm">
              <div className="relative p-6">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Price Formula</h3>
                <div className="space-y-2 text-sm">
                  <p className="text-gray-600 dark:text-gray-400">
                    Price = Reference × Scarcity Factor
                  </p>
                  <p className="text-gray-600 dark:text-gray-400">
                    Scarcity = Demand / Supply
                  </p>
                  <div className="mt-4 p-3 rounded-lg bg-gray-100 dark:bg-gray-800">
                    <p className="font-mono text-xs text-gray-700 dark:text-gray-300">
                      {formatCurrency(data.price.referenceValue)} × {data.price.scarcityFactor.toFixed(2)} = {formatCurrency(data.price.currentPrice)}
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

