"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { corporationAPI, CorporationResponse } from '@/lib/api';
import { Building2, Plus, TrendingUp, DollarSign, Users } from 'lucide-react';

export default function StockMarketPage() {
  const router = useRouter();
  const [corporations, setCorporations] = useState<CorporationResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-gray-100 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 flex items-center justify-center">
        <div className="text-lg text-gray-600 dark:text-gray-200">Loading stock market...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-gray-100 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 flex items-center justify-center">
        <div className="text-xl text-red-600 dark:text-red-400">{error}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-gray-100 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">Stock Market</h1>
            <p className="text-gray-600 dark:text-gray-400">Browse all publicly traded corporations</p>
          </div>
          <Link
            href="/corporation/create"
            className="inline-flex items-center gap-2 bg-corporate-blue text-white px-6 py-3 rounded-lg font-semibold hover:bg-corporate-blue-dark transition-colors shadow-md hover:shadow-lg"
          >
            <Plus className="w-5 h-5" />
            Create Corporation
          </Link>
        </div>

        {corporations.length === 0 ? (
          <div className="text-center py-20">
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {corporations.map((corp) => {
              const marketCap = calculateMarketCap(corp.shares, corp.share_price);
              return (
                <Link
                  key={corp.id}
                  href={`/corporation/${corp.id}`}
                  className="group bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm hover:shadow-lg transition-all hover:-translate-y-1"
                >
                  <div className="flex items-start gap-4 mb-4">
                    <div className="flex-shrink-0 w-16 h-16 rounded-lg bg-gray-100 dark:bg-gray-700 overflow-hidden border border-gray-200 dark:border-gray-600">
                      {corp.logo ? (
                        <img
                          src={corp.logo}
                          alt={corp.name}
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
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white group-hover:text-corporate-blue transition-colors truncate">
                        {corp.name}
                      </h3>
                      {corp.ceo && (
                        <Link
                          href={`/profile/${corp.ceo.profile_id}`}
                          onClick={(e) => e.stopPropagation()}
                          className="text-sm text-gray-600 dark:text-gray-400 hover:text-corporate-blue transition-colors"
                        >
                          CEO: {corp.ceo.player_name || corp.ceo.username}
                        </Link>
                      )}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-1">
                        <DollarSign className="w-4 h-4" />
                        Share Price
                      </span>
                      <span className="text-lg font-semibold text-gray-900 dark:text-white">
                        {formatCurrency(corp.share_price)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-1">
                        <Users className="w-4 h-4" />
                        Total Shares
                      </span>
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        {corp.shares.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t border-gray-200 dark:border-gray-700">
                      <span className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-1">
                        <TrendingUp className="w-4 h-4" />
                        Market Cap
                      </span>
                      <span className="text-lg font-bold text-corporate-blue">
                        {formatCurrency(marketCap)}
                      </span>
                    </div>
                    {corp.type && (
                      <div className="pt-2">
                        <span className="inline-block px-2 py-1 text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded">
                          {corp.type}
                        </span>
                      </div>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
