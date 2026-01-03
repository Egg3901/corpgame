"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const connection_1 = __importDefault(require("../db/connection"));
const Shareholder_1 = require("../models/Shareholder");
const imageUrl_1 = require("../utils/imageUrl");
const router = express_1.default.Router();
// GET /api/portfolio/:userId - Get user's portfolio
router.get('/:userId', async (req, res) => {
    try {
        const userId = parseInt(req.params.userId, 10);
        if (isNaN(userId)) {
            return res.status(400).json({ error: 'Invalid user ID' });
        }
        // Get all shareholders records for this user
        const shareholders = await Shareholder_1.ShareholderModel.findByUserId(userId);
        // Batch fetch all corporations in a single query
        const corpIds = [...new Set(shareholders.map(sh => sh.corporation_id))];
        let corpMap = new Map();
        if (corpIds.length > 0) {
            const corpResult = await connection_1.default.query(`SELECT id, name, logo, share_price, shares, type 
         FROM corporations WHERE id = ANY($1)`, [corpIds]);
            for (const corp of corpResult.rows) {
                corpMap.set(corp.id, {
                    id: corp.id,
                    name: corp.name,
                    logo: (0, imageUrl_1.normalizeImageUrl)(corp.logo),
                    share_price: parseFloat(corp.share_price),
                    shares: corp.shares,
                    type: corp.type,
                });
            }
        }
        // Build holdings using pre-fetched corporation data
        const holdings = shareholders.map((sh) => {
            const corporation = corpMap.get(sh.corporation_id);
            if (!corporation) {
                return null;
            }
            const currentValue = sh.shares * corporation.share_price;
            const ownershipPercentage = (sh.shares / corporation.shares) * 100;
            return {
                corporation: {
                    id: corporation.id,
                    name: corporation.name,
                    logo: corporation.logo,
                    share_price: corporation.share_price,
                    total_shares: corporation.shares,
                    type: corporation.type,
                },
                shares_owned: sh.shares,
                current_value: currentValue,
                ownership_percentage: ownershipPercentage,
                purchased_at: sh.purchased_at,
            };
        });
        // Filter out null values (corporations that were deleted)
        const validHoldings = holdings.filter((h) => h !== null);
        // Calculate total portfolio value
        const totalValue = validHoldings.reduce((sum, h) => sum + h.current_value, 0);
        // Calculate total dividend income from transactions
        const dividendResult = await connection_1.default.query(`SELECT COALESCE(SUM(amount), 0) as total
       FROM transactions
       WHERE to_user_id = $1 AND transaction_type IN ('dividend', 'special_dividend')`, [userId]);
        const dividendIncome = parseFloat(dividendResult.rows[0].total) || 0;
        res.json({
            user_id: userId,
            holdings: validHoldings,
            total_value: totalValue,
            dividend_income: dividendIncome,
        });
    }
    catch (error) {
        console.error('Get portfolio error:', error);
        res.status(500).json({ error: 'Failed to fetch portfolio' });
    }
});
exports.default = router;
