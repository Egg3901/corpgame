import { NextRequest, NextResponse } from 'next/server';
import { getDb, connectMongo } from '@/lib/db/mongo';
import { getAuthUserId } from '@/lib/auth';
import { getErrorMessage } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export interface LeaderboardEntry {
  rank: number;
  user_id: number;
  username: string;
  player_name: string | null;
  profile_id: number;
  profile_slug: string;
  profile_image_url: string | null;
  cash: number;
  portfolio_value: number;
  net_worth: number;
}

export interface LeaderboardResponse {
  entries: LeaderboardEntry[];
  total: number;
  page: number;
  limit: number;
  viewer_rank?: number;
  viewer_entry?: LeaderboardEntry;
}

export async function GET(req: NextRequest) {
  try {
    // Require authentication
    const viewerId = await getAuthUserId(req);
    if (!viewerId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectMongo();
    const db = getDb();

    // Parse pagination params
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '25', 10)));
    const offset = (page - 1) * limit;

    // Aggregation pipeline to calculate net worth for all users
    const pipeline = [
      // Start with non-banned users
      { $match: { is_banned: { $ne: true } } },
      // Lookup shareholder records for each user
      {
        $lookup: {
          from: 'shareholders',
          localField: 'id',
          foreignField: 'user_id',
          as: 'holdings'
        }
      },
      // Unwind holdings (preserve users with no holdings)
      { $unwind: { path: '$holdings', preserveNullAndEmptyArrays: true } },
      // Lookup corporation for share price
      {
        $lookup: {
          from: 'corporations',
          localField: 'holdings.corporation_id',
          foreignField: 'id',
          as: 'corporation'
        }
      },
      { $unwind: { path: '$corporation', preserveNullAndEmptyArrays: true } },
      // Calculate holding value
      {
        $addFields: {
          holding_value: {
            $ifNull: [
              { $multiply: ['$holdings.shares', '$corporation.share_price'] },
              0
            ]
          }
        }
      },
      // Group back by user, summing portfolio values
      {
        $group: {
          _id: '$id',
          username: { $first: '$username' },
          player_name: { $first: '$player_name' },
          profile_id: { $first: '$profile_id' },
          profile_slug: { $first: '$profile_slug' },
          profile_image_url: { $first: '$profile_image_url' },
          cash: { $first: { $ifNull: ['$cash', 0] } },
          portfolio_value: { $sum: '$holding_value' }
        }
      },
      // Calculate net worth
      {
        $addFields: {
          net_worth: { $add: ['$cash', '$portfolio_value'] }
        }
      },
      // Sort by net worth descending, then by username for consistency
      { $sort: { net_worth: -1, username: 1 } },
      // Use $facet to get both paginated results and total count
      {
        $facet: {
          entries: [
            { $skip: offset },
            { $limit: limit }
          ],
          total: [
            { $count: 'count' }
          ]
        }
      }
    ];

    const [result] = await db.collection('users').aggregate(pipeline).toArray();

    const total = result.total[0]?.count || 0;
    const entries: LeaderboardEntry[] = result.entries.map((entry: {
      _id: number;
      username: string;
      player_name: string | null;
      profile_id: number;
      profile_slug: string;
      profile_image_url: string | null;
      cash: number;
      portfolio_value: number;
      net_worth: number;
    }, index: number) => ({
      rank: offset + index + 1,
      user_id: entry._id,
      username: entry.username,
      player_name: entry.player_name,
      profile_id: entry.profile_id,
      profile_slug: entry.profile_slug,
      profile_image_url: entry.profile_image_url,
      cash: entry.cash,
      portfolio_value: entry.portfolio_value,
      net_worth: entry.net_worth
    }));

    // Check if viewer is in the results
    const viewerInResults = entries.find(e => e.user_id === viewerId);

    let viewer_rank: number | undefined;
    let viewer_entry: LeaderboardEntry | undefined;

    if (!viewerInResults) {
      // Get viewer's rank separately
      const viewerPipeline = [
        { $match: { is_banned: { $ne: true } } },
        {
          $lookup: {
            from: 'shareholders',
            localField: 'id',
            foreignField: 'user_id',
            as: 'holdings'
          }
        },
        { $unwind: { path: '$holdings', preserveNullAndEmptyArrays: true } },
        {
          $lookup: {
            from: 'corporations',
            localField: 'holdings.corporation_id',
            foreignField: 'id',
            as: 'corporation'
          }
        },
        { $unwind: { path: '$corporation', preserveNullAndEmptyArrays: true } },
        {
          $addFields: {
            holding_value: {
              $ifNull: [
                { $multiply: ['$holdings.shares', '$corporation.share_price'] },
                0
              ]
            }
          }
        },
        {
          $group: {
            _id: '$id',
            username: { $first: '$username' },
            player_name: { $first: '$player_name' },
            profile_id: { $first: '$profile_id' },
            profile_slug: { $first: '$profile_slug' },
            profile_image_url: { $first: '$profile_image_url' },
            cash: { $first: { $ifNull: ['$cash', 0] } },
            portfolio_value: { $sum: '$holding_value' }
          }
        },
        {
          $addFields: {
            net_worth: { $add: ['$cash', '$portfolio_value'] }
          }
        },
        { $sort: { net_worth: -1, username: 1 } },
        // Add rank to all users
        {
          $group: {
            _id: null,
            users: { $push: '$$ROOT' }
          }
        },
        { $unwind: { path: '$users', includeArrayIndex: 'rank' } },
        { $replaceRoot: { newRoot: { $mergeObjects: ['$users', { rank: { $add: ['$rank', 1] } }] } } },
        { $match: { _id: viewerId } }
      ];

      const viewerResults = await db.collection('users').aggregate(viewerPipeline).toArray();

      if (viewerResults.length > 0) {
        const viewer = viewerResults[0];
        viewer_rank = viewer.rank;
        viewer_entry = {
          rank: viewer.rank,
          user_id: viewer._id,
          username: viewer.username,
          player_name: viewer.player_name,
          profile_id: viewer.profile_id,
          profile_slug: viewer.profile_slug,
          profile_image_url: viewer.profile_image_url,
          cash: viewer.cash,
          portfolio_value: viewer.portfolio_value,
          net_worth: viewer.net_worth
        };
      }
    }

    const response: LeaderboardResponse = {
      entries,
      total,
      page,
      limit,
      viewer_rank,
      viewer_entry
    };

    return NextResponse.json(response);
  } catch (error: unknown) {
    console.error('Leaderboard error:', error);
    return NextResponse.json(
      { error: getErrorMessage(error, 'Failed to fetch leaderboard') },
      { status: 500 }
    );
  }
}
