import fs from 'fs';
import path from 'path';
import pool from '../db/connection';
import { SectorCalculator } from './SectorCalculator';
import {
  RESOURCES,
  PRODUCTS,
  calculateCommodityPrice,
  calculateProductPrice,
} from '../constants/sectors';

type CacheEntry<T> = { value: T; expiresAt: number };

export class MarketDataService {
  private calc = new SectorCalculator();
  private cache: Map<string, CacheEntry<any>> = new Map();
  private ttlMs = 5000;

  async getUnitMaps() {
    const [productionQuery, retailQuery, serviceQuery, extractionQuery] = await Promise.all([
      pool.query(`
        SELECT me.sector_type, COALESCE(SUM(bu.count), 0)::int as production_units
        FROM market_entries me
        LEFT JOIN business_units bu ON me.id = bu.market_entry_id AND bu.unit_type = 'production'
        GROUP BY me.sector_type`),
      pool.query(`
        SELECT me.sector_type, COALESCE(SUM(bu.count), 0)::int as retail_units
        FROM market_entries me
        LEFT JOIN business_units bu ON me.id = bu.market_entry_id AND bu.unit_type = 'retail'
        GROUP BY me.sector_type`),
      pool.query(`
        SELECT me.sector_type, COALESCE(SUM(bu.count), 0)::int as service_units
        FROM market_entries me
        LEFT JOIN business_units bu ON me.id = bu.market_entry_id AND bu.unit_type = 'service'
        GROUP BY me.sector_type`),
      pool.query(`
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

  private getFromCache<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    return entry.value as T;
  }

  private setCache<T>(key: string, value: T) {
    this.cache.set(key, { value, expiresAt: Date.now() + this.ttlMs });
  }

  invalidateAll() {
    this.cache.clear();
  }

  async getCommoditySummary() {
    const key = 'commodity_summary';
    const cached = this.getFromCache<any>(key);
    if (cached) return cached;
    const unitMaps = await this.getUnitMaps();
    const { supply, demand } = this.calc.computeCommoditySupplyDemand(unitMaps, [...RESOURCES]);
    const summary = RESOURCES.map(resource => {
      const price = calculateCommodityPrice(resource as any, supply[resource], demand[resource]);
      return { resource, supply: supply[resource], demand: demand[resource], price };
    });
    this.setCache(key, { summary, supply, demand });
    return { summary, supply, demand };
  }

  async getProductSummary() {
    const key = 'product_summary';
    const cached = this.getFromCache<any>(key);
    if (cached) return cached;
    const unitMaps = await this.getUnitMaps();
    const { supply, demand } = this.calc.computeProductSupplyDemand(unitMaps, [...PRODUCTS]);
    const summary = PRODUCTS.map(product => {
      const price = calculateProductPrice(product as any, supply[product], demand[product]);
      return { product, supply: supply[product], demand: demand[product], price };
    });
    this.setCache(key, { summary, supply, demand });
    return { summary, supply, demand };
  }

  async getCommodityDetail(resource: string) {
    const all = await this.getCommoditySummary();
    const supply = all.supply[resource] || 0;
    const demand = all.demand[resource] || 0;
    const price = calculateCommodityPrice(resource as any, supply, demand);
    return { resource, supply, demand, price };
  }

  async getProductDetail(product: string) {
    const all = await this.getProductSummary();
    const supply = all.supply[product] || 0;
    const demand = all.demand[product] || 0;
    const price = calculateProductPrice(product as any, supply, demand);
    return { product, supply, demand, price };
  }

  async validateAndAudit() {
    const auditPath = path.resolve(process.cwd(), 'logs', 'market_audit.log');
    fs.mkdirSync(path.dirname(auditPath), { recursive: true });
    const lines: string[] = [];
    const now = new Date().toISOString();
    const prod = await this.getProductSummary();
    const com = await this.getCommoditySummary();
    lines.push(`[${now}] Validation start`);
    for (const product of PRODUCTS) {
      const detail = await this.getProductDetail(product);
      const s = prod.supply[product];
      const d = prod.demand[product];
      const ok = s === detail.supply && d === detail.demand;
      lines.push(`PRODUCT ${product}: supply=${s}, demand=${d}, price=${detail.price.currentPrice}, ok=${ok}`);
      if (!ok) lines.push(`DISCREPANCY: product=${product}`);
    }
    for (const resource of RESOURCES) {
      const detail = await this.getCommodityDetail(resource);
      const s = com.supply[resource];
      const d = com.demand[resource];
      const ok = s === detail.supply && d === detail.demand;
      lines.push(`RESOURCE ${resource}: supply=${s}, demand=${d}, price=${detail.price.currentPrice}, ok=${ok}`);
      if (!ok) lines.push(`DISCREPANCY: resource=${resource}`);
    }
    lines.push(`[${now}] Validation end`);
    fs.appendFileSync(auditPath, lines.join('\n') + '\n', 'utf8');
    return { ok: true };
  }
}

export const marketDataService = new MarketDataService();

