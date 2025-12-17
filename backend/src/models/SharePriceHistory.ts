import pool from '../db/connection';

export interface SharePriceHistory {
  id: number;
  corporation_id: number;
  share_price: number;
  capital: number;
  recorded_at: Date;
}

export interface SharePriceHistoryInput {
  corporation_id: number;
  share_price: number;
  capital: number;
}

export class SharePriceHistoryModel {
  static async create(historyData: SharePriceHistoryInput): Promise<SharePriceHistory> {
    const { corporation_id, share_price, capital } = historyData;

    const result = await pool.query(
      `INSERT INTO share_price_history (corporation_id, share_price, capital)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [corporation_id, share_price, capital]
    );

    return result.rows[0];
  }

  static async findByCorporationId(
    corporationId: number,
    limit: number = 100,
    hours?: number
  ): Promise<SharePriceHistory[]> {
    let query = `SELECT * FROM share_price_history WHERE corporation_id = $1`;
    const params: any[] = [corporationId];

    if (hours) {
      query += ` AND recorded_at >= NOW() - INTERVAL '${hours} hours'`;
    }

    query += ` ORDER BY recorded_at DESC LIMIT $${params.length + 1}`;
    params.push(limit);

    const result = await pool.query(query, params);
    return result.rows;
  }
}
