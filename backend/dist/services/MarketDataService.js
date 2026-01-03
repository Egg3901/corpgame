"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.marketDataService = exports.MarketDataService = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const connection_1 = __importDefault(require("../db/connection"));
const SectorCalculator_1 = require("./SectorCalculator");
const sectors_1 = require("../constants/sectors");
class MarketDataService {
    constructor() {
        this.calc = new SectorCalculator_1.SectorCalculator();
        this.cache = new Map();
        this.ttlMs = 5000;
    }
    async getUnitMaps() {
        const [productionQuery, retailQuery, serviceQuery, extractionQuery] = await Promise.all([
            connection_1.default.query(`
        SELECT me.sector_type, COALESCE(SUM(bu.count), 0)::int as production_units
        FROM market_entries me
        LEFT JOIN business_units bu ON me.id = bu.market_entry_id AND bu.unit_type = 'production'
        GROUP BY me.sector_type`),
            connection_1.default.query(`
        SELECT me.sector_type, COALESCE(SUM(bu.count), 0)::int as retail_units
        FROM market_entries me
        LEFT JOIN business_units bu ON me.id = bu.market_entry_id AND bu.unit_type = 'retail'
        GROUP BY me.sector_type`),
            connection_1.default.query(`
        SELECT me.sector_type, COALESCE(SUM(bu.count), 0)::int as service_units
        FROM market_entries me
        LEFT JOIN business_units bu ON me.id = bu.market_entry_id AND bu.unit_type = 'service'
        GROUP BY me.sector_type`),
            connection_1.default.query(`
        SELECT me.sector_type, COALESCE(SUM(bu.count), 0)::int as extraction_units
        FROM market_entries me
        LEFT JOIN business_units bu ON me.id = bu.market_entry_id AND bu.unit_type = 'extraction'
        GROUP BY me.sector_type`),
        ]);
        const unitMaps = {
            production: Object.fromEntries(productionQuery.rows.map(r => [r.sector_type, r.production_units || 0])),
            retail: Object.fromEntries(retailQuery.rows.map(r => [r.sector_type, r.retail_units || 0])),
            service: Object.fromEntries(serviceQuery.rows.map(r => [r.sector_type, r.service_units || 0])),
            extraction: Object.fromEntries(extractionQuery.rows.map(r => [r.sector_type, r.extraction_units || 0])),
        };
        return unitMaps;
    }
    getFromCache(key) {
        const entry = this.cache.get(key);
        if (!entry)
            return null;
        if (Date.now() > entry.expiresAt) {
            this.cache.delete(key);
            return null;
        }
        return entry.value;
    }
    setCache(key, value) {
        this.cache.set(key, { value, expiresAt: Date.now() + this.ttlMs });
    }
    invalidateAll() {
        this.cache.clear();
    }
    async getCommoditySummary() {
        const key = 'commodity_summary';
        const cached = this.getFromCache(key);
        if (cached)
            return cached;
        const unitMaps = await this.getUnitMaps();
        const { supply, demand } = this.calc.computeCommoditySupplyDemand(unitMaps, [...sectors_1.RESOURCES]);
        const summary = sectors_1.RESOURCES.map(resource => {
            const price = (0, sectors_1.calculateCommodityPrice)(resource, supply[resource], demand[resource]);
            return { resource, supply: supply[resource], demand: demand[resource], price };
        });
        this.setCache(key, { summary, supply, demand });
        return { summary, supply, demand };
    }
    async getProductSummary() {
        const key = 'product_summary';
        const cached = this.getFromCache(key);
        if (cached)
            return cached;
        const unitMaps = await this.getUnitMaps();
        const { supply, demand } = this.calc.computeProductSupplyDemand(unitMaps, [...sectors_1.PRODUCTS]);
        const summary = sectors_1.PRODUCTS.map(product => {
            const price = (0, sectors_1.calculateProductPrice)(product, supply[product], demand[product]);
            return { product, supply: supply[product], demand: demand[product], price };
        });
        this.setCache(key, { summary, supply, demand });
        return { summary, supply, demand };
    }
    async getCommodityDetail(resource) {
        const all = await this.getCommoditySummary();
        const supply = all.supply[resource] || 0;
        const demand = all.demand[resource] || 0;
        const price = (0, sectors_1.calculateCommodityPrice)(resource, supply, demand);
        return { resource, supply, demand, price };
    }
    async getProductDetail(product) {
        const all = await this.getProductSummary();
        const supply = all.supply[product] || 0;
        const demand = all.demand[product] || 0;
        const price = (0, sectors_1.calculateProductPrice)(product, supply, demand);
        return { product, supply, demand, price };
    }
    async validateAndAudit() {
        const auditPath = path_1.default.resolve(process.cwd(), 'logs', 'market_audit.log');
        fs_1.default.mkdirSync(path_1.default.dirname(auditPath), { recursive: true });
        const lines = [];
        const now = new Date().toISOString();
        const prod = await this.getProductSummary();
        const com = await this.getCommoditySummary();
        lines.push(`[${now}] Validation start`);
        for (const product of sectors_1.PRODUCTS) {
            const detail = await this.getProductDetail(product);
            const s = prod.supply[product];
            const d = prod.demand[product];
            const ok = s === detail.supply && d === detail.demand;
            lines.push(`PRODUCT ${product}: supply=${s}, demand=${d}, price=${detail.price.currentPrice}, ok=${ok}`);
            if (!ok)
                lines.push(`DISCREPANCY: product=${product}`);
        }
        for (const resource of sectors_1.RESOURCES) {
            const detail = await this.getCommodityDetail(resource);
            const s = com.supply[resource];
            const d = com.demand[resource];
            const ok = s === detail.supply && d === detail.demand;
            lines.push(`RESOURCE ${resource}: supply=${s}, demand=${d}, price=${detail.price.currentPrice}, ok=${ok}`);
            if (!ok)
                lines.push(`DISCREPANCY: resource=${resource}`);
        }
        lines.push(`[${now}] Validation end`);
        fs_1.default.appendFileSync(auditPath, lines.join('\n') + '\n', 'utf8');
        return { ok: true };
    }
}
exports.MarketDataService = MarketDataService;
exports.marketDataService = new MarketDataService();
