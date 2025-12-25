import pool from '../db/connection';
import { 
  DISPLAY_PERIOD_HOURS,
  calculateMarketEntryEconomics,
  calculateCommodityPrice,
  calculateProductPrice,
  EXTRACTION_ELECTRICITY_CONSUMPTION,
  EXTRACTION_OUTPUT_RATE,
  MarketPriceOverrides,
  PRODUCTS,
  PRODUCTION_PRODUCT_CONSUMPTION,
  PRODUCTION_ELECTRICITY_CONSUMPTION,
  PRODUCTION_OUTPUT_RATE,
  PRODUCTION_RESOURCE_CONSUMPTION,
  RESOURCES,
  RETAIL_PRODUCT_CONSUMPTION,
  SECTOR_EXTRACTION,
  SECTOR_PRODUCTS,
  SECTOR_PRODUCT_DEMANDS,
  SECTOR_RETAIL_DEMANDS,
  SECTOR_RESOURCES,
  SECTOR_SERVICE_DEMANDS,
  SERVICE_ELECTRICITY_CONSUMPTION,
  SERVICE_PRODUCT_CONSUMPTION,
  type Product,
  type Resource,
  type Sector,
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
  private static _marketPricesCache: { prices: MarketPriceOverrides; timestamp: number } | null = null;
  private static readonly MARKET_PRICES_CACHE_TTL_MS = 60_000;

  private static async getCurrentMarketPrices(): Promise<MarketPriceOverrides> {
    const now = Date.now();
    const cached = this._marketPricesCache;
    if (cached && now - cached.timestamp < this.MARKET_PRICES_CACHE_TTL_MS) {
      return cached.prices;
    }

    const result = await pool.query(
      `SELECT 
        me.sector_type,
        COALESCE(SUM(CASE WHEN bu.unit_type = 'retail' THEN bu.count ELSE 0 END), 0)::int as retail_units,
        COALESCE(SUM(CASE WHEN bu.unit_type = 'production' THEN bu.count ELSE 0 END), 0)::int as production_units,
        COALESCE(SUM(CASE WHEN bu.unit_type = 'service' THEN bu.count ELSE 0 END), 0)::int as service_units,
        COALESCE(SUM(CASE WHEN bu.unit_type = 'extraction' THEN bu.count ELSE 0 END), 0)::int as extraction_units
      FROM market_entries me
      LEFT JOIN business_units bu ON me.id = bu.market_entry_id
      GROUP BY me.sector_type`
    );

    const sectorRetailUnits: Record<string, number> = {};
    const sectorProductionUnits: Record<string, number> = {};
    const sectorServiceUnits: Record<string, number> = {};
    const sectorExtractionUnits: Record<string, number> = {};
    for (const row of result.rows) {
      sectorRetailUnits[row.sector_type] = row.retail_units || 0;
      sectorProductionUnits[row.sector_type] = row.production_units || 0;
      sectorServiceUnits[row.sector_type] = row.service_units || 0;
      sectorExtractionUnits[row.sector_type] = row.extraction_units || 0;
    }

    const commoditySupply: Record<Resource, number> = {} as Record<Resource, number>;
    const commodityDemand: Record<Resource, number> = {} as Record<Resource, number>;
    for (const resource of RESOURCES) {
      let supply = 0;
      let demand = 0;

      for (const [sector, extractableResources] of Object.entries(SECTOR_EXTRACTION)) {
        if (extractableResources && extractableResources.includes(resource)) {
          supply += (sectorExtractionUnits[sector] || 0) * EXTRACTION_OUTPUT_RATE;
        }
      }

      for (const [sector, requiredResource] of Object.entries(SECTOR_RESOURCES)) {
        if (requiredResource === resource) {
          demand += (sectorProductionUnits[sector] || 0) * PRODUCTION_RESOURCE_CONSUMPTION;
        }
      }

      commoditySupply[resource] = supply;
      commodityDemand[resource] = demand;
    }

    const commodityPrices: Record<Resource, number> = {} as Record<Resource, number>;
    for (const resource of RESOURCES) {
      commodityPrices[resource] = calculateCommodityPrice(resource, commoditySupply[resource], commodityDemand[resource]).currentPrice;
    }

    const productSupply: Record<Product, number> = {} as Record<Product, number>;
    for (const product of PRODUCTS) {
      let supply = 0;
      for (const [sector, producedProduct] of Object.entries(SECTOR_PRODUCTS)) {
        if (producedProduct === product) {
          supply += (sectorProductionUnits[sector] || 0) * PRODUCTION_OUTPUT_RATE;
        }
      }
      productSupply[product] = supply;
    }

    const productDemand: Record<Product, number> = {} as Record<Product, number>;
    for (const product of PRODUCTS) {
      let demand = 0;

      for (const [sector, demandedProducts] of Object.entries(SECTOR_PRODUCT_DEMANDS)) {
        if (!demandedProducts || !demandedProducts.includes(product)) continue;
        const productionUnits = sectorProductionUnits[sector] || 0;
        demand += productionUnits * PRODUCTION_PRODUCT_CONSUMPTION;
      }

      for (const [sector, demandedProducts] of Object.entries(SECTOR_RETAIL_DEMANDS)) {
        if (!demandedProducts || !demandedProducts.includes(product)) continue;
        demand += (sectorRetailUnits[sector] || 0) * RETAIL_PRODUCT_CONSUMPTION;
      }

      for (const [sector, demandedProducts] of Object.entries(SECTOR_SERVICE_DEMANDS)) {
        if (!demandedProducts || !demandedProducts.includes(product)) continue;
        const perUnitDemand = product === 'Electricity' ? SERVICE_ELECTRICITY_CONSUMPTION : SERVICE_PRODUCT_CONSUMPTION;
        demand += (sectorServiceUnits[sector] || 0) * perUnitDemand;
      }

      if (product === 'Electricity') {
        for (const productionUnits of Object.values(sectorProductionUnits)) {
          demand += (productionUnits || 0) * PRODUCTION_ELECTRICITY_CONSUMPTION;
        }

        for (const [sector, extractableResources] of Object.entries(SECTOR_EXTRACTION)) {
          if (!extractableResources || extractableResources.length === 0) continue;
          demand += (sectorExtractionUnits[sector] || 0) * EXTRACTION_ELECTRICITY_CONSUMPTION;
        }
      }

      productDemand[product] = demand;
    }

    const productPrices: Record<Product, number> = {} as Record<Product, number>;
    for (const product of PRODUCTS) {
      productPrices[product] = calculateProductPrice(product, productSupply[product], productDemand[product]).currentPrice;
    }

    const prices: MarketPriceOverrides = {
      commodityPrices,
      productPrices,
    };

    this._marketPricesCache = { prices, timestamp: now };
    return prices;
  }

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
  static async calculateCorporationFinances(
    corporationId: number,
    marketPrices?: MarketPriceOverrides
  ): Promise<CorporationFinances> {
    // Get all market entries with their units
    const entries = await this.findByCorporationIdWithUnits(corporationId);
    const prices = marketPrices ?? await this.getCurrentMarketPrices();

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
        entry.extraction_count,
        prices
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
    const prices = await this.getCurrentMarketPrices();

    for (const row of corpResult.rows) {
      const finances = await this.calculateCorporationFinances(row.corporation_id, prices);
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

