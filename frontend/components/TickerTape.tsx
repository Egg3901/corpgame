"use client";

import { CorporationResponse } from '@/lib/api';

interface TickerTapeProps {
  corporations: CorporationResponse[];
}

export default function TickerTape({ corporations }: TickerTapeProps) {
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

  // Create ticker items
  const tickerItems = corporations.map((corp) => {
    const symbol = getSymbol(corp.name);
    const price = formatCurrency(corp.share_price);
    const change = getChange(corp);
    const changeFormatted = `${change >= 0 ? '+' : ''}${change.toFixed(2)}%`;
    const isPositive = change >= 0;

    return { symbol, price, changeFormatted, isPositive, corp };
  });

  // Duplicate items for seamless loop
  const duplicatedItems = [...tickerItems, ...tickerItems];

  return (
    <div className="rounded-xl border border-white/60 bg-white/80 backdrop-blur shadow-lg dark:border-gray-800/60 dark:bg-gray-900/80 overflow-hidden">
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
    </div>
  );
}
