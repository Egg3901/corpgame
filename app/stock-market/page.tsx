import { Suspense } from 'react';
import AppNavigation from '@/components/AppNavigation';
import TickerTape from '@/components/TickerTape';
import StockMarketTable from '@/components/stock-market/StockMarketTable';
import CommoditiesView from '@/components/stock-market/CommoditiesView';
import { connectMongo } from '@/lib/db/mongo';
import { CorporationModel } from '@/lib/models/Corporation';
import { SharePriceHistoryModel } from '@/lib/models/SharePriceHistory';
import { marketDataService, MarketItemSummary } from '@/lib/services/MarketDataService';
import { Clock, Plus, TrendingUp, Package, FileText } from 'lucide-react';
import Link from 'next/link';
import { CorporationResponse, SharePriceHistoryResponse } from '@/lib/api';

// Force dynamic rendering since this depends on live market data
export const dynamic = 'force-dynamic';

interface PageProps {
  searchParams: {
    tab?: string;
    subtab?: string;
  };
}

// Calculate trailing 4-period average price change
const calculateTrailing4PeriodChange = (history: SharePriceHistoryResponse[]): number => {
  if (history.length < 2) return 0;

  // Need at least 2 data points to calculate 1 change, up to 5 points for 4 changes
  const sortedHistory = [...history].sort((a, b) =>
    new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime()
  );

  const changes: number[] = [];
  for (let i = 1; i < sortedHistory.length; i++) {
    const oldPrice = sortedHistory[i - 1].share_price;
    const newPrice = sortedHistory[i].share_price;
    if (oldPrice > 0) {
      const change = ((newPrice - oldPrice) / oldPrice) * 100;
      changes.push(change);
    }
  }

  // Take the last 4 changes (or fewer if we don't have 4)
  const lastChanges = changes.slice(-4);
  if (lastChanges.length === 0) return 0;

  // Calculate average
  const sum = lastChanges.reduce((acc, val) => acc + val, 0);
  return sum / lastChanges.length;
};

async function StockMarketContent({ searchParams }: PageProps) {
  const tab = searchParams.tab || 'stocks';

  // Ensure MongoDB is connected before querying
  await connectMongo();

  // Parallel data fetching based on tab
  const corporationsPromise = CorporationModel.findAll();
  
  // Data for Commodities tab
  const commoditiesPromise = tab === 'products' 
    ? marketDataService.getCommoditySummary() 
    : Promise.resolve(null);
    
  const productsPromise = tab === 'products'
    ? marketDataService.getProductSummary()
    : Promise.resolve(null);

  const [corporations, commodityData, productData] = await Promise.all([
    corporationsPromise,
    commoditiesPromise,
    productsPromise
  ]);

  // Fetch price history for all corporations if we are on the stocks tab
  // This avoids N+1 by running in parallel, though ideally we'd have a batch fetch method
  let priceChanges: Record<number, number> = {};
  
  if (tab === 'stocks') {
    const histories = await Promise.all(
      corporations.map(c => SharePriceHistoryModel.findByCorporationId(c.id, 5))
    );
    
    corporations.forEach((corp, idx) => {
      // Map generic model to API response type (date handling mostly)
      const history = histories[idx].map(h => ({
        ...h,
        recorded_at: h.recorded_at.toISOString() // Convert Date to string for calculation
      })) as unknown as SharePriceHistoryResponse[];
      
      priceChanges[corp.id] = calculateTrailing4PeriodChange(history);
    });
  }

  // Map corporations to expected response format (mostly Date handling)
  const formattedCorporations = corporations.map(c => ({
    ...c,
    created_at: c.created_at.toISOString(),
    special_dividend_last_paid_at: c.special_dividend_last_paid_at?.toISOString() || null
  })) as unknown as CorporationResponse[];

  // Prepare commodity data
  const commodities = commodityData?.summary.map((c: MarketItemSummary) => ({
    name: c.resource || '',
    currentPrice: c.price?.currentPrice ?? 0,
    priceChange: 0,
  })) || [];

  // Prepare product data
  const products = productData?.summary.map((p: MarketItemSummary) => ({
    name: p.product || '',
    currentPrice: p.price?.currentPrice ?? 0,
    priceChange: 0,
  })) || [];

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 sm:py-10 space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white">Stock Exchange</h1>
          <div className="flex items-center gap-4 mt-2 text-sm text-gray-500 dark:text-gray-400">
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              <span className="font-mono tabular-nums">
                {new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-emerald-600 dark:text-emerald-400 font-medium text-xs uppercase tracking-wide">Open</span>
            </div>
          </div>
        </div>
        <Link
          href="/corporation/create"
          className="inline-flex items-center justify-center gap-2 bg-corporate-blue text-white px-4 sm:px-5 py-2.5 rounded-lg font-semibold hover:bg-corporate-blue-dark transition-colors text-sm sm:text-base"
        >
          <Plus className="w-4 h-4" />
          <span>Create Corporation</span>
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
        <Link
          href="/stock-market?tab=stocks"
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
            tab === 'stocks'
              ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          Stocks
        </Link>
        <Link
          href="/stock-market?tab=products"
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
            tab === 'products'
              ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          <Package className="w-4 h-4" />
          Commodities
        </Link>
        <Link
          href="/stock-market?tab=bonds"
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
            tab === 'bonds'
              ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          <FileText className="w-4 h-4" />
          Bonds
        </Link>
      </div>

      {/* Ticker Tape - Only show for stocks */}
      {tab === 'stocks' && formattedCorporations.length > 0 && (
        <TickerTape corporations={formattedCorporations} />
      )}

      {/* Tab Content */}
      {tab === 'stocks' && (
        <StockMarketTable 
          corporations={formattedCorporations}
          priceChanges={priceChanges}
        />
      )}

      {tab === 'products' && (
        <CommoditiesView 
          commodities={commodities}
          products={products}
          supply={{...commodityData?.supply, ...productData?.supply}}
          demand={{...commodityData?.demand, ...productData?.demand}}
        />
      )}

      {tab === 'bonds' && (
        <div className="rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-8 sm:p-12 text-center">
          <FileText className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <p className="text-lg font-medium text-gray-900 dark:text-white mb-1">Bond Market</p>
          <p className="text-gray-500 dark:text-gray-400 mb-6 text-sm">Corporate bonds coming soon.</p>
        </div>
      )}
    </div>
  );
}

export default function StockMarketPage({ searchParams }: PageProps) {
  return (
    <AppNavigation>
      <Suspense fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-lg text-gray-600 dark:text-gray-200">Loading stock market...</div>
        </div>
      }>
        <StockMarketContent searchParams={searchParams} />
      </Suspense>
    </AppNavigation>
  );
}
