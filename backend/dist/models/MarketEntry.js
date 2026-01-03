"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MarketEntryModel = void 0;
const connection_1 = __importDefault(require("../db/connection"));
const sectors_1 = require("../constants/sectors");
class MarketEntryModel {
    static async getCurrentMarketPrices() {
        const now = Date.now();
        const cached = this._marketPricesCache;
        if (cached && now - cached.timestamp < this.MARKET_PRICES_CACHE_TTL_MS) {
            return cached.prices;
        }
        const result = await connection_1.default.query(`SELECT 
        me.sector_type,
        COALESCE(SUM(CASE WHEN bu.unit_type = 'retail' THEN bu.count ELSE 0 END), 0)::int as retail_units,
        COALESCE(SUM(CASE WHEN bu.unit_type = 'production' THEN bu.count ELSE 0 END), 0)::int as production_units,
        COALESCE(SUM(CASE WHEN bu.unit_type = 'service' THEN bu.count ELSE 0 END), 0)::int as service_units,
        COALESCE(SUM(CASE WHEN bu.unit_type = 'extraction' THEN bu.count ELSE 0 END), 0)::int as extraction_units
      FROM market_entries me
      LEFT JOIN business_units bu ON me.id = bu.market_entry_id
      GROUP BY me.sector_type`);
        const sectorRetailUnits = {};
        const sectorProductionUnits = {};
        const sectorServiceUnits = {};
        const sectorExtractionUnits = {};
        for (const row of result.rows) {
            sectorRetailUnits[row.sector_type] = row.retail_units || 0;
            sectorProductionUnits[row.sector_type] = row.production_units || 0;
            sectorServiceUnits[row.sector_type] = row.service_units || 0;
            sectorExtractionUnits[row.sector_type] = row.extraction_units || 0;
        }
        const commoditySupply = {};
        const commodityDemand = {};
        for (const resource of sectors_1.RESOURCES) {
            let supply = 0;
            let demand = 0;
            for (const [sector, extractableResources] of Object.entries(sectors_1.SECTOR_EXTRACTION)) {
                if (extractableResources && extractableResources.includes(resource)) {
                    supply += (sectorExtractionUnits[sector] || 0) * sectors_1.EXTRACTION_OUTPUT_RATE;
                }
            }
            for (const [sector, requiredResource] of Object.entries(sectors_1.SECTOR_RESOURCES)) {
                if (requiredResource === resource) {
                    demand += (sectorProductionUnits[sector] || 0) * sectors_1.PRODUCTION_RESOURCE_CONSUMPTION;
                }
            }
            commoditySupply[resource] = supply;
            commodityDemand[resource] = demand;
        }
        const commodityPrices = {};
        for (const resource of sectors_1.RESOURCES) {
            commodityPrices[resource] = (0, sectors_1.calculateCommodityPrice)(resource, commoditySupply[resource], commodityDemand[resource]).currentPrice;
        }
        const productSupply = {};
        for (const product of sectors_1.PRODUCTS) {
            let supply = 0;
            for (const [sector, producedProduct] of Object.entries(sectors_1.SECTOR_PRODUCTS)) {
                if (producedProduct === product) {
                    supply += (sectorProductionUnits[sector] || 0) * sectors_1.PRODUCTION_OUTPUT_RATE;
                }
            }
            productSupply[product] = supply;
        }
        const productDemand = {};
        for (const product of sectors_1.PRODUCTS) {
            let demand = 0;
            for (const [sector, demandedProducts] of Object.entries(sectors_1.SECTOR_PRODUCT_DEMANDS)) {
                if (!demandedProducts || !demandedProducts.includes(product))
                    continue;
                const productionUnits = sectorProductionUnits[sector] || 0;
                demand += productionUnits * sectors_1.PRODUCTION_PRODUCT_CONSUMPTION;
            }
            for (const [sector, demandedProducts] of Object.entries(sectors_1.SECTOR_RETAIL_DEMANDS)) {
                if (!demandedProducts || !demandedProducts.includes(product))
                    continue;
                demand += (sectorRetailUnits[sector] || 0) * sectors_1.RETAIL_PRODUCT_CONSUMPTION;
            }
            for (const [sector, demandedProducts] of Object.entries(sectors_1.SECTOR_SERVICE_DEMANDS)) {
                if (!demandedProducts || !demandedProducts.includes(product))
                    continue;
                const perUnitDemand = product === 'Electricity' ? sectors_1.SERVICE_ELECTRICITY_CONSUMPTION : sectors_1.SERVICE_PRODUCT_CONSUMPTION;
                demand += (sectorServiceUnits[sector] || 0) * perUnitDemand;
            }
            if (product === 'Electricity') {
                for (const productionUnits of Object.values(sectorProductionUnits)) {
                    demand += (productionUnits || 0) * sectors_1.PRODUCTION_ELECTRICITY_CONSUMPTION;
                }
                for (const [sector, extractableResources] of Object.entries(sectors_1.SECTOR_EXTRACTION)) {
                    if (!extractableResources || extractableResources.length === 0)
                        continue;
                    demand += (sectorExtractionUnits[sector] || 0) * sectors_1.EXTRACTION_ELECTRICITY_CONSUMPTION;
                }
            }
            productDemand[product] = demand;
        }
        const productPrices = {};
        for (const product of sectors_1.PRODUCTS) {
            productPrices[product] = (0, sectors_1.calculateProductPrice)(product, productSupply[product], productDemand[product]).currentPrice;
        }
        const prices = {
            commodityPrices,
            productPrices,
        };
        this._marketPricesCache = { prices, timestamp: now };
        return prices;
    }
    static async create(data) {
        const { corporation_id, state_code, sector_type } = data;
        const result = await connection_1.default.query(`INSERT INTO market_entries (corporation_id, state_code, sector_type)
       VALUES ($1, $2, $3)
       RETURNING *`, [corporation_id, state_code.toUpperCase(), sector_type]);
        return result.rows[0];
    }
    static async findById(id) {
        const result = await connection_1.default.query('SELECT * FROM market_entries WHERE id = $1', [id]);
        return result.rows[0] || null;
    }
    static async findByCorporationId(corporationId) {
        const result = await connection_1.default.query('SELECT * FROM market_entries WHERE corporation_id = $1 ORDER BY created_at DESC', [corporationId]);
        return result.rows;
    }
    static async findByStateCode(stateCode) {
        const result = await connection_1.default.query('SELECT * FROM market_entries WHERE state_code = $1 ORDER BY created_at DESC', [stateCode.toUpperCase()]);
        return result.rows;
    }
    static async findByCorpAndState(corporationId, stateCode) {
        const result = await connection_1.default.query('SELECT * FROM market_entries WHERE corporation_id = $1 AND state_code = $2 ORDER BY created_at DESC', [corporationId, stateCode.toUpperCase()]);
        return result.rows;
    }
    static async findByCorpStateAndSector(corporationId, stateCode, sectorType) {
        const result = await connection_1.default.query('SELECT * FROM market_entries WHERE corporation_id = $1 AND state_code = $2 AND sector_type = $3', [corporationId, stateCode.toUpperCase(), sectorType]);
        return result.rows[0] || null;
    }
    static async exists(corporationId, stateCode, sectorType) {
        const result = await connection_1.default.query('SELECT 1 FROM market_entries WHERE corporation_id = $1 AND state_code = $2 AND sector_type = $3', [corporationId, stateCode.toUpperCase(), sectorType]);
        return result.rows.length > 0;
    }
    static async delete(id) {
        await connection_1.default.query('DELETE FROM market_entries WHERE id = $1', [id]);
    }
    // Get market entries with unit counts
    static async findByCorporationIdWithUnits(corporationId) {
        const result = await connection_1.default.query(`SELECT 
        me.*,
        COALESCE(SUM(CASE WHEN bu.unit_type = 'retail' THEN bu.count ELSE 0 END), 0)::int as retail_count,
        COALESCE(SUM(CASE WHEN bu.unit_type = 'production' THEN bu.count ELSE 0 END), 0)::int as production_count,
        COALESCE(SUM(CASE WHEN bu.unit_type = 'service' THEN bu.count ELSE 0 END), 0)::int as service_count,
        COALESCE(SUM(CASE WHEN bu.unit_type = 'extraction' THEN bu.count ELSE 0 END), 0)::int as extraction_count
      FROM market_entries me
      LEFT JOIN business_units bu ON me.id = bu.market_entry_id
      WHERE me.corporation_id = $1
      GROUP BY me.id
      ORDER BY me.created_at DESC`, [corporationId]);
        return result.rows;
    }
    // Calculate corporation finances from all market entries
    // Uses dynamic economics based on sector, commodity prices, and product prices
    // When corporationData is provided, calculates full income statement with CEO salary and dividends
    static async calculateCorporationFinances(corporationId, marketPrices, corporationData) {
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
            const economics = (0, sectors_1.calculateMarketEntryEconomics)(entry.sector_type, entry.state_code, entry.retail_count, entry.production_count, entry.service_count, entry.extraction_count, prices);
            hourlyRevenue += economics.hourlyRevenue;
            hourlyCosts += economics.hourlyCost;
            // Sum up units
            totalRetail += entry.retail_count;
            totalProduction += entry.production_count;
            totalService += entry.service_count;
            totalExtraction += entry.extraction_count;
        }
        const hourlyProfit = hourlyRevenue - hourlyCosts;
        // Calculate 96-hour income statement
        // Sector profit is the SOURCE OF TRUTH - everything flows from this
        const grossProfit96h = hourlyProfit * sectors_1.DISPLAY_PERIOD_HOURS;
        // CEO Salary is an operating expense (per 96h period)
        const ceoSalary96h = corporationData?.ceo_salary ?? 0;
        // Operating Income = Gross Profit - CEO Salary
        const operatingIncome96h = grossProfit96h - ceoSalary96h;
        // Dividends: only paid from POSITIVE operating income
        const dividendPercentage = corporationData?.dividend_percentage ?? 0;
        const dividendPayout96h = operatingIncome96h > 0
            ? operatingIncome96h * (dividendPercentage / 100)
            : 0;
        // Net Income (Retained Earnings) = Operating Income - Dividends
        const netIncome96h = operatingIncome96h - dividendPayout96h;
        // Per-share calculations
        const totalShares = corporationData?.shares ?? 1;
        const dividendPerShare96h = totalShares > 0 && dividendPayout96h > 0
            ? dividendPayout96h / totalShares
            : 0;
        // Special dividend info
        const specialDividendLastPaidAt = corporationData?.special_dividend_last_paid_at ?? null;
        const specialDividendLastAmount = corporationData?.special_dividend_last_amount ?? null;
        const specialDividendPerShareLast = specialDividendLastAmount && totalShares > 0
            ? specialDividendLastAmount / totalShares
            : null;
        return {
            corporation_id: corporationId,
            hourly_revenue: hourlyRevenue,
            hourly_costs: hourlyCosts,
            hourly_profit: hourlyProfit,
            display_revenue: hourlyRevenue * sectors_1.DISPLAY_PERIOD_HOURS,
            display_costs: hourlyCosts * sectors_1.DISPLAY_PERIOD_HOURS,
            display_profit: grossProfit96h, // This is gross profit (sector profit)
            // Full income statement
            gross_profit_96h: grossProfit96h,
            ceo_salary_96h: ceoSalary96h,
            operating_income_96h: operatingIncome96h,
            dividend_payout_96h: dividendPayout96h,
            net_income_96h: netIncome96h,
            // Unit counts
            total_retail_units: totalRetail,
            total_production_units: totalProduction,
            total_service_units: totalService,
            total_extraction_units: totalExtraction,
            markets_count: entries.length,
            // Per-share metrics
            dividend_per_share_96h: dividendPerShare96h,
            special_dividend_last_paid_at: specialDividendLastPaidAt,
            special_dividend_last_amount: specialDividendLastAmount,
            special_dividend_per_share_last: specialDividendPerShareLast,
        };
    }
    // Get all corporations with their hourly financials (for cron job)
    // Now uses dynamic economics per-corporation for accurate commodity-based pricing
    static async getAllCorporationsFinancials() {
        // Get all corporation IDs that have market entries
        const corpResult = await connection_1.default.query(`SELECT DISTINCT corporation_id FROM market_entries`);
        const results = [];
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
exports.MarketEntryModel = MarketEntryModel;
MarketEntryModel._marketPricesCache = null;
MarketEntryModel.MARKET_PRICES_CACHE_TTL_MS = 60000;
