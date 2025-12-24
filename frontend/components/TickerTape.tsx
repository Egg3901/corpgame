"use client";

import { useState } from 'react';
import { CorporationResponse } from '@/lib/api';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface TickerTapeProps {
  corporations: CorporationResponse[];
}

export default function TickerTape({ corporations }: TickerTapeProps) {
  const [activeTab, setActiveTab] = useState<'gainers' | 'losers'>('gainers');

  if (corporations.length === 0) {
    return null;
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  // Generate symbol from corporation name (first 3-4 letters, uppercase)
  const getSymbol = (name: string) => {
    const words = name.split(' ');
    if (words.length > 1) {
      return words.map(w => w[0]).join('').toUpperCase().slice(0, 4);
    }
    return name.toUpperCase().slice(0, 4);
  };

  // Calculate change percentage (placeholder - using share_price as baseline)
  // In real implementation, this would compare to previous price
  const getChange = (corp: CorporationResponse) => {
    // For now, simulate a small random change for visual interest
    // In production, this would come from historical data
    const basePrice = 1.0;
    const change = ((corp.share_price - basePrice) / basePrice) * 100;
    return change;
  };

  // Create ticker items with change data
  const tickerItems = corporations.map((corp) => {
    const symbol = getSymbol(corp.name);
    const price = formatCurrency(corp.share_price);
    const change = getChange(corp);
    const changeFormatted = `${change >= 0 ? '+' : ''}${change.toFixed(2)}%`;
    const isPositive = change >= 0;

    return { symbol, price, changeFormatted, isPositive, corp, change };
  });

  // Separate into gainers and losers
  const gainers = tickerItems.filter(item => item.isPositive).sort((a, b) => b.change - a.change);
  const losers = tickerItems.filter(item => !item.isPositive).sort((a, b) => a.change - b.change);

  // Get active list based on tab
  const activeItems = activeTab === 'gainers' ? gainers : losers;
  
  // Duplicate items for seamless loop
  const duplicatedItems = activeItems.length > 0 ? [...activeItems, ...activeItems] : [];

  return (
    <div className="rounded-xl border border-white/60 bg-white/80 backdrop-blur shadow-lg dark:border-gray-800/60 dark:bg-gray-900/80 overflow-hidden">
      {/* Tabs */}
      <div className="flex border-b border-gray-200/60 dark:border-gray-700/60">
        <button
          onClick={() => setActiveTab('gainers')}
          className={`flex-1 px-4 py-2 text-sm font-bold uppercase tracking-[0.1em] transition-colors flex items-center justify-center gap-2 ${
            activeTab === 'gainers'
              ? 'bg-corporate-blue/10 text-corporate-blue dark:bg-corporate-blue/20 dark:text-corporate-blue-light border-b-2 border-corporate-blue'
              : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/50'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          Gainers ({gainers.length})
        </button>
        <button
          onClick={() => setActiveTab('losers')}
          className={`flex-1 px-4 py-2 text-sm font-bold uppercase tracking-[0.1em] transition-colors flex items-center justify-center gap-2 ${
            activeTab === 'losers'
              ? 'bg-red-500/10 text-red-600 dark:bg-red-500/20 dark:text-red-400 border-b-2 border-red-500'
              : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/50'
          }`}
        >
          <TrendingDown className="w-4 h-4" />
          Losers ({losers.length})
        </button>
      </div>

      {/* Ticker Scroll */}
      {duplicatedItems.length > 0 ? (
        <div className="relative h-16 overflow-hidden">
          <div className="absolute inset-0 flex items-center ticker-scroll whitespace-nowrap">
            {duplicatedItems.map((item, idx) => (
              <div
                key={`${item.corp.id}-${idx}`}
                className="inline-flex items-center gap-4 px-6 font-mono-numeric"
              >
                <span className="font-semibold text-corporate-blue">{item.symbol}</span>
                <span className="text-gray-700 dark:text-gray-300">{item.price}</span>
                <span className={item.isPositive ? 'text-positive' : 'text-negative'}>
                  {item.changeFormatted}
                </span>
                <span className="text-gray-400 dark:text-gray-500">|</span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="h-16 flex items-center justify-center text-gray-500 dark:text-gray-400 text-sm">
          No {activeTab === 'gainers' ? 'gainers' : 'losers'} to display
        </div>
      )}
    </div>
  );
}


