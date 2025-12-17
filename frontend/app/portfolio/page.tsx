"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import AppNavigation from '@/components/AppNavigation';
import { portfolioAPI, PortfolioResponse, authAPI } from '@/lib/api';
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
      } catch (err: any) {
        console.error('Failed to fetch portfolio:', err);
        if (err.response?.status === 401) {
          router.push('/login');
        } else {
          setError('Failed to load portfolio');
        }
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
  const sortedHoldings = [...portfolio.holdings].sort((a, b) => b.current_value - a.current_value);

  return (
    <AppNavigation>
      <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-10">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">My Portfolio</h1>
          <p className="text-gray-600 dark:text-gray-400">Your stock holdings across all corporations</p>
        </div>

        {/* Total Portfolio Value */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-lg mb-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total Portfolio Value</p>
              <p className="text-3xl font-bold text-corporate-blue">{formatCurrency(portfolio.total_value)}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Holdings</p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">{portfolio.holdings.length}</p>
            </div>
          </div>
        </div>

        {sortedHoldings.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-12 shadow-lg text-center">
            <Building2 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">No Holdings Yet</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              You don't own any stocks yet. Start investing in corporations on the stock market!
            </p>
            <Link
              href="/stock-market"
              className="inline-flex items-center gap-2 bg-corporate-blue text-white px-6 py-3 rounded-lg font-semibold hover:bg-corporate-blue-dark transition-colors"
            >
              View Stock Market
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {sortedHoldings.map((holding) => (
              <Link
                key={holding.corporation.id}
                href={`/corporation/${holding.corporation.id}`}
                className="group block bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm hover:shadow-lg transition-all hover:-translate-y-1"
              >
                <div className="flex items-center gap-6">
                  {/* Logo */}
                  <div className="flex-shrink-0 w-16 h-16 rounded-lg bg-gray-100 dark:bg-gray-700 overflow-hidden border border-gray-200 dark:border-gray-600">
                    {holding.corporation.logo ? (
                      <img
                        src={holding.corporation.logo}
                        alt={holding.corporation.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.src = '/defaultpfp.jpg';
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Building2 className="w-8 h-8 text-gray-400" />
                      </div>
                    )}
                  </div>

                  {/* Corporation Info */}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white group-hover:text-corporate-blue transition-colors mb-1">
                      {holding.corporation.name}
                    </h3>
                    {holding.corporation.type && (
                      <span className="inline-block px-2 py-0.5 text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded mb-2">
                        {holding.corporation.type}
                      </span>
                    )}
                  </div>

                  {/* Holdings Info */}
                  <div className="grid grid-cols-4 gap-6 text-right">
                    <div>
                      <p className="text-xs text-gray-600 dark:text-gray-400 mb-1 flex items-center justify-end gap-1">
                        <PieChart className="w-3 h-3" />
                        Shares
                      </p>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">
                        {holding.shares_owned.toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600 dark:text-gray-400 mb-1 flex items-center justify-end gap-1">
                        <DollarSign className="w-3 h-3" />
                        Price
                      </p>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">
                        {formatCurrency(holding.corporation.share_price)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Ownership</p>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">
                        {holding.ownership_percentage.toFixed(2)}%
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600 dark:text-gray-400 mb-1 flex items-center justify-end gap-1">
                        <TrendingUp className="w-3 h-3" />
                        Value
                      </p>
                      <p className="text-lg font-bold text-corporate-blue">
                        {formatCurrency(holding.current_value)}
                      </p>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Link to Stock Market */}
        <div className="mt-8 text-center">
          <Link
            href="/stock-market"
            className="inline-flex items-center gap-2 text-corporate-blue hover:text-corporate-blue-dark font-semibold transition-colors"
          >
            View Stock Market
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </div>
    </AppNavigation>
  );
}
