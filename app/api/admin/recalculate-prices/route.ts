import { NextRequest, NextResponse } from 'next/server';
import { getAuthUserId } from '@/lib/auth';
import { UserModel } from '@/lib/models/User';
import { CorporationModel } from '@/lib/models/Corporation';
import { updateStockPrice } from '@/lib/utils/valuation';
import { getErrorMessage } from '@/lib/utils';
import { connectMongo } from '@/lib/db/mongo';

export async function POST(req: NextRequest) {
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

    console.log(`[Admin] Recalculating all stock prices by user:`, userId);

    const corporations = await CorporationModel.findAll();
    const changes: Array<{ corporation_id: number; name: string; old_price: number; new_price: number }> = [];

    for (const corp of corporations) {
      const oldPrice = corp.share_price || 0;
      const newPrice = await updateStockPrice(corp.id);

      if (oldPrice !== newPrice) {
        changes.push({
          corporation_id: corp.id,
          name: corp.name,
          old_price: oldPrice,
          new_price: newPrice,
        });
      }
    }

    console.log(`[Admin] Recalculated prices for ${corporations.length} corporations, ${changes.length} changed`);

    return NextResponse.json({
      success: true,
      corporations_updated: changes.length,
      changes,
    });
  } catch (error: unknown) {
    console.error('Recalculate prices error:', error);
    return NextResponse.json({ error: getErrorMessage(error, 'Failed to recalculate prices') }, { status: 500 });
  }
}
