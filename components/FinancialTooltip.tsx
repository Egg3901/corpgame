'use client';

import React from 'react';
import { Card, CardBody, Chip, Divider } from "@heroui/react";

type CostItem = {
  name: string;
  costHr: number;
  quantity?: number;
  unitPrice?: number;
};

type OutputItem = {
  name: string;
  revenueHr: number;
  quantity?: number;
  unitPrice?: number;
};

type Props = {
  title: string;
  revenueHr: number;
  costHr: number;
  profitHr: number;
  outputSoldUnits: number;
  costItems: CostItem[];
  outputItems?: OutputItem[];
  loading?: boolean;
  note?: string;
  breakdown?: Array<{ label: string; value: number }>;
};

export default function FinancialTooltip({
  title,
  revenueHr,
  costHr,
  profitHr,
  outputSoldUnits,
  costItems,
  outputItems,
  loading,
  note,
  breakdown,
}: Props) {
  const formatCurrency = (v: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(v);
  const formatCurrencyPrecise = (v: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v);
  const formatNumber = (v: number) => new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(v);

  const totalCost = costHr > 0 ? costHr : costItems.reduce((s, i) => s + i.costHr, 0);
  const totalOutputRevenue = outputItems ? outputItems.reduce((s, i) => s + i.revenueHr, 0) : 0;

  const breakdownTotal = (propsBreakdown?: Array<{ label: string; value: number }>) => {
    if (!propsBreakdown || propsBreakdown.length === 0) return null;
    return propsBreakdown.reduce((s, b) => s + b.value, 0);
  };

  const expectedTotal = breakdownTotal(breakdown);
  const matches = expectedTotal !== null ? Math.abs((expectedTotal || 0) - revenueHr) < 0.01 : true;

  return (
    <Card className="min-w-[300px]" shadow="none">
      <CardBody className="space-y-3 p-1">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold">{title}</p>
          <div className="flex items-center gap-2">
            {expectedTotal !== null && (
              <Chip
                size="sm"
                variant="flat"
                color={matches ? "success" : "danger"}
                className="h-5 text-[10px]"
              >
                {matches ? 'Validated' : 'Mismatch'}
              </Chip>
            )}
            {loading ? (
              <Chip size="sm" variant="flat" className="h-5 text-[10px] text-gray-400">
                Loading…
              </Chip>
            ) : null}
          </div>
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
        {/* Output Revenue Section */}
        {outputItems && outputItems.length > 0 && (
          <div>
            <Divider className="my-2 bg-gray-700" />
            <p className="text-[11px] text-green-400 font-medium mb-1">Output Revenue</p>
            <div className="space-y-1">
              {outputItems.map((it) => (
                <div key={it.name} className="flex items-center justify-between gap-2">
                  <span className="text-[11px] text-gray-300 truncate flex-1">{it.name}</span>
                  {it.quantity !== undefined && it.unitPrice !== undefined ? (
                    <span className="font-mono text-[10px] text-gray-400">
                      {formatNumber(it.quantity)}/hr × {formatCurrency(it.unitPrice)}
                    </span>
                  ) : null}
                  <span className="font-mono text-[11px] text-green-400">{formatCurrencyPrecise(it.revenueHr)}</span>
                </div>
              ))}
              <div className="flex items-center justify-between border-t border-gray-700 pt-1 mt-1">
                <span className="text-[11px] text-gray-400">Total Revenue</span>
                <span className="font-mono text-[11px] text-green-400">{formatCurrencyPrecise(totalOutputRevenue)}</span>
              </div>
            </div>
          </div>
        )}
        {/* Legacy breakdown for backwards compatibility */}
        {(!outputItems || outputItems.length === 0) && breakdown && breakdown.length > 0 && (
          <div>
            <Divider className="my-2 bg-gray-700" />
            <p className="text-[11px] text-gray-300 mb-1">Revenue Breakdown</p>
            <div className="space-y-1">
              {breakdown.map((b) => (
                <div key={b.label} className="flex items-center justify-between">
                  <span className="text-[11px] text-gray-300">{b.label}</span>
                  <span className="font-mono text-[11px]">{formatCurrencyPrecise(b.value)}</span>
                </div>
              ))}
              <div className="flex items-center justify-between border-t border-gray-700 pt-1 mt-1">
                <span className="text-[11px] text-gray-400">Total</span>
                <span className="font-mono text-[11px]">{formatCurrencyPrecise(expectedTotal || 0)}</span>
              </div>
            </div>
          </div>
        )}
        {/* Input Cost Section */}
        <div>
          <Divider className="my-2 bg-gray-700" />
          <p className="text-[11px] text-red-400 font-medium mb-1">Input Costs</p>
          <div className="space-y-1">
            {costItems.length === 0 ? (
              <p className="text-[11px] text-gray-500">No input costs</p>
            ) : (
            <>
              {costItems.map((it) => (
                <div key={it.name} className="flex items-center justify-between gap-2">
                  <span className="text-[11px] text-gray-300 truncate flex-1">{it.name}</span>
                  {it.quantity !== undefined && it.unitPrice !== undefined ? (
                    <span className="font-mono text-[10px] text-gray-400">
                      {formatNumber(it.quantity)}/hr × {formatCurrency(it.unitPrice)}
                    </span>
                  ) : null}
                  <span className="font-mono text-[11px] text-red-400">{formatCurrencyPrecise(it.costHr)}</span>
                </div>
              ))}
              <div className="flex items-center justify-between border-t border-gray-700 pt-1 mt-1">
                <span className="text-[11px] text-gray-400">Total Cost</span>
                <span className="font-mono text-[11px] text-red-400">{formatCurrencyPrecise(totalCost)}</span>
              </div>
            </>
          )}
        </div>
      </div>
      {note ? (
        <div className="rounded-md border border-gray-700 bg-gray-800 px-2 py-1">
          <p className="text-[10px] text-gray-400">{note}</p>
        </div>
      ) : null}
      </CardBody>
    </Card>
  );
}
