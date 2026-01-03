import { NextRequest, NextResponse } from 'next/server';
import { getAuthUserId } from '@/lib/auth';
import { CorporationModel } from '@/lib/models/Corporation';
import { BuySharesSchema } from '@/lib/validations/shares';
import { calculateStockPrice } from '@/lib/utils/valuation';
import { UserModel } from '@/lib/models/User';
import { getErrorMessage } from '@/lib/utils';

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

    const { shares: sharesToIssue } = validated.data;

    // Get corporation
    const corporation = await CorporationModel.findById(corporationId);
    if (!corporation) {
      return NextResponse.json({ error: 'Corporation not found' }, { status: 404 });
    }

    // Check permissions: Must be CEO or Admin
    const isCEO = corporation.ceo_id === userId || corporation.elected_ceo_id === userId;
    const user = await UserModel.findById(userId);
    const isAdmin = user?.is_admin;

    if (!isCEO && !isAdmin) {
      return NextResponse.json({ error: 'Only the CEO can issue shares' }, { status: 403 });
    }

    // Calculate current share price
    const valuation = await calculateStockPrice(corporationId);
    const currentPrice = valuation.calculatedPrice;
    
    // Issue price (use current market price)
    const capitalRaised = sharesToIssue * currentPrice;

    // Update corporation
    // 1. Increase total shares
    await CorporationModel.incrementShares(corporationId, sharesToIssue);
    // 2. Increase public shares (they go to the market)
    await CorporationModel.incrementPublicShares(corporationId, sharesToIssue);
    // 3. Increase capital
    await CorporationModel.incrementCapital(corporationId, capitalRaised);

    return NextResponse.json({
      message: 'Shares issued successfully',
      shares_issued: sharesToIssue,
      price_per_share: currentPrice,
      capital_raised: capitalRaised,
      new_total_shares: corporation.shares + sharesToIssue,
      new_public_shares: corporation.public_shares + sharesToIssue,
    });
  } catch (error: unknown) {
    console.error('Issue shares error:', error);
    return NextResponse.json({ error: getErrorMessage(error, 'Failed to issue shares') }, { status: 500 });
  }
}
