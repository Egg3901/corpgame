import { MarketEntryModel, MarketEntryWithUnits } from '../models/MarketEntry';
import { ShareTransactionModel } from '../models/ShareTransaction';
import { CorporationModel } from '../models/Corporation';
import {
  getUnitAssetValue,
  getMarketEntryAssetValue,
  STOCK_VALUATION,
} from '../constants/sectors';

// Stock price calculation weights
// Book Value includes Cash + Business Unit Assets (NPV-based)
// Cash is NOT weighted separately - it's part of book value
const STOCK_PRICE_WEIGHTS = {
  BOOK_VALUE: 0.50,      // 50% weight on book value (cash + NPV-based unit assets)
  EARNINGS: 0.30,        // 30% weight on earnings (P/E valuation)
  TRADE_HISTORY: 0.20,   // 20% weight on recent trade prices
};

const EARNINGS_PE_RATIO = 15;  // P/E ratio for earnings-based valuation

export interface BalanceSheet {
  // Assets
  cash: number;
  businessUnitAssets: number;
  totalAssets: number;
  
  // Asset breakdown
  retailAssetValue: number;
  productionAssetValue: number;
  serviceAssetValue: number;
  extractionAssetValue: number;
  
  // Liabilities (simplified for now)
  totalLiabilities: number;
  
  // Equity
  shareholdersEquity: number;
  
  // Per share metrics
  bookValuePerShare: number;
  
  // Unit counts
  totalRetailUnits: number;
  totalProductionUnits: number;
  totalServiceUnits: number;
  totalExtractionUnits: number;
  marketsCount: number;
}

export interface StockValuation {
  // Components
  bookValue: number;           // Book value per share (assets - liabilities)
  earningsValue: number;       // Earnings-based value (annual profit / shares * P/E)
  dividendYield: number;       // Annual dividend yield percentage
  cashPerShare: number;        // Cash (capital) per share
  tradeWeightedPrice: number;  // Weighted average of recent trades
  
  // Combined fundamental value
  fundamentalValue: number;    // Weighted combination of book value, earnings, and cash
  
  // Final price
  calculatedPrice: number;
  
  // Metadata
  recentTradeCount: number;
  hasTradeHistory: boolean;
  annualProfit: number;
  annualDividendPerShare: number;
}

/**
 * Calculate the total asset value of all business units for a corporation
 * Uses dynamic pricing based on sector, commodity prices, and product prices
 */
export async function calculateBusinessUnitAssets(corporationId: number): Promise<{
  totalValue: number;
  retailValue: number;
  productionValue: number;
  serviceValue: number;
  extractionValue: number;
  retailUnits: number;
  productionUnits: number;
  serviceUnits: number;
  extractionUnits: number;
  marketsCount: number;
}> {
  const entries = await MarketEntryModel.findByCorporationIdWithUnits(corporationId);
  
  let totalValue = 0;
  let retailValue = 0;
  let productionValue = 0;
  let serviceValue = 0;
  let extractionValue = 0;
  let retailUnits = 0;
  let productionUnits = 0;
  let serviceUnits = 0;
  let extractionUnits = 0;
  
  for (const entry of entries) {
    // Use dynamic asset value calculation that considers sector and commodity prices
    const assetValues = getMarketEntryAssetValue(
      entry.sector_type,
      entry.state_code,
      entry.retail_count,
      entry.production_count,
      entry.service_count,
      entry.extraction_count
    );
    
    retailValue += assetValues.retailValue;
    productionValue += assetValues.productionValue;
    serviceValue += assetValues.serviceValue;
    extractionValue += assetValues.extractionValue;
    totalValue += assetValues.totalValue;
    
    retailUnits += entry.retail_count;
    productionUnits += entry.production_count;
    serviceUnits += entry.service_count;
    extractionUnits += entry.extraction_count;
  }
  
  return {
    totalValue,
    retailValue,
    productionValue,
    serviceValue,
    extractionValue,
    retailUnits,
    productionUnits,
    serviceUnits,
    extractionUnits,
    marketsCount: entries.length,
  };
}

/**
 * Calculate the full balance sheet for a corporation
 * Uses dynamic asset valuation based on sector and commodity prices
 */
export async function calculateBalanceSheet(corporationId: number): Promise<BalanceSheet> {
  const corporation = await CorporationModel.findById(corporationId);
  if (!corporation) {
    throw new Error('Corporation not found');
  }
  
  const cash = typeof corporation.capital === 'string' 
    ? parseFloat(corporation.capital) 
    : corporation.capital;
  
  const unitAssets = await calculateBusinessUnitAssets(corporationId);
  
  const totalAssets = cash + unitAssets.totalValue;
  const totalLiabilities = 0; // Simplified for now
  const shareholdersEquity = totalAssets - totalLiabilities;
  const bookValuePerShare = shareholdersEquity / corporation.shares;
  
  return {
    cash,
    businessUnitAssets: unitAssets.totalValue,
    totalAssets,
    retailAssetValue: unitAssets.retailValue,
    productionAssetValue: unitAssets.productionValue,
    serviceAssetValue: unitAssets.serviceValue,
    extractionAssetValue: unitAssets.extractionValue,
    totalLiabilities,
    shareholdersEquity,
    bookValuePerShare,
    totalRetailUnits: unitAssets.retailUnits,
    totalProductionUnits: unitAssets.productionUnits,
    totalServiceUnits: unitAssets.serviceUnits,
    totalExtractionUnits: unitAssets.extractionUnits,
    marketsCount: unitAssets.marketsCount,
  };
}

/**
 * Calculate trade-weighted average price with recency bias
 */
export async function calculateTradeWeightedPrice(corporationId: number): Promise<{
  weightedPrice: number;
  tradeCount: number;
  hasHistory: boolean;
}> {
  const transactions = await ShareTransactionModel.getRecentActivity(
    corporationId,
    STOCK_VALUATION.TRADE_LOOKBACK_HOURS
  );
  
  if (transactions.length === 0) {
    return { weightedPrice: 0, tradeCount: 0, hasHistory: false };
  }
  
  // Sort by date (most recent first) - should already be sorted but ensure
  const sortedTransactions = [...transactions].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
  
  let totalWeight = 0;
  let weightedSum = 0;
  
  sortedTransactions.forEach((tx, index) => {
    // Recency weight: most recent transaction gets weight 1.0, older ones decay
    const recencyWeight = Math.pow(STOCK_VALUATION.RECENCY_DECAY, index);
    
    // Volume weight: larger trades have more influence
    const volumeWeight = Math.sqrt(tx.shares); // Square root to dampen very large trades
    
    const combinedWeight = recencyWeight * volumeWeight;
    
    weightedSum += tx.price_per_share * combinedWeight;
    totalWeight += combinedWeight;
  });
  
  const weightedPrice = totalWeight > 0 ? weightedSum / totalWeight : 0;
  
  return {
    weightedPrice,
    tradeCount: transactions.length,
    hasHistory: true,
  };
}

/**
 * Calculate the fair stock price based on fundamentals and trade activity
 *
 * Formula: Price = 50% Book Value + 30% Earnings Value + 20% Trade History
 *
 * Book Value = (Cash + NPV-based Business Unit Assets - Liabilities) / Shares
 * Earnings Value = EPS × P/E Ratio (negative earnings apply a drag)
 * Trade History = Recency-weighted average of recent trades
 */
export async function calculateStockPrice(corporationId: number): Promise<StockValuation> {
  const balanceSheet = await calculateBalanceSheet(corporationId);
  const tradeData = await calculateTradeWeightedPrice(corporationId);
  const finances = await MarketEntryModel.calculateCorporationFinances(corporationId);
  const corporation = await CorporationModel.findById(corporationId);

  if (!corporation) {
    throw new Error('Corporation not found');
  }

  const totalShares = corporation.shares || 1;

  // Book value per share (assets - liabilities)
  // Assets now include NPV-based business unit valuations
  const bookValue = balanceSheet.bookValuePerShare;

  // Cash per share (informational only - included in book value, not weighted separately)
  const cashPerShare = totalShares > 0 ? balanceSheet.cash / totalShares : 0;

  // Annual earnings calculation
  const annualProfit = finances.hourly_profit * STOCK_VALUATION.HOURS_PER_YEAR;
  const earningsPerShare = totalShares > 0 ? annualProfit / totalShares : 0;

  // Earnings value with P/E ratio
  // IMPORTANT: Negative earnings apply a drag (reduce price)
  const earningsValue = earningsPerShare * EARNINGS_PE_RATIO;

  // Dividend calculations
  const dividendPercentage = typeof corporation.dividend_percentage === 'string'
    ? parseFloat(corporation.dividend_percentage)
    : (corporation.dividend_percentage || 0);
  const annualDividendPerShare = totalShares > 0 && dividendPercentage > 0 && annualProfit > 0
    ? (annualProfit * dividendPercentage / 100) / totalShares
    : 0;
  const dividendYield = bookValue > 0 && annualDividendPerShare > 0
    ? (annualDividendPerShare / bookValue) * 100
    : 0;

  // Trade-weighted price (use book value as fallback if no trades)
  const tradePrice = tradeData.hasHistory && tradeData.weightedPrice > 0
    ? tradeData.weightedPrice
    : bookValue;

  // Calculate weighted fundamental value
  // Negative earnings now DRAG the price down (not clamped to 0)
  let fundamentalValue = 0;
  if (totalShares > 0) {
    fundamentalValue =
      (bookValue * STOCK_PRICE_WEIGHTS.BOOK_VALUE) +
      (earningsValue * STOCK_PRICE_WEIGHTS.EARNINGS);
    // Note: Cash is already in book value, not weighted separately
  } else {
    fundamentalValue = bookValue;
  }

  // Final price: blend fundamental value with trade history
  let calculatedPrice: number;
  if (tradeData.hasHistory && tradeData.weightedPrice > 0) {
    calculatedPrice =
      (fundamentalValue * (1 - STOCK_PRICE_WEIGHTS.TRADE_HISTORY)) +
      (tradePrice * STOCK_PRICE_WEIGHTS.TRADE_HISTORY);
  } else {
    // No trade history - use pure fundamental value
    calculatedPrice = fundamentalValue;
  }

  // Apply minimum floor (even unprofitable companies have some floor value)
  calculatedPrice = Math.max(STOCK_VALUATION.MIN_SHARE_PRICE, calculatedPrice);

  // Round to 2 decimal places
  calculatedPrice = Math.round(calculatedPrice * 100) / 100;

  return {
    bookValue,
    earningsValue,  // Now can be negative
    dividendYield,
    cashPerShare,
    tradeWeightedPrice: tradeData.weightedPrice,
    fundamentalValue,
    calculatedPrice,
    recentTradeCount: tradeData.tradeCount,
    hasTradeHistory: tradeData.hasHistory,
    annualProfit,
    annualDividendPerShare,
  };
}

/**
 * Recalculate and update stock price for a corporation
 * Returns the new price
 * @param applyVariation - If true, applies random hourly variation (±5%)
 */
export async function updateStockPrice(corporationId: number, applyVariation: boolean = false): Promise<number> {
  const valuation = await calculateStockPrice(corporationId);
  
  let finalPrice = valuation.calculatedPrice;
  
  // Apply random hourly variation if requested
  if (applyVariation) {
    // Generate random variation between -5% and +5%
    const variationPercent = STOCK_VALUATION.HOURLY_VARIATION_PERCENT;
    const randomFactor = 1 + (Math.random() * 2 - 1) * variationPercent;
    finalPrice = finalPrice * randomFactor;
    
    // Ensure minimum floor is maintained
    finalPrice = Math.max(STOCK_VALUATION.MIN_SHARE_PRICE, finalPrice);
    
    // Round to 2 decimal places
    finalPrice = Math.round(finalPrice * 100) / 100;
  }
  
  await CorporationModel.update(corporationId, {
    share_price: finalPrice,
  });
  
  return finalPrice;
}

