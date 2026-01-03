import { getDb, getNextId } from '../db/mongo';

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

    const now = new Date();
    const id = await getNextId('share_price_history_id');
    const doc: SharePriceHistory = {
      id,
      corporation_id,
      share_price,
      capital,
      recorded_at: now,
    };

    await getDb().collection<SharePriceHistory>('share_price_history').insertOne(doc);
    return doc;
  }

  static async findByCorporationId(
    corporationId: number,
    limit: number = 100,
    hours?: number
  ): Promise<SharePriceHistory[]> {
    const filter: Record<string, unknown> = { corporation_id: corporationId };
    if (hours) {
      filter.recorded_at = { $gte: new Date(Date.now() - hours * 60 * 60 * 1000) };
    }

    return await getDb()
      .collection<SharePriceHistory>('share_price_history')
      .find(filter)
      .sort({ recorded_at: -1 })
      .limit(limit)
      .toArray();
  }
}
