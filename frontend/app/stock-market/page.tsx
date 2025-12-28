"use client";

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import AppNavigation from '@/components/AppNavigation';
import TickerTape from '@/components/TickerTape';
import { corporationAPI, CorporationResponse, marketsAPI, CommodityPrice, ProductMarketData, MarketMetadataResponse, sharesAPI, SharePriceHistoryResponse } from '@/lib/api';
import { Building2, Plus, TrendingUp, TrendingDown, Clock, FileText, ChevronRight, ArrowUpRight, ArrowDownRight, Package, Droplets, Cpu, Zap, Wheat, Trees, FlaskConical, MapPin, Box, Lightbulb, Pill, Wrench, Truck, Shield, UtensilsCrossed, GitBranch, Mountain, Flame } from 'lucide-react';
import CommodityRelationshipChart from '@/components/CommodityRelationshipChart';

// Resource icon mapping (raw materials extracted from nature)
const RESOURCE_ICONS: Record<string, React.ReactNode> = {
  'Oil': <Droplets className="w-5 h-5" />,
  'Iron Ore': <Mountain className="w-5 h-5" />,
  'Rare Earth': <Cpu className="w-5 h-5" />,
  'Copper': <Zap className="w-5 h-5" />,
  'Fertile Land': <Wheat className="w-5 h-5" />,
  'Lumber': <Trees className="w-5 h-5" />,
  'Chemical Compounds': <FlaskConical className="w-5 h-5" />,
  'Coal': <Flame className="w-5 h-5" />,
};

// Resource color mapping (raw materials extracted from nature)
const RESOURCE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  'Oil': { bg: 'bg-slate-900', text: 'text-slate-100', border: 'border-slate-700' },
  'Iron Ore': { bg: 'bg-red-800', text: 'text-red-100', border: 'border-red-700' },
  'Rare Earth': { bg: 'bg-violet-600', text: 'text-violet-100', border: 'border-violet-500' },
  'Copper': { bg: 'bg-orange-600', text: 'text-orange-100', border: 'border-orange-500' },
  'Fertile Land': { bg: 'bg-lime-600', text: 'text-lime-100', border: 'border-lime-500' },
  'Lumber': { bg: 'bg-amber-700', text: 'text-amber-100', border: 'border-amber-600' },
  'Chemical Compounds': { bg: 'bg-cyan-600', text: 'text-cyan-100', border: 'border-cyan-500' },
  'Coal': { bg: 'bg-gray-800', text: 'text-gray-100', border: 'border-gray-700' },
};

// Product icon mapping (manufactured goods produced by production units)
const PRODUCT_ICONS: Record<string, React.ReactNode> = {
  'Technology Products': <Cpu className="w-5 h-5" />,
  'Manufactured Goods': <Wrench className="w-5 h-5" />,
  'Electricity': <Lightbulb className="w-5 h-5" />,
  'Food Products': <UtensilsCrossed className="w-5 h-5" />,
  'Construction Capacity': <Building2 className="w-5 h-5" />,
  'Pharmaceutical Products': <Pill className="w-5 h-5" />,
  'Defense Equipment': <Shield className="w-5 h-5" />,
  'Logistics Capacity': <Truck className="w-5 h-5" />,
  'Steel': <Package className="w-5 h-5" />,
};

// Product color mapping (manufactured goods produced by production units)
const PRODUCT_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  'Technology Products': { bg: 'bg-indigo-600', text: 'text-indigo-100', border: 'border-indigo-500' },
  'Manufactured Goods': { bg: 'bg-gray-600', text: 'text-gray-100', border: 'border-gray-500' },
  'Electricity': { bg: 'bg-yellow-500', text: 'text-yellow-900', border: 'border-yellow-400' },
  'Food Products': { bg: 'bg-green-600', text: 'text-green-100', border: 'border-green-500' },
  'Construction Capacity': { bg: 'bg-stone-600', text: 'text-stone-100', border: 'border-stone-500' },
  'Pharmaceutical Products': { bg: 'bg-rose-600', text: 'text-rose-100', border: 'border-rose-500' },
  'Defense Equipment': { bg: 'bg-red-700', text: 'text-red-100', border: 'border-red-600' },
  'Logistics Capacity': { bg: 'bg-blue-600', text: 'text-blue-100', border: 'border-blue-500' },
  'Steel': { bg: 'bg-zinc-600', text: 'text-zinc-100', border: 'border-zinc-500' },
};

function StockMarketPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [corporations, setCorporations] = useState<CorporationResponse[]>([]);
  const [priceChanges, setPriceChanges] = useState<Record<number, number>>({});
  const [commodities, setCommodities] = useState<CommodityPrice[]>([]);
  const [products, setProducts] = useState<ProductMarketData[]>([]);
  const [commoditySupply, setCommoditySupply] = useState<Record<string, number>>({});
  const [commodityDemand, setCommodityDemand] = useState<Record<string, number>>({});
  const [marketMetadata, setMarketMetadata] = useState<MarketMetadataResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [commoditiesLoading, setCommoditiesLoading] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState<'resources' | 'products' | 'charts'>('resources');
  const [error, setError] = useState('');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [activeTab, setActiveTab] = useState<'stocks' | 'products' | 'bonds'>('stocks');

  // Handle URL query parameters for tabs
  useEffect(() => {
    const tab = searchParams.get('tab');
    const subtab = searchParams.get('subtab');

    if (tab === 'products' || tab === 'bonds') {
      setActiveTab(tab as 'products' | 'bonds');
    }
    if (subtab === 'resources' || subtab === 'products' || subtab === 'charts') {
      setActiveSubTab(subtab as 'resources' | 'products' | 'charts');
    }
  }, [searchParams]);

  // Calculate trailing 4-period average price change
  const calculateTrailing4PeriodChange = (history: SharePriceHistoryResponse[]): number => {
    if (history.length < 2) return 0;

    // Need at least 2 data points to calculate 1 change, up to 5 points for 4 changes
    const sortedHistory = [...history].sort((a, b) =>
      new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime()
    );

    const changes: number[] = [];
    for (let i = 1; i < sortedHistory.length; i++) {
      const oldPrice = sortedHistory[i - 1].share_price;
      const newPrice = sortedHistory[i].share_price;
      if (oldPrice > 0) {
        const change = ((newPrice - oldPrice) / oldPrice) * 100;
        changes.push(change);
      }
    }

    // Take the last 4 changes (or fewer if we don't have 4)
    const lastChanges = changes.slice(-4);
    if (lastChanges.length === 0) return 0;

    // Calculate average
    const sum = lastChanges.reduce((acc, val) => acc + val, 0);
    return sum / lastChanges.length;
  };

  useEffect(() => {
    const fetchCorporations = async () => {
      try {
        const data = await corporationAPI.getAll();
        setCorporations(data);

        // Fetch price history for each corporation to calculate trailing average
        const priceChangeMap: Record<number, number> = {};
        await Promise.all(
          data.map(async (corp) => {
            try {
              const history = await sharesAPI.getPriceHistory(corp.id, undefined, 5);
              const avgChange = calculateTrailing4PeriodChange(history);
              priceChangeMap[corp.id] = avgChange;
            } catch (err) {
              console.error(`Failed to fetch price history for ${corp.name}:`, err);
              priceChangeMap[corp.id] = 0;
            }
          })
        );
        setPriceChanges(priceChangeMap);
      } catch (err) {
        console.error('Failed to fetch corporations:', err);
        setError('Failed to load corporations');
      } finally {
        setLoading(false);
      }
    };

    fetchCorporations();
  }, []);

  // Fetch commodities when Products tab is selected
  useEffect(() => {
    if (activeTab === 'products' && commodities.length === 0) {
      const fetchCommodities = async () => {
        setCommoditiesLoading(true);
        try {
          const [data, metadata] = await Promise.all([
            marketsAPI.getCommodities(),
            marketsAPI.getMarketMetadata().catch(() => null),
          ]);
          setCommodities(data.commodities);
          setProducts(data.products);
          setCommoditySupply(data.commodity_supply || {});
          setCommodityDemand(data.commodity_demand || {});
          if (metadata) setMarketMetadata(metadata);
        } catch (err) {
          console.error('Failed to fetch commodities:', err);
        } finally {
          setCommoditiesLoading(false);
        }
      };
      fetchCommodities();
    }
  }, [activeTab, commodities.length]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const formatCompactCurrency = (value: number) => {
    if (value >= 1_000_000_000) {
      return `$${(value / 1_000_000_000).toFixed(2)}B`;
    }
    if (value >= 1_000_000) {
      return `$${(value / 1_000_000).toFixed(2)}M`;
    }
    if (value >= 1_000) {
      return `$${(value / 1_000).toFixed(2)}K`;
    }
    return formatCurrency(value);
  };

  const formatCompactNumber = (value: number) => {
    if (value >= 1_000_000_000) {
      return `${(value / 1_000_000_000).toFixed(1)}B`;
    }
    if (value >= 1_000_000) {
      return `${(value / 1_000_000).toFixed(1)}M`;
    }
    if (value >= 1_000) {
      return `${(value / 1_000).toFixed(1)}K`;
    }
    return value.toLocaleString();
  };

  const calculateMarketCap = (shares: number, price: number) => {
    return shares * price;
  };

  // Generate symbol from corporation name
  const getSymbol = (name: string) => {
    const words = name.split(' ');
    if (words.length > 1) {
      return words.map(w => w[0]).join('').toUpperCase().slice(0, 4);
    }
    return name.toUpperCase().slice(0, 4);
  };

  // Get trailing 4-period average change for a corporation
  const getChange = (corp: CorporationResponse) => {
    return priceChanges[corp.id] || 0;
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  // Sort corporations by market cap
  const sortedCorporations = [...corporations].sort((a, b) => {
    const marketCapA = calculateMarketCap(a.shares, a.share_price);
    const marketCapB = calculateMarketCap(b.shares, b.share_price);
    return marketCapB - marketCapA;
  });

  if (loading) {
    return (
      <AppNavigation>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-lg text-gray-600 dark:text-gray-200">Loading stock market...</div>
        </div>
      </AppNavigation>
    );
  }

  if (error) {
    return (
      <AppNavigation>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-xl text-red-600 dark:text-red-400">{error}</div>
        </div>
      </AppNavigation>
    );
  }

  return (
    <AppNavigation>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 sm:py-10 space-y-5">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white">Stock Exchange</h1>
            <div className="flex items-center gap-4 mt-2 text-sm text-gray-500 dark:text-gray-400">
              <div className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                <span className="font-mono tabular-nums">{formatTime(currentTime)}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span className="text-emerald-600 dark:text-emerald-400 font-medium text-xs uppercase tracking-wide">Open</span>
              </div>
            </div>
          </div>
          <Link
            href="/corporation/create"
            className="inline-flex items-center justify-center gap-2 bg-corporate-blue text-white px-4 sm:px-5 py-2.5 rounded-lg font-semibold hover:bg-corporate-blue-dark transition-colors text-sm sm:text-base"
          >
            <Plus className="w-4 h-4" />
            <span>Create Corporation</span>
          </Link>
        </div>

        {/* Tabs */}
        <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
          <button
            onClick={() => setActiveTab('stocks')}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
              activeTab === 'stocks'
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            Stocks
          </button>
          <button
            onClick={() => setActiveTab('products')}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
              activeTab === 'products'
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <Package className="w-4 h-4" />
            Commodities
          </button>
          <button
            onClick={() => setActiveTab('bonds')}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
              activeTab === 'bonds'
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <FileText className="w-4 h-4" />
            Bonds
          </button>
        </div>

        {/* Ticker Tape - Only show for stocks */}
        {activeTab === 'stocks' && corporations.length > 0 && (
          <TickerTape corporations={corporations} />
        )}

        {/* Stock List */}
        {activeTab === 'stocks' && (
          corporations.length === 0 ? (
            <div className="rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-8 sm:p-12 text-center">
              <Building2 className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
              <p className="text-lg font-medium text-gray-900 dark:text-white mb-1">No corporations yet</p>
              <p className="text-gray-500 dark:text-gray-400 mb-6 text-sm">Be the first to create a corporation!</p>
              <Link
                href="/corporation/create"
                className="inline-flex items-center gap-2 bg-corporate-blue text-white px-5 py-2.5 rounded-lg font-semibold hover:bg-corporate-blue-dark transition-colors text-sm"
              >
                <Plus className="w-4 h-4" />
                Create Corporation
              </Link>
            </div>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="hidden lg:block bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700">
                      <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Company</th>
                      <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Price</th>
                      <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Change</th>
                      <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Div Yield</th>
                      <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Volume</th>
                      <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Market Cap</th>
                      <th className="w-10"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
                    {sortedCorporations.map((corp) => {
                      const marketCap = calculateMarketCap(corp.shares, corp.share_price);
                      const change = getChange(corp);
                      const isPositive = change >= 0;
                      const symbol = getSymbol(corp.name);

                      return (
                        <tr
                          key={corp.id}
                          onClick={() => router.push(`/corporation/${corp.id}`)}
                          className="group hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition-colors"
                        >
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3">
                              <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center overflow-hidden">
                                {corp.logo ? (
                                  <img
                                    src={corp.logo}
                                    alt={corp.name}
                                    className="w-full h-full object-cover"
                                    onError={(e) => { e.currentTarget.src = '/defaultpfp.jpg'; }}
                                  />
                                ) : (
                                  <Building2 className="w-5 h-5 text-gray-400 dark:text-gray-500" />
                                )}
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="font-mono text-xs font-bold text-corporate-blue dark:text-corporate-blue-light bg-corporate-blue/10 dark:bg-corporate-blue/20 px-1.5 py-0.5 rounded">
                                    {symbol}
                                  </span>
                                  <span className="font-semibold text-gray-900 dark:text-white truncate group-hover:text-corporate-blue dark:group-hover:text-corporate-blue-light transition-colors">
                                    {corp.name}
                                  </span>
                                </div>
                                {corp.type && (
                                  <span className="text-xs text-gray-500 dark:text-gray-400">{corp.type}</span>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <span className="font-mono font-semibold text-gray-900 dark:text-white">
                              {formatCurrency(corp.share_price)}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <span className={`inline-flex items-center gap-0.5 font-mono text-sm font-medium ${
                              isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
                            }`}>
                              {isPositive ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                              {Math.abs(change).toFixed(2)}%
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <span className="font-mono text-sm font-medium text-gray-900 dark:text-white">
                              {(corp.dividend_percentage || 0) > 0 ? `${(corp.dividend_percentage || 0).toFixed(2)}%` : '-'}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <span className="font-mono text-sm text-gray-600 dark:text-gray-300">
                              {formatCompactNumber(corp.shares)}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <span className="font-mono font-medium text-gray-900 dark:text-white">
                              {formatCompactCurrency(marketCap)}
                            </span>
                          </td>
                          <td className="py-3 px-2">
                            <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-corporate-blue dark:group-hover:text-corporate-blue-light transition-colors" />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile/Tablet Card View */}
              <div className="lg:hidden space-y-3">
                {sortedCorporations.map((corp) => {
                  const marketCap = calculateMarketCap(corp.shares, corp.share_price);
                  const change = getChange(corp);
                  const isPositive = change >= 0;
                  const symbol = getSymbol(corp.name);

                  return (
                    <Link
                      key={corp.id}
                      href={`/corporation/${corp.id}`}
                      className="block bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 hover:border-corporate-blue/50 dark:hover:border-corporate-blue/50 transition-colors active:bg-gray-50 dark:active:bg-gray-700/50"
                    >
                      {/* Top row: Logo, Name/Symbol, Price/Change */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center overflow-hidden">
                            {corp.logo ? (
                              <img
                                src={corp.logo}
                                alt={corp.name}
                                className="w-full h-full object-cover"
                                onError={(e) => { e.currentTarget.src = '/defaultpfp.jpg'; }}
                              />
                            ) : (
                              <Building2 className="w-6 h-6 text-gray-400 dark:text-gray-500" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 mb-0.5">
                              <span className="font-mono text-xs font-bold text-corporate-blue dark:text-corporate-blue-light">
                                {symbol}
                              </span>
                              {corp.type && (
                                <span className="text-xs text-gray-400 dark:text-gray-500">· {corp.type}</span>
                              )}
                            </div>
                            <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                              {corp.name}
                            </h3>
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <div className="font-mono font-bold text-gray-900 dark:text-white">
                            {formatCurrency(corp.share_price)}
                          </div>
                          <div className={`inline-flex items-center gap-0.5 font-mono text-sm font-medium ${
                            isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
                          }`}>
                            {isPositive ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                            {Math.abs(change).toFixed(2)}%
                          </div>
                        </div>
                      </div>

                      {/* Bottom row: Stats */}
                      <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
                        <div className="flex items-center gap-4">
                          <div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Div Yield</div>
                            <div className="font-mono text-sm font-medium text-gray-700 dark:text-gray-300">
                              {(corp.dividend_percentage || 0) > 0 ? `${(corp.dividend_percentage || 0).toFixed(2)}%` : '-'}
                            </div>
                          </div>
                          <div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Volume</div>
                            <div className="font-mono text-sm font-medium text-gray-700 dark:text-gray-300">
                              {formatCompactNumber(corp.shares)}
                            </div>
                          </div>
                          <div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Market Cap</div>
                            <div className="font-mono text-sm font-medium text-gray-700 dark:text-gray-300">
                              {formatCompactCurrency(marketCap)}
                            </div>
                          </div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-gray-400" />
                      </div>
                    </Link>
                  );
                })}
              </div>
            </>
          )
        )}

        {/* Commodities Market */}
        {activeTab === 'products' && (
          commoditiesLoading ? (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-8 sm:p-12 text-center">
              <div className="text-lg text-gray-600 dark:text-gray-200">Loading commodities...</div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Sub-tabs for Resources vs Products vs Charts */}
              <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1 max-w-xl">
                <button
                  onClick={() => setActiveSubTab('resources')}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                    activeSubTab === 'resources'
                      ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  <Droplets className="w-4 h-4" />
                  Raw Resources
                </button>
                <button
                  onClick={() => setActiveSubTab('products')}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                    activeSubTab === 'products'
                      ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  <Box className="w-4 h-4" />
                  Products
                </button>
                <button
                  onClick={() => setActiveSubTab('charts')}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                    activeSubTab === 'charts'
                      ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  <GitBranch className="w-4 h-4" />
                  Supply Chain
                </button>
              </div>

              {/* Info Banner - Resources */}
              {activeSubTab === 'resources' && (
                <div className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-4">
                  <div className="flex items-start gap-3">
                    <Droplets className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-amber-800 dark:text-amber-200">Raw Resources</p>
                      <p className="text-sm text-amber-700 dark:text-amber-300">
                        Natural resources from state pools. Prices based on supply scarcity. 
                        Production units in manufacturing sectors require these to operate at full efficiency.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Info Banner - Products */}
              {activeSubTab === 'products' && (
                <div className="rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-900/20 p-4">
                  <div className="flex items-start gap-3">
                    <Box className="h-5 w-5 text-indigo-600 dark:text-indigo-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-indigo-800 dark:text-indigo-200">Manufactured Products</p>
                      <p className="text-sm text-indigo-700 dark:text-indigo-300">
                        Products created by production units. Prices based on supply vs demand ratio.
                        Service sectors require these products to operate efficiently.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Raw Resources Grid */}
              {activeSubTab === 'resources' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {commodities.map((commodity) => {
                    const colors = RESOURCE_COLORS[commodity.resource] || { bg: 'bg-gray-600', text: 'text-gray-100', border: 'border-gray-500' };
                    const isPositive = commodity.priceChange >= 0;
                    
                    return (
                      <Link
                        key={commodity.resource}
                        href={`/commodity/${encodeURIComponent(commodity.resource)}`}
                        className="relative bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden hover:border-corporate-blue/50 dark:hover:border-corporate-blue/50 transition-all group hover:shadow-lg cursor-pointer"
                      >
                        {/* Header with icon and name */}
                        <div className={`${colors.bg} ${colors.text} px-4 py-3 flex items-center justify-between`}>
                          <div className="flex items-center gap-2">
                            {RESOURCE_ICONS[commodity.resource] || <Package className="w-5 h-5" />}
                            <span className="font-semibold">{commodity.resource}</span>
                          </div>
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                            isPositive 
                              ? 'bg-emerald-500/20 text-emerald-200' 
                              : 'bg-red-500/20 text-red-200'
                          }`}>
                            {isPositive ? '+' : ''}{commodity.priceChange.toFixed(1)}%
                          </span>
                        </div>

                        {/* Price info */}
                        <div className="p-4 space-y-3">
                          <div className="flex items-end justify-between">
                            <div>
                              <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Current Price</p>
                              <p className="text-2xl font-bold font-mono text-gray-900 dark:text-white">
                                {formatCurrency(commodity.currentPrice)}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Base Price</p>
                              <p className="text-sm font-mono text-gray-600 dark:text-gray-400">
                                {formatCurrency(commodity.basePrice)}
                              </p>
                            </div>
                          </div>

                          {/* Supply info */}
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <div className="flex flex-col">
                              <span className="text-gray-500 dark:text-gray-400 text-xs mb-0.5">Supply</span>
                              <span className="font-mono text-emerald-600 dark:text-emerald-400 font-medium">
                                {formatCompactNumber(commoditySupply[commodity.resource] || 0)}
                              </span>
                            </div>
                            <div className="flex flex-col">
                              <span className="text-gray-500 dark:text-gray-400 text-xs mb-0.5">Demand</span>
                              <span className="font-mono text-orange-600 dark:text-orange-400 font-medium">
                                {formatCompactNumber(commodityDemand[commodity.resource] || 0)}
                              </span>
                            </div>
                          </div>

                          {/* Scarcity indicator */}
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-500 dark:text-gray-400">Scarcity</span>
                            <span className={`font-medium ${
                              commodity.scarcityFactor >= 1.5 
                                ? 'text-red-600 dark:text-red-400'
                                : commodity.scarcityFactor >= 1.0
                                ? 'text-amber-600 dark:text-amber-400'
                                : 'text-emerald-600 dark:text-emerald-400'
                            }`}>
                              {commodity.scarcityFactor >= 1.5 ? 'High' : commodity.scarcityFactor >= 1.0 ? 'Normal' : 'Low'}
                              <span className="text-xs ml-1 font-mono">({commodity.scarcityFactor.toFixed(2)}x)</span>
                            </span>
                          </div>

                          {(() => {
                            const suppliers = marketMetadata?.resource_suppliers?.[commodity.resource] || [];
                            const consumers = marketMetadata?.resource_consumers?.[commodity.resource] || commodity.demandingSectors || [];
                            if (suppliers.length === 0 && consumers.length === 0) return null;
                            return (
                              <div className="pt-2 border-t border-gray-100 dark:border-gray-700 space-y-2">
                                {suppliers.length > 0 && (
                                  <div>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1.5">Supplied by:</p>
                                    <div className="flex flex-wrap gap-1">
                                      {suppliers.map((sector) => (
                                        <span
                                          key={sector}
                                          className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300"
                                        >
                                          {sector}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                )}
                                {consumers.length > 0 && (
                                  <div>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1.5">Used by:</p>
                                    <div className="flex flex-wrap gap-1">
                                      {consumers.map((sector) => (
                                        <span
                                          key={sector}
                                          className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300"
                                        >
                                          {sector}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })()}

                          {/* Top producers */}
                          <div className="pt-2 border-t border-gray-100 dark:border-gray-700">
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2 flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              Top Producers
                            </p>
                            <div className="space-y-1.5">
                              {commodity.topProducers.slice(0, 3).map((producer, idx) => (
                                <div key={producer.stateCode} className="flex items-center justify-between text-xs">
                                  <span className="text-gray-700 dark:text-gray-300">
                                    {idx + 1}. {producer.stateName}
                                  </span>
                                  <span className="font-mono text-gray-500 dark:text-gray-400">
                                    {producer.percentage.toFixed(1)}%
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* View details hint */}
                          <div className="pt-2 flex items-center justify-center text-xs text-corporate-blue dark:text-corporate-blue-light font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                            <ChevronRight className="w-3 h-3 mr-1" />
                            View Details
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}

              {/* Products Grid */}
              {activeSubTab === 'products' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {products.map((product) => {
                    const colors = PRODUCT_COLORS[product.product] || { bg: 'bg-gray-600', text: 'text-gray-100', border: 'border-gray-500' };
                    const priceChange = product.referenceValue > 0
                      ? ((product.currentPrice - product.referenceValue) / product.referenceValue) * 100
                      : 0;
                    const isPositive = priceChange >= 0;

                    const producingSectors = marketMetadata?.product_suppliers?.[product.product] || product.producingSectors || [];
                    const consumingSectors = marketMetadata?.product_consumers?.[product.product] || product.demandingSectors || [];

                    return (
                      <Link
                        key={product.product}
                        href={`/product/${encodeURIComponent(product.product)}`}
                        className="relative bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden hover:border-corporate-blue/50 dark:hover:border-corporate-blue/50 transition-all group hover:shadow-lg cursor-pointer"
                      >
                        {/* Header with icon and name */}
                        <div className={`${colors.bg} ${colors.text} px-4 py-3 flex items-center justify-between`}>
                          <div className="flex items-center gap-2">
                            {PRODUCT_ICONS[product.product] || <Box className="w-5 h-5" />}
                            <span className="font-semibold text-sm">{product.product}</span>
                          </div>
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                            isPositive
                              ? 'bg-emerald-500/20 text-emerald-200'
                              : 'bg-red-500/20 text-red-200'
                          }`}>
                            {isPositive ? '+' : ''}{priceChange.toFixed(1)}%
                          </span>
                        </div>

                        {/* Price info */}
                        <div className="p-4 space-y-3">
                          <div className="flex items-end justify-between">
                            <div>
                              <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Current Price</p>
                              <p className="text-2xl font-bold font-mono text-gray-900 dark:text-white">
                                {formatCurrency(product.currentPrice)}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Reference</p>
                              <p className="text-sm font-mono text-gray-600 dark:text-gray-400">
                                {formatCurrency(product.referenceValue)}
                              </p>
                            </div>
                          </div>

                          {/* Supply/Demand */}
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <div className="flex items-center justify-between">
                              <span className="text-gray-500 dark:text-gray-400">Supply</span>
                              <span className="font-mono text-emerald-600 dark:text-emerald-400 font-medium">
                                {product.supply}
                              </span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-gray-500 dark:text-gray-400">Demand</span>
                              <span className="font-mono text-orange-600 dark:text-orange-400 font-medium">
                                {product.demand}
                              </span>
                            </div>
                          </div>

                          {/* Scarcity indicator */}
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-500 dark:text-gray-400">Market</span>
                            <span className={`font-medium ${
                              product.scarcityFactor >= 1.5
                                ? 'text-red-600 dark:text-red-400'
                                : product.scarcityFactor >= 0.8
                                ? 'text-amber-600 dark:text-amber-400'
                                : 'text-emerald-600 dark:text-emerald-400'
                            }`}>
                              {product.scarcityFactor >= 1.5 ? 'Shortage' : product.scarcityFactor >= 0.8 ? 'Balanced' : 'Surplus'}
                              <span className="text-xs ml-1 font-mono">({product.scarcityFactor.toFixed(2)}x)</span>
                            </span>
                          </div>

                          {/* Producing sectors */}
                          {producingSectors.length > 0 && (
                            <div className="pt-2 border-t border-gray-100 dark:border-gray-700">
                              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1.5">Produced by:</p>
                              <div className="flex flex-wrap gap-1">
                                {producingSectors.map((sector) => (
                                  <span
                                    key={sector}
                                    className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300"
                                  >
                                    {sector}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Consuming sectors */}
                          {consumingSectors.length > 0 && (
                            <div className="pt-2 border-t border-gray-100 dark:border-gray-700">
                              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1.5">Consumed by:</p>
                              <div className="flex flex-wrap gap-1">
                                {consumingSectors.map((sector) => (
                                  <span
                                    key={sector}
                                    className="text-xs px-2 py-0.5 rounded-full bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300"
                                  >
                                    {sector}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* View details hint */}
                          <div className="pt-2 flex items-center justify-center text-xs text-corporate-blue dark:text-corporate-blue-light font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                            <ChevronRight className="w-3 h-3 mr-1" />
                            View Details
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}

              {/* Supply Chain Chart */}
              {activeSubTab === 'charts' && (
                <div className="space-y-4">
                  {/* Info Banner */}
                  <div className="rounded-xl border border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-900/20 p-4">
                    <div className="flex items-start gap-3">
                      <GitBranch className="h-5 w-5 text-purple-600 dark:text-purple-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-purple-800 dark:text-purple-200">Production Chain Overview</p>
                        <p className="text-sm text-purple-700 dark:text-purple-300">
                          Interactive visualization showing how raw resources flow through sectors to produce products.
                          Drag to pan, scroll to zoom, and click any node to view details.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Chart Component */}
                  <CommodityRelationshipChart />
                </div>
              )}
            </div>
          )
        )}

        {/* Bond Market Placeholder */}
        {activeTab === 'bonds' && (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-8 sm:p-12 text-center">
            <FileText className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1">Bond Market</h2>
            <p className="text-gray-500 dark:text-gray-400 text-sm">
              Coming soon — invest in corporate and government bonds.
            </p>
          </div>
        )}
      </div>
    </AppNavigation>
  );
}

export default function StockMarketPage() {
  return (
    <Suspense fallback={
      <AppNavigation>
        <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-corporate-blue dark:border-corporate-blue-light bloomberg:border-bloomberg-green"></div>
            <div className="text-lg text-gray-600 dark:text-gray-300 bloomberg:text-bloomberg-green font-medium">Loading market data...</div>
          </div>
        </div>
      </AppNavigation>
    }>
      <StockMarketPageContent />
    </Suspense>
  );
}
