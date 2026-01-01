import { getDb, getNextId } from '../db/mongo';

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

    const id = await getNextId('share_transactions_id');
    const now = new Date();
    
    const doc: ShareTransaction = {
      id,
      corporation_id,
      user_id,
      transaction_type,
      shares,
      price_per_share,
      total_amount,
      created_at: now,
    };

    await getDb().collection<ShareTransaction>('share_transactions').insertOne(doc);
    return doc;
  }

  static async findByCorporationId(corporationId: number, limit: number = 50): Promise<ShareTransaction[]> {
    return await getDb()
      .collection<ShareTransaction>('share_transactions')
      .find({ corporation_id: corporationId })
      .sort({ created_at: -1 })
      .limit(limit)
      .toArray();
  }

  static async findByUserId(userId: number, limit: number = 50): Promise<ShareTransaction[]> {
    return await getDb()
      .collection<ShareTransaction>('share_transactions')
      .find({ user_id: userId })
      .sort({ created_at: -1 })
      .limit(limit)
      .toArray();
  }

  static async getRecentActivity(corporationId: number, hours: number = 24): Promise<ShareTransaction[]> {
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
    return await getDb()
      .collection<ShareTransaction>('share_transactions')
      .find({ 
        corporation_id: corporationId,
        created_at: { $gte: cutoff }
      })
      .sort({ created_at: -1 })
      .toArray();
  }
}
