import { getDb, getNextId } from '../db/mongo';

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
  static async create(shareholderData: ShareholderInput): Promise<Shareholder> {
    const { corporation_id, user_id, shares } = shareholderData;
    const db = getDb();
    
    // Check if exists first to decide whether to increment or create
    // We can use findOneAndUpdate with upsert, but we need to handle ID generation for new docs
    // Since Mongo doesn't support auto-increment on upsert easily without a sequence call
    
    const existing = await db.collection<Shareholder>('shareholders').findOne({ corporation_id, user_id });
    
    if (existing) {
      const result = await db.collection<Shareholder>('shareholders').findOneAndUpdate(
        { corporation_id, user_id },
        { $inc: { shares: shares } },
        { returnDocument: 'after' }
      );
      if (!result) throw new Error('Failed to update shareholder');
      if (!result) throw new Error('Failed to update shareholder');
      return result;
    } else {
      const id = await getNextId('shareholders_id');
      const doc: Shareholder = {
        id,
        corporation_id,
        user_id,
        shares,
        purchased_at: new Date(),
      };
      await db.collection('shareholders').insertOne(doc);
      return doc;
    }
  }

  static async findByCorporationId(corporationId: number): Promise<Shareholder[]> {
    return await getDb().collection<Shareholder>('shareholders')
      .find({ corporation_id: corporationId })
      .sort({ shares: -1 })
      .toArray();
  }

  static async findByUserId(userId: number): Promise<Shareholder[]> {
    return await getDb().collection<Shareholder>('shareholders')
      .find({ user_id: userId })
      .sort({ purchased_at: -1 })
      .toArray();
  }

  static async getShareholder(corporationId: number, userId: number): Promise<Shareholder | null> {
    return await getDb().collection<Shareholder>('shareholders').findOne({ corporation_id: corporationId, user_id: userId });
  }

  static async updateShares(
    corporationId: number,
    userId: number,
    shares: number
  ): Promise<Shareholder | null> {
    const result = await getDb().collection<Shareholder>('shareholders').findOneAndUpdate(
      { corporation_id: corporationId, user_id: userId },
      { $set: { shares } },
      { returnDocument: 'after' }
    );
    return result;
  }

  static async delete(corporationId: number, userId: number): Promise<void> {
    await getDb().collection('shareholders').deleteOne({
      corporation_id: corporationId,
      user_id: userId
    });
  }
}
