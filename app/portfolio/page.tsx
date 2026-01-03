"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import AppNavigation from '@/components/AppNavigation';
import { portfolioAPI, PortfolioResponse, authAPI } from '@/lib/api';
import { getErrorMessage } from '@/lib/utils';
import { Building2, TrendingUp, DollarSign, PieChart, ArrowRight } from 'lucide-react';

export default function PortfolioPage() {
  const router = useRouter();
  const [portfolio, setPortfolio] = useState<PortfolioResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchPortfolio = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          router.push('/login');
          return;
        }

        const user = await authAPI.getMe();
        const data = await portfolioAPI.getByUserId(user.id);
        setPortfolio(data);
      } catch (err: unknown) {
        console.error('Failed to fetch portfolio:', err);
        
        // Check for 401 specifically
        if (typeof err === 'object' && err !== null && 'response' in err) {
           const errWithResponse = err as { response?: { status?: number } };
           if (errWithResponse.response?.status === 401) {
             router.push('/login');
             return;
           }
        }
        
        setError(getErrorMessage(err, 'Failed to load portfolio'));
      } finally {
        setLoading(false);
      }
    };

    fetchPortfolio();
  }, [router]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  if (loading) {
    return (
      <AppNavigation>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-lg text-gray-600 dark:text-gray-200">Loading portfolio...</div>
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

  if (!portfolio) {
    return (
      <AppNavigation>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-lg text-gray-600 dark:text-gray-200">No portfolio data</div>
        </div>
      </AppNavigation>
    );
  }

  // Sort holdings by value (highest first)
  const sortedHoldings = portfolio.holdings ? [...portfolio.holdings].sort((a, b) => b.current_value - a.current_value) : [];

  return (
    <AppNavigation>
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">My Portfolio</h1>
            <p className="text-gray-600 dark:text-gray-400">Your stock holdings across all corporations</p>
          </div>
        </div>

        {/* Total Portfolio Value */}
        <div className="relative rounded-2xl border border-gray-200/50 dark:border-gray-700/50 bg-gradient-to-br from-white via-white to-gray-50/50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800/50 shadow-2xl overflow-hidden backdrop-blur-sm">
          <div className="absolute inset-0 bg-gradient-to-br from-corporate-blue/5 via-transparent to-corporate-blue-light/5 dark:from-corporate-blue/10 dark:via-transparent dark:to-corporate-blue-dark/10 pointer-events-none" />
          <div className="absolute inset-0 ring-1 ring-inset ring-white/20 dark:ring-gray-700/30 pointer-events-none" />
          <div className="relative p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.15em] text-gray-600 dark:text-gray-400 mb-2">Total Portfolio Value</p>
                <p className="text-4xl font-bold text-corporate-blue dark:text-corporate-blue-light">{formatCurrency(portfolio.total_value)}</p>
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.15em] text-gray-600 dark:text-gray-400 mb-2">Holdings</p>
                <p className="text-4xl font-bold text-gray-900 dark:text-white">{portfolio.holdings?.length ?? 0}</p>
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.15em] text-gray-600 dark:text-gray-400 mb-2">Dividend Income</p>
                <p className="text-4xl font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(portfolio.dividend_income || 0)}</p>
              </div>
            </div>
          </div>
        </div>

        {sortedHoldings.length === 0 ? (
          <div className="rounded-xl border border-white/60 bg-white/80 backdrop-blur shadow-xl dark:border-gray-800/60 dark:bg-gray-900/80 p-12 text-center">
            <Building2 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">No Holdings Yet</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              You don&apos;t own any stocks yet. Start investing in corporations on the stock market!
            </p>
            <Link
              href="/stock-market"
              className="inline-flex items-center gap-2 bg-corporate-blue text-white px-6 py-3 rounded-lg font-semibold hover:bg-corporate-blue-dark transition-colors shadow-md hover:shadow-lg"
            >
              View Stock Market
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        ) : (
          <div className="relative rounded-2xl border border-gray-200/50 dark:border-gray-700/50 bg-gradient-to-br from-white via-white to-gray-50/50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800/50 shadow-2xl overflow-hidden backdrop-blur-sm">
            <div className="absolute inset-0 bg-gradient-to-br from-corporate-blue/5 via-transparent to-corporate-blue-light/5 dark:from-corporate-blue/10 dark:via-transparent dark:to-corporate-blue-dark/10 pointer-events-none" />
            <div className="absolute inset-0 ring-1 ring-inset ring-white/20 dark:ring-gray-700/30 pointer-events-none" />
            <div className="relative divide-y divide-gray-200/60 dark:divide-gray-700/50">
              {sortedHoldings.map((holding, idx) => (
                <Link
                  key={holding.corporation.id}
                  href={`/corporation/${holding.corporation.id}`}
                  className="group block relative transition-all duration-200 ease-out"
                >
                  <div className={`
                    relative px-6 py-5 transition-all duration-200 ease-out
                    ${idx % 2 === 0 
                      ? 'bg-white/40 dark:bg-gray-900/30' 
                      : 'bg-gray-50/30 dark:bg-gray-800/20'
                    }
                    group-hover:bg-gradient-to-r group-hover:from-corporate-blue/10 group-hover:to-corporate-blue-light/5
                    dark:group-hover:from-corporate-blue/15 dark:group-hover:to-corporate-blue-dark/10
                    group-hover:shadow-lg border-l-4 border-transparent group-hover:border-corporate-blue
                  `}>
                    <div className="absolute inset-0 bg-gradient-to-r from-corporate-blue/0 via-corporate-blue/5 to-corporate-blue/0 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none" />
                    <div className="relative flex items-center gap-6">
                      {/* Logo */}
                      <div className="flex-shrink-0 relative">
                        {holding.corporation.logo ? (
                          <>
                            <div className="absolute inset-0 bg-gradient-to-br from-corporate-blue/20 to-corporate-blue-light/30 rounded-lg blur-sm opacity-0 group-hover:opacity-100 transition-opacity" />
                            <img
                              src={holding.corporation.logo}
                              alt={holding.corporation.name}
                              className="relative w-16 h-16 rounded-lg object-cover ring-2 ring-gray-200/50 dark:ring-gray-700/50 group-hover:ring-corporate-blue/50 transition-all shadow-md group-hover:shadow-lg"
                              onError={(e) => {
                                e.currentTarget.src = '/defaultpfp.jpg';
                              }}
                            />
                          </>
                        ) : (
                          <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-800 flex items-center justify-center ring-2 ring-gray-200/50 dark:ring-gray-700/50 shadow-md group-hover:shadow-lg transition-all">
                            <Building2 className="w-8 h-8 text-gray-400 dark:text-gray-500" />
                          </div>
                        )}
                      </div>

                      {/* Corporation Info */}
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white group-hover:text-corporate-blue dark:group-hover:text-corporate-blue-light transition-colors mb-1">
                          {holding.corporation.name}
                        </h3>
                        {holding.corporation.type && (
                          <span className="inline-block px-2 py-0.5 text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded">
                            {holding.corporation.type}
                          </span>
                        )}
                      </div>

                      {/* Holdings Info */}
                      <div className="grid grid-cols-4 gap-6 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <PieChart className="w-3 h-3 text-gray-600 dark:text-gray-400" />
                          <span className="text-xs font-bold uppercase tracking-[0.1em] text-gray-600 dark:text-gray-400">Shares:</span>
                          <span className="text-base font-bold text-gray-900 dark:text-white font-mono">
                            {holding.shares_owned.toLocaleString()}
                          </span>
                        </div>
                        <div className="flex items-center justify-end gap-2">
                          <DollarSign className="w-3 h-3 text-gray-600 dark:text-gray-400" />
                          <span className="text-xs font-bold uppercase tracking-[0.1em] text-gray-600 dark:text-gray-400">Price:</span>
                          <span className="text-base font-bold text-gray-900 dark:text-white font-mono">
                            {formatCurrency(holding.corporation.share_price)}
                          </span>
                        </div>
                        <div className="flex items-center justify-end gap-2">
                          <span className="text-xs font-bold uppercase tracking-[0.1em] text-gray-600 dark:text-gray-400">Ownership:</span>
                          <span className="text-base font-bold text-gray-900 dark:text-white">
                            {holding.ownership_percentage.toFixed(2)}%
                          </span>
                        </div>
                        <div className="flex items-center justify-end gap-2">
                          <TrendingUp className="w-3 h-3 text-gray-600 dark:text-gray-400" />
                          <span className="text-xs font-bold uppercase tracking-[0.1em] text-gray-600 dark:text-gray-400">Value:</span>
                          <span className="text-xl font-bold text-corporate-blue dark:text-corporate-blue-light font-mono">
                            {formatCurrency(holding.current_value)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Link to Stock Market */}
        {sortedHoldings.length > 0 && (
          <div className="text-center">
            <Link
              href="/stock-market"
              className="inline-flex items-center gap-2 text-corporate-blue hover:text-corporate-blue-dark font-semibold transition-colors"
            >
              View Stock Market
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        )}
      </div>
    </AppNavigation>
  );
}


