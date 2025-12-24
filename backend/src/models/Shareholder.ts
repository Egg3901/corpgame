import pool from '../db/connection';

export interface Shareholder {
  id: number;
  corporation_id: number;
  user_id: number;
  shares: number;
  purchased_at: Date;
}

export interface ShareholderInput {
  corporation_id: number;
  user_id: number;
  shares: number;
}

export class ShareholderModel {
  private static mapRow(row: any): Shareholder {
    if (!row) return row;
    return {
      ...row,
      shares: typeof row.shares === 'string' ? parseInt(row.shares, 10) : row.shares,
    };
  }

  static async create(shareholderData: ShareholderInput): Promise<Shareholder> {
    const { corporation_id, user_id, shares } = shareholderData;

    const result = await pool.query(
      `INSERT INTO shareholders (corporation_id, user_id, shares)
       VALUES ($1, $2, $3)
       ON CONFLICT (corporation_id, user_id) 
       DO UPDATE SET shares = shareholders.shares + EXCLUDED.shares
       RETURNING *`,
      [corporation_id, user_id, shares]
    );

    return this.mapRow(result.rows[0]);
  }

  static async findByCorporationId(corporationId: number): Promise<Shareholder[]> {
    const result = await pool.query(
      'SELECT * FROM shareholders WHERE corporation_id = $1 ORDER BY shares DESC',
      [corporationId]
    );
    return result.rows.map(row => this.mapRow(row));
  }

  static async findByUserId(userId: number): Promise<Shareholder[]> {
    const result = await pool.query(
      'SELECT * FROM shareholders WHERE user_id = $1 ORDER BY purchased_at DESC',
      [userId]
    );
    return result.rows.map(row => this.mapRow(row));
  }

  static async updateShares(
    corporationId: number,
    userId: number,
    shares: number
  ): Promise<Shareholder | null> {
    const result = await pool.query(
      `UPDATE shareholders SET shares = $1 
       WHERE corporation_id = $2 AND user_id = $3 
       RETURNING *`,
      [shares, corporationId, userId]
    );
    return this.mapRow(result.rows[0]) || null;
  }

  static async delete(corporationId: number, userId: number): Promise<void> {
    await pool.query(
      'DELETE FROM shareholders WHERE corporation_id = $1 AND user_id = $2',
      [corporationId, userId]
    );
  }
}

