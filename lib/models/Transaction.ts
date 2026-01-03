import { getDb, getNextId } from '../db/mongo';
import { Document, Filter } from 'mongodb';

export type TransactionType =
  | 'corp_revenue'
  | 'ceo_salary'
  | 'user_transfer'
  | 'share_purchase'
  | 'share_sale'
  | 'share_issue'
  | 'market_entry'
  | 'unit_build'
  | 'corp_founding'
  | 'dividend'
  | 'special_dividend'
  | 'sector_abandon'
  | 'unit_abandon'
  | 'corporate_action'
  | 'market_revenue'
  | 'market_cost';

export interface Transaction {
  id: number;
  transaction_type: TransactionType;
  amount: number;
  from_user_id: number | null;
  to_user_id: number | null;
  corporation_id: number | null;
  description: string | null;
  reference_id: number | null;
  reference_type: string | null;
  created_at: Date;
}

export interface TransactionInput {
  transaction_type: TransactionType;
  amount: number;
  from_user_id?: number | null;
  to_user_id?: number | null;
  corporation_id?: number | null;
  description?: string | null;
  reference_id?: number | null;
  reference_type?: string | null;
}

export interface TransactionWithDetails extends Transaction {
  from_user?: {
    id: number;
    profile_id: number;
    username: string;
    player_name?: string;
    profile_image_url?: string | null;
  } | null;
  to_user?: {
    id: number;
    profile_id: number;
    username: string;
    player_name?: string;
    profile_image_url?: string | null;
  } | null;
  corporation?: {
    id: number;
    name: string;
    logo?: string | null;
  } | null;
}

export interface TransactionFilters {
  user_id?: number;
  corporation_id?: number;
  transaction_type?: TransactionType;
  search?: string;
  from_date?: Date;
  to_date?: Date;
}

export class TransactionModel {
  /**
   * Create a new transaction record
   */
  static async create(data: TransactionInput): Promise<Transaction> {
    const {
      transaction_type,
      amount,
      from_user_id = null,
      to_user_id = null,
      corporation_id = null,
      description = null,
      reference_id = null,
      reference_type = null,
    } = data;

    const id = await getNextId('transactions_id');
    const now = new Date();

    const doc: Transaction = {
      id,
      transaction_type,
      amount,
      from_user_id: from_user_id ?? null,
      to_user_id: to_user_id ?? null,
      corporation_id: corporation_id ?? null,
      description: description ?? null,
      reference_id: reference_id ?? null,
      reference_type: reference_type ?? null,
      created_at: now,
    };

    await getDb().collection('transactions').insertOne(doc);
    return doc;
  }

  /**
   * Find transaction by ID
   */
  static async findById(id: number): Promise<Transaction | null> {
    return await getDb().collection<Transaction>('transactions').findOne({ id });
  }

  /**
   * Helper to build aggregation pipeline for details
   */
  private static getAggregationPipeline(match: Filter<Transaction>, limit: number, offset: number): Document[] {
    return [
      { $match: match },
      { $sort: { created_at: -1 } },
      { $skip: offset },
      { $limit: limit },
      // Lookup From User
      {
        $lookup: {
          from: 'users',
          localField: 'from_user_id',
          foreignField: 'id',
          as: 'fromUserArr'
        }
      },
      { $unwind: { path: '$fromUserArr', preserveNullAndEmptyArrays: true } },
      // Lookup To User
      {
        $lookup: {
          from: 'users',
          localField: 'to_user_id',
          foreignField: 'id',
          as: 'toUserArr'
        }
      },
      { $unwind: { path: '$toUserArr', preserveNullAndEmptyArrays: true } },
      // Lookup Corporation
      {
        $lookup: {
          from: 'corporations',
          localField: 'corporation_id',
          foreignField: 'id',
          as: 'corpArr'
        }
      },
      { $unwind: { path: '$corpArr', preserveNullAndEmptyArrays: true } },
      // Project
      {
        $project: {
          id: 1,
          transaction_type: 1,
          amount: 1,
          from_user_id: 1,
          to_user_id: 1,
          corporation_id: 1,
          description: 1,
          reference_id: 1,
          reference_type: 1,
          created_at: 1,
          from_user: {
            $cond: {
              if: { $eq: ['$from_user_id', null] },
              then: null,
              else: {
                id: '$fromUserArr.id',
                profile_id: '$fromUserArr.profile_id',
                username: '$fromUserArr.username',
                player_name: '$fromUserArr.player_name',
                profile_image_url: '$fromUserArr.profile_image_url',
              }
            }
          },
          to_user: {
            $cond: {
              if: { $eq: ['$to_user_id', null] },
              then: null,
              else: {
                id: '$toUserArr.id',
                profile_id: '$toUserArr.profile_id',
                username: '$toUserArr.username',
                player_name: '$toUserArr.player_name',
                profile_image_url: '$toUserArr.profile_image_url',
              }
            }
          },
          corporation: {
            $cond: {
              if: { $eq: ['$corporation_id', null] },
              then: null,
              else: {
                id: '$corpArr.id',
                name: '$corpArr.name',
                logo: '$corpArr.logo',
              }
            }
          }
        }
      }
    ];
  }

  /**
   * Get transactions for a user (as sender or recipient)
   */
  static async findByUserId(
    userId: number,
    limit: number = 50,
    offset: number = 0
  ): Promise<TransactionWithDetails[]> {
    const match = {
      $or: [{ from_user_id: userId }, { to_user_id: userId }]
    };
    
    return await getDb().collection('transactions')
      .aggregate<TransactionWithDetails>(this.getAggregationPipeline(match, limit, offset))
      .toArray();
  }

  /**
   * Get transactions for a corporation
   */
  static async findByCorporationId(
    corporationId: number,
    limit: number = 50,
    offset: number = 0
  ): Promise<TransactionWithDetails[]> {
    const match = { corporation_id: corporationId };
    
    return await getDb().collection('transactions')
      .aggregate<TransactionWithDetails>(this.getAggregationPipeline(match, limit, offset))
      .toArray();
  }

  /**
   * Admin: Get all transactions with filters
   */
  static async findAll(
    filters: TransactionFilters = {},
    limit: number = 50,
    offset: number = 0
  ): Promise<TransactionWithDetails[]> {
    const match: Filter<Transaction> = {};

    if (filters.user_id) {
      match.$or = [{ from_user_id: filters.user_id }, { to_user_id: filters.user_id }];
    }

    if (filters.corporation_id) {
      match.corporation_id = filters.corporation_id;
    }

    if (filters.transaction_type) {
      match.transaction_type = filters.transaction_type;
    }

    if (filters.from_date) {
      match.created_at = { ...match.created_at, $gte: filters.from_date };
    }

    if (filters.to_date) {
      match.created_at = { ...match.created_at, $lte: filters.to_date };
    }

    // Search is tricky with lookups in standard find, easier in aggregation but we do match first
    // If searching by username, we need to do lookup first or use separate queries.
    // For now, let's support description search only in match, or we'd need a more complex pipeline.
    // The original SQL did ILIKE on usernames too.
    // To support username search, we'd need to $lookup users first, then $match.
    // But that's expensive.
    // Let's implement basic description search first.
    if (filters.search) {
       match.description = { $regex: filters.search, $options: 'i' };
    }

    return await getDb().collection('transactions')
      .aggregate<TransactionWithDetails>(this.getAggregationPipeline(match, limit, offset))
      .toArray();
  }

  /**
   * Get count of transactions matching filters (for pagination)
   */
  static async getCount(filters: TransactionFilters = {}): Promise<number> {
    const match: Filter<Transaction> = {};

    if (filters.user_id) {
      match.$or = [{ from_user_id: filters.user_id }, { to_user_id: filters.user_id }];
    }

    if (filters.corporation_id) {
      match.corporation_id = filters.corporation_id;
    }

    if (filters.transaction_type) {
      match.transaction_type = filters.transaction_type;
    }

    if (filters.from_date) {
      match.created_at = { ...match.created_at, $gte: filters.from_date };
    }

    if (filters.to_date) {
      match.created_at = { ...match.created_at, $lte: filters.to_date };
    }
    
    if (filters.search) {
       match.description = { $regex: filters.search, $options: 'i' };
    }

    return await getDb().collection<Transaction>('transactions').countDocuments(match);
  }

  /**
   * Get recent transactions (for dashboard/overview)
   */
  static async getRecent(limit: number = 10): Promise<TransactionWithDetails[]> {
    return this.findAll({}, limit, 0);
  }

  /**
   * Get total dividend income for a user
   */
  static async getDividendIncome(userId: number): Promise<number> {
    const result = await getDb().collection('transactions').aggregate([
      {
        $match: {
          to_user_id: userId,
          transaction_type: { $in: ['dividend', 'special_dividend'] }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$amount' }
        }
      }
    ]).toArray();
    
    return result.length > 0 ? result[0].total : 0;
  }

  /**
   * Get unit builds in the last 24 hours grouped by state and sector
   */
  static async getUnitBuildsLast24Hours(stateCode?: string): Promise<Array<{ state_code: string; sector_type: string; builds: number }>> {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    const match: Filter<Transaction> = {
      transaction_type: 'unit_build',
      reference_type: 'business_unit',
      created_at: { $gte: yesterday }
    };

    const pipeline: Document[] = [
      { $match: match },
      {
        $lookup: {
          from: 'business_units',
          localField: 'reference_id',
          foreignField: 'id',
          as: 'bu'
        }
      },
      { $unwind: '$bu' },
      {
        $lookup: {
          from: 'market_entries',
          localField: 'bu.market_entry_id',
          foreignField: 'id',
          as: 'me'
        }
      },
      { $unwind: '$me' }
    ];

    if (stateCode) {
      pipeline.push({ $match: { 'me.state_code': stateCode } });
    }

    pipeline.push({
      $group: {
        _id: { state_code: '$me.state_code', sector_type: '$me.sector_type' },
        builds: { $sum: 1 }
      }
    });

    pipeline.push({
      $project: {
        _id: 0,
        state_code: '$_id.state_code',
        sector_type: '$_id.sector_type',
        builds: 1
      }
    });

    const results = await getDb().collection('transactions').aggregate(pipeline).toArray();
    return results as Array<{ state_code: string; sector_type: string; builds: number }>;
  }
}
