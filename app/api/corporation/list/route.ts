import { NextRequest, NextResponse } from 'next/server';
import { connectMongo, getDb } from '@/lib/db/mongo';
import { Corporation } from '@/lib/models/Corporation';
import { MarketEntryModel } from '@/lib/models/MarketEntry';
import { calculateBalanceSheet } from '@/lib/utils/valuation';
import { normalizeImageUrl } from '@/lib/utils/imageUrl';
import { SECTORS } from '@/lib/constants/sectors';
import { Filter } from 'mongodb';

interface CorporationUser {
  id: number;
  profile_id: number;
  username: string;
  player_name?: string;
  profile_slug: string;
  profile_image_url?: string | null;
}

export async function GET(request: NextRequest) {
  try {
    await connectMongo();
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '25', 10);
    const sort = searchParams.get('sort') || 'revenue';
    const dir = (searchParams.get('dir') || 'desc').toLowerCase() === 'asc' ? 'asc' : 'desc';
    const sector = searchParams.get('sector') || '';
    const q = searchParams.get('q') || '';
    const ceo = searchParams.get('ceo') || '';

    const db = getDb();

    // Build query
    const query: Filter<Corporation> = {};

    if (sector) {
      query.type = sector;
    }

    if (q) {
      query.name = { $regex: q, $options: 'i' };
    }

    if (ceo) {
      // Find users matching the CEO search term
      const users = await db.collection('users').find({
        $or: [
          { username: { $regex: ceo, $options: 'i' } },
          { player_name: { $regex: ceo, $options: 'i' } }
        ]
      }, { projection: { id: 1 } }).toArray();
      
      const userIds = users.map(u => u.id);
      query.ceo_id = { $in: userIds };
    }

    // Count total matches
    const total = await db.collection<Corporation>('corporations').countDocuments(query);

    // Fetch all matching corporations (needed for sorting by computed metrics)
    // If sorting by simple fields (name, id), we could optimize, but for now stick to legacy logic
    const corporations = await db.collection<Corporation>('corporations').find(query).toArray();

    // Batch fetch CEO details
    const ceoIds = [...new Set(corporations.map(c => c.ceo_id))];
    let ceoMap = new Map<number, CorporationUser>();
    if (ceoIds.length > 0) {
      const users = await db.collection('users').find({
        id: { $in: ceoIds }
      }, {
        projection: {
          id: 1, profile_id: 1, username: 1, player_name: 1,
          profile_slug: 1, profile_image_url: 1
        }
      }).toArray();

      for (const user of users) {
        ceoMap.set(user.id, {
          id: user.id,
          profile_id: user.profile_id,
          username: user.username,
          player_name: user.player_name,
          profile_slug: user.profile_slug,
          profile_image_url: normalizeImageUrl(user.profile_image_url),
        });
      }
    }

    // Compute metrics
    const itemsWithMetrics = await Promise.all(
      corporations.map(async (c: Corporation) => {
        const financesResult = await MarketEntryModel.calculateCorporationFinances(c.id).catch(() => null);
        const balanceSheet = await calculateBalanceSheet(c.id).catch(() => null);
        const marketCap = (Number(c.shares) || 0) * (Number(c.share_price) || 0);
        
        return {
          id: c.id,
          name: c.name,
          logo: normalizeImageUrl(c.logo),
          sector: c.type || 'Unknown',
          ceo: ceoMap.get(c.ceo_id) || null,
          shares: c.shares,
          share_price: c.share_price,
          market_cap: marketCap,
          revenue_96h: financesResult?.display_revenue || 0,
          costs_96h: financesResult?.display_costs || 0,
          profit_96h: financesResult?.display_profit || 0,
          assets: balanceSheet?.totalAssets || 0,
          book_value: balanceSheet?.shareholdersEquity || 0,
        };
      })
    );

    type MetricKey = 'revenue' | 'profit' | 'assets' | 'market_cap' | 'share_price' | 'book_value' | 'name';
    type SortKey = MetricKey;

    // Sorting
    const validSortKeys: SortKey[] = ['revenue', 'profit', 'assets', 'market_cap', 'share_price', 'book_value', 'name'];
    const sortKey = validSortKeys.includes(sort as SortKey) ? (sort as SortKey) : 'revenue';

    const keyMap: Record<SortKey, (x: typeof itemsWithMetrics[0]) => number | string> = {
      revenue: (x) => x.revenue_96h,
      profit: (x) => x.profit_96h,
      assets: (x) => x.assets,
      market_cap: (x) => x.market_cap,
      share_price: (x) => x.share_price,
      book_value: (x) => x.book_value,
      name: (x) => x.name,
    };

    itemsWithMetrics.sort((a, b) => {
      const ka = keyMap[sortKey](a);
      const kb = keyMap[sortKey](b);
      if (typeof ka === 'string' && typeof kb === 'string') {
        return dir === 'asc' ? String(ka).localeCompare(String(kb)) : String(kb).localeCompare(String(ka));
      }
      return dir === 'asc' ? Number(ka) - Number(kb) : Number(kb) - Number(ka);
    });

    // Pagination
    const start = (page - 1) * limit;
    const end = start + limit;
    const pageItems = itemsWithMetrics.slice(start, end);

    return NextResponse.json({
      items: pageItems,
      total,
      page,
      limit,
      available_metrics: ['revenue', 'profit', 'assets', 'market_cap', 'share_price', 'book_value'],
      sectors: SECTORS,
    });

  } catch (error: unknown) {
    console.error('Corporations list error:', error);
    return NextResponse.json({
      error: 'Failed to fetch corporations list',
    }, { status: 500 });
  }
}
