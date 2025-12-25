import { BaseSector, UnitCounts } from './BaseSector';
import { SECTOR_EXTRACTION } from '../../constants/sectors';

export class ExtractionSector extends BaseSector {
  computeCommoditySupply(resource: string, counts: UnitCounts): number {
    const out = this.getNumber('EXTRACTION_OUTPUT_RATE', 2.0);
    const extractable = (SECTOR_EXTRACTION as any)[this.sectorName] as string[] | null;
    if (extractable && extractable.includes(resource)) {
      return counts.extraction * out;
    }
    return 0;
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
