import { getDb, getNextId } from '../db/mongo';

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
  static async create(historyData: ProductPriceHistoryInput): Promise<ProductPriceHistory> {
    const { product_name, price, supply, demand } = historyData;

    const id = await getNextId('product_price_history_id');
    const now = new Date();

    const doc: ProductPriceHistory = {
      id,
      product_name,
      price,
      supply,
      demand,
      recorded_at: now,
    };

    await getDb().collection<ProductPriceHistory>('product_price_history').insertOne(doc);
    return doc;
  }

  static async findByProductName(
    productName: string,
    limit: number = 100,
    hours?: number
  ): Promise<ProductPriceHistory[]> {
    const filter: Record<string, unknown> = { product_name: productName };
    
    if (hours) {
      filter.recorded_at = { $gte: new Date(Date.now() - hours * 60 * 60 * 1000) };
    }

    return await getDb()
      .collection<ProductPriceHistory>('product_price_history')
      .find(filter)
      .sort({ recorded_at: -1 })
      .limit(limit)
      .toArray();
  }

  static async getPriceFromHoursAgo(
    productName: string,
    hoursAgo: number = 1
  ): Promise<number | null> {
    const cutoff = new Date(Date.now() - hoursAgo * 60 * 60 * 1000);
    
    const result = await getDb()
      .collection<ProductPriceHistory>('product_price_history')
      .findOne(
        { 
          product_name: productName,
          recorded_at: { $lte: cutoff }
        },
        { sort: { recorded_at: -1 } }
      );

    return result ? result.price : null;
  }
}
