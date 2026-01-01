import { NextRequest, NextResponse } from 'next/server';
import { TransactionModel } from '@/lib/models/Transaction';
import { UserModel } from '@/lib/models/User';
import { connectMongo } from '@/lib/db/mongo';
import { getErrorMessage } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectMongo();
    
    // History is only available by ID currently
    const userId = parseInt(params.id, 10);

    if (isNaN(userId)) {
      // If we want to support slug, we'd need to lookup user by slug here
      // For now, return error if not ID
      return NextResponse.json({ error: 'Invalid user ID' }, { status: 400 });
    }

    // Check if user exists
    const user = await UserModel.findById(userId);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const limit = parseInt(req.nextUrl.searchParams.get('limit') || '50', 10);
    const offset = parseInt(req.nextUrl.searchParams.get('offset') || '0', 10);
    
    const transactions = await TransactionModel.findByUserId(userId, limit, offset);

    // Transform transactions to CorporateHistoryItem[]
    // The frontend expects { user_id, history: [...] }
    const history = transactions
      .filter(tx => tx.corporation_id && tx.corporation) // Must be related to a corporation
      .map(tx => {
        let type = 'other';
        
        // Map transaction types to history types
        if (tx.transaction_type === 'corp_founding') {
          type = 'founded';
        }
        
        // We only want to include specific corporate events
        if (type === 'other') {
          return null;
        }

        return {
          type,
          corporation_id: tx.corporation_id,
          corporation_name: tx.corporation?.name || 'Unknown Corporation',
          date: tx.created_at, // NextResponse will serialize Date to string
          details: tx.description || undefined
        };
      })
      .filter(Boolean); // Remove nulls

    return NextResponse.json({
      user_id: userId,
      history
    });
  } catch (error: unknown) {
    console.error('Get profile history error:', error);
    return NextResponse.json({ error: getErrorMessage(error, 'Failed to fetch history') }, { status: 500 });
  }
}
