import { NextRequest, NextResponse } from 'next/server';
import { getAuthUserId } from '@/lib/auth';
import { UserModel } from '@/lib/models/User';
import { TransactionModel, TransactionType } from '@/lib/models/Transaction';
import { connectMongo } from '@/lib/db/mongo';
import { getErrorMessage } from '@/lib/utils';

export async function GET(req: NextRequest) {
  try {
    await connectMongo();

    const userId = await getAuthUserId(req);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await UserModel.findById(userId);
    if (!user || !user.is_admin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const searchParams = req.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);
    const filterUserId = searchParams.get('user_id');
    const filterCorpId = searchParams.get('corporation_id');
    const filterType = searchParams.get('type') as TransactionType | null;
    const search = searchParams.get('search');

    const filters = {
      user_id: filterUserId ? parseInt(filterUserId, 10) : undefined,
      corporation_id: filterCorpId ? parseInt(filterCorpId, 10) : undefined,
      transaction_type: filterType || undefined,
      search: search || undefined,
    };

    const [transactions, total] = await Promise.all([
      TransactionModel.findAll(filters, limit, offset),
      TransactionModel.getCount(filters),
    ]);

    return NextResponse.json({
      transactions,
      pagination: {
        limit,
        offset,
        total,
        total_pages: Math.ceil(total / limit),
      },
    });
  } catch (error: unknown) {
    console.error('Admin transactions list error:', error);
    return NextResponse.json(
      { error: getErrorMessage(error, 'Failed to fetch transactions') },
      { status: 500 }
    );
  }
}
