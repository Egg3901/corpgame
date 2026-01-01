import { getDb, getNextId } from '../db/mongo';

export type UnitType = 'retail' | 'production' | 'service' | 'extraction';

export interface BusinessUnit {
  id: number;
  market_entry_id: number;
  unit_type: UnitType;
  count: number;
  created_at: Date;
  updated_at: Date;
}

export interface BusinessUnitInput {
  market_entry_id: number;
  unit_type: UnitType;
  count?: number;
}

export class BusinessUnitModel {
  static async create(data: BusinessUnitInput): Promise<BusinessUnit> {
    const { market_entry_id, unit_type, count = 1 } = data;
    const db = getDb();

    // Check if exists
    const existing = await db.collection<BusinessUnit>('business_units').findOne({ market_entry_id, unit_type });
    
    if (existing) {
      throw new Error(`Business unit already exists for market_entry_id ${market_entry_id} and unit_type ${unit_type}`);
    }

    const id = await getNextId('business_units_id');
    const now = new Date();
    
    const doc: BusinessUnit = {
      id,
      market_entry_id,
      unit_type,
      count,
      created_at: now,
      updated_at: now,
    };

    await db.collection('business_units').insertOne(doc);
    return doc;
  }

  static async findById(id: number): Promise<BusinessUnit | null> {
    return await getDb().collection<BusinessUnit>('business_units').findOne({ id });
  }

  static async findByMarketEntryId(marketEntryId: number): Promise<BusinessUnit[]> {
    return await getDb().collection<BusinessUnit>('business_units')
      .find({ market_entry_id: marketEntryId })
      .sort({ unit_type: 1 })
      .toArray();
  }

  static async findByMarketEntryAndType(
    marketEntryId: number,
    unitType: UnitType
  ): Promise<BusinessUnit | null> {
    return await getDb().collection<BusinessUnit>('business_units').findOne({
      market_entry_id: marketEntryId,
      unit_type: unitType
    });
  }

  // Increment unit count or create if doesn't exist
  static async incrementUnit(
    marketEntryId: number,
    unitType: UnitType,
    incrementBy: number = 1
  ): Promise<BusinessUnit> {
    const db = getDb();
    const existing = await db.collection<BusinessUnit>('business_units').findOne({ 
      market_entry_id: marketEntryId, 
      unit_type: unitType 
    });

    if (existing) {
      const result = await db.collection<BusinessUnit>('business_units').findOneAndUpdate(
        { market_entry_id: marketEntryId, unit_type: unitType },
        { 
          $inc: { count: incrementBy },
          $set: { updated_at: new Date() }
        },
        { returnDocument: 'after' }
      );
      if (!result) throw new Error('Failed to update business unit');
      return result;
    } else {
      const id = await getNextId('business_units_id');
      const now = new Date();
      const doc: BusinessUnit = {
        id,
        market_entry_id: marketEntryId,
        unit_type: unitType,
        count: incrementBy,
        created_at: now,
        updated_at: now,
      };
      await db.collection('business_units').insertOne(doc);
      return doc;
    }
  }

  // Set unit count directly
  static async setUnitCount(
    marketEntryId: number,
    unitType: UnitType,
    count: number
  ): Promise<BusinessUnit> {
    const db = getDb();
    const existing = await db.collection<BusinessUnit>('business_units').findOne({ market_entry_id: marketEntryId, unit_type: unitType });

    if (existing) {
      const result = await db.collection<BusinessUnit>('business_units').findOneAndUpdate(
        { market_entry_id: marketEntryId, unit_type: unitType },
        { 
          $set: { count, updated_at: new Date() }
        },
        { returnDocument: 'after' }
      );
      if (!result) throw new Error('Failed to update business unit');
      return result;
    } else {
      const id = await getNextId('business_units_id');
      const now = new Date();
      const doc: BusinessUnit = {
        id,
        market_entry_id: marketEntryId,
        unit_type: unitType,
        count,
        created_at: now,
        updated_at: now,
      };
      await db.collection('business_units').insertOne(doc);
      return doc;
    }
  }

  // Decrement unit count (remove units)
  static async removeUnit(
    marketEntryId: number,
    unitType: UnitType,
    decrementBy: number = 1
  ): Promise<BusinessUnit | null> {
    const db = getDb();
    const existing = await db.collection<BusinessUnit>('business_units').findOne({ market_entry_id: marketEntryId, unit_type: unitType });

    if (!existing) return null;

    const newCount = Math.max(0, existing.count - decrementBy);

    if (newCount === 0) {
      await db.collection('business_units').deleteOne({ market_entry_id: marketEntryId, unit_type: unitType });
      return { ...existing, count: 0, updated_at: new Date() };
    } else {
      const result = await db.collection<BusinessUnit>('business_units').findOneAndUpdate(
        { market_entry_id: marketEntryId, unit_type: unitType },
        { 
          $set: { count: newCount, updated_at: new Date() }
        },
        { returnDocument: 'after' }
      );
      if (!result) throw new Error('Failed to update business unit');
      return result;
    }
  }

  // Get total unit counts for a market entry
  static async getUnitCounts(marketEntryId: number): Promise<{
    retail: number;
    production: number;
    service: number;
    extraction: number;
  }> {
    const units = await this.findByMarketEntryId(marketEntryId);

    return {
      retail: units.find(u => u.unit_type === 'retail')?.count || 0,
      production: units.find(u => u.unit_type === 'production')?.count || 0,
      service: units.find(u => u.unit_type === 'service')?.count || 0,
      extraction: units.find(u => u.unit_type === 'extraction')?.count || 0,
    };
  }

  // Bulk get unit counts for multiple market entries - avoids N+1 queries
  static async getBulkUnitCounts(marketEntryIds: number[]): Promise<Map<number, {
    retail: number;
    production: number;
    service: number;
    extraction: number;
  }>> {
    if (marketEntryIds.length === 0) {
      return new Map();
    }

    const units = await getDb().collection<BusinessUnit>('business_units')
      .find({ market_entry_id: { $in: marketEntryIds } })
      .toArray();

    // Initialize map with default values
    const countsMap = new Map<number, { retail: number; production: number; service: number; extraction: number }>();
    for (const id of marketEntryIds) {
      countsMap.set(id, { retail: 0, production: 0, service: 0, extraction: 0 });
    }

    // Fill in actual values
    for (const unit of units) {
      const counts = countsMap.get(unit.market_entry_id);
      if (counts) {
        counts[unit.unit_type] = unit.count;
      }
    }

    return countsMap;
  }

  static async delete(id: number): Promise<void> {
    await getDb().collection('business_units').deleteOne({ id });
  }

  static async deleteByMarketEntryId(marketEntryId: number): Promise<void> {
    await getDb().collection('business_units').deleteMany({ market_entry_id: marketEntryId });
  }
}
