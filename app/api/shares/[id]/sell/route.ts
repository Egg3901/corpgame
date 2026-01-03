import { NextRequest, NextResponse } from 'next/server';
import { getAuthUserId } from '@/lib/auth';
import { CorporationModel } from '@/lib/models/Corporation';
import { SellSharesSchema } from '@/lib/validations/shares';
import { ShareholderModel } from '@/lib/models/Shareholder';
import { ShareTransactionModel } from '@/lib/models/ShareTransaction';
import { UserModel } from '@/lib/models/User';
import { calculateStockPrice } from '@/lib/utils/valuation';
import { getErrorMessage } from '@/lib/utils';

async function getCurrentSharePrice(corporationId: number): Promise<number> {
  const valuation = await calculateStockPrice(corporationId);
  return valuation.calculatedPrice;
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const userId = await getAuthUserId(req);
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const corporationId = parseInt(params.id, 10);

    if (isNaN(corporationId)) {
      return NextResponse.json({ error: 'Invalid corporation ID' }, { status: 400 });
    }

    const body = await req.json();
    const validated = SellSharesSchema.safeParse(body);
    
    if (!validated.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validated.error.issues },
        { status: 400 }
      );
    }

    const sharesToSell = validated.data.shares;

    // Get corporation
    const corporation = await CorporationModel.findById(corporationId);
    if (!corporation) {
      return NextResponse.json({ error: 'Corporation not found' }, { status: 404 });
    }

    // Check user holdings
    const shareholders = await ShareholderModel.findByCorporationId(corporationId);
    const shareholder = shareholders.find(s => s.user_id === userId);

    if (!shareholder || shareholder.shares < sharesToSell) {
      return NextResponse.json({ 
        error: `Insufficient shares. You have ${shareholder?.shares || 0} shares.` 
      }, { status: 400 });
    }

    // Calculate current share price
    const currentPrice = await getCurrentSharePrice(corporationId);
    
    // Sell price is 0.99x current price (spread)
    const sellPrice = Math.round(currentPrice * 0.99 * 100) / 100;
    const totalProceeds = sellPrice * sharesToSell;

    // Add cash to user
    await UserModel.updateCash(userId, totalProceeds);

    // Update corporation: increase public shares
    await CorporationModel.incrementPublicShares(corporationId, sharesToSell);

    // Update shareholder record
    const newShares = shareholder.shares - sharesToSell;
    await ShareholderModel.updateShares(corporationId, userId, newShares);

    // Record share transaction
    await ShareTransactionModel.create({
      corporation_id: corporationId,
      user_id: userId,
      transaction_type: 'sell',
      shares: sharesToSell,
      price_per_share: sellPrice,
      total_amount: totalProceeds,
    });

    return NextResponse.json({
      message: 'Shares sold successfully',
      shares: sharesToSell,
      price: sellPrice,
      total_proceeds: totalProceeds,
    });
  } catch (error: unknown) {
    console.error('Sell shares error:', error);
    return NextResponse.json({ error: getErrorMessage(error, 'Failed to sell shares') }, { status: 500 });
  }
}
