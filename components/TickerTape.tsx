"use client";

import { useState } from 'react';
import { CorporationResponse } from '@/lib/api';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { Card, Button } from "@heroui/react";

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

  // Get the 4-hour price change from API data
  const getChange = (corp: CorporationResponse) => {
    return corp.price_change_4h ?? 0;
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
    <Card className="rounded-xl border shadow-lg overflow-hidden border-default-200/60 bg-content1/80 backdrop-blur dark:border-default-200/60 dark:bg-content1/90">
      {/* Tabs */}
      <div className="flex border-b border-default-200/60">
        <Button
          onPress={() => setActiveTab('gainers')}
          radius="none"
          variant="light"
          className={`flex-1 h-auto py-2 text-sm font-bold uppercase tracking-[0.1em] ${
            activeTab === 'gainers'
              ? 'bg-success-50 dark:bg-success-900/20 text-success border-b-2 border-success'
              : 'text-default-500 hover:bg-content2'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          Gainers ({gainers.length})
        </Button>
        <Button
          onPress={() => setActiveTab('losers')}
          radius="none"
          variant="light"
          className={`flex-1 h-auto py-2 text-sm font-bold uppercase tracking-[0.1em] ${
            activeTab === 'losers'
              ? 'bg-danger-50 dark:bg-danger-900/20 text-danger border-b-2 border-danger'
              : 'text-default-500 hover:bg-content2'
          }`}
        >
          <TrendingDown className="w-4 h-4" />
          Losers ({losers.length})
        </Button>
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
                <span className="font-semibold text-primary">{item.symbol}</span>
                <span className="text-foreground">{item.price}</span>
                <span className={item.isPositive ? 'text-success' : 'text-danger'}>
                  {item.changeFormatted}
                </span>
                <span className="text-default-400">|</span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="h-16 flex items-center justify-center text-default-400 text-sm">
          No {activeTab === 'gainers' ? 'gainers' : 'losers'} to display
        </div>
      )}
    </Card>
  );
}


