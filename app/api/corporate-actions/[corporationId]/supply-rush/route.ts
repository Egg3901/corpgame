import { NextRequest, NextResponse } from 'next/server';
import { getAuthUserId } from '@/lib/auth';
import { CorporateActionModel } from '@/lib/models/CorporateAction';
import { CorporationModel } from '@/lib/models/Corporation';
import { TransactionModel } from '@/lib/models/Transaction';
import { getErrorMessage } from '@/lib/utils';

// Helper to check if user is CEO of corporation
async function isCeo(corporationId: number, userId: number): Promise<boolean> {
  const corp = await CorporationModel.findById(corporationId);
  return corp?.ceo_id === userId;
}

// Calculate market capitalization
async function getMarketCapitalization(corporationId: number): Promise<number> {
  const corp = await CorporationModel.findById(corporationId);
  if (!corp) return 0;
  return corp.shares * corp.share_price;
}

// Calculate cost for an action: $500,000 + 1% of market cap
function calculateActionCost(marketCap: number): number {
  return 500000 + (marketCap * 0.01);
}

// Helper function to format cost
function formatCost(cost: number): string {
  return `$${cost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export async function POST(req: NextRequest, { params }: { params: { corporationId: string } }) {
  try {
    const userId = await getAuthUserId(req);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const corporationId = parseInt(params.corporationId, 10);
    if (isNaN(corporationId)) {
      return NextResponse.json({ error: 'Invalid corporation ID' }, { status: 400 });
    }

    // Check if user is CEO
    const ceoCheck = await isCeo(corporationId, userId);
    if (!ceoCheck) {
      return NextResponse.json({ error: 'Only the CEO can activate corporate actions' }, { status: 403 });
    }

    // Check if already active
    const hasActive = await CorporateActionModel.hasActiveAction(corporationId, 'supply_rush');
    if (hasActive) {
      const activeAction = await CorporateActionModel.findActiveAction(corporationId, 'supply_rush');
      return NextResponse.json({ 
        error: 'Supply rush is already active',
        expiresAt: activeAction?.expires_at
      }, { status: 400 });
    }

    // Calculate cost
    const marketCap = await getMarketCapitalization(corporationId);
    const cost = calculateActionCost(marketCap);

    // Check if corporation has enough capital
    const corp = await CorporationModel.findById(corporationId);
    if (!corp) {
      return NextResponse.json({ error: 'Corporation not found' }, { status: 404 });
    }

    if (corp.capital < cost) {
      return NextResponse.json({ 
        error: 'Insufficient capital',
        required: cost,
        available: corp.capital
      }, { status: 400 });
    }

    // Deduct cost from corporation capital
    await CorporationModel.update(corporationId, { 
      capital: corp.capital - cost 
    });

    // Create action (expires in 4 hours)
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 4);

    const action = await CorporateActionModel.create({
      corporation_id: corporationId,
      action_type: 'supply_rush',
      cost,
      expires_at: expiresAt,
    });

    // Record transaction
    await TransactionModel.create({
      transaction_type: 'corporate_action',
      amount: -cost,
      from_user_id: userId,
      corporation_id: corporationId,
      description: `Supply Rush activated - ${formatCost(cost)}`,
    });

    return NextResponse.json(action, { status: 201 });
  } catch (error: unknown) {
    console.error('Activate supply rush error:', error);
    return NextResponse.json({ error: getErrorMessage(error, 'Failed to activate supply rush') }, { status: 500 });
  }
}
