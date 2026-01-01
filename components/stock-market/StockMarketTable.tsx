"use client";

import { useRouter } from 'next/navigation';
import { Building2, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { Table, TableHeader, TableColumn, TableBody, TableRow, TableCell } from "@heroui/react";
import { CorporationResponse } from '@/lib/api';

interface StockMarketTableProps {
  corporations: CorporationResponse[];
  priceChanges: Record<number, number>;
}

export default function StockMarketTable({ corporations, priceChanges }: StockMarketTableProps) {
  const router = useRouter();

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

  const getSymbol = (name: string) => {
    const words = name.split(' ');
    if (words.length > 1) {
      return words.map(w => w[0]).join('').toUpperCase().slice(0, 4);
    }
    return name.toUpperCase().slice(0, 4);
  };

  // Sort corporations by market cap
  const sortedCorporations = [...corporations].sort((a, b) => {
    const marketCapA = calculateMarketCap(a.shares, a.share_price);
    const marketCapB = calculateMarketCap(b.shares, b.share_price);
    return marketCapB - marketCapA;
  });

  if (corporations.length === 0) {
    return (
      <div className="rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-8 sm:p-12 text-center">
        <Building2 className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
        <p className="text-lg font-medium text-gray-900 dark:text-white mb-1">No corporations yet</p>
        <p className="text-gray-500 dark:text-gray-400 mb-6 text-sm">Be the first to create a corporation!</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      <Table aria-label="Stock market table" removeWrapper>
        <TableHeader>
          <TableColumn>COMPANY</TableColumn>
          <TableColumn align="end">PRICE</TableColumn>
          <TableColumn align="end">CHANGE</TableColumn>
          <TableColumn align="end">DIV YIELD</TableColumn>
          <TableColumn align="end">VOLUME</TableColumn>
          <TableColumn align="end">MARKET CAP</TableColumn>
          <TableColumn width={40}> </TableColumn>
        </TableHeader>
        <TableBody>
          {sortedCorporations.map((corp) => {
            const marketCap = calculateMarketCap(corp.shares, corp.share_price);
            const change = priceChanges[corp.id] || 0;
            const isPositive = change >= 0;
            const symbol = getSymbol(corp.name);

            return (
              <TableRow 
                key={corp.id} 
                className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50"
                onClick={() => router.push(`/corporation/${corp.id}`)}
              >
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center overflow-hidden">
                      {corp.logo ? (
                        <img
                          src={corp.logo}
                          alt={`${corp.name} company logo`}
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
                        <span className="font-semibold text-gray-900 dark:text-white truncate">
                          {corp.name}
                        </span>
                      </div>
                      {corp.type && (
                        <span className="text-xs text-gray-500 dark:text-gray-400">{corp.type}</span>
                      )}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <span className="font-mono font-semibold text-gray-900 dark:text-white">
                    {formatCurrency(corp.share_price)}
                  </span>
                </TableCell>
                <TableCell>
                  <span className={`inline-flex items-center gap-0.5 font-mono text-sm font-medium ${
                    isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
                  }`}>
                    {isPositive ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                    {isPositive ? '▲' : '▼'} {Math.abs(change).toFixed(2)}%
                  </span>
                </TableCell>
                <TableCell>
                  <span className="font-mono text-gray-600 dark:text-gray-300">
                    {(corp.dividend_percentage || 0).toFixed(1)}%
                  </span>
                </TableCell>
                <TableCell>
                  <span className="font-mono text-gray-600 dark:text-gray-300">
                    {Math.floor(Math.random() * 10000).toLocaleString()}
                  </span>
                </TableCell>
                <TableCell>
                  <span className="font-mono font-semibold text-gray-900 dark:text-white">
                    {formatCurrency(marketCap)}
                  </span>
                </TableCell>
                <TableCell>
                  <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
