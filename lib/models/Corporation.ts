import { getDb, getNextId } from '../db/mongo';
import { isValidSector, isValidCorpFocus, CorpFocus, Sector } from '@/lib/constants/sectors';
import { ShareholderModel } from './Shareholder';

export type CorpStructure = 'public' | 'private';

export interface Corporation {
  id: number;
  ceo_id: number;
  name: string;
  logo: string | null;
  shares: number;
  public_shares: number;
  share_price: number;
  capital: number;
  type: string | null;
  structure: CorpStructure;
  hq_state: string | null;
  board_size: number;
  elected_ceo_id: number | null;
  ceo_salary: number;
  dividend_percentage: number;
  special_dividend_last_paid_at: Date | null;
  special_dividend_last_amount: number | null;
  focus: CorpFocus;
  created_at: Date;
}

export interface CreateCorporationData {
  ceo_id: number;
  name: string;
  logo?: string | null;
  shares?: number;
  public_shares?: number;
  share_price?: number;
  capital?: number;
  type?: string | null;
  structure?: CorpStructure;
  focus?: CorpFocus;
}

export interface UpdateCorporationData {
  name?: string;
  logo?: string | null;
  type?: string | null;
  structure?: CorpStructure;
  share_price?: number;
  capital?: number;
  public_shares?: number;
  shares?: number;
  hq_state?: string | null;
  board_size?: number;
  elected_ceo_id?: number | null;
  ceo_salary?: number;
  dividend_percentage?: number;
  special_dividend_last_paid_at?: Date | null;
  special_dividend_last_amount?: number | null;
  focus?: CorpFocus;
}

export class CorporationModel {
  static async create(corpData: CreateCorporationData): Promise<Corporation> {
    const {
      ceo_id,
      name,
      logo = null,
      shares = 500000,
      public_shares = 100000,
      share_price = 1.00,
      capital = 500000.00,
      type = null,
      structure = 'public',
      focus = 'diversified',
    } = corpData;

    // Validate sector if provided
    if (type !== null && !isValidSector(type)) {
      throw new Error(`Invalid sector: ${type}. Must be one of the predefined sectors.`);
    }

    // Validate focus
    if (!isValidCorpFocus(focus)) {
      throw new Error(`Invalid focus: ${focus}. Must be one of: extraction, production, retail, service, diversified.`);
    }

    const id = await getNextId('corporations_id');
    const now = new Date();

    const doc: Corporation = {
      id,
      ceo_id,
      name: name.trim(),
      logo,
      shares,
      public_shares,
      share_price,
      capital,
      type,
      structure,
      focus,
      hq_state: null,
      board_size: 0, // Default? Postgres didn't specify default in insert, so it was likely DB default or null. Interface says number.
      elected_ceo_id: null,
      ceo_salary: 0, // Default?
      dividend_percentage: 0, // Default?
      special_dividend_last_paid_at: null,
      special_dividend_last_amount: null,
      created_at: now,
    };

    // Fill in defaults that might have been DB defaults
    // Assuming schema defaults: board_size=3? ceo_salary=0?
    // Let's set reasonable defaults if they weren't in the input
    doc.board_size = 3; 
    doc.ceo_salary = 0;
    doc.dividend_percentage = 0;

    await getDb().collection('corporations').insertOne(doc);
    return doc;
  }

  static async findById(id: number): Promise<Corporation | null> {
    return getDb().collection<Corporation>('corporations').findOne({ id });
  }

  static async findByName(name: string): Promise<Corporation | null> {
    return getDb().collection<Corporation>('corporations').findOne({ name });
  }

  static async findByIds(ids: number[]): Promise<Corporation[]> {
    if (ids.length === 0) return [];
    return getDb().collection<Corporation>('corporations').find({ id: { $in: ids } }).toArray();
  }

  static async findAll(): Promise<Corporation[]> {
    return await getDb().collection<Corporation>('corporations')
      .find({})
      .sort({ created_at: -1 })
      .toArray();
  }

  static async search(query: string, limit: number = 20): Promise<Corporation[]> {
    const db = getDb();
    return db.collection<Corporation>('corporations')
      .find({ name: { $regex: query, $options: 'i' } })
      .limit(limit)
      .toArray();
  }

  static async findByCeoId(ceoId: number): Promise<Corporation[]> {
    return await getDb().collection<Corporation>('corporations')
      .find({ ceo_id: ceoId })
      .sort({ created_at: -1 })
      .toArray();
  }

  static async update(id: number, updates: UpdateCorporationData): Promise<Corporation | null> {
    // Validate sector if being updated
    if (updates.type !== undefined && updates.type !== null && !isValidSector(updates.type)) {
      throw new Error(`Invalid sector: ${updates.type}. Must be one of the predefined sectors.`);
    }

    // Validate focus if being updated
    if (updates.focus !== undefined && !isValidCorpFocus(updates.focus)) {
      throw new Error(`Invalid focus: ${updates.focus}. Must be one of: extraction, production, retail, service, diversified.`);
    }

    const allowedFields = [
      'name', 'logo', 'type', 'structure', 'share_price', 'capital', 'public_shares', 'shares',
      'hq_state', 'board_size', 'elected_ceo_id', 'ceo_salary', 'dividend_percentage',
      'special_dividend_last_paid_at', 'special_dividend_last_amount', 'focus'
    ];
    
    const setUpdates: Record<string, any> = {};
    Object.entries(updates).forEach(([key, value]) => {
      if (allowedFields.includes(key) && value !== undefined) {
        setUpdates[key] = value;
      }
    });

    if (Object.keys(setUpdates).length === 0) {
      return this.findById(id);
    }

    const result = await getDb().collection<Corporation>('corporations').findOneAndUpdate(
      { id },
      { $set: setUpdates },
      { returnDocument: 'after' }
    );

    return result ?? null;
  }

  static async delete(id: number): Promise<void> {
    // Clean up related data
    await ShareholderModel.deleteByCorporationId(id);
    await getDb().collection('board_appointments').deleteMany({ corporation_id: id });
    await getDb().collection('board_proposals').deleteMany({ corporation_id: id });
    await getDb().collection('board_votes').deleteMany({ corporation_id: id });
    await getDb().collection('board_messages').deleteMany({ corporation_id: id });
    // Delete the corporation
    await getDb().collection('corporations').deleteOne({ id });
  }

  // Clear the elected CEO (for resignation)
  static async clearElectedCeo(id: number): Promise<Corporation | null> {
    const result = await getDb().collection<Corporation>('corporations').findOneAndUpdate(
      { id },
      { $set: { elected_ceo_id: null } },
      { returnDocument: 'after' }
    );
    return result ?? null;
  }

  // Set elected CEO
  static async setElectedCeo(id: number, ceoUserId: number): Promise<Corporation | null> {
    const result = await getDb().collection<Corporation>('corporations').findOneAndUpdate(
      { id },
      { $set: { elected_ceo_id: ceoUserId } },
      { returnDocument: 'after' }
    );
    return result ?? null;
  }

  static async incrementCapital(id: number, amount: number): Promise<Corporation | null> {
    const result = await getDb().collection<Corporation>('corporations').findOneAndUpdate(
      { id },
      { $inc: { capital: amount } },
      { returnDocument: 'after' }
    );
    return result ?? null;
  }

  static async incrementPublicShares(id: number, amount: number): Promise<Corporation | null> {
    const result = await getDb().collection<Corporation>('corporations').findOneAndUpdate(
      { id },
      { $inc: { public_shares: amount } },
      { returnDocument: 'after' }
    );
    return result ?? null;
  }

  static async incrementShares(id: number, amount: number): Promise<Corporation | null> {
    const result = await getDb().collection<Corporation>('corporations').findOneAndUpdate(
      { id },
      { $inc: { shares: amount } },
      { returnDocument: 'after' }
    );
    return result ?? null;
  }
}
