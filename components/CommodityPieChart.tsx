'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from 'recharts';
import type { PieLabelRenderProps } from 'recharts';
import { Building2, Factory, Users } from 'lucide-react';
import { ResourcePieDataEntry } from '@/lib/api';

interface CommodityPieChartProps {
  title: string;
  data: ResourcePieDataEntry[];
  others: number;
  total: number;
  type: 'producers' | 'demanders';
  valueLabel?: string;
}

// Beautiful color palette for pie chart
const PIE_COLORS = [
  '#3b82f6', // blue-500
  '#10b981', // emerald-500
  '#f59e0b', // amber-500
  '#ef4444', // red-500
  '#8b5cf6', // violet-500
  '#ec4899', // pink-500
  '#06b6d4', // cyan-500
  '#84cc16', // lime-500
  '#f97316', // orange-500
  '#14b8a6', // teal-500
];

const OTHERS_COLOR = '#6b7280'; // gray-500

const formatNumber = (value: number) => {
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 1,
  }).format(value);
};

interface ChartDataItem {
  name: string;
  value: number;
  corporation_id?: number;
  corporation_logo?: string | null;
  color: string;
  [key: string]: string | number | null | undefined;
}

export default function CommodityPieChart({
  title,
  data,
  others,
  total,
  type,
  valueLabel = 'units',
}: CommodityPieChartProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  // Prepare chart data with colors
  const chartData: ChartDataItem[] = useMemo(() => {
    const items: ChartDataItem[] = data.map((entry, index) => ({
      name: entry.corporation_name,
      value: entry.value,
      corporation_id: entry.corporation_id,
      corporation_logo: entry.corporation_logo,
      color: PIE_COLORS[index % PIE_COLORS.length],
    }));

    // Add "Others" slice if there's remaining value
    if (others > 0) {
      items.push({
        name: 'Others',
        value: others,
        color: OTHERS_COLOR,
      });
    }

    return items;
  }, [data, others]);

  const Icon = type === 'producers' ? Factory : Users;
  const iconColor = type === 'producers' ? 'text-corporate-blue' : 'text-orange-600';
  const accentColor = type === 'producers' ? 'bg-corporate-blue' : 'bg-orange-600';

  // Custom tooltip
  interface CustomTooltipProps {
    active?: boolean;
    payload?: { payload: ChartDataItem }[];
  }

  const CustomTooltip = ({ active, payload }: CustomTooltipProps) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload;
      const percentage = total > 0 ? ((item.value / total) * 100).toFixed(1) : '0.0';

      return (
        <div className="rounded-lg px-4 py-3 text-xs shadow-2xl border border-gray-700 bg-gray-900 text-white">
          <div className="flex items-center gap-2 mb-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: item.color }}
            />
            <span className="font-semibold">{item.name}</span>
          </div>
          <div className="space-y-1">
            <div className="flex justify-between gap-4">
              <span className="text-gray-400">{valueLabel}:</span>
              <span className="font-mono font-semibold">{formatNumber(item.value)}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-gray-400">Share:</span>
              <span className="font-mono font-semibold">{percentage}%</span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  const renderCustomLabel = ({
    cx,
    cy,
    midAngle,
    innerRadius,
    outerRadius,
    percent,
  }: PieLabelRenderProps) => {
    if (cx === undefined || cy === undefined) return null;
    if (midAngle === undefined || innerRadius === undefined || outerRadius === undefined) return null;
    if (percent === undefined) return null;

    // Only show label if percentage is above 5%
    if (percent < 0.05) return null;

    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text
        x={x}
        y={y}
        fill="white"
        textAnchor="middle"
        dominantBaseline="central"
        className="text-xs font-semibold"
        style={{ textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  if (data.length === 0 && others === 0) {
    return (
      <div className="relative rounded-2xl border border-gray-200/50 dark:border-gray-700/50 bg-gradient-to-br from-white via-white to-gray-50/50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800/50 shadow-xl overflow-hidden backdrop-blur-sm">
        <div className="relative p-6">
          <div className="flex items-center gap-2 mb-4">
            <Icon className={`w-5 h-5 ${iconColor}`} />
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">{title}</h3>
          </div>
          <div className="flex items-center justify-center h-48">
            <div className="text-center">
              <Icon className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
              <p className="text-sm text-gray-500 dark:text-gray-400">
                No {type === 'producers' ? 'producers' : 'demanders'} yet
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative rounded-2xl border border-gray-200/50 dark:border-gray-700/50 bg-gradient-to-br from-white via-white to-gray-50/50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800/50 shadow-xl overflow-hidden backdrop-blur-sm">
      <div className="relative p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Icon className={`w-5 h-5 ${iconColor}`} />
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">{title}</h3>
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            Total: <span className="font-mono font-semibold text-gray-900 dark:text-white">{formatNumber(total)}</span>
          </div>
        </div>

        {/* Pie Chart */}
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={renderCustomLabel}
                outerRadius={90}
                innerRadius={40}
                paddingAngle={2}
                dataKey="value"
                onMouseEnter={(_, index) => setActiveIndex(index)}
                onMouseLeave={() => setActiveIndex(null)}
                animationBegin={0}
                animationDuration={800}
              >
                {chartData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.color}
                    stroke={activeIndex === index ? '#fff' : 'transparent'}
                    strokeWidth={activeIndex === index ? 3 : 0}
                    style={{
                      filter: activeIndex === index ? 'brightness(1.1)' : 'none',
                      cursor: entry.corporation_id ? 'pointer' : 'default',
                      transition: 'all 0.2s ease',
                    }}
                  />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Legend */}
        <div className="mt-4 space-y-2 max-h-40 overflow-y-auto">
          {chartData.map((item, index) => {
            const percentage = total > 0 ? ((item.value / total) * 100).toFixed(1) : '0.0';
            return (
              <div
                key={index}
                className={`flex items-center justify-between p-2 rounded-lg transition-colors ${
                  activeIndex === index ? 'bg-gray-100 dark:bg-gray-800' : ''
                }`}
                onMouseEnter={() => setActiveIndex(index)}
                onMouseLeave={() => setActiveIndex(null)}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: item.color }}
                  />
                  {item.corporation_id ? (
                    <Link
                      href={`/corporation/${item.corporation_id}`}
                      className="flex items-center gap-2 min-w-0 hover:text-corporate-blue dark:hover:text-corporate-blue-light transition-colors"
                    >
                      {item.corporation_logo ? (
                        <img
                          src={item.corporation_logo}
                          alt={item.name}
                          className="w-5 h-5 rounded object-cover flex-shrink-0"
                          onError={(e) => { e.currentTarget.src = '/defaultpfp.jpg'; }}
                        />
                      ) : (
                        <div className="w-5 h-5 rounded bg-gray-200 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
                          <Building2 className="w-3 h-3 text-gray-400" />
                        </div>
                      )}
                      <span className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {item.name}
                      </span>
                    </Link>
                  ) : (
                    <span className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                      {item.name}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className="text-sm font-mono text-gray-600 dark:text-gray-400">
                    {formatNumber(item.value)}
                  </span>
                  <span className="text-xs font-semibold text-gray-500 dark:text-gray-500 w-12 text-right">
                    {percentage}%
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
