import { BaseSector, UnitCounts } from './BaseSector';

export class ExtractionSector extends BaseSector {
  computeCommoditySupply(resource: string, counts: UnitCounts): number {
    const out = this.getNumber('EXTRACTION_OUTPUT_RATE', 2.0);
    return counts.extraction * out;
  }

  computeCommodityDemand(resource: string, counts: UnitCounts): number {
    return 0;
  }

  computeProductSupply(product: string, counts: UnitCounts): number {
    return 0;
  }

  computeProductDemand(product: string, counts: UnitCounts): number {
    const elec = this.getNumber('EXTRACTION_ELECTRICITY_CONSUMPTION', 0.25);
    if (product === 'Electricity') {
      return counts.extraction * elec;
    }
    return 0;
  }
}

