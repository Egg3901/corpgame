import pool from '../db/connection';

export interface ProductPriceHistory {
  id: number;
  product_name: string;
  price: number;
  supply: number;
  demand: number;
  recorded_at: Date;
}

export interface ProductPriceHistoryInput {
  product_name: string;
  price: number;
  supply: number;
  demand: number;
}

export class ProductPriceHistoryModel {
  private static mapRow(row: any): ProductPriceHistory {
    if (!row) return row;
    return {
      ...row,
      price: typeof row.price === 'string' ? parseFloat(row.price) : row.price,
      supply: typeof row.supply === 'string' ? parseFloat(row.supply) : row.supply,
      demand: typeof row.demand === 'string' ? parseFloat(row.demand) : row.demand,
    };
  }

  static async create(historyData: ProductPriceHistoryInput): Promise<ProductPriceHistory> {
    const { product_name, price, supply, demand } = historyData;

    const result = await pool.query(
      `INSERT INTO product_price_history (product_name, price, supply, demand)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [product_name, price, supply, demand]
    );

    return this.mapRow(result.rows[0]);
  }

  static async findByProductName(
    productName: string,
    limit: number = 100,
    hours?: number
  ): Promise<ProductPriceHistory[]> {
    let query = `SELECT * FROM product_price_history WHERE product_name = $1`;
    const params: any[] = [productName];

    if (hours) {
      query += ` AND recorded_at >= NOW() - INTERVAL '${hours} hours'`;
    }

    query += ` ORDER BY recorded_at DESC LIMIT $${params.length + 1}`;
    params.push(limit);

    const result = await pool.query(query, params);
    return result.rows.map(row => this.mapRow(row));
  }
}

