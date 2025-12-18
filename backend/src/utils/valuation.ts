import { MarketEntryModel, MarketEntryWithUnits } from '../models/MarketEntry';
import { ShareTransactionModel } from '../models/ShareTransaction';
import { CorporationModel } from '../models/Corporation';
import {
  getStateMultiplier,
  getUnitAssetValue,
  UNIT_ECONOMICS,
  STOCK_VALUATION,
} from '../constants/sectors';

export interface BalanceSheet {
  // Assets
  cash: number;
  businessUnitAssets: number;
  totalAssets: number;
  
  // Asset breakdown
  retailAssetValue: number;
  productionAssetValue: number;
  serviceAssetValue: number;
  
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
  marketsCount: number;
}

export interface StockValuation {
  // Components
  fundamentalValue: number;    // Book value per share
  tradeWeightedPrice: number;  // Weighted average of recent trades
  
  // Final price
  calculatedPrice: number;
  
  // Metadata
  recentTradeCount: number;
  hasTradeHistory: boolean;
}

/**
 * Calculate the total asset value of all business units for a corporation
 */
export async function calculateBusinessUnitAssets(corporationId: number): Promise<{
  totalValue: number;
  retailValue: number;
  productionValue: number;
  serviceValue: number;
  retailUnits: number;
  productionUnits: number;
  serviceUnits: number;
  marketsCount: number;
}> {
  const entries = await MarketEntryModel.findByCorporationIdWithUnits(corporationId);
  
  let totalValue = 0;
  let retailValue = 0;
  let productionValue = 0;
  let serviceValue = 0;
  let retailUnits = 0;
  let productionUnits = 0;
  let serviceUnits = 0;
  
  for (const entry of entries) {
    const multiplier = getStateMultiplier(entry.state_code);
    
    // Calculate value for each unit type
    const retailUnitValue = getUnitAssetValue('retail', multiplier);
    const productionUnitValue = getUnitAssetValue('production', multiplier);
    const serviceUnitValue = getUnitAssetValue('service', multiplier);
    
    retailValue += entry.retail_count * retailUnitValue;
    productionValue += entry.production_count * productionUnitValue;
    serviceValue += entry.service_count * serviceUnitValue;
    
    retailUnits += entry.retail_count;
    productionUnits += entry.production_count;
    serviceUnits += entry.service_count;
  }
  
  totalValue = retailValue + productionValue + serviceValue;
  
  return {
    totalValue,
    retailValue,
    productionValue,
    serviceValue,
    retailUnits,
    productionUnits,
    serviceUnits,
    marketsCount: entries.length,
  };
}

/**
 * Calculate the full balance sheet for a corporation
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
    totalLiabilities,
    shareholdersEquity,
    bookValuePerShare,
    totalRetailUnits: unitAssets.retailUnits,
    totalProductionUnits: unitAssets.productionUnits,
    totalServiceUnits: unitAssets.serviceUnits,
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
 */
export async function calculateStockPrice(corporationId: number): Promise<StockValuation> {
  const balanceSheet = await calculateBalanceSheet(corporationId);
  const tradeData = await calculateTradeWeightedPrice(corporationId);
  
  const fundamentalValue = balanceSheet.bookValuePerShare;
  
  let calculatedPrice: number;
  
  if (tradeData.hasHistory && tradeData.weightedPrice > 0) {
    // Blend fundamental value with trade-weighted price
    calculatedPrice = 
      (fundamentalValue * STOCK_VALUATION.FUNDAMENTAL_WEIGHT) +
      (tradeData.weightedPrice * STOCK_VALUATION.TRADE_WEIGHT);
  } else {
    // No trade history - use pure fundamental value
    calculatedPrice = fundamentalValue;
  }
  
  // Apply minimum floor
  calculatedPrice = Math.max(STOCK_VALUATION.MIN_SHARE_PRICE, calculatedPrice);
  
  // Round to 2 decimal places
  calculatedPrice = Math.round(calculatedPrice * 100) / 100;
  
  return {
    fundamentalValue,
    tradeWeightedPrice: tradeData.weightedPrice,
    calculatedPrice,
    recentTradeCount: tradeData.tradeCount,
    hasTradeHistory: tradeData.hasHistory,
  };
}

/**
 * Recalculate and update stock price for a corporation
 * Returns the new price
 */
export async function updateStockPrice(corporationId: number): Promise<number> {
  const valuation = await calculateStockPrice(corporationId);
  
  await CorporationModel.update(corporationId, {
    share_price: valuation.calculatedPrice,
  });
  
  return valuation.calculatedPrice;
}
