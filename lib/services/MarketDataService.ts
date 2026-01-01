import fs from 'fs';
import path from 'path';
import { MarketEntryModel } from '../models/MarketEntry';
import {
  RESOURCES,
  PRODUCTS,
} from '../constants/sectors';
import { getErrorMessage } from '../utils';

type CacheEntry<T> = { value: T; expiresAt: number };

export interface PriceData {
  currentPrice: number;
  history: number[];
}

export interface MarketItemSummary {
  resource?: string;
  product?: string;
  supply: number;
  demand: number;
  price: PriceData;
}

export interface MarketSummaryResult {
  summary: MarketItemSummary[];
  supply: Record<string, number>;
  demand: Record<string, number>;
}

export class MarketDataService {
  private cache: Map<string, CacheEntry<MarketSummaryResult>> = new Map();
  private ttlMs = 5000;

  private getFromCache(key: string): MarketSummaryResult | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    return entry.value;
  }

  private setCache(key: string, value: MarketSummaryResult) {
    this.cache.set(key, { value, expiresAt: Date.now() + this.ttlMs });
  }

  invalidateAll() {
    this.cache.clear();
  }

  async getCommoditySummary(): Promise<MarketSummaryResult> {
    const key = 'commodity_summary';
    const cached = this.getFromCache(key);
    if (cached) return cached;

    const marketData = await MarketEntryModel.getMarketData();
    const { commodityPrices, commoditySupply, commodityDemand } = marketData;

    const summary: MarketItemSummary[] = RESOURCES.map(resource => {
      const price = { currentPrice: commodityPrices[resource] || 0, history: [] }; // MarketEntryModel returns currentPrice directly
      return { 
        resource, 
        supply: commoditySupply[resource] || 0, 
        demand: commodityDemand[resource] || 0, 
        price 
      };
    });

    const result = { summary, supply: commoditySupply, demand: commodityDemand };
    this.setCache(key, result);
    return result;
  }

  async getProductSummary(): Promise<MarketSummaryResult> {
    const key = 'product_summary';
    const cached = this.getFromCache(key);
    if (cached) return cached;

    const marketData = await MarketEntryModel.getMarketData();
    const { productPrices, productSupply, productDemand } = marketData;

    const summary: MarketItemSummary[] = PRODUCTS.map(product => {
      const price = { currentPrice: productPrices[product] || 0, history: [] };
      return { 
        product, 
        supply: productSupply[product] || 0, 
        demand: productDemand[product] || 0, 
        price 
      };
    });

    const result = { summary, supply: productSupply, demand: productDemand };
    this.setCache(key, result);
    return result;
  }

  async getCommodityDetail(resource: string) {
    const all = await this.getCommoditySummary();
    const supply = all.supply[resource] || 0;
    const demand = all.demand[resource] || 0;
    const summaryItem = all.summary.find((s) => s.resource === resource);
    const price = summaryItem ? summaryItem.price : { currentPrice: 0, history: [] };
    return { resource, supply, demand, price };
  }

  async getProductDetail(product: string) {
    const all = await this.getProductSummary();
    const supply = all.supply[product] || 0;
    const demand = all.demand[product] || 0;
    const summaryItem = all.summary.find((s) => s.product === product);
    const price = summaryItem ? summaryItem.price : { currentPrice: 0, history: [] };
    return { product, supply, demand, price };
  }

  async validateAndAudit() {
    const auditPath = path.resolve(process.cwd(), 'logs', 'market_audit.log');
    try {
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
    } catch (error: unknown) {
      console.error('Failed to write audit log:', getErrorMessage(error));
      return { ok: false, error };
    }
  }
}

export const marketDataService = new MarketDataService();
