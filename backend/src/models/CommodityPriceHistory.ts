import pool from '../db/connection';

export interface CommodityPriceHistory {
  id: number;
  resource_name: string;
  price: number;
  supply: number;
  demand: number;
  recorded_at: Date;
}

export interface CommodityPriceHistoryInput {
  resource_name: string;
  price: number;
  supply: number;
  demand: number;
}

export class CommodityPriceHistoryModel {
  private static mapRow(row: any): CommodityPriceHistory {
    if (!row) return row;
    return {
      ...row,
      price: typeof row.price === 'string' ? parseFloat(row.price) : row.price,
      supply: typeof row.supply === 'string' ? parseFloat(row.supply) : row.supply,
      demand: typeof row.demand === 'string' ? parseFloat(row.demand) : row.demand,
    };
  }

  static async create(historyData: CommodityPriceHistoryInput): Promise<CommodityPriceHistory> {
    const { resource_name, price, supply, demand } = historyData;

    const result = await pool.query(
      `INSERT INTO commodity_price_history (resource_name, price, supply, demand)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [resource_name, price, supply, demand]
    );

    return this.mapRow(result.rows[0]);
  }

  static async findByResourceName(
    resourceName: string,
    limit: number = 100,
    hours?: number
  ): Promise<CommodityPriceHistory[]> {
    let query = `SELECT * FROM commodity_price_history WHERE resource_name = $1`;
    const params: any[] = [resourceName];

    if (hours) {
      query += ` AND recorded_at >= NOW() - INTERVAL '${hours} hours'`;
    }

    query += ` ORDER BY recorded_at DESC LIMIT $${params.length + 1}`;
    params.push(limit);

    const result = await pool.query(query, params);
    return result.rows.map(row => this.mapRow(row));
  }

  static async getPriceFromHoursAgo(
    resourceName: string,
    hoursAgo: number = 1
  ): Promise<number | null> {
    const result = await pool.query(
      `SELECT price FROM commodity_price_history
       WHERE resource_name = $1
       AND recorded_at <= NOW() - INTERVAL '${hoursAgo} hours'
       ORDER BY recorded_at DESC
       LIMIT 1`,
      [resourceName]
    );

    if (result.rows.length === 0) return null;

    const price = result.rows[0].price;
    return typeof price === 'string' ? parseFloat(price) : price;
  }
}

