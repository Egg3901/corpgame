"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import AppNavigation from '@/components/AppNavigation';
import TickerTape from '@/components/TickerTape';
import { corporationAPI, CorporationResponse } from '@/lib/api';
import { Building2, Plus, TrendingUp, DollarSign, Users, Clock } from 'lucide-react';

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

        {/* Ticker Tape */}
        {corporations.length > 0 && (
          <div className="mb-6">
            <TickerTape corporations={corporations} />
          </div>
        )}

        {/* Stock Table */}
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
          <div className="rounded-xl border border-white/60 bg-white/80 backdrop-blur shadow-xl dark:border-gray-800/60 dark:bg-gray-900/80 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/30">
                    <th className="text-left py-4 px-6 text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300">
                      Symbol
                    </th>
                    <th className="text-left py-4 px-6 text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300">
                      Corporation
                    </th>
                    <th className="text-right py-4 px-6 text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300">
                      Price
                    </th>
                    <th className="text-right py-4 px-6 text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300">
                      Change
                    </th>
                    <th className="text-right py-4 px-6 text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300">
                      Volume
                    </th>
                    <th className="text-right py-4 px-6 text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300">
                      Market Cap
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
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
                        className="block"
                      >
                        <tr className={`hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors cursor-pointer ${
                          idx % 2 === 0 ? 'bg-white/50 dark:bg-gray-900/50' : 'bg-gray-50/30 dark:bg-gray-800/20'
                        }`}>
                          <td className="py-4 px-6">
                            <span className="font-mono-numeric font-semibold text-corporate-blue">
                              {symbol}
                            </span>
                          </td>
                          <td className="py-4 px-6">
                            <div className="flex items-center gap-3">
                              {corp.logo && (
                                <img
                                  src={corp.logo}
                                  alt={corp.name}
                                  className="w-8 h-8 rounded object-cover"
                                  onError={(e) => {
                                    e.currentTarget.src = '/defaultpfp.jpg';
                                  }}
                                />
                              )}
                              <div>
                                <div className="font-semibold text-gray-900 dark:text-white">
                                  {corp.name}
                                </div>
                                {corp.type && (
                                  <div className="text-xs text-gray-500 dark:text-gray-400">
                                    {corp.type}
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="py-4 px-6 text-right">
                            <span className="font-mono-numeric font-semibold text-gray-900 dark:text-white">
                              {formatCurrency(corp.share_price)}
                            </span>
                          </td>
                          <td className="py-4 px-6 text-right">
                            <span className={`font-mono-numeric font-semibold ${isPositive ? 'text-positive' : 'text-negative'}`}>
                              {changeFormatted}
                            </span>
                          </td>
                          <td className="py-4 px-6 text-right">
                            <span className="font-mono-numeric text-gray-700 dark:text-gray-300">
                              {corp.shares.toLocaleString()}
                            </span>
                          </td>
                          <td className="py-4 px-6 text-right">
                            <span className="font-mono-numeric font-semibold text-gray-900 dark:text-white">
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
      </div>
    </AppNavigation>
  );
}
