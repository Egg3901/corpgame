import { BaseSector, UnitCounts } from './BaseSector';
import { SECTOR_PRODUCT_DEMANDS, SECTOR_EXTRACTION, SECTOR_RETAIL_DEMANDS, SECTOR_SERVICE_DEMANDS } from '../../constants/sectors';

export class ProductionSector extends BaseSector {
  computeCommoditySupply(resource: string, counts: UnitCounts): number {
    const out = this.getNumber('EXTRACTION_OUTPUT_RATE', 2.0);
    const extractable = (SECTOR_EXTRACTION as any)[this.sectorName] as string[] | null;
    if (extractable && extractable.includes(resource)) {
      return counts.extraction * out;
    }
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
    const extractionElecCons = this.getNumber('EXTRACTION_ELECTRICITY_CONSUMPTION', 0.25);
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

    let totalDemand = 0;

    if (product === 'Electricity') {
      totalDemand += counts.production * elecCons;
      totalDemand += counts.extraction * extractionElecCons;
      totalDemand += counts.service * serviceElec;
      return totalDemand;
    }

    // Production unit demands
    const demandedProducts = (SECTOR_PRODUCT_DEMANDS as any)[this.sectorName] as string[] | null;
    if (demandedProducts && demandedProducts.includes(product)) {
      totalDemand += counts.production * prodCons;
    }

    // Retail unit demands
    const retailDemands = (SECTOR_RETAIL_DEMANDS as any)[this.sectorName] as string[] | null;
    if (retailDemands && retailDemands.includes(product)) {
      totalDemand += counts.retail * retailCons;
    }

    // Service unit demands
    const serviceDemands = (SECTOR_SERVICE_DEMANDS as any)[this.sectorName] as string[] | null;
    if (serviceDemands && serviceDemands.includes(product)) {
      totalDemand += counts.service * serviceProd;
    }

    return totalDemand;
  }
}
