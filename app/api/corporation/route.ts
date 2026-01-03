import { NextRequest, NextResponse } from 'next/server';
import { getAuthUserId } from '@/lib/auth';
import { CorporationModel } from '@/lib/models/Corporation';
import { ShareholderModel } from '@/lib/models/Shareholder';
import { TransactionModel } from '@/lib/models/Transaction';
import { UserModel } from '@/lib/models/User';
import { connectMongo, getDb } from '@/lib/db/mongo';
import { normalizeImageUrl } from '@/lib/utils/imageUrl';
import { getErrorMessage } from '@/lib/utils';
import { SECTORS, isValidSector, CORP_FOCUS_TYPES, isValidCorpFocus, CorpFocus } from '@/lib/constants/sectors';
import { CreateCorporationSchema } from '@/lib/validations/corporations';

// Corporation structure configuration
const CORP_CONFIG = {
  public: { cost: 400000, capital: 500000, publicShares: 100000 },
  private: { cost: 500000, capital: 300000, publicShares: 0 },
} as const;

// GET /api/corporation - List all corporations
export async function GET(request: NextRequest) {
  try {
    await connectMongo();
    const corporations = await CorporationModel.findAll();

    // Get all unique CEO IDs
    const ceoIds = [...new Set(corporations.map(c => c.ceo_id))];
    const corpIds = corporations.map(c => c.id);

    // Batch fetch all CEOs
    interface CeoDetails {
      id: number;
      profile_id: number;
      username: string;
      player_name: string;
      profile_slug: string;
      profile_image_url: string | null;
    }
    let ceoMap = new Map<number, CeoDetails>();
    if (ceoIds.length > 0) {
      const db = getDb();
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

    // Batch fetch 4-hour price change for all corporations
    // Gets the oldest price within the last 4 hours for each corporation
    let priceChangeMap = new Map<number, number>();
    if (corpIds.length > 0) {
      const db = getDb();
      const fourHoursAgo = new Date(Date.now() - 4 * 60 * 60 * 1000);
      
      // We need the *oldest* price record >= 4 hours ago for each corporation
      // In Mongo, we can match, sort by date ASC, group by corp taking first
      const priceHistory = await db.collection('share_price_history').aggregate([
        {
          $match: {
            corporation_id: { $in: corpIds },
            recorded_at: { $gte: fourHoursAgo }
          }
        },
        { $sort: { recorded_at: 1 } },
        {
          $group: {
            _id: '$corporation_id',
            oldest_price: { $first: '$share_price' }
          }
        }
      ]).toArray();

      for (const row of priceHistory) {
        priceChangeMap.set(row._id, row.oldest_price);
      }
    }

    // Build corporations with CEO details and price change
    const corporationsWithCeo = corporations.map((corp) => {
      const oldPrice = priceChangeMap.get(corp.id);
      const priceChange4h = oldPrice && oldPrice > 0
        ? ((corp.share_price - oldPrice) / oldPrice) * 100
        : 0;

      return {
        ...corp,
        logo: normalizeImageUrl(corp.logo),
        ceo: ceoMap.get(corp.ceo_id) || null,
        price_change_4h: priceChange4h,
      };
    });

    return NextResponse.json(corporationsWithCeo);
  } catch (error: unknown) {
    console.error('List corporations error:', error);
    return NextResponse.json({ error: getErrorMessage(error, 'Failed to fetch corporations') }, { status: 500 });
  }
}

// POST /api/corporation - Create corporation
export async function POST(request: NextRequest) {
  try {
    await connectMongo();
    const userId = await getAuthUserId(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    
    // Zod validation
    const validated = CreateCorporationSchema.safeParse(body);
    if (!validated.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validated.error.issues },
        { status: 400 }
      );
    }
    
    const { name, type, focus, structure } = validated.data;
    const config = CORP_CONFIG[structure];

    // Check if user already has a corporation
    const existingCorporations = await CorporationModel.findByCeoId(userId);
    if (existingCorporations.length > 0) {
      return NextResponse.json({
        error: 'You can only be CEO of one corporation at a time',
        existingCorporation: {
          id: existingCorporations[0].id,
          name: existingCorporations[0].name,
        }
      }, { status: 400 });
    }

    // Check if user has enough cash for founding cost
    const user = await UserModel.findById(userId);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const userCash = typeof user.cash === 'string' ? parseFloat(user.cash) : (user.cash || 0);
    if (userCash < config.cost) {
      return NextResponse.json({
        error: `Insufficient funds. You need $${config.cost.toLocaleString()} to found a ${structure} corporation. You have $${userCash.toLocaleString()}.`
      }, { status: 400 });
    }

    // Deduct founding cost from user's cash
    await UserModel.updateCash(userId, -config.cost);

    // Create corporation with structure-based config
    const corporation = await CorporationModel.create({
      ceo_id: userId,
      name,
      type,
      structure,
      focus: (focus as CorpFocus) || 'diversified',
      shares: 500000,
      public_shares: config.publicShares,
      share_price: 1.00,
      capital: config.capital,
    });

    // Create shareholder record for CEO with 400,000 shares (80%)
    const founderShares = corporation.shares - corporation.public_shares;
    console.log(`[Corporation Create] Creating shareholder record: corp=${corporation.id}, user=${userId}, shares=${founderShares}`);
    const shareholderRecord = await ShareholderModel.create({
      corporation_id: corporation.id,
      user_id: userId,
      shares: founderShares,
    });
    console.log(`[Corporation Create] Shareholder record created:`, shareholderRecord);

    // Record corporation founding transaction
    await TransactionModel.create({
      transaction_type: 'corp_founding',
      amount: config.cost,
      from_user_id: userId,
      corporation_id: corporation.id,
      description: `Founded ${structure} corporation ${corporation.name} with $${config.capital.toLocaleString()} initial capital`,
    });

    return NextResponse.json(corporation, { status: 201 });
  } catch (error: unknown) {
    console.error('Create corporation error:', error);
    // Handle validation errors from the model
    const errorMessage = getErrorMessage(error);
    if (errorMessage.includes('Invalid sector') || errorMessage.includes('Invalid focus')) {
      return NextResponse.json({ error: errorMessage }, { status: 400 });
    }
    return NextResponse.json({ error: getErrorMessage(error, 'Failed to create corporation') }, { status: 500 });
  }
}
