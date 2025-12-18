"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import AppNavigation from '@/components/AppNavigation';
import TickerTape from '@/components/TickerTape';
import { corporationAPI, CorporationResponse } from '@/lib/api';
import { Building2, Plus, TrendingUp, TrendingDown, Clock, FileText, ChevronRight, ArrowUpRight, ArrowDownRight } from 'lucide-react';

export default function StockMarketPage() {
  const router = useRouter();
  const [corporations, setCorporations] = useState<CorporationResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [activeTab, setActiveTab] = useState<'stocks' | 'bonds'>('stocks');

  useEffect(() => {
    const fetchCorporations = async () => {
      try {
        const data = await corporationAPI.getAll();
        setCorporations(data);
      } catch (err) {
        console.error('Failed to fetch corporations:', err);
        setError('Failed to load corporations');
      } finally {
        setLoading(false);
      }
    };

    fetchCorporations();
  }, []);

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

  // Calculate change percentage (placeholder - using share_price as baseline)
  const getChange = (corp: CorporationResponse) => {
    const basePrice = 1.0;
    const change = ((corp.share_price - basePrice) / basePrice) * 100;
    return change;
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

