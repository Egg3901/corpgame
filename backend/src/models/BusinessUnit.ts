import pool from '../db/connection';

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

    const result = await pool.query(
      `INSERT INTO business_units (market_entry_id, unit_type, count)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [market_entry_id, unit_type, count]
    );

    return result.rows[0];
  }

  static async findById(id: number): Promise<BusinessUnit | null> {
    const result = await pool.query('SELECT * FROM business_units WHERE id = $1', [id]);
    return result.rows[0] || null;
  }

  static async findByMarketEntryId(marketEntryId: number): Promise<BusinessUnit[]> {
    const result = await pool.query(
      'SELECT * FROM business_units WHERE market_entry_id = $1 ORDER BY unit_type',
      [marketEntryId]
    );
    return result.rows;
  }

  static async findByMarketEntryAndType(
    marketEntryId: number,
    unitType: UnitType
  ): Promise<BusinessUnit | null> {
    const result = await pool.query(
      'SELECT * FROM business_units WHERE market_entry_id = $1 AND unit_type = $2',
      [marketEntryId, unitType]
    );
    return result.rows[0] || null;
  }

  // Increment unit count or create if doesn't exist
  static async incrementUnit(
    marketEntryId: number,
    unitType: UnitType,
    incrementBy: number = 1
  ): Promise<BusinessUnit> {
    // Use upsert to either create or increment
    const result = await pool.query(
      `INSERT INTO business_units (market_entry_id, unit_type, count)
       VALUES ($1, $2, $3)
       ON CONFLICT (market_entry_id, unit_type)
       DO UPDATE SET 
         count = business_units.count + $3,
         updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [marketEntryId, unitType, incrementBy]
    );

    return result.rows[0];
  }

  // Set unit count directly
  static async setUnitCount(
    marketEntryId: number,
    unitType: UnitType,
    count: number
  ): Promise<BusinessUnit> {
    const result = await pool.query(
      `INSERT INTO business_units (market_entry_id, unit_type, count)
       VALUES ($1, $2, $3)
       ON CONFLICT (market_entry_id, unit_type)
       DO UPDATE SET 
         count = $3,
         updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [marketEntryId, unitType, count]
    );

    return result.rows[0];
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

    const result = await pool.query(
      `SELECT market_entry_id, unit_type, count 
       FROM business_units 
       WHERE market_entry_id = ANY($1)`,
      [marketEntryIds]
    );

    // Initialize map with default values
    const countsMap = new Map<number, { retail: number; production: number; service: number; extraction: number }>();
    for (const id of marketEntryIds) {
      countsMap.set(id, { retail: 0, production: 0, service: 0, extraction: 0 });
    }

    // Fill in actual values
    for (const row of result.rows) {
      const counts = countsMap.get(row.market_entry_id);
      if (counts) {
        counts[row.unit_type as UnitType] = row.count;
      }
    }

    return countsMap;
  }

  static async delete(id: number): Promise<void> {
    await pool.query('DELETE FROM business_units WHERE id = $1', [id]);
  }

  static async deleteByMarketEntryId(marketEntryId: number): Promise<void> {
    await pool.query('DELETE FROM business_units WHERE market_entry_id = $1', [marketEntryId]);
  }
}

