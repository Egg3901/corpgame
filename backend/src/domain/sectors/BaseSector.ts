export type CategoryParams = Record<string, number>;

export type SectorRule = {
  category: 'production' | 'extraction' | 'retail_service';
  overrides?: CategoryParams;
};

export type SectorParams = {
  categoryParams: Record<'production' | 'extraction' | 'retail_service', CategoryParams>;
  sectorOverrides: Record<string, SectorRule>;
};

export type UnitCounts = {
  production: number;
  retail: number;
  service: number;
  extraction: number;
};

export abstract class BaseSector {
  protected params: SectorParams;
  protected sectorName: string;

  constructor(sectorName: string, params: SectorParams) {
    this.sectorName = sectorName;
    this.params = params;
  }

  protected getCategory(): SectorRule['category'] {
    return this.params.sectorOverrides[this.sectorName]?.category || 'production';
  }

  protected getNumber(key: string, fallback: number): number {
    const category = this.getCategory();
    const catVal = this.params.categoryParams[category]?.[key];
    const ov = this.params.sectorOverrides[this.sectorName]?.overrides?.[key];
    return typeof ov === 'number' ? ov : typeof catVal === 'number' ? catVal : fallback;
  }

  abstract computeCommoditySupply(resource: string, counts: UnitCounts): number;
  abstract computeCommodityDemand(resource: string, counts: UnitCounts): number;
  abstract computeProductSupply(product: string, counts: UnitCounts): number;
  abstract computeProductDemand(product: string, counts: UnitCounts): number;
}

