import { businessUnitCalculator, UnitCounts } from './BusinessUnitCalculator';
import { SECTOR_PRODUCTS } from '../constants/sectors';

type UnitMaps = {
  production: Record<string, number>;
  retail: Record<string, number>;
  service: Record<string, number>;
  extraction: Record<string, number>;
};

/**
 * SectorCalculator - Computes aggregate supply/demand across all sectors
 *
 * Uses BusinessUnitCalculator for unified unit-type-based economics.
 * FID-20251225-001: Refactored to use BusinessUnitCalculator
 */
export class SectorCalculator {
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

      for (const res of resources) {
        supply[res] += businessUnitCalculator.computeTotalCommoditySupply(sector, res, counts);
        demand[res] += businessUnitCalculator.computeTotalCommodityDemand(sector, res, counts);
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

      for (const p of products) {
        // Supply: only production units create products
        const produced = (SECTOR_PRODUCTS as Record<string, string | null>)[sector];
        if (produced === p) {
          supply[p] += businessUnitCalculator.computeProductSupplyByUnitType('production', sector, p, counts.production);
        }

        // Demand: all unit types may consume products
        demand[p] += businessUnitCalculator.computeTotalProductDemand(sector, p, counts);
      }
    }

    return { supply, demand };
  }
}
