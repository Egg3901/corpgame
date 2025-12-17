import express, { Request, Response } from 'express';
import { ShareholderModel } from '../models/Shareholder';
import { CorporationModel } from '../models/Corporation';
import { UserModel } from '../models/User';

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
      })
    );

    // Filter out null values (corporations that were deleted)
    const validHoldings = holdings.filter((h): h is NonNullable<typeof h> => h !== null);

    // Calculate total portfolio value
    const totalValue = validHoldings.reduce((sum, h) => sum + h.current_value, 0);

    res.json({
      user_id: userId,
      holdings: validHoldings,
      total_value: totalValue,
    });
  } catch (error) {
    console.error('Get portfolio error:', error);
    res.status(500).json({ error: 'Failed to fetch portfolio' });
  }
});

export default router;
