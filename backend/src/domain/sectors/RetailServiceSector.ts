import { BaseSector, UnitCounts } from './BaseSector';
import { SECTOR_RETAIL_DEMANDS, SECTOR_SERVICE_DEMANDS } from '../../constants/sectors';

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
    let retailCons = this.getNumber('RETAIL_PRODUCT_CONSUMPTION', 2.0);
    const serviceElec = this.getNumber('SERVICE_ELECTRICITY_CONSUMPTION', 0.25);
    let serviceProd = this.getNumber('SERVICE_PRODUCT_CONSUMPTION', 1.5);

    // Defense sector rule: 1.0 consumption per unit
    if (this.sectorName === 'Defense') {
      retailCons = 1.0;
      serviceProd = 1.0;
    }

    // Manufacturing service rule: 0.5 consumption
    if (this.sectorName === 'Manufacturing') {
      serviceProd = 0.5;
    }

    let total = 0;
    const retailDemands = (SECTOR_RETAIL_DEMANDS as any)[this.sectorName] as string[] | null;
    const serviceDemands = (SECTOR_SERVICE_DEMANDS as any)[this.sectorName] as string[] | null;
    if (retailDemands && retailDemands.includes(product)) {
      total += counts.retail * retailCons;
    }
    if (product === 'Electricity') {
      total += counts.service * serviceElec;
    } else if (serviceDemands && serviceDemands.includes(product)) {
      total += counts.service * serviceProd;
    }
    return total;
  }
}
