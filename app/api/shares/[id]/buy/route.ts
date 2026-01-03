import { NextRequest, NextResponse } from 'next/server';
import { getAuthUserId } from '@/lib/auth';
import { CorporationModel } from '@/lib/models/Corporation';
import { BuySharesSchema } from '@/lib/validations/shares';
import { ShareholderModel } from '@/lib/models/Shareholder';
import { ShareTransactionModel } from '@/lib/models/ShareTransaction';
import { SharePriceHistoryModel } from '@/lib/models/SharePriceHistory';
import { UserModel } from '@/lib/models/User';
import { TransactionModel } from '@/lib/models/Transaction';
import { calculateStockPrice, updateStockPrice } from '@/lib/utils/valuation';
import { getErrorMessage } from '@/lib/utils';

async function getCurrentSharePrice(corporationId: number): Promise<number> {
  const valuation = await calculateStockPrice(corporationId);
  return valuation.calculatedPrice;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getAuthUserId(req);
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await params;
    const corporationId = parseInt(id, 10);

    if (isNaN(corporationId)) {
      return NextResponse.json({ error: 'Invalid corporation ID' }, { status: 400 });
    }

    const body = await req.json();
    const validated = BuySharesSchema.safeParse(body);
    
    if (!validated.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validated.error.issues },
        { status: 400 }
      );
    }

    const { shares: requestedShares } = validated.data;

    // Get corporation
    const corporation = await CorporationModel.findById(corporationId);
    if (!corporation) {
      return NextResponse.json({ error: 'Corporation not found' }, { status: 404 });
    }

    // Check if enough public shares available
    if (corporation.public_shares < requestedShares) {
      return NextResponse.json({ 
        error: `Only ${corporation.public_shares} public shares available` 
      }, { status: 400 });
    }

    // Calculate current share price using fundamentals-based valuation
    const currentPrice = await getCurrentSharePrice(corporationId);
    
    // Buy price is 1.01x current price
    const buyPrice = Math.round(currentPrice * 1.01 * 100) / 100;
    const totalCost = buyPrice * requestedShares;

    // Check user's cash
    const userCash = await UserModel.getCash(userId);
    if (userCash < totalCost) {
      return NextResponse.json({ 
        error: `Insufficient funds. You have ${userCash.toLocaleString('en-US', { style: 'currency', currency: 'USD' })} but need ${totalCost.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}` 
      }, { status: 400 });
    }

    // Deduct cash from user
    await UserModel.updateCash(userId, -totalCost);

    // Update corporation: reduce public shares (no capital change - just transferring ownership)
    await CorporationModel.incrementPublicShares(corporationId, -requestedShares);
    
    // Update or create shareholder record
    const shareholders = await ShareholderModel.findByCorporationId(corporationId);
    const existingShareholder = shareholders.find(s => s.user_id === userId);
    
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

    return NextResponse.json({
      success: true,
      shares: requestedShares,
      price_per_share: buyPrice,
      total_cost: totalCost,
      new_share_price: newPrice,
    });
  } catch (error: unknown) {
    console.error('Buy shares error:', error);
    return NextResponse.json({ error: getErrorMessage(error, 'Failed to buy shares') }, { status: 500 });
  }
}
