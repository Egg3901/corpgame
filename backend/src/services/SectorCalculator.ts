import fs from 'fs';
import path from 'path';
import { BaseSector, SectorParams, UnitCounts } from '../domain/sectors/BaseSector';
import { ProductionSector } from '../domain/sectors/ProductionSector';
import { ExtractionSector } from '../domain/sectors/ExtractionSector';
import { RetailServiceSector } from '../domain/sectors/RetailServiceSector';
import { SECTOR_PRODUCTS, SECTOR_RESOURCES, SECTOR_EXTRACTION } from '../constants/sectors';

type UnitMaps = {
  production: Record<string, number>;
  retail: Record<string, number>;
  service: Record<string, number>;
  extraction: Record<string, number>;
};

export class SectorCalculator {
  private params: SectorParams;

  constructor() {
    const cfgPath = path.resolve(process.cwd(), 'config', 'sector_rules.json');
    const raw = fs.existsSync(cfgPath) ? JSON.parse(fs.readFileSync(cfgPath, 'utf8')) : {};
    this.params = {
      categoryParams: {
        production: raw.categories?.production || {},
        extraction: raw.categories?.extraction || {},
        retail_service: raw.categories?.retail_service || {},
      },
      sectorOverrides: raw.sectors || {},
    };
  }

  private getSector(sector: string): BaseSector {
    const prod = (SECTOR_PRODUCTS as any)[sector];
    const ext = (SECTOR_EXTRACTION as any)[sector];
    const category = this.params.sectorOverrides[sector]?.category
      || (prod ? 'production' : ext ? 'extraction' : 'retail_service');
    switch (category) {
      case 'production':
        return new ProductionSector(sector, this.params);
      case 'extraction':
        return new ExtractionSector(sector, this.params);
      default:
        return new RetailServiceSector(sector, this.params);
    }
  }

  computeCommoditySupplyDemand(unitMaps: UnitMaps, resources: string[]): { supply: Record<string, number>; demand: Record<string, number> } {
    const supply: Record<string, number> = {};
    const demand: Record<string, number> = {};
    const sectors = Object.keys({ ...unitMaps.production, ...unitMaps.retail, ...unitMaps.service, ...unitMaps.extraction });
    for (const res of resources) {
      supply[res] = 0;
      demand[res] = 0;
    }
    for (const sector of sectors) {
      const counts: UnitCounts = {
        production: unitMaps.production[sector] || 0,
        retail: unitMaps.retail[sector] || 0,
        service: unitMaps.service[sector] || 0,
        extraction: unitMaps.extraction[sector] || 0,
      };
      const s = this.getSector(sector);
      for (const res of resources) {
        supply[res] += s.computeCommoditySupply(res, counts);
        const reqRes = (SECTOR_RESOURCES as any)[sector];
        if (reqRes === res) {
          demand[res] += s.computeCommodityDemand(res, counts);
        }
      }
    }
    return { supply, demand };
  }

  computeProductSupplyDemand(unitMaps: UnitMaps, products: string[]): { supply: Record<string, number>; demand: Record<string, number> } {
    const supply: Record<string, number> = {};
    const demand: Record<string, number> = {};
    const sectors = Object.keys({ ...unitMaps.production, ...unitMaps.retail, ...unitMaps.service, ...unitMaps.extraction });
    for (const p of products) {
      supply[p] = 0;
      demand[p] = 0;
    }
    for (const sector of sectors) {
      const counts: UnitCounts = {
        production: unitMaps.production[sector] || 0,
        retail: unitMaps.retail[sector] || 0,
        service: unitMaps.service[sector] || 0,
        extraction: unitMaps.extraction[sector] || 0,
      };
      const s = this.getSector(sector);
      for (const p of products) {
        const produced = (SECTOR_PRODUCTS as any)[sector];
        if (produced === p) {
          supply[p] += s.computeProductSupply(p, counts);
        }
        const demands = s.computeProductDemand(p, counts);
        demand[p] += demands;
      }
    }
    return { supply, demand };
  }
}
