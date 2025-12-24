import express, { Request, Response } from 'express';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { CorporationModel } from '../models/Corporation';
import { ShareholderModel } from '../models/Shareholder';
import { ShareTransactionModel } from '../models/ShareTransaction';
import { SharePriceHistoryModel } from '../models/SharePriceHistory';
import { UserModel } from '../models/User';
import { TransactionModel } from '../models/Transaction';
import { calculateStockPrice, calculateBalanceSheet, updateStockPrice } from '../utils/valuation';
import { STOCK_VALUATION } from '../constants/sectors';

const router = express.Router();

// Helper function to get current share price using new valuation system
async function getCurrentSharePrice(corporationId: number): Promise<number> {
  const valuation = await calculateStockPrice(corporationId);
  return valuation.calculatedPrice;
}

// POST /api/shares/:id/buy - Buy shares
router.post('/:id/buy', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    
    const corporationId = parseInt(req.params.id, 10);
    const userId = req.userId!;
    const { shares: requestedShares } = req.body;

    if (isNaN(corporationId)) {
      return res.status(400).json({ error: 'Invalid corporation ID' });
    }

    if (!requestedShares || requestedShares <= 0 || !Number.isInteger(requestedShares)) {
      return res.status(400).json({ error: 'Invalid number of shares' });
    }

    // Get corporation
    const corporation = await CorporationModel.findById(corporationId);
    if (!corporation) {
      return res.status(404).json({ error: 'Corporation not found' });
    }

    // Check if enough public shares available
    if (corporation.public_shares < requestedShares) {
      return res.status(400).json({ 
        error: `Only ${corporation.public_shares} public shares available` 
      });
    }

    // Calculate current share price using fundamentals-based valuation
    const currentPrice = await getCurrentSharePrice(corporationId);
    
    // Buy price is 1.01x current price
    const buyPrice = Math.round(currentPrice * 1.01 * 100) / 100;
    const totalCost = buyPrice * requestedShares;

    // Check user's cash
    const userCash = await UserModel.getCash(userId);
    if (userCash < totalCost) {
      return res.status(400).json({ 
        error: `Insufficient funds. You have ${userCash.toLocaleString('en-US', { style: 'currency', currency: 'USD' })} but need ${totalCost.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}` 
      });
    }

    // Deduct cash from user
    await UserModel.updateCash(userId, -totalCost);

    // Update corporation: reduce public shares (no capital change - just transferring ownership)
    const newPublicShares = corporation.public_shares - requestedShares;
    
    await CorporationModel.update(corporationId, {
      public_shares: newPublicShares,
    });

    // Update or create shareholder record
    const existingShareholder = await ShareholderModel.findByCorporationId(corporationId)
      .then(sh => sh.find(s => s.user_id === userId));
    
    if (existingShareholder) {
      await ShareholderModel.updateShares(
        corporationId,
        userId,
        existingShareholder.shares + requestedShares
      );
    } else {
      await ShareholderModel.create({
        corporation_id: corporationId,
        user_id: userId,
        shares: requestedShares,
      });
    }

    // Record share transaction (for price calculation)
    const shareTransaction = await ShareTransactionModel.create({
      corporation_id: corporationId,
      user_id: userId,
      transaction_type: 'buy',
      shares: requestedShares,
      price_per_share: buyPrice,
      total_amount: totalCost,
    });

    // Record financial transaction
    await TransactionModel.create({
      transaction_type: 'share_purchase',
      amount: totalCost,
      from_user_id: userId,
      corporation_id: corporationId,
      description: `Purchased ${requestedShares} shares at $${buyPrice.toFixed(2)}/share`,
      reference_id: shareTransaction.id,
      reference_type: 'share_transaction',
    });

    // Recalculate stock price using fundamentals-based valuation
    const newPrice = await updateStockPrice(corporationId);

    // Record price history
    const updatedCorp = await CorporationModel.findById(corporationId);
    const updatedCapital = typeof updatedCorp!.capital === 'string' 
      ? parseFloat(updatedCorp!.capital) 
      : updatedCorp!.capital;
    
    await SharePriceHistoryModel.create({
      corporation_id: corporationId,
      share_price: newPrice,
      capital: updatedCapital,
    });

    res.json({
      success: true,
      shares: requestedShares,
      price_per_share: buyPrice,
      total_cost: totalCost,
      new_share_price: newPrice,
    });
  } catch (error: any) {
    console.error('Buy shares error:', error);
    res.status(500).json({ error: error.message || 'Failed to buy shares' });
  }
});

// POST /api/shares/:id/sell - Sell shares
router.post('/:id/sell', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const corporationId = parseInt(req.params.id, 10);
    const userId = req.userId!;
    const { shares: requestedShares } = req.body;

    if (isNaN(corporationId)) {
      return res.status(400).json({ error: 'Invalid corporation ID' });
    }

    if (!requestedShares || requestedShares <= 0 || !Number.isInteger(requestedShares)) {
      return res.status(400).json({ error: 'Invalid number of shares' });
    }

    // Get corporation
    const corporation = await CorporationModel.findById(corporationId);
    if (!corporation) {
      return res.status(404).json({ error: 'Corporation not found' });
    }

    // Check if user owns enough shares
    const shareholders = await ShareholderModel.findByCorporationId(corporationId);
    const userShareholder = shareholders.find(sh => sh.user_id === userId);
    
    if (!userShareholder || userShareholder.shares < requestedShares) {
      return res.status(400).json({ 
        error: `You only own ${userShareholder?.shares || 0} shares` 
      });
    }

    // Cannot sell if user is CEO and would sell all shares
    if (userId === corporation.ceo_id && userShareholder.shares === requestedShares) {
      return res.status(400).json({ 
        error: 'CEO cannot sell all shares' 
      });
    }

    // Calculate current share price using fundamentals-based valuation
    const currentPrice = await getCurrentSharePrice(corporationId);
    
    // Sell price is 0.99x current price
    const sellPrice = Math.round(currentPrice * 0.99 * 100) / 100;
    const totalRevenue = sellPrice * requestedShares;

    // Add cash to user
    await UserModel.updateCash(userId, totalRevenue);

    // Update corporation: increase public shares (no capital change - just transferring ownership)
    const newPublicShares = corporation.public_shares + requestedShares;
    
    await CorporationModel.update(corporationId, {
      public_shares: newPublicShares,
    });

    // Update shareholder record
    const newShares = userShareholder.shares - requestedShares;
    if (newShares > 0) {
      await ShareholderModel.updateShares(corporationId, userId, newShares);
    } else {
      await ShareholderModel.delete(corporationId, userId);
    }

    // Record share transaction (for price calculation)
    const shareTransaction = await ShareTransactionModel.create({
      corporation_id: corporationId,
      user_id: userId,
      transaction_type: 'sell',
      shares: requestedShares,
      price_per_share: sellPrice,
      total_amount: totalRevenue,
    });

    // Record financial transaction
    await TransactionModel.create({
      transaction_type: 'share_sale',
      amount: totalRevenue,
      to_user_id: userId,
      corporation_id: corporationId,
      description: `Sold ${requestedShares} shares at $${sellPrice.toFixed(2)}/share`,
      reference_id: shareTransaction.id,
      reference_type: 'share_transaction',
    });

    // Recalculate stock price using fundamentals-based valuation
    const newPrice = await updateStockPrice(corporationId);

    // Record price history
    const updatedCorp2 = await CorporationModel.findById(corporationId);
    const updatedCapital2 = typeof updatedCorp2!.capital === 'string' 
      ? parseFloat(updatedCorp2!.capital) 
      : updatedCorp2!.capital;
    
    await SharePriceHistoryModel.create({
      corporation_id: corporationId,
      share_price: newPrice,
      capital: updatedCapital2,
    });

    res.json({
      success: true,
      shares: requestedShares,
      price_per_share: sellPrice,
      total_revenue: totalRevenue,
      new_share_price: newPrice,
    });
  } catch (error: any) {
    console.error('Sell shares error:', error);
    res.status(500).json({ error: error.message || 'Failed to sell shares' });
  }
});

// POST /api/shares/:id/issue - Issue new shares (CEO only)
router.post('/:id/issue', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const corporationId = parseInt(req.params.id, 10);
    const userId = req.userId!;
    const { shares: requestedShares } = req.body;

    if (isNaN(corporationId)) {
      return res.status(400).json({ error: 'Invalid corporation ID' });
    }

    if (!requestedShares || requestedShares <= 0 || !Number.isInteger(requestedShares)) {
      return res.status(400).json({ error: 'Invalid number of shares' });
    }

    // Get corporation
    const corporation = await CorporationModel.findById(corporationId);
    if (!corporation) {
      return res.status(404).json({ error: 'Corporation not found' });
    }

    // Check if user is CEO
    if (userId !== corporation.ceo_id) {
      return res.status(403).json({ error: 'Only the CEO can issue new shares' });
    }

    // Check if issue amount exceeds 10% of current shares
    const maxIssueable = Math.floor(corporation.shares * 0.1);
    if (requestedShares > maxIssueable) {
      return res.status(400).json({ 
        error: `Cannot issue more than ${maxIssueable.toLocaleString()} shares (10% of ${corporation.shares.toLocaleString()} outstanding)` 
      });
    }

    // Calculate current share price using fundamentals-based valuation
    const currentPrice = await getCurrentSharePrice(corporationId);
    const issuePrice = currentPrice; // Issue at market price
    const totalCapitalRaised = issuePrice * requestedShares;

    // Update corporation: increase total shares, increase public shares, increase capital
    const newTotalShares = corporation.shares + requestedShares;
    const newPublicShares = corporation.public_shares + requestedShares;
    const currentCapital = typeof corporation.capital === 'string' ? parseFloat(corporation.capital) : corporation.capital;
    const newCapital = currentCapital + totalCapitalRaised;
    
    await CorporationModel.update(corporationId, {
      shares: newTotalShares,
      public_shares: newPublicShares,
      capital: newCapital,
    });

    // Record share transaction (issue is treated as a special buy transaction from the corporation)
    const shareTransaction = await ShareTransactionModel.create({
      corporation_id: corporationId,
      user_id: userId, // CEO
      transaction_type: 'buy', // Issue is like buying from the corporation
      shares: requestedShares,
      price_per_share: issuePrice,
      total_amount: totalCapitalRaised,
    });

    // Record financial transaction
    await TransactionModel.create({
      transaction_type: 'share_issue',
      amount: totalCapitalRaised,
      to_user_id: userId, // CEO issued the shares
      corporation_id: corporationId,
      description: `Issued ${requestedShares} new shares at $${issuePrice.toFixed(2)}/share, raising $${totalCapitalRaised.toLocaleString()} capital`,
      reference_id: shareTransaction.id,
      reference_type: 'share_transaction',
    });

    // Recalculate stock price using fundamentals-based valuation
    const newPrice = await updateStockPrice(corporationId);

    // Record price history
    await SharePriceHistoryModel.create({
      corporation_id: corporationId,
      share_price: newPrice,
      capital: newCapital,
    });

    res.json({
      success: true,
      shares_issued: requestedShares,
      price_per_share: issuePrice,
      total_capital_raised: totalCapitalRaised,
      new_total_shares: newTotalShares,
      new_share_price: newPrice,
    });
  } catch (error: any) {
    console.error('Issue shares error:', error);
    res.status(500).json({ error: error.message || 'Failed to issue shares' });
  }
});

// GET /api/shares/:id/valuation - Get detailed stock valuation
router.get('/:id/valuation', async (req: Request, res: Response) => {
  try {
    const corporationId = parseInt(req.params.id, 10);

    if (isNaN(corporationId)) {
      return res.status(400).json({ error: 'Invalid corporation ID' });
    }

    const corporation = await CorporationModel.findById(corporationId);
    if (!corporation) {
      return res.status(404).json({ error: 'Corporation not found' });
    }

    const [valuation, balanceSheet] = await Promise.all([
      calculateStockPrice(corporationId),
      calculateBalanceSheet(corporationId),
    ]);

    res.json({
      corporation_id: corporationId,
      current_price: corporation.share_price,
      valuation: {
        fundamental_value: valuation.fundamentalValue,
        trade_weighted_price: valuation.tradeWeightedPrice,
        calculated_price: valuation.calculatedPrice,
        recent_trade_count: valuation.recentTradeCount,
        has_trade_history: valuation.hasTradeHistory,
        fundamental_weight: STOCK_VALUATION.FUNDAMENTAL_WEIGHT,
        trade_weight: STOCK_VALUATION.TRADE_WEIGHT,
      },
      balance_sheet: balanceSheet,
    });
  } catch (error: any) {
    console.error('Get valuation error:', error);
    res.status(500).json({ error: 'Failed to fetch valuation' });
  }
});

// GET /api/shares/:id/history - Get share price history
router.get('/:id/history', async (req: Request, res: Response) => {
  try {
    const corporationId = parseInt(req.params.id, 10);
    const hours = req.query.hours ? parseInt(req.query.hours as string, 10) : undefined;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 100;

    if (isNaN(corporationId)) {
      return res.status(400).json({ error: 'Invalid corporation ID' });
    }

    const history = await SharePriceHistoryModel.findByCorporationId(
      corporationId,
      limit,
      hours
    );

    res.json(history);
  } catch (error: any) {
    console.error('Get price history error:', error);
    res.status(500).json({ error: 'Failed to fetch price history' });
  }
});

export default router;
