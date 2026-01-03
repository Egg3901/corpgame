"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Droplets, Mountain, Cpu, Zap, Wheat, Trees, FlaskConical, Flame,
  Wrench, Lightbulb, UtensilsCrossed, Building2, Pill, Shield, Truck, Package,
  TrendingUp, TrendingDown, ChevronRight
} from 'lucide-react';
import { Card, CardBody, Tabs, Tab } from "@heroui/react";
import CommodityRelationshipChart from '@/components/CommodityRelationshipChart';

type MarketSummaryCard = {
  name: string;
  currentPrice: number;
  priceChange: number;
};

// Resource icon mapping
const RESOURCE_ICONS: Record<string, React.ReactNode> = {
  'Oil': <Droplets className="w-5 h-5" />,
  'Iron Ore': <Mountain className="w-5 h-5" />,
  'Rare Earth': <Cpu className="w-5 h-5" />,
  'Copper': <Zap className="w-5 h-5" />,
  'Fertile Land': <Wheat className="w-5 h-5" />,
  'Lumber': <Trees className="w-5 h-5" />,
  'Chemical Compounds': <FlaskConical className="w-5 h-5" />,
  'Coal': <Flame className="w-5 h-5" />,
};

// Resource color mapping
const RESOURCE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  'Oil': { bg: 'bg-slate-900', text: 'text-slate-100', border: 'border-slate-700' },
  'Iron Ore': { bg: 'bg-red-800', text: 'text-red-100', border: 'border-red-700' },
  'Rare Earth': { bg: 'bg-violet-600', text: 'text-violet-100', border: 'border-violet-500' },
  'Copper': { bg: 'bg-orange-600', text: 'text-orange-100', border: 'border-orange-500' },
  'Fertile Land': { bg: 'bg-lime-600', text: 'text-lime-100', border: 'border-lime-500' },
  'Lumber': { bg: 'bg-amber-700', text: 'text-amber-100', border: 'border-amber-600' },
  'Chemical Compounds': { bg: 'bg-cyan-600', text: 'text-cyan-100', border: 'border-cyan-500' },
  'Coal': { bg: 'bg-gray-800', text: 'text-gray-100', border: 'border-gray-700' },
};

// Product icon mapping
const PRODUCT_ICONS: Record<string, React.ReactNode> = {
  'Technology Products': <Cpu className="w-5 h-5" />,
  'Manufactured Goods': <Wrench className="w-5 h-5" />,
  'Electricity': <Lightbulb className="w-5 h-5" />,
  'Food Products': <UtensilsCrossed className="w-5 h-5" />,
  'Construction Capacity': <Building2 className="w-5 h-5" />,
  'Pharmaceutical Products': <Pill className="w-5 h-5" />,
  'Defense Equipment': <Shield className="w-5 h-5" />,
  'Logistics Capacity': <Truck className="w-5 h-5" />,
  'Steel': <Package className="w-5 h-5" />,
};

// Product color mapping
const PRODUCT_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  'Technology Products': { bg: 'bg-indigo-600', text: 'text-indigo-100', border: 'border-indigo-500' },
  'Manufactured Goods': { bg: 'bg-gray-600', text: 'text-gray-100', border: 'border-gray-500' },
  'Electricity': { bg: 'bg-yellow-500', text: 'text-yellow-900', border: 'border-yellow-400' },
  'Food Products': { bg: 'bg-green-600', text: 'text-green-100', border: 'border-green-500' },
  'Construction Capacity': { bg: 'bg-stone-600', text: 'text-stone-100', border: 'border-stone-500' },
  'Pharmaceutical Products': { bg: 'bg-rose-600', text: 'text-rose-100', border: 'border-rose-500' },
  'Defense Equipment': { bg: 'bg-red-700', text: 'text-red-100', border: 'border-red-600' },
  'Logistics Capacity': { bg: 'bg-blue-600', text: 'text-blue-100', border: 'border-blue-500' },
  'Steel': { bg: 'bg-zinc-600', text: 'text-zinc-100', border: 'border-zinc-500' },
};

interface CommoditiesViewProps {
  commodities: MarketSummaryCard[];
  products: MarketSummaryCard[];
  supply: Record<string, number>;
  demand: Record<string, number>;
}

export default function CommoditiesView({ commodities, products, supply, demand }: CommoditiesViewProps) {
  const [activeTab, setActiveTab] = useState('resources');

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const formatCompactNumber = (value: number) => {
    if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)}B`;
    if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
    if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
    return value.toLocaleString();
  };

  const renderGrid = (items: MarketSummaryCard[], type: 'resource' | 'product') => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {items.map((item, idx) => {
        const name = item.name;
        const colors = type === 'resource' ? RESOURCE_COLORS[name] : PRODUCT_COLORS[name];
        const Icon = type === 'resource' ? RESOURCE_ICONS[name] : PRODUCT_ICONS[name];

        const price = item.currentPrice || 0;
        const change = item.priceChange || 0;
        const isPositive = change >= 0;

        const itemSupply = supply[name] || 0;
        const itemDemand = demand[name] || 0;

        // Calculate fill percentage for supply bar (relative to demand or max)
        const maxVal = Math.max(itemSupply, itemDemand, 1);
        const supplyPct = (itemSupply / maxVal) * 100;
        const demandPct = (itemDemand / maxVal) * 100;

        // Link to detail page
        const href = type === 'resource'
          ? `/commodity/${encodeURIComponent(name)}`
          : `/product/${encodeURIComponent(name)}`;

        return (
          <Link key={idx} href={href} className="block group">
            <Card className="w-full transition-all duration-200 hover:shadow-lg hover:scale-[1.02] cursor-pointer">
              <CardBody className="p-4">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${colors?.bg || 'bg-gray-100'} ${colors?.text || 'text-gray-600'}`}>
                    {Icon || <Package className="w-5 h-5" />}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">{name}</h3>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-lg font-mono font-bold text-gray-900 dark:text-white">
                        {formatCurrency(price)}
                      </span>
                      <span className={`flex items-center text-xs font-medium ${
                        isPositive ? 'text-emerald-600' : 'text-red-600'
                      }`}>
                        {isPositive ? <TrendingUp className="w-3 h-3 mr-0.5" /> : <TrendingDown className="w-3 h-3 mr-0.5" />}
                        {Math.abs(change).toFixed(2)}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Supply/Demand Bars */}
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-500">Supply</span>
                    <span className="font-mono font-medium">{formatCompactNumber(itemSupply)}</span>
                  </div>
                  <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                      style={{ width: `${supplyPct}%` }}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-500">Demand</span>
                    <span className="font-mono font-medium">{formatCompactNumber(itemDemand)}</span>
                  </div>
                  <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-blue-500 rounded-full transition-all duration-500"
                      style={{ width: `${demandPct}%` }}
                    />
                  </div>
                </div>
              </div>
            </CardBody>
          </Card>
        </Link>
        );
      })}
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col">
        <Tabs 
          selectedKey={activeTab} 
          onSelectionChange={(key) => setActiveTab(key as string)}
          variant="underlined"
          color="primary"
          classNames={{
            tabList: "gap-6 w-full relative rounded-none p-0 border-b border-divider",
            cursor: "w-full bg-primary",
            tab: "max-w-fit px-0 h-12",
            tabContent: "group-data-[selected=true]:text-primary"
          }}
        >
          <Tab key="resources" title="Raw Resources" />
          <Tab key="products" title="Manufactured Products" />
          <Tab key="charts" title="Market Relationships" />
        </Tabs>
      </div>

      <div className="mt-4">
        {activeTab === 'resources' && renderGrid(commodities, 'resource')}
        {activeTab === 'products' && renderGrid(products, 'product')}
        {activeTab === 'charts' && <CommodityRelationshipChart />}
      </div>
    </div>
  );
}
