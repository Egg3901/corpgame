'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { TrendingUp, TrendingDown, Clock, Activity } from 'lucide-react';

interface PriceHistoryPoint {
  price: number;
  recorded_at: string;
  supply?: number;
  demand?: number;
}

interface PriceChartProps {
  currentPrice: number;
  fetchHistory: (hours: number, limit: number) => Promise<PriceHistoryPoint[]>;
  title?: string;
  priceLabel?: string;
}

type TimeFrame = '24h' | '48h' | '96h' | '7d' | '30d';

interface TimeFrameOption {
  label: string;
  value: TimeFrame;
  hours: number;
}

const TIME_FRAMES: TimeFrameOption[] = [
  { label: '24H', value: '24h', hours: 24 },
  { label: '48H', value: '48h', hours: 48 },
  { label: '4D', value: '96h', hours: 96 },
  { label: '7D', value: '7d', hours: 168 },
  { label: '30D', value: '30d', hours: 720 },
];

interface ChartDataPoint {
  time: string;
  price: number;
  timestamp: number;
  supply?: number;
  demand?: number;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
};

const formatPercent = (value: number) => {
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
};

export default function PriceChart({ currentPrice, fetchHistory, title = 'Price History', priceLabel = 'Price' }: PriceChartProps) {
  const [timeFrame, setTimeFrame] = useState<TimeFrame>('96h');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [historyData, setHistoryData] = useState<PriceHistoryPoint[]>([]);

  const selectedTimeFrame = TIME_FRAMES.find(tf => tf.value === timeFrame)!;

  useEffect(() => {
    const loadHistory = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchHistory(selectedTimeFrame.hours, 1000);
        setHistoryData(data);
      } catch (err: any) {
        console.error('Failed to fetch price history:', err);
        setError('Failed to load price history');
      } finally {
        setLoading(false);
      }
    };

    loadHistory();
  }, [selectedTimeFrame.hours, fetchHistory]);

  // Process and format chart data
  const chartData = useMemo((): ChartDataPoint[] => {
    if (historyData.length === 0) {
      // If no history, show a flat line at current price
      const now = Date.now();
      return [
        { time: 'Start', price: currentPrice, timestamp: now - selectedTimeFrame.hours * 3600000 },
        { time: 'Now', price: currentPrice, timestamp: now },
      ];
    }

    // Sort data by timestamp (ascending)
    const sorted = [...historyData].sort(
      (a, b) => new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime()
    );

    return sorted.map((point) => {
      const date = new Date(point.recorded_at);
      const hours = selectedTimeFrame.hours;
      
      let timeLabel: string;
      if (hours <= 48) {
        // Show time only for shorter periods
        timeLabel = date.toLocaleTimeString('en-US', { 
          hour: 'numeric', 
          minute: '2-digit',
          hour12: true 
        });
      } else if (hours <= 168) {
        // Show day and time for weekly
        timeLabel = date.toLocaleDateString('en-US', { 
          weekday: 'short',
          hour: 'numeric',
          hour12: true 
        });
      } else {
        // Show date for monthly
        timeLabel = date.toLocaleDateString('en-US', { 
          month: 'short',
          day: 'numeric'
        });
      }

      return {
        time: timeLabel,
        price: typeof point.price === 'string' ? parseFloat(point.price) : point.price,
        timestamp: date.getTime(),
        supply: point.supply,
        demand: point.demand,
      };
    });
  }, [historyData, currentPrice, selectedTimeFrame.hours]);

  // Calculate statistics
  const stats = useMemo(() => {
    if (chartData.length < 2) {
      return {
        startPrice: currentPrice,
        endPrice: currentPrice,
        change: 0,
        changePercent: 0,
        high: currentPrice,
        low: currentPrice,
        isPositive: true,
      };
    }

    const prices = chartData.map(d => d.price);
    const startPrice = prices[0];
    const endPrice = prices[prices.length - 1];
    const change = endPrice - startPrice;
    const changePercent = ((endPrice - startPrice) / startPrice) * 100;
    const high = Math.max(...prices);
    const low = Math.min(...prices);

    return {
      startPrice,
      endPrice,
      change,
      changePercent,
      high,
      low,
      isPositive: change >= 0,
    };
  }, [chartData, currentPrice]);

  // Calculate Y-axis domain with padding
  const yDomain = useMemo(() => {
    if (chartData.length === 0) return [currentPrice * 0.9, currentPrice * 1.1];
    const prices = chartData.map(d => d.price);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const padding = (max - min) * 0.1 || max * 0.05; // 10% padding or 5% if flat
    return [Math.max(0, min - padding), max + padding];
  }, [chartData, currentPrice]);

  const gradientId = `priceGradient-${Math.random().toString(36).substr(2, 9)}`;
  const lineColor = stats.isPositive ? '#10b981' : '#ef4444';
  const gradientColorStart = stats.isPositive ? '#10b981' : '#ef4444';
  const gradientColorEnd = stats.isPositive ? 'rgba(16, 185, 129, 0.05)' : 'rgba(239, 68, 68, 0.05)';

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload as ChartDataPoint;
      return (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 p-3">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{data.time}</p>
          <p className="text-lg font-bold text-gray-900 dark:text-white font-mono">
            {formatCurrency(data.price)}
          </p>
          {(data.supply !== undefined || data.demand !== undefined) && (
            <div className="mt-2 space-y-1">
              {data.supply !== undefined && (
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Supply: {data.supply.toLocaleString()}
                </p>
              )}
              {data.demand !== undefined && (
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Demand: {data.demand.toLocaleString()}
                </p>
              )}
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="relative rounded-2xl border border-gray-200/50 dark:border-gray-700/50 bg-gradient-to-br from-white via-white to-gray-50/50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800/50 shadow-2xl overflow-hidden backdrop-blur-sm">
      <div className="absolute inset-0 bg-gradient-to-br from-corporate-blue/5 via-transparent to-corporate-blue-light/5 dark:from-corporate-blue/10 dark:via-transparent dark:to-corporate-blue-dark/10 pointer-events-none" />
      <div className="absolute inset-0 ring-1 ring-inset ring-white/20 dark:ring-gray-700/30 pointer-events-none" />
      
      <div className="relative p-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${stats.isPositive ? 'bg-emerald-100 dark:bg-emerald-900/30' : 'bg-red-100 dark:bg-red-900/30'}`}>
              {stats.isPositive ? (
                <TrendingUp className={`w-5 h-5 text-emerald-600 dark:text-emerald-400`} />
              ) : (
                <TrendingDown className={`w-5 h-5 text-red-600 dark:text-red-400`} />
              )}
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">{title}</h2>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-2xl font-bold font-mono text-gray-900 dark:text-white">
                  {formatCurrency(currentPrice)}
                </span>
                <span className={`text-sm font-semibold ${stats.isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                  {formatPercent(stats.changePercent)}
                </span>
              </div>
            </div>
          </div>

          {/* Time Frame Selector */}
          <div className="flex items-center gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-lg">
            {TIME_FRAMES.map((tf) => (
              <button
                key={tf.value}
                onClick={() => setTimeFrame(tf.value)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all duration-200 ${
                  timeFrame === tf.value
                    ? 'bg-white dark:bg-gray-700 text-corporate-blue dark:text-corporate-blue-light shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                {tf.label}
              </button>
            ))}
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-4 gap-3 mb-6">
          <div className="text-center p-2 rounded-lg bg-gray-50 dark:bg-gray-800/50">
            <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Open</p>
            <p className="text-sm font-bold text-gray-900 dark:text-white font-mono">
              {formatCurrency(stats.startPrice)}
            </p>
          </div>
          <div className="text-center p-2 rounded-lg bg-gray-50 dark:bg-gray-800/50">
            <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">High</p>
            <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400 font-mono">
              {formatCurrency(stats.high)}
            </p>
          </div>
          <div className="text-center p-2 rounded-lg bg-gray-50 dark:bg-gray-800/50">
            <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Low</p>
            <p className="text-sm font-bold text-red-600 dark:text-red-400 font-mono">
              {formatCurrency(stats.low)}
            </p>
          </div>
          <div className="text-center p-2 rounded-lg bg-gray-50 dark:bg-gray-800/50">
            <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Change</p>
            <p className={`text-sm font-bold font-mono ${stats.isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
              {stats.change >= 0 ? '+' : ''}{formatCurrency(stats.change)}
            </p>
          </div>
        </div>

        {/* Chart */}
        <div className="h-64 sm:h-80">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                <Activity className="w-5 h-5 animate-pulse" />
                <span>Loading chart data...</span>
              </div>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <p className="text-red-500 dark:text-red-400">{error}</p>
                <button
                  onClick={() => setTimeFrame(timeFrame)} // Trigger refetch
                  className="mt-2 text-sm text-corporate-blue hover:underline"
                >
                  Retry
                </button>
              </div>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={gradientColorStart} stopOpacity={0.3} />
                    <stop offset="100%" stopColor={gradientColorEnd} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid 
                  strokeDasharray="3 3" 
                  stroke="rgba(156, 163, 175, 0.2)" 
                  vertical={false}
                />
                <XAxis 
                  dataKey="time" 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: '#9ca3af' }}
                  interval="preserveStartEnd"
                  minTickGap={30}
                />
                <YAxis 
                  domain={yDomain}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: '#9ca3af' }}
                  tickFormatter={(value) => `$${value.toFixed(2)}`}
                  width={60}
                />
                <Tooltip content={<CustomTooltip />} />
                <ReferenceLine 
                  y={stats.startPrice} 
                  stroke="rgba(156, 163, 175, 0.5)" 
                  strokeDasharray="5 5"
                />
                <Area
                  type="monotone"
                  dataKey="price"
                  stroke={lineColor}
                  strokeWidth={2}
                  fill={`url(#${gradientId})`}
                  animationDuration={750}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Footer info */}
        <div className="mt-4 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
          <div className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            <span>Last {selectedTimeFrame.label.toLowerCase()}</span>
          </div>
          <div>
            {chartData.length > 0 && historyData.length > 0 && (
              <span>{historyData.length} data points</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

