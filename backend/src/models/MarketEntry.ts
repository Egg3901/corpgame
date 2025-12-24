import pool from '../db/connection';
import { 
  DISPLAY_PERIOD_HOURS, 
  getDynamicUnitEconomics,
  calculateMarketEntryEconomics,
} from '../constants/sectors';

export interface MarketEntry {
  id: number;
  corporation_id: number;
  state_code: string;
  sector_type: string;
  created_at: Date;
}

export interface MarketEntryInput {
  corporation_id: number;
  state_code: string;
  sector_type: string;
}

export interface MarketEntryWithUnits extends MarketEntry {
  retail_count: number;
  production_count: number;
  service_count: number;
  extraction_count: number;
}

export interface CorporationFinances {
  corporation_id: number;
  hourly_revenue: number;
  hourly_costs: number;
  hourly_profit: number;
  display_revenue: number;  // 96-hour projection
  display_costs: number;    // 96-hour projection
  display_profit: number;   // 96-hour projection
  total_retail_units: number;
  total_production_units: number;
  total_service_units: number;
  total_extraction_units: number;
  markets_count: number;
  dividend_per_share_96h?: number;
  special_dividend_last_paid_at?: Date | string | null;
  special_dividend_last_amount?: number | null;
  special_dividend_per_share_last?: number | null;
}

export class MarketEntryModel {
  static async create(data: MarketEntryInput): Promise<MarketEntry> {
    const { corporation_id, state_code, sector_type } = data;

    const result = await pool.query(
      `INSERT INTO market_entries (corporation_id, state_code, sector_type)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [corporation_id, state_code.toUpperCase(), sector_type]
    );

    return result.rows[0];
  }

  static async findById(id: number): Promise<MarketEntry | null> {
    const result = await pool.query('SELECT * FROM market_entries WHERE id = $1', [id]);
    return result.rows[0] || null;
  }

  static async findByCorporationId(corporationId: number): Promise<MarketEntry[]> {
    const result = await pool.query(
      'SELECT * FROM market_entries WHERE corporation_id = $1 ORDER BY created_at DESC',
      [corporationId]
    );
    return result.rows;
  }

  static async findByStateCode(stateCode: string): Promise<MarketEntry[]> {
    const result = await pool.query(
      'SELECT * FROM market_entries WHERE state_code = $1 ORDER BY created_at DESC',
      [stateCode.toUpperCase()]
    );
    return result.rows;
  }

  static async findByCorpAndState(corporationId: number, stateCode: string): Promise<MarketEntry[]> {
    const result = await pool.query(
      'SELECT * FROM market_entries WHERE corporation_id = $1 AND state_code = $2 ORDER BY created_at DESC',
      [corporationId, stateCode.toUpperCase()]
    );
    return result.rows;
  }

  static async findByCorpStateAndSector(
    corporationId: number,
    stateCode: string,
    sectorType: string
  ): Promise<MarketEntry | null> {
    const result = await pool.query(
      'SELECT * FROM market_entries WHERE corporation_id = $1 AND state_code = $2 AND sector_type = $3',
      [corporationId, stateCode.toUpperCase(), sectorType]
    );
    return result.rows[0] || null;
  }

  static async exists(corporationId: number, stateCode: string, sectorType: string): Promise<boolean> {
    const result = await pool.query(
      'SELECT 1 FROM market_entries WHERE corporation_id = $1 AND state_code = $2 AND sector_type = $3',
      [corporationId, stateCode.toUpperCase(), sectorType]
    );
    return result.rows.length > 0;
  }

  static async delete(id: number): Promise<void> {
    await pool.query('DELETE FROM market_entries WHERE id = $1', [id]);
  }

  // Get market entries with unit counts
  static async findByCorporationIdWithUnits(corporationId: number): Promise<MarketEntryWithUnits[]> {
    const result = await pool.query(
      `SELECT 
        me.*,
        COALESCE(SUM(CASE WHEN bu.unit_type = 'retail' THEN bu.count ELSE 0 END), 0)::int as retail_count,
        COALESCE(SUM(CASE WHEN bu.unit_type = 'production' THEN bu.count ELSE 0 END), 0)::int as production_count,
        COALESCE(SUM(CASE WHEN bu.unit_type = 'service' THEN bu.count ELSE 0 END), 0)::int as service_count,
        COALESCE(SUM(CASE WHEN bu.unit_type = 'extraction' THEN bu.count ELSE 0 END), 0)::int as extraction_count
      FROM market_entries me
      LEFT JOIN business_units bu ON me.id = bu.market_entry_id
      WHERE me.corporation_id = $1
      GROUP BY me.id
      ORDER BY me.created_at DESC`,
      [corporationId]
    );
    return result.rows;
  }

  // Calculate corporation finances from all market entries
  // Uses dynamic economics based on sector, commodity prices, and product prices
  static async calculateCorporationFinances(corporationId: number): Promise<CorporationFinances> {
    // Get all market entries with their units
    const entries = await this.findByCorporationIdWithUnits(corporationId);

    let hourlyRevenue = 0;
    let hourlyCosts = 0;
    let totalRetail = 0;
    let totalProduction = 0;
    let totalService = 0;
    let totalExtraction = 0;

    for (const entry of entries) {
      // Use dynamic economics that considers sector, commodity prices, etc.
      const economics = calculateMarketEntryEconomics(
        entry.sector_type,
        entry.state_code,
        entry.retail_count,
        entry.production_count,
        entry.service_count,
        entry.extraction_count
      );

      hourlyRevenue += economics.hourlyRevenue;
      hourlyCosts += economics.hourlyCost;

      // Sum up units
      totalRetail += entry.retail_count;
      totalProduction += entry.production_count;
      totalService += entry.service_count;
      totalExtraction += entry.extraction_count;
    }

    const hourlyProfit = hourlyRevenue - hourlyCosts;

    return {
      corporation_id: corporationId,
      hourly_revenue: hourlyRevenue,
      hourly_costs: hourlyCosts,
      hourly_profit: hourlyProfit,
      display_revenue: hourlyRevenue * DISPLAY_PERIOD_HOURS,
      display_costs: hourlyCosts * DISPLAY_PERIOD_HOURS,
      display_profit: hourlyProfit * DISPLAY_PERIOD_HOURS,
      total_retail_units: totalRetail,
      total_production_units: totalProduction,
      total_service_units: totalService,
      total_extraction_units: totalExtraction,
      markets_count: entries.length,
    };
  }

  // Get all corporations with their hourly financials (for cron job)
  // Now uses dynamic economics per-corporation for accurate commodity-based pricing
  static async getAllCorporationsFinancials(): Promise<{ corporation_id: number; hourly_profit: number }[]> {
    // Get all corporation IDs that have market entries
    const corpResult = await pool.query(
      `SELECT DISTINCT corporation_id FROM market_entries`
    );

    const results: { corporation_id: number; hourly_profit: number }[] = [];

    for (const row of corpResult.rows) {
      const finances = await this.calculateCorporationFinances(row.corporation_id);
      if (finances.hourly_profit !== 0 || 
          finances.total_retail_units > 0 || 
          finances.total_production_units > 0 || 
          finances.total_service_units > 0 ||
          finances.total_extraction_units > 0) {
        results.push({
          corporation_id: row.corporation_id,
          hourly_profit: finances.hourly_profit,
        });
      }
    }

    return results;
  }
}

