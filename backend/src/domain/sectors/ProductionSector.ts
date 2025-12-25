import { BaseSector, UnitCounts } from './BaseSector';

export class ProductionSector extends BaseSector {
  computeCommoditySupply(resource: string, counts: UnitCounts): number {
    return 0;
  }

  computeCommodityDemand(resource: string, counts: UnitCounts): number {
    const consumption = this.getNumber('PRODUCTION_RESOURCE_CONSUMPTION', 0.5);
    return counts.production * consumption;
  }

  computeProductSupply(product: string, counts: UnitCounts): number {
    const output = this.getNumber('PRODUCTION_OUTPUT_RATE', 1.0);
    return counts.production * output;
  }

  computeProductDemand(product: string, counts: UnitCounts): number {
    const prodCons = this.getNumber('PRODUCTION_PRODUCT_CONSUMPTION', 0.5);
    const elecCons = this.getNumber('PRODUCTION_ELECTRICITY_CONSUMPTION', 0.5);
    if (product === 'Electricity') {
      return counts.production * elecCons;
    }
    return counts.production * prodCons;
  }
}

