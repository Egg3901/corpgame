import { getDb, getNextId } from '../db/mongo';

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
  static async create(historyData: CommodityPriceHistoryInput): Promise<CommodityPriceHistory> {
    const { resource_name, price, supply, demand } = historyData;

    const id = await getNextId('commodity_price_history_id');
    const now = new Date();

    const doc: CommodityPriceHistory = {
      id,
      resource_name,
      price,
      supply,
      demand,
      recorded_at: now,
    };

    await getDb().collection<CommodityPriceHistory>('commodity_price_history').insertOne(doc);
    return doc;
  }

  static async findByResourceName(
    resourceName: string,
    limit: number = 100,
    hours?: number
  ): Promise<CommodityPriceHistory[]> {
    const filter: Record<string, unknown> = { resource_name: resourceName };
    
    if (hours) {
      filter.recorded_at = { $gte: new Date(Date.now() - hours * 60 * 60 * 1000) };
    }

    return await getDb()
      .collection<CommodityPriceHistory>('commodity_price_history')
      .find(filter)
      .sort({ recorded_at: -1 })
      .limit(limit)
      .toArray();
  }

  static async getPriceFromHoursAgo(
    resourceName: string,
    hoursAgo: number = 1
  ): Promise<number | null> {
    const cutoff = new Date(Date.now() - hoursAgo * 60 * 60 * 1000);
    
    // Find the latest record that is BEFORE or AT the cutoff time
    // Logic: recorded_at <= cutoff, sort desc, limit 1
    const result = await getDb()
      .collection<CommodityPriceHistory>('commodity_price_history')
      .findOne(
        { 
          resource_name: resourceName,
          recorded_at: { $lte: cutoff }
        },
        { sort: { recorded_at: -1 } }
      );

    return result ? result.price : null;
  }
}
