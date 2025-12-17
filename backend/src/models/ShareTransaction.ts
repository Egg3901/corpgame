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
  static async create(transactionData: ShareTransactionInput): Promise<ShareTransaction> {
    const { corporation_id, user_id, transaction_type, shares, price_per_share, total_amount } = transactionData;

    const result = await pool.query(
      `INSERT INTO share_transactions (corporation_id, user_id, transaction_type, shares, price_per_share, total_amount)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [corporation_id, user_id, transaction_type, shares, price_per_share, total_amount]
    );

    return result.rows[0];
  }

  static async findByCorporationId(corporationId: number, limit: number = 50): Promise<ShareTransaction[]> {
    const result = await pool.query(
      `SELECT * FROM share_transactions 
       WHERE corporation_id = $1 
       ORDER BY created_at DESC 
       LIMIT $2`,
      [corporationId, limit]
    );
    return result.rows;
  }

  static async findByUserId(userId: number, limit: number = 50): Promise<ShareTransaction[]> {
    const result = await pool.query(
      `SELECT * FROM share_transactions 
       WHERE user_id = $1 
       ORDER BY created_at DESC 
       LIMIT $2`,
      [userId, limit]
    );
    return result.rows;
  }

  static async getRecentActivity(corporationId: number, hours: number = 24): Promise<ShareTransaction[]> {
    const result = await pool.query(
      `SELECT * FROM share_transactions 
       WHERE corporation_id = $1 
       AND created_at >= NOW() - INTERVAL '${hours} hours'
       ORDER BY created_at DESC`,
      [corporationId]
    );
    return result.rows;
  }
}
