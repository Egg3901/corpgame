import pool from '../db/connection';

export type TransactionType = 
  | 'corp_revenue'
  | 'ceo_salary'
  | 'user_transfer'
  | 'share_purchase'
  | 'share_sale'
  | 'share_issue'
  | 'market_entry'
  | 'unit_build'
  | 'corp_founding';

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

    const result = await pool.query(
      `INSERT INTO transactions (
        transaction_type, amount, from_user_id, to_user_id, 
        corporation_id, description, reference_id, reference_type
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *`,
      [
        transaction_type,
        amount,
        from_user_id,
        to_user_id,
        corporation_id,
        description,
        reference_id,
        reference_type,
      ]
    );

    return result.rows[0];
  }

  /**
   * Find transaction by ID
   */
  static async findById(id: number): Promise<Transaction | null> {
    const result = await pool.query(
      'SELECT * FROM transactions WHERE id = $1',
      [id]
    );
    return result.rows[0] || null;
  }

  /**
   * Get transactions for a user (as sender or recipient)
   */
  static async findByUserId(
    userId: number,
    limit: number = 50,
    offset: number = 0
  ): Promise<TransactionWithDetails[]> {
    const result = await pool.query(
      `SELECT 
        t.*,
        CASE WHEN t.from_user_id IS NOT NULL THEN
          json_build_object(
            'id', fu.id,
            'profile_id', fu.profile_id,
            'username', fu.username,
            'player_name', fu.player_name,
            'profile_image_url', fu.profile_image_url
          )
        ELSE NULL END as from_user,
        CASE WHEN t.to_user_id IS NOT NULL THEN
          json_build_object(
            'id', tu.id,
            'profile_id', tu.profile_id,
            'username', tu.username,
            'player_name', tu.player_name,
            'profile_image_url', tu.profile_image_url
          )
        ELSE NULL END as to_user,
        CASE WHEN t.corporation_id IS NOT NULL THEN
          json_build_object(
            'id', c.id,
            'name', c.name,
            'logo', c.logo
          )
        ELSE NULL END as corporation
      FROM transactions t
      LEFT JOIN users fu ON t.from_user_id = fu.id
      LEFT JOIN users tu ON t.to_user_id = tu.id
      LEFT JOIN corporations c ON t.corporation_id = c.id
      WHERE t.from_user_id = $1 OR t.to_user_id = $1
      ORDER BY t.created_at DESC
      LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );

    return result.rows;
  }

  /**
   * Get transactions for a corporation
   */
  static async findByCorporationId(
    corporationId: number,
    limit: number = 50,
    offset: number = 0
  ): Promise<TransactionWithDetails[]> {
    const result = await pool.query(
      `SELECT 
        t.*,
        CASE WHEN t.from_user_id IS NOT NULL THEN
          json_build_object(
            'id', fu.id,
            'profile_id', fu.profile_id,
            'username', fu.username,
            'player_name', fu.player_name,
            'profile_image_url', fu.profile_image_url
          )
        ELSE NULL END as from_user,
        CASE WHEN t.to_user_id IS NOT NULL THEN
          json_build_object(
            'id', tu.id,
            'profile_id', tu.profile_id,
            'username', tu.username,
            'player_name', tu.player_name,
            'profile_image_url', tu.profile_image_url
          )
        ELSE NULL END as to_user,
        json_build_object(
          'id', c.id,
          'name', c.name,
          'logo', c.logo
        ) as corporation
      FROM transactions t
      LEFT JOIN users fu ON t.from_user_id = fu.id
      LEFT JOIN users tu ON t.to_user_id = tu.id
      JOIN corporations c ON t.corporation_id = c.id
      WHERE t.corporation_id = $1
      ORDER BY t.created_at DESC
      LIMIT $2 OFFSET $3`,
      [corporationId, limit, offset]
    );

    return result.rows;
  }

  /**
   * Admin: Get all transactions with filters
   */
  static async findAll(
    filters: TransactionFilters = {},
    limit: number = 50,
    offset: number = 0
  ): Promise<TransactionWithDetails[]> {
    const conditions: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (filters.user_id) {
      conditions.push(`(t.from_user_id = $${paramIndex} OR t.to_user_id = $${paramIndex})`);
      params.push(filters.user_id);
      paramIndex++;
    }

    if (filters.corporation_id) {
      conditions.push(`t.corporation_id = $${paramIndex}`);
      params.push(filters.corporation_id);
      paramIndex++;
    }

    if (filters.transaction_type) {
      conditions.push(`t.transaction_type = $${paramIndex}`);
      params.push(filters.transaction_type);
      paramIndex++;
    }

    if (filters.search) {
      conditions.push(`(
        t.description ILIKE $${paramIndex}
        OR fu.username ILIKE $${paramIndex}
        OR fu.player_name ILIKE $${paramIndex}
        OR tu.username ILIKE $${paramIndex}
        OR tu.player_name ILIKE $${paramIndex}
        OR c.name ILIKE $${paramIndex}
      )`);
      params.push(`%${filters.search}%`);
      paramIndex++;
    }

    if (filters.from_date) {
      conditions.push(`t.created_at >= $${paramIndex}`);
      params.push(filters.from_date);
      paramIndex++;
    }

    if (filters.to_date) {
      conditions.push(`t.created_at <= $${paramIndex}`);
      params.push(filters.to_date);
      paramIndex++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    params.push(limit, offset);

    const result = await pool.query(
      `SELECT 
        t.*,
        CASE WHEN t.from_user_id IS NOT NULL THEN
          json_build_object(
            'id', fu.id,
            'profile_id', fu.profile_id,
            'username', fu.username,
            'player_name', fu.player_name,
            'profile_image_url', fu.profile_image_url
          )
        ELSE NULL END as from_user,
        CASE WHEN t.to_user_id IS NOT NULL THEN
          json_build_object(
            'id', tu.id,
            'profile_id', tu.profile_id,
            'username', tu.username,
            'player_name', tu.player_name,
            'profile_image_url', tu.profile_image_url
          )
        ELSE NULL END as to_user,
        CASE WHEN t.corporation_id IS NOT NULL THEN
          json_build_object(
            'id', c.id,
            'name', c.name,
            'logo', c.logo
          )
        ELSE NULL END as corporation
      FROM transactions t
      LEFT JOIN users fu ON t.from_user_id = fu.id
      LEFT JOIN users tu ON t.to_user_id = tu.id
      LEFT JOIN corporations c ON t.corporation_id = c.id
      ${whereClause}
      ORDER BY t.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      params
    );

    return result.rows;
  }

  /**
   * Get count of transactions matching filters (for pagination)
   */
  static async getCount(filters: TransactionFilters = {}): Promise<number> {
    const conditions: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (filters.user_id) {
      conditions.push(`(t.from_user_id = $${paramIndex} OR t.to_user_id = $${paramIndex})`);
      params.push(filters.user_id);
      paramIndex++;
    }

    if (filters.corporation_id) {
      conditions.push(`t.corporation_id = $${paramIndex}`);
      params.push(filters.corporation_id);
      paramIndex++;
    }

    if (filters.transaction_type) {
      conditions.push(`t.transaction_type = $${paramIndex}`);
      params.push(filters.transaction_type);
      paramIndex++;
    }

    if (filters.search) {
      conditions.push(`(
        t.description ILIKE $${paramIndex}
        OR fu.username ILIKE $${paramIndex}
        OR fu.player_name ILIKE $${paramIndex}
        OR tu.username ILIKE $${paramIndex}
        OR tu.player_name ILIKE $${paramIndex}
        OR c.name ILIKE $${paramIndex}
      )`);
      params.push(`%${filters.search}%`);
      paramIndex++;
    }

    if (filters.from_date) {
      conditions.push(`t.created_at >= $${paramIndex}`);
      params.push(filters.from_date);
      paramIndex++;
    }

    if (filters.to_date) {
      conditions.push(`t.created_at <= $${paramIndex}`);
      params.push(filters.to_date);
      paramIndex++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const result = await pool.query(
      `SELECT COUNT(*) as count
      FROM transactions t
      LEFT JOIN users fu ON t.from_user_id = fu.id
      LEFT JOIN users tu ON t.to_user_id = tu.id
      LEFT JOIN corporations c ON t.corporation_id = c.id
      ${whereClause}`,
      params
    );

    return parseInt(result.rows[0].count, 10);
  }

  /**
   * Get recent transactions (for dashboard/overview)
   */
  static async getRecent(limit: number = 10): Promise<TransactionWithDetails[]> {
    return this.findAll({}, limit, 0);
  }
}
