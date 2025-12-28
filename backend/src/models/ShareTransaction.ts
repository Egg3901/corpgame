import pool from '../db/connection';

export interface ShareTransaction {
  id: number;
  corporation_id: number;
  user_id: number;
  transaction_type: 'buy' | 'sell';
  shares: number;
  price_per_share: number;
  total_amount: number;
  created_at: Date;
}

export interface ShareTransactionInput {
  corporation_id: number;
  user_id: number;
  transaction_type: 'buy' | 'sell';
  shares: number;
  price_per_share: number;
  total_amount: number;
}

export class ShareTransactionModel {
  private static mapRow(row: any): ShareTransaction {
    if (!row) return row;
    return {
      ...row,
      shares: typeof row.shares === 'string' ? parseInt(row.shares, 10) : row.shares,
      price_per_share: typeof row.price_per_share === 'string' ? parseFloat(row.price_per_share) : row.price_per_share,
      total_amount: typeof row.total_amount === 'string' ? parseFloat(row.total_amount) : row.total_amount,
    };
  }

  static async create(transactionData: ShareTransactionInput): Promise<ShareTransaction> {
    const { corporation_id, user_id, transaction_type, shares, price_per_share, total_amount } = transactionData;

    const result = await pool.query(
      `INSERT INTO share_transactions (corporation_id, user_id, transaction_type, shares, price_per_share, total_amount)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [corporation_id, user_id, transaction_type, shares, price_per_share, total_amount]
    );

    return this.mapRow(result.rows[0]);
  }

  static async findByCorporationId(corporationId: number, limit: number = 50): Promise<ShareTransaction[]> {
    const result = await pool.query(
      `SELECT * FROM share_transactions 
       WHERE corporation_id = $1 
       ORDER BY created_at DESC 
       LIMIT $2`,
      [corporationId, limit]
    );
    return result.rows.map(row => this.mapRow(row));
  }

  static async findByUserId(userId: number, limit: number = 50): Promise<ShareTransaction[]> {
    const result = await pool.query(
      `SELECT * FROM share_transactions 
       WHERE user_id = $1 
       ORDER BY created_at DESC 
       LIMIT $2`,
      [userId, limit]
    );
    return result.rows.map(row => this.mapRow(row));
  }

  static async getRecentActivity(corporationId: number, hours: number = 24): Promise<ShareTransaction[]> {
    const result = await pool.query(
      `SELECT * FROM share_transactions 
       WHERE corporation_id = $1 
       AND created_at >= NOW() - INTERVAL '${hours} hours'
       ORDER BY created_at DESC`,
      [corporationId]
    );
    return result.rows.map(row => this.mapRow(row));
  }
}

