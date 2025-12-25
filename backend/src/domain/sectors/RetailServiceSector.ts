import { BaseSector, UnitCounts } from './BaseSector';

export class RetailServiceSector extends BaseSector {
  computeCommoditySupply(resource: string, counts: UnitCounts): number {
    return 0;
  }

  computeCommodityDemand(resource: string, counts: UnitCounts): number {
    return 0;
  }

  computeProductSupply(product: string, counts: UnitCounts): number {
    return 0;
  }

  computeProductDemand(product: string, counts: UnitCounts): number {
    const retailCons = this.getNumber('RETAIL_PRODUCT_CONSUMPTION', 2.0);
    const serviceCons = product === 'Electricity'
      ? this.getNumber('SERVICE_ELECTRICITY_CONSUMPTION', 0.25)
      : this.getNumber('SERVICE_PRODUCT_CONSUMPTION', 1.5);
    return counts.retail * retailCons + counts.service * serviceCons;
  }
}

