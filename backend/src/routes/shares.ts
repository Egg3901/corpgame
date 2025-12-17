import express, { Request, Response } from 'express';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { CorporationModel } from '../models/Corporation';
import { ShareholderModel } from '../models/Shareholder';
import { ShareTransactionModel } from '../models/ShareTransaction';
import { SharePriceHistoryModel } from '../models/SharePriceHistory';
import { UserModel } from '../models/User';

const router = express.Router();

// Helper function to calculate dynamic share price
async function calculateSharePrice(corporationId: number): Promise<number> {
  const corporation = await CorporationModel.findById(corporationId);
  if (!corporation) {
    throw new Error('Corporation not found');
  }

  // Base price calculation: capital / total_shares * 2
  // This ensures price reflects corporate value
  const capital = typeof corporation.capital === 'string' ? parseFloat(corporation.capital) : corporation.capital;
  const basePrice = (capital / corporation.shares) * 2;
  
  // Get recent transactions (last 24 hours)
  const recentTransactions = await ShareTransactionModel.getRecentActivity(corporationId, 24);
  
  // Calculate price impact from recent activity
  let priceImpact = 0;
  const impactFactor = 0.0001; // Small impact per share traded
  
  recentTransactions.forEach(transaction => {
    if (transaction.transaction_type === 'buy') {
      // Buying increases price
      priceImpact += transaction.shares * impactFactor;
    } else {
      // Selling decreases price
      priceImpact -= transaction.shares * impactFactor;
    }
  });

  // Calculate final price (ensure minimum of $1.00)
  const calculatedPrice = Math.max(1.00, basePrice + priceImpact);
  
  return Math.round(calculatedPrice * 100) / 100; // Round to 2 decimal places
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

    // Calculate current share price
    const currentPrice = await calculateSharePrice(corporationId);
    
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

    // Record transaction first (so it's included in price calculation)
    await ShareTransactionModel.create({
      corporation_id: corporationId,
      user_id: userId,
      transaction_type: 'buy',
      shares: requestedShares,
      price_per_share: buyPrice,
      total_amount: totalCost,
    });

    // Recalculate and update share price based on new capital and activity
    // Fetch fresh corporation data to ensure we have updated capital
    const updatedCorpForPrice = await CorporationModel.findById(corporationId);
    if (!updatedCorpForPrice) {
      throw new Error('Corporation not found after update');
    }
    
    // Manually calculate price with updated capital
    const updatedCapital = typeof updatedCorpForPrice.capital === 'string' ? parseFloat(updatedCorpForPrice.capital) : updatedCorpForPrice.capital;
    const basePrice = (updatedCapital / updatedCorpForPrice.shares) * 2;
    
    // Get recent transactions (including the one we just created)
    const recentTransactions = await ShareTransactionModel.getRecentActivity(corporationId, 24);
    let priceImpact = 0;
    const impactFactor = 0.0001;
    
    recentTransactions.forEach(transaction => {
      if (transaction.transaction_type === 'buy') {
        priceImpact += transaction.shares * impactFactor;
      } else {
        priceImpact -= transaction.shares * impactFactor;
      }
    });
    
    const newPrice = Math.max(1.00, basePrice + priceImpact);
    const roundedPrice = Math.round(newPrice * 100) / 100;
    
    await CorporationModel.update(corporationId, {
      share_price: roundedPrice,
    });

    // Record price history
    await SharePriceHistoryModel.create({
      corporation_id: corporationId,
      share_price: roundedPrice,
      capital: updatedCapital,
    });

    res.json({
      success: true,
      shares: requestedShares,
      price_per_share: buyPrice,
      total_cost: totalCost,
      new_share_price: roundedPrice,
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

    // Calculate current share price
    const currentPrice = await calculateSharePrice(corporationId);
    
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

    // Record transaction first (so it's included in price calculation)
    await ShareTransactionModel.create({
      corporation_id: corporationId,
      user_id: userId,
      transaction_type: 'sell',
      shares: requestedShares,
      price_per_share: sellPrice,
      total_amount: totalRevenue,
    });

    // Recalculate and update share price based on new capital and activity
    // Fetch fresh corporation data to ensure we have updated capital
    const updatedCorpForPrice = await CorporationModel.findById(corporationId);
    if (!updatedCorpForPrice) {
      throw new Error('Corporation not found after update');
    }
    
    // Manually calculate price with updated capital
    const updatedCapital = typeof updatedCorpForPrice.capital === 'string' ? parseFloat(updatedCorpForPrice.capital) : updatedCorpForPrice.capital;
    const basePrice = (updatedCapital / updatedCorpForPrice.shares) * 2;
    
    // Get recent transactions (including the one we just created)
    const recentTransactions = await ShareTransactionModel.getRecentActivity(corporationId, 24);
    let priceImpact = 0;
    const impactFactor = 0.0001;
    
    recentTransactions.forEach(transaction => {
      if (transaction.transaction_type === 'buy') {
        priceImpact += transaction.shares * impactFactor;
      } else {
        priceImpact -= transaction.shares * impactFactor;
      }
    });
    
    const newPrice = Math.max(1.00, basePrice + priceImpact);
    const roundedPrice = Math.round(newPrice * 100) / 100;
    
    await CorporationModel.update(corporationId, {
      share_price: roundedPrice,
    });

    // Record price history
    await SharePriceHistoryModel.create({
      corporation_id: corporationId,
      share_price: roundedPrice,
      capital: updatedCapital,
    });

    res.json({
      success: true,
      shares: requestedShares,
      price_per_share: sellPrice,
      total_revenue: totalRevenue,
      new_share_price: roundedPrice,
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

    // Calculate current share price
    const currentPrice = await calculateSharePrice(corporationId);
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

    // Record transaction (issue is treated as a special buy transaction from the corporation)
    await ShareTransactionModel.create({
      corporation_id: corporationId,
      user_id: userId, // CEO
      transaction_type: 'buy', // Issue is like buying from the corporation
      shares: requestedShares,
      price_per_share: issuePrice,
      total_amount: totalCapitalRaised,
    });

    // Recalculate and update share price based on new capital and share count
    const updatedCorpForPrice = await CorporationModel.findById(corporationId);
    if (!updatedCorpForPrice) {
      throw new Error('Corporation not found after update');
    }
    
    const updatedCapital = typeof updatedCorpForPrice.capital === 'string' ? parseFloat(updatedCorpForPrice.capital) : updatedCorpForPrice.capital;
    const basePrice = (updatedCapital / updatedCorpForPrice.shares) * 2;
    
    // Get recent transactions
    const recentTransactions = await ShareTransactionModel.getRecentActivity(corporationId, 24);
    let priceImpact = 0;
    const impactFactor = 0.0001;
    
    recentTransactions.forEach(transaction => {
      if (transaction.transaction_type === 'buy') {
        priceImpact += transaction.shares * impactFactor;
      } else {
        priceImpact -= transaction.shares * impactFactor;
      }
    });
    
    const newPrice = Math.max(1.00, basePrice + priceImpact);
    const roundedPrice = Math.round(newPrice * 100) / 100;
    
    await CorporationModel.update(corporationId, {
      share_price: roundedPrice,
    });

    // Record price history
    await SharePriceHistoryModel.create({
      corporation_id: corporationId,
      share_price: roundedPrice,
      capital: updatedCapital,
    });

    res.json({
      success: true,
      shares_issued: requestedShares,
      price_per_share: issuePrice,
      total_capital_raised: totalCapitalRaised,
      new_total_shares: newTotalShares,
      new_share_price: roundedPrice,
    });
  } catch (error: any) {
    console.error('Issue shares error:', error);
    res.status(500).json({ error: error.message || 'Failed to issue shares' });
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
