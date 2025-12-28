import { BaseSector, UnitCounts } from './BaseSector';
import { SECTOR_PRODUCT_DEMANDS, SECTOR_EXTRACTION } from '../../constants/sectors';

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

    let totalDemand = 0;

    if (product === 'Electricity') {
      totalDemand += counts.production * elecCons;
      totalDemand += counts.extraction * extractionElecCons;
      return totalDemand;
    }

    const demandedProducts = (SECTOR_PRODUCT_DEMANDS as any)[this.sectorName] as string[] | null;
    if (demandedProducts && demandedProducts.includes(product)) {
      totalDemand += counts.production * prodCons;
    }

    return totalDemand;
  }
}
