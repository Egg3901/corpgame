"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_1 = require("../middleware/auth");
const Corporation_1 = require("../models/Corporation");
const Shareholder_1 = require("../models/Shareholder");
const ShareTransaction_1 = require("../models/ShareTransaction");
const SharePriceHistory_1 = require("../models/SharePriceHistory");
const User_1 = require("../models/User");
const Transaction_1 = require("../models/Transaction");
const valuation_1 = require("../utils/valuation");
const router = express_1.default.Router();
// Helper function to get current share price using new valuation system
async function getCurrentSharePrice(corporationId) {
    const valuation = await (0, valuation_1.calculateStockPrice)(corporationId);
    return valuation.calculatedPrice;
}
// POST /api/shares/:id/buy - Buy shares
router.post('/:id/buy', auth_1.authenticateToken, async (req, res) => {
    try {
        const corporationId = parseInt(req.params.id, 10);
        const userId = req.userId;
        const { shares: requestedShares } = req.body;
        if (isNaN(corporationId)) {
            return res.status(400).json({ error: 'Invalid corporation ID' });
        }
        if (!requestedShares || requestedShares <= 0 || !Number.isInteger(requestedShares)) {
            return res.status(400).json({ error: 'Invalid number of shares' });
        }
        // Get corporation
        const corporation = await Corporation_1.CorporationModel.findById(corporationId);
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
        const userCash = await User_1.UserModel.getCash(userId);
        if (userCash < totalCost) {
            return res.status(400).json({
                error: `Insufficient funds. You have ${userCash.toLocaleString('en-US', { style: 'currency', currency: 'USD' })} but need ${totalCost.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}`
            });
        }
        // Deduct cash from user
        await User_1.UserModel.updateCash(userId, -totalCost);
        // Update corporation: reduce public shares (no capital change - just transferring ownership)
        const newPublicShares = corporation.public_shares - requestedShares;
        await Corporation_1.CorporationModel.update(corporationId, {
            public_shares: newPublicShares,
        });
        // Update or create shareholder record
        const existingShareholder = await Shareholder_1.ShareholderModel.findByCorporationId(corporationId)
            .then(sh => sh.find(s => s.user_id === userId));
        if (existingShareholder) {
            await Shareholder_1.ShareholderModel.updateShares(corporationId, userId, existingShareholder.shares + requestedShares);
        }
        else {
            await Shareholder_1.ShareholderModel.create({
                corporation_id: corporationId,
                user_id: userId,
                shares: requestedShares,
            });
        }
        // Record share transaction (for price calculation)
        const shareTransaction = await ShareTransaction_1.ShareTransactionModel.create({
            corporation_id: corporationId,
            user_id: userId,
            transaction_type: 'buy',
            shares: requestedShares,
            price_per_share: buyPrice,
            total_amount: totalCost,
        });
        // Record financial transaction
        await Transaction_1.TransactionModel.create({
            transaction_type: 'share_purchase',
            amount: totalCost,
            from_user_id: userId,
            corporation_id: corporationId,
            description: `Purchased ${requestedShares} shares at $${buyPrice.toFixed(2)}/share`,
            reference_id: shareTransaction.id,
            reference_type: 'share_transaction',
        });
        // Recalculate stock price using fundamentals-based valuation
        const newPrice = await (0, valuation_1.updateStockPrice)(corporationId);
        // Record price history
        const updatedCorp = await Corporation_1.CorporationModel.findById(corporationId);
        const updatedCapital = typeof updatedCorp.capital === 'string'
            ? parseFloat(updatedCorp.capital)
            : updatedCorp.capital;
        await SharePriceHistory_1.SharePriceHistoryModel.create({
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
    }
    catch (error) {
        console.error('Buy shares error:', error);
        res.status(500).json({ error: error.message || 'Failed to buy shares' });
    }
});
// POST /api/shares/:id/sell - Sell shares
router.post('/:id/sell', auth_1.authenticateToken, async (req, res) => {
    try {
        const corporationId = parseInt(req.params.id, 10);
        const userId = req.userId;
        const { shares: requestedShares } = req.body;
        if (isNaN(corporationId)) {
            return res.status(400).json({ error: 'Invalid corporation ID' });
        }
        if (!requestedShares || requestedShares <= 0 || !Number.isInteger(requestedShares)) {
            return res.status(400).json({ error: 'Invalid number of shares' });
        }
        // Get corporation
        const corporation = await Corporation_1.CorporationModel.findById(corporationId);
        if (!corporation) {
            return res.status(404).json({ error: 'Corporation not found' });
        }
        // Check if user owns enough shares
        const shareholders = await Shareholder_1.ShareholderModel.findByCorporationId(corporationId);
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
        await User_1.UserModel.updateCash(userId, totalRevenue);
        // Update corporation: increase public shares (no capital change - just transferring ownership)
        const newPublicShares = corporation.public_shares + requestedShares;
        await Corporation_1.CorporationModel.update(corporationId, {
            public_shares: newPublicShares,
        });
        // Update shareholder record
        const newShares = userShareholder.shares - requestedShares;
        if (newShares > 0) {
            await Shareholder_1.ShareholderModel.updateShares(corporationId, userId, newShares);
        }
        else {
            await Shareholder_1.ShareholderModel.delete(corporationId, userId);
        }
        // Record share transaction (for price calculation)
        const shareTransaction = await ShareTransaction_1.ShareTransactionModel.create({
            corporation_id: corporationId,
            user_id: userId,
            transaction_type: 'sell',
            shares: requestedShares,
            price_per_share: sellPrice,
            total_amount: totalRevenue,
        });
        // Record financial transaction
        await Transaction_1.TransactionModel.create({
            transaction_type: 'share_sale',
            amount: totalRevenue,
            to_user_id: userId,
            corporation_id: corporationId,
            description: `Sold ${requestedShares} shares at $${sellPrice.toFixed(2)}/share`,
            reference_id: shareTransaction.id,
            reference_type: 'share_transaction',
        });
        // Recalculate stock price using fundamentals-based valuation
        const newPrice = await (0, valuation_1.updateStockPrice)(corporationId);
        // Record price history
        const updatedCorp2 = await Corporation_1.CorporationModel.findById(corporationId);
        const updatedCapital2 = typeof updatedCorp2.capital === 'string'
            ? parseFloat(updatedCorp2.capital)
            : updatedCorp2.capital;
        await SharePriceHistory_1.SharePriceHistoryModel.create({
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
    }
    catch (error) {
        console.error('Sell shares error:', error);
        res.status(500).json({ error: error.message || 'Failed to sell shares' });
    }
});
// POST /api/shares/:id/issue - Issue new shares (CEO only)
router.post('/:id/issue', auth_1.authenticateToken, async (req, res) => {
    try {
        const corporationId = parseInt(req.params.id, 10);
        const userId = req.userId;
        const { shares: requestedShares } = req.body;
        if (isNaN(corporationId)) {
            return res.status(400).json({ error: 'Invalid corporation ID' });
        }
        if (!requestedShares || requestedShares <= 0 || !Number.isInteger(requestedShares)) {
            return res.status(400).json({ error: 'Invalid number of shares' });
        }
        // Get corporation
        const corporation = await Corporation_1.CorporationModel.findById(corporationId);
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
        await Corporation_1.CorporationModel.update(corporationId, {
            shares: newTotalShares,
            public_shares: newPublicShares,
            capital: newCapital,
        });
        // Record share transaction (issue is treated as a special buy transaction from the corporation)
        const shareTransaction = await ShareTransaction_1.ShareTransactionModel.create({
            corporation_id: corporationId,
            user_id: userId, // CEO
            transaction_type: 'buy', // Issue is like buying from the corporation
            shares: requestedShares,
            price_per_share: issuePrice,
            total_amount: totalCapitalRaised,
        });
        // Record financial transaction
        await Transaction_1.TransactionModel.create({
            transaction_type: 'share_issue',
            amount: totalCapitalRaised,
            to_user_id: userId, // CEO issued the shares
            corporation_id: corporationId,
            description: `Issued ${requestedShares} new shares at $${issuePrice.toFixed(2)}/share, raising $${totalCapitalRaised.toLocaleString()} capital`,
            reference_id: shareTransaction.id,
            reference_type: 'share_transaction',
        });
        // Recalculate stock price using fundamentals-based valuation
        const newPrice = await (0, valuation_1.updateStockPrice)(corporationId);
        // Record price history
        await SharePriceHistory_1.SharePriceHistoryModel.create({
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
    }
    catch (error) {
        console.error('Issue shares error:', error);
        res.status(500).json({ error: error.message || 'Failed to issue shares' });
    }
});
// GET /api/shares/:id/valuation - Get detailed stock valuation
router.get('/:id/valuation', async (req, res) => {
    try {
        const corporationId = parseInt(req.params.id, 10);
        if (isNaN(corporationId)) {
            return res.status(400).json({ error: 'Invalid corporation ID' });
        }
        const corporation = await Corporation_1.CorporationModel.findById(corporationId);
        if (!corporation) {
            return res.status(404).json({ error: 'Corporation not found' });
        }
        const [valuation, balanceSheet] = await Promise.all([
            (0, valuation_1.calculateStockPrice)(corporationId),
            (0, valuation_1.calculateBalanceSheet)(corporationId),
        ]);
        res.json({
            corporation_id: corporationId,
            current_price: corporation.share_price,
            valuation: {
                book_value: valuation.bookValue,
                earnings_value: valuation.earningsValue,
                dividend_yield: valuation.dividendYield,
                cash_per_share: valuation.cashPerShare,
                trade_weighted_price: valuation.tradeWeightedPrice,
                fundamental_value: valuation.fundamentalValue,
                calculated_price: valuation.calculatedPrice,
                recent_trade_count: valuation.recentTradeCount,
                has_trade_history: valuation.hasTradeHistory,
                annual_profit: valuation.annualProfit,
                annual_dividend_per_share: valuation.annualDividendPerShare,
            },
            balance_sheet: balanceSheet,
        });
    }
    catch (error) {
        console.error('Get valuation error:', error);
        res.status(500).json({ error: 'Failed to fetch valuation' });
    }
});
// GET /api/shares/:id/history - Get share price history
router.get('/:id/history', async (req, res) => {
    try {
        const corporationId = parseInt(req.params.id, 10);
        const hours = req.query.hours ? parseInt(req.query.hours, 10) : undefined;
        const limit = req.query.limit ? parseInt(req.query.limit, 10) : 100;
        if (isNaN(corporationId)) {
            return res.status(400).json({ error: 'Invalid corporation ID' });
        }
        const history = await SharePriceHistory_1.SharePriceHistoryModel.findByCorporationId(corporationId, limit, hours);
        res.json(history);
    }
    catch (error) {
        console.error('Get price history error:', error);
        res.status(500).json({ error: 'Failed to fetch price history' });
    }
});
exports.default = router;
