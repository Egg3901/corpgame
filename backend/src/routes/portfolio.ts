import express, { Request, Response } from 'express';
import pool from '../db/connection';
import { ShareholderModel } from '../models/Shareholder';
import { CorporationModel } from '../models/Corporation';
import { UserModel } from '../models/User';
import { normalizeImageUrl } from '../utils/imageUrl';

const router = express.Router();

// GET /api/portfolio/:userId - Get user's portfolio
router.get('/:userId', async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.userId, 10);
    if (isNaN(userId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    // Get all shareholders records for this user
    const shareholders = await ShareholderModel.findByUserId(userId);

    // Get full corporation details for each holding
    const holdings = await Promise.all(
      shareholders.map(async (sh) => {
        const corporation = await CorporationModel.findById(sh.corporation_id);
        if (!corporation) {
          return null;
        }

        const currentValue = sh.shares * corporation.share_price;
        const ownershipPercentage = (sh.shares / corporation.shares) * 100;

        return {
          corporation: {
            id: corporation.id,
            name: corporation.name,
            logo: normalizeImageUrl(corporation.logo),
            share_price: corporation.share_price,
            total_shares: corporation.shares,
            type: corporation.type,
          },
          shares_owned: sh.shares,
          current_value: currentValue,
          ownership_percentage: ownershipPercentage,
          purchased_at: sh.purchased_at,
        };
      })
    );

    // Filter out null values (corporations that were deleted)
    const validHoldings = holdings.filter((h): h is NonNullable<typeof h> => h !== null);

    // Calculate total portfolio value
    const totalValue = validHoldings.reduce((sum, h) => sum + h.current_value, 0);

    // Calculate total dividend income from transactions
    const dividendResult = await pool.query(
      `SELECT COALESCE(SUM(amount), 0) as total
       FROM transactions
       WHERE to_user_id = $1 AND transaction_type IN ('dividend', 'special_dividend')`,
      [userId]
    );
    const dividendIncome = parseFloat(dividendResult.rows[0].total) || 0;

    res.json({
      user_id: userId,
      holdings: validHoldings,
      total_value: totalValue,
      dividend_income: dividendIncome,
    });
  } catch (error) {
    console.error('Get portfolio error:', error);
    res.status(500).json({ error: 'Failed to fetch portfolio' });
  }
});

export default router;
