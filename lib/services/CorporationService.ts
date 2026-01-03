import { CorporationModel, CreateCorporationData, Corporation } from '../models/Corporation';
import { MarketEntryModel } from '../models/MarketEntry';
import { BusinessUnitModel } from '../models/BusinessUnit';
import { UserModel } from '../models/User';
import { MessageModel } from '../models/Message';
import { connectMongo, getDb } from '../db/mongo';
import { calculateBalanceSheet } from '../utils/valuation';
import { normalizeImageUrl } from '../utils/imageUrl';
import { SECTORS } from '../constants/sectors';
import { Filter } from 'mongodb';

export interface CorporationListItem {
  id: number;
  name: string;
  logo: string | null;
  sector: string;
  ceo: {
    id: number;
    profile_id: number;
    username: string;
    player_name?: string;
    profile_slug: string;
    profile_image_url?: string | null;
  } | null;
  shares: number;
  share_price: number;
  market_cap: number;
  revenue_96h: number;
  costs_96h: number;
  profit_96h: number;
  assets: number;
  book_value: number;
}

export interface CorporationsListResult {
  items: CorporationListItem[];
  total: number;
  page: number;
  limit: number;
  available_metrics: string[];
  sectors: string[];
}

export interface CorporationsListParams {
  page?: number;
  limit?: number;
  sort?: 'revenue' | 'profit' | 'assets' | 'market_cap' | 'share_price' | 'book_value' | 'name';
  dir?: 'asc' | 'desc';
  sector?: string;
  q?: string;
  ceo?: string;
}

export class CorporationService {
  /**
   * Fetches corporations list with computed metrics.
   * Designed for server-side rendering - calls database directly.
   */
  static async getCorporationsList(params: CorporationsListParams = {}): Promise<CorporationsListResult> {
    const {
      page = 1,
      limit = 25,
      sort = 'revenue',
      dir = 'desc',
      sector = '',
      q = '',
      ceo = '',
    } = params;

    await connectMongo();
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

    // Fetch all matching corporations
    const corporations = await db.collection<Corporation>('corporations').find(query).toArray();

    // Batch fetch CEO details
    const ceoIds = [...new Set(corporations.map(c => c.ceo_id))];
    const ceoMap = new Map<number, CorporationListItem['ceo']>();

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
    const itemsWithMetrics: CorporationListItem[] = await Promise.all(
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

    type SortKey = 'revenue' | 'profit' | 'assets' | 'market_cap' | 'share_price' | 'book_value' | 'name';
    const validSortKeys: SortKey[] = ['revenue', 'profit', 'assets', 'market_cap', 'share_price', 'book_value', 'name'];
    const sortKey = validSortKeys.includes(sort as SortKey) ? (sort as SortKey) : 'revenue';

    const keyMap: Record<SortKey, (x: CorporationListItem) => number | string> = {
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
        return dir === 'asc' ? ka.localeCompare(kb) : kb.localeCompare(ka);
      }
      return dir === 'asc' ? Number(ka) - Number(kb) : Number(kb) - Number(ka);
    });

    // Pagination
    const start = (page - 1) * limit;
    const end = start + limit;
    const pageItems = itemsWithMetrics.slice(start, end);

    return {
      items: pageItems,
      total,
      page,
      limit,
      available_metrics: ['revenue', 'profit', 'assets', 'market_cap', 'share_price', 'book_value'],
      sectors: [...SECTORS],
    };
  }
  /**
   * Creates a new corporation for a user if they don't already have one.
   * Includes default market entry and business unit setup.
   */
  static async createForUser(user: { id: number; player_name: string; starting_state: string; username: string }) {
    // 1. Check if user already has a corporation (is CEO)
    const existingCorps = await CorporationModel.findByCeoId(user.id);
    if (existingCorps.length > 0) {
      return existingCorps[0];
    }

    // 2. Generate a unique corporation name
    let baseName = `${user.player_name || user.username}'s Enterprise`;
    let name = baseName;
    let counter = 1;

    while (await CorporationModel.findByName(name)) {
      counter++;
      name = `${baseName} ${counter}`;
    }

    // 3. Create the Corporation
    // Defaults: 500k capital, 500k shares, 100k public, $1.00 price, 'diversified' focus
    const corpData: CreateCorporationData = {
      ceo_id: user.id,
      name: name,
      shares: 500000,
      public_shares: 100000,
      share_price: 1.00,
      capital: 500000.00,
      type: null, // Legacy field, we use focus now? Or type is sector? Model says type is sector string or null.
      focus: 'diversified',
    };

    const corporation = await CorporationModel.create(corpData);

    // 4. Create initial Market Entry in starting state
    // Default to 'Retail' sector as it's generally accessible
    const marketEntry = await MarketEntryModel.create({
      corporation_id: corporation.id,
      state_code: user.starting_state,
      sector_type: 'Retail',
    });

    // 5. Create initial Business Unit
    // Give them 1 Retail unit to start
    await BusinessUnitModel.create({
      market_entry_id: marketEntry.id,
      unit_type: 'retail',
      count: 1,
    });

    // 6. Notify the user
    try {
      await MessageModel.create({
        sender_id: 1, // System
        recipient_id: user.id,
        subject: 'Corporation Established!',
        body: `Congratulations! Your corporation "${name}" has been established.\n\nWe have set up your headquarters in ${user.starting_state} and established a Retail presence.\n\nYou have been granted:\n• $500,000.00 in Capital\n• 1 Retail Unit in ${user.starting_state}\n\nGood luck, CEO!`,
      });
    } catch (error: unknown) {
      console.warn('Failed to send corporation creation notification', error);
    }

    return corporation;
  }
}
