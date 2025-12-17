"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import AppNavigation from '@/components/AppNavigation';
import TickerTape from '@/components/TickerTape';
import { corporationAPI, CorporationResponse } from '@/lib/api';
import { Building2, Plus, TrendingUp, DollarSign, Users, Clock, FileText } from 'lucide-react';

export default function StockMarketPage() {
  const router = useRouter();
  const [corporations, setCorporations] = useState<CorporationResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentTime, setCurrentTime] = useState(new Date());

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
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">Stock Exchange</h1>
            <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                <span className="font-mono-numeric">{formatTime(currentTime)}</span>
              </div>
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                MARKET OPEN
              </span>
            </div>
          </div>
          <Link
            href="/corporation/create"
            className="inline-flex items-center gap-2 bg-corporate-blue text-white px-6 py-3 rounded-lg font-semibold hover:bg-corporate-blue-dark transition-colors shadow-md hover:shadow-lg"
          >
            <Plus className="w-5 h-5" />
            Create Corporation
          </Link>
        </div>

        {/* Tabs */}
        <div className="relative rounded-2xl border border-gray-200/50 dark:border-gray-700/50 bg-gradient-to-br from-white via-white to-gray-50/50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800/50 shadow-2xl overflow-hidden backdrop-blur-sm">
          <div className="absolute inset-0 bg-gradient-to-br from-corporate-blue/5 via-transparent to-corporate-blue-light/5 dark:from-corporate-blue/10 dark:via-transparent dark:to-corporate-blue-dark/10 pointer-events-none" />
          <div className="absolute inset-0 ring-1 ring-inset ring-white/20 dark:ring-gray-700/30 pointer-events-none" />
          <div className="relative border-b border-gray-200 dark:border-gray-700">
            <div className="flex">
              <button
                onClick={() => setActiveTab('stocks')}
                className={`flex-1 px-6 py-4 text-sm font-semibold transition-colors ${
                  activeTab === 'stocks'
                    ? 'text-corporate-blue dark:text-corporate-blue-light border-b-2 border-corporate-blue dark:border-corporate-blue-light bg-corporate-blue/5 dark:bg-corporate-blue/10'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                <div className="flex items-center justify-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  Stocks
                </div>
              </button>
              <button
                onClick={() => setActiveTab('bonds')}
                className={`flex-1 px-6 py-4 text-sm font-semibold transition-colors ${
                  activeTab === 'bonds'
                    ? 'text-corporate-blue dark:text-corporate-blue-light border-b-2 border-corporate-blue dark:border-corporate-blue-light bg-corporate-blue/5 dark:bg-corporate-blue/10'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                <div className="flex items-center justify-center gap-2">
                  <FileText className="w-4 h-4" />
                  Bonds
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* Ticker Tape - Only show for stocks */}
        {activeTab === 'stocks' && corporations.length > 0 && (
          <div className="mb-6">
            <TickerTape corporations={corporations} />
          </div>
        )}

        {/* Stock Table */}
        {activeTab === 'stocks' && (
        {corporations.length === 0 ? (
          <div className="rounded-xl border border-white/60 bg-white/80 backdrop-blur shadow-xl dark:border-gray-800/60 dark:bg-gray-900/80 p-12 text-center">
            <Building2 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-xl text-gray-600 dark:text-gray-400 mb-2">No corporations yet</p>
            <p className="text-gray-500 dark:text-gray-500 mb-6">Be the first to create a corporation!</p>
            <Link
              href="/corporation/create"
              className="inline-flex items-center gap-2 bg-corporate-blue text-white px-6 py-3 rounded-lg font-semibold hover:bg-corporate-blue-dark transition-colors"
            >
              <Plus className="w-5 h-5" />
              Create Corporation
            </Link>
          </div>
        ) : (
          <div className="relative rounded-2xl border border-gray-200/50 dark:border-gray-700/50 bg-gradient-to-br from-white via-white to-gray-50/50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800/50 shadow-2xl overflow-hidden backdrop-blur-sm">
            {/* Subtle gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-corporate-blue/5 via-transparent to-corporate-blue-light/5 dark:from-corporate-blue/10 dark:via-transparent dark:to-corporate-blue-dark/10 pointer-events-none" />
            
            {/* Inner shadow effect */}
            <div className="absolute inset-0 ring-1 ring-inset ring-white/20 dark:ring-gray-700/30 pointer-events-none" />
            
            <div className="relative overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b-2 border-gray-200/80 dark:border-gray-700/80 bg-gradient-to-b from-gray-50/80 to-gray-100/60 dark:from-gray-800/60 dark:to-gray-800/40 backdrop-blur-sm">
                    <th className="text-left py-5 px-6 text-xs font-bold uppercase tracking-[0.15em] text-gray-600 dark:text-gray-400">
                      Symbol
                    </th>
                    <th className="text-left py-5 px-6 text-xs font-bold uppercase tracking-[0.15em] text-gray-600 dark:text-gray-400">
                      Corporation
                    </th>
                    <th className="text-right py-5 px-6 text-xs font-bold uppercase tracking-[0.15em] text-gray-600 dark:text-gray-400">
                      Price
                    </th>
                    <th className="text-right py-5 px-6 text-xs font-bold uppercase tracking-[0.15em] text-gray-600 dark:text-gray-400">
                      Change
                    </th>
                    <th className="text-right py-5 px-6 text-xs font-bold uppercase tracking-[0.15em] text-gray-600 dark:text-gray-400">
                      Volume
                    </th>
                    <th className="text-right py-5 px-6 text-xs font-bold uppercase tracking-[0.15em] text-gray-600 dark:text-gray-400">
                      Market Cap
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200/60 dark:divide-gray-700/50">
                  {corporations.map((corp, idx) => {
                    const marketCap = calculateMarketCap(corp.shares, corp.share_price);
                    const change = getChange(corp);
                    const changeFormatted = `${change >= 0 ? '+' : ''}${change.toFixed(2)}%`;
                    const isPositive = change >= 0;
                    const symbol = getSymbol(corp.name);

                    return (
                      <Link
                        key={corp.id}
                        href={`/corporation/${corp.id}`}
                        className="block group"
                      >
                        <tr className={`
                          relative transition-all duration-200 ease-out
                          ${idx % 2 === 0 
                            ? 'bg-white/40 dark:bg-gray-900/30' 
                            : 'bg-gray-50/30 dark:bg-gray-800/20'
                          }
                          group-hover:bg-gradient-to-r group-hover:from-corporate-blue/10 group-hover:to-corporate-blue-light/5
                          dark:group-hover:from-corporate-blue/15 dark:group-hover:to-corporate-blue-dark/10
                          group-hover:shadow-lg group-hover:scale-[1.01] group-hover:z-10
                          border-l-4 border-transparent group-hover:border-corporate-blue
                        `}>
                          {/* Hover glow effect */}
                          <div className="absolute inset-0 bg-gradient-to-r from-corporate-blue/0 via-corporate-blue/5 to-corporate-blue/0 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none" />
                          
                          <td className="py-5 px-6 text-left align-middle">
                            <div className="flex items-center">
                              <span className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-gradient-to-br from-corporate-blue/10 to-corporate-blue-light/20 dark:from-corporate-blue/20 dark:to-corporate-blue-dark/30 font-mono text-sm font-bold text-corporate-blue dark:text-corporate-blue-light shadow-sm border border-corporate-blue/20 dark:border-corporate-blue/30">
                                {symbol}
                              </span>
                            </div>
                          </td>
                          <td className="py-5 px-6 text-left align-middle">
                            <div className="flex items-center gap-4">
                              <div className="relative flex-shrink-0">
                                {corp.logo ? (
                                  <>
                                    <div className="absolute inset-0 bg-gradient-to-br from-corporate-blue/20 to-corporate-blue-light/30 rounded-lg blur-sm opacity-0 group-hover:opacity-100 transition-opacity" />
                                    <img
                                      src={corp.logo}
                                      alt={corp.name}
                                      className="relative w-12 h-12 rounded-lg object-cover ring-2 ring-gray-200/50 dark:ring-gray-700/50 group-hover:ring-corporate-blue/50 transition-all shadow-md group-hover:shadow-lg"
                                      onError={(e) => {
                                        e.currentTarget.src = '/defaultpfp.jpg';
                                      }}
                                    />
                                  </>
                                ) : (
                                  <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-800 flex items-center justify-center ring-2 ring-gray-200/50 dark:ring-gray-700/50 shadow-md group-hover:shadow-lg transition-all">
                                    <Building2 className="w-6 h-6 text-gray-400 dark:text-gray-500" />
                                  </div>
                                )}
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="font-bold text-base text-gray-900 dark:text-white group-hover:text-corporate-blue dark:group-hover:text-corporate-blue-light transition-colors">
                                  {corp.name}
                                </div>
                                {corp.type && (
                                  <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mt-0.5">
                                    {corp.type}
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="py-5 px-6 text-right align-middle">
                            <span className="font-mono text-base font-bold text-gray-900 dark:text-white">
                              {formatCurrency(corp.share_price)}
                            </span>
                          </td>
                          <td className="py-5 px-6 text-right align-middle">
                            <span className={`
                              inline-flex items-center px-3 py-1.5 rounded-lg font-mono text-sm font-bold
                              ${isPositive 
                                ? 'bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400' 
                                : 'bg-red-500/10 text-red-600 dark:bg-red-500/20 dark:text-red-400'
                              }
                              shadow-sm border border-current/20
                            `}>
                              {changeFormatted}
                            </span>
                          </td>
                          <td className="py-5 px-6 text-right align-middle">
                            <span className="font-mono text-sm text-gray-700 dark:text-gray-300">
                              {corp.shares.toLocaleString()}
                            </span>
                          </td>
                          <td className="py-5 px-6 text-right align-middle">
                            <span className="font-mono text-base font-semibold text-gray-900 dark:text-white">
                              {formatCurrency(marketCap)}
                            </span>
                          </td>
                        </tr>
                      </Link>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Bond Market Placeholder */}
        {activeTab === 'bonds' && (
          <div className="relative rounded-2xl border border-gray-200/50 dark:border-gray-700/50 bg-gradient-to-br from-white via-white to-gray-50/50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800/50 shadow-2xl overflow-hidden backdrop-blur-sm">
            <div className="absolute inset-0 bg-gradient-to-br from-corporate-blue/5 via-transparent to-corporate-blue-light/5 dark:from-corporate-blue/10 dark:via-transparent dark:to-corporate-blue-dark/10 pointer-events-none" />
            <div className="absolute inset-0 ring-1 ring-inset ring-white/20 dark:ring-gray-700/30 pointer-events-none" />
            <div className="relative p-12 text-center">
              <FileText className="w-16 h-16 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Bond Market</h2>
              <p className="text-lg text-gray-600 dark:text-gray-400 mb-2">Coming Soon</p>
              <p className="text-gray-500 dark:text-gray-500">
                The bond market will allow you to invest in corporate and government bonds.
              </p>
            </div>
          </div>
        )}
      </div>
    </AppNavigation>
  );
}
