'use client';

import React from 'react';

type CostItem = {
  name: string;
  costHr: number;
};

type Props = {
  title: string;
  revenueHr: number;
  costHr: number;
  profitHr: number;
  outputSoldUnits: number;
  costItems: CostItem[];
  loading?: boolean;
  note?: string;
};

export default function FinancialTooltip({
  title,
  revenueHr,
  costHr,
  profitHr,
  outputSoldUnits,
  costItems,
  loading,
  note,
}: Props) {
  const formatCurrency = (v: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v);
  const formatNumber = (v: number) => new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(v);

  const totalCost = costHr > 0 ? costHr : costItems.reduce((s, i) => s + i.costHr, 0);
  const itemsWithPct = costItems.map((i) => ({ ...i, pct: totalCost > 0 ? (i.costHr / totalCost) * 100 : 0 }));

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold">{title}</p>
        {loading ? <span className="text-[10px] text-gray-400">Loading…</span> : null}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <div className="text-right">
          <p className="text-[10px] text-gray-400">Revenue/hr</p>
          <p className="font-mono">{formatCurrency(revenueHr)}</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] text-gray-400">Cost/hr</p>
          <p className="font-mono">{formatCurrency(costHr)}</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] text-gray-400">Profit/hr</p>
          <p className="font-mono">{formatCurrency(profitHr)}</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] text-gray-400">Output Sold (u/hr)</p>
          <p className="font-mono">{formatNumber(outputSoldUnits)}</p>
        </div>
      </div>
      <div>
        <p className="text-[11px] text-gray-300 mb-1">Cost Breakdown</p>
        <div className="space-y-1">
          {itemsWithPct.length === 0 ? (
            <p className="text-[11px] text-gray-500">No input cost components</p>
          ) : (
            itemsWithPct.map((it) => (
              <div key={it.name} className="flex items-center justify-between">
                <span className="text-[11px] text-gray-300">{it.name}</span>
                <span className="font-mono text-[11px]">{formatCurrency(it.costHr)} ({formatNumber(it.pct)}%)</span>
              </div>
            ))
          )}
        </div>
      </div>
      {note ? (
        <div className="rounded-md border border-gray-700 bg-gray-800 px-2 py-1">
          <p className="text-[10px] text-gray-400">{note}</p>
        </div>
      ) : null}
    </div>
  );
}

