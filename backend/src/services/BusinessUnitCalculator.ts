/**
 * BusinessUnitCalculator - Unified economics calculator for all business unit types
 *
 * This replaces the fragmented ProductionSector/RetailServiceSector/ExtractionSector
 * approach with a single calculator that computes demand/supply based on unit type.
 *
 * FID-20251225-001
 */

import {
  SECTOR_PRODUCTS,
  SECTOR_PRODUCT_DEMANDS,
  SECTOR_RETAIL_DEMANDS,
  SECTOR_SERVICE_DEMANDS,
  SECTOR_EXTRACTION,
  SECTOR_RESOURCES,
  PRODUCTION_RESOURCE_CONSUMPTION,
  PRODUCTION_PRODUCT_CONSUMPTION,
  PRODUCTION_OUTPUT_RATE,
  PRODUCTION_ELECTRICITY_CONSUMPTION,
  EXTRACTION_OUTPUT_RATE,
  EXTRACTION_ELECTRICITY_CONSUMPTION,
  RETAIL_PRODUCT_CONSUMPTION,
  SERVICE_PRODUCT_CONSUMPTION,
  SERVICE_ELECTRICITY_CONSUMPTION,
  // Sector-specific additional consumption constants
  ENERGY_LOGISTICS_CONSUMPTION,
  MANUFACTURING_LOGISTICS_CONSUMPTION,
  RETAIL_LOGISTICS_CONSUMPTION,
  REAL_ESTATE_LOGISTICS_CONSUMPTION,
  AGRICULTURE_MANUFACTURED_GOODS_CONSUMPTION,
  PHARMACEUTICALS_TECHNOLOGY_CONSUMPTION,
  DEFENSE_TECHNOLOGY_CONSUMPTION,
  MINING_MANUFACTURED_GOODS_CONSUMPTION,
  HEALTHCARE_TECHNOLOGY_CONSUMPTION,
  CONSTRUCTION_MANUFACTURED_GOODS_CONSUMPTION,
  type Sector,
  type Product,
  type Resource,
} from '../constants/sectors';

export type UnitType = 'production' | 'retail' | 'service' | 'extraction';

export interface UnitCounts {
  production: number;
  retail: number;
  service: number;
  extraction: number;
}

/**
 * Sector-specific consumption rate overrides
 * These override the default rates for specific sectors
 */
export const SECTOR_RULES: Record<string, {
  retailConsumption?: number;
  serviceConsumption?: number;
  productionConsumption?: number;
  extractionConsumption?: number;
}> = {
  'Defense': {
    retailConsumption: 1.0,      // 1.0 instead of 2.0
    serviceConsumption: 1.0,    // 1.0 instead of 1.5
  },
  'Manufacturing': {
    serviceConsumption: 0.5,    // 0.5 instead of 1.5
  },
};

export class BusinessUnitCalculator {
  /**
   * Get consumption rate for a unit type in a specific sector
   */
  getConsumptionRate(unitType: UnitType, sector: string, isElectricity: boolean = false): number {
    const rules = SECTOR_RULES[sector];

    switch (unitType) {
      case 'production':
        if (isElectricity) return PRODUCTION_ELECTRICITY_CONSUMPTION;
        return rules?.productionConsumption ?? PRODUCTION_PRODUCT_CONSUMPTION;

      case 'retail':
        // Retail doesn't consume electricity separately (it's included in product demands)
        return rules?.retailConsumption ?? RETAIL_PRODUCT_CONSUMPTION;

      case 'service':
        if (isElectricity) return SERVICE_ELECTRICITY_CONSUMPTION;
        return rules?.serviceConsumption ?? SERVICE_PRODUCT_CONSUMPTION;

      case 'extraction':
        if (isElectricity) return EXTRACTION_ELECTRICITY_CONSUMPTION;
        return 0; // Extraction only consumes electricity

      default:
        return 0;
    }
  }

  /**
   * Get output rate for a unit type
   */
  getOutputRate(unitType: UnitType): number {
    switch (unitType) {
      case 'production':
        return PRODUCTION_OUTPUT_RATE;
      case 'extraction':
        return EXTRACTION_OUTPUT_RATE;
      default:
        return 0; // Retail and service don't produce outputs
    }
  }

  /**
   * Get what products a unit type demands for a given sector
   */
  getProductDemands(unitType: UnitType, sector: string): string[] | null {
    switch (unitType) {
      case 'production':
        return (SECTOR_PRODUCT_DEMANDS as Record<string, string[] | null>)[sector] ?? null;
      case 'retail':
        return (SECTOR_RETAIL_DEMANDS as Record<string, string[] | null>)[sector] ?? null;
      case 'service':
        return (SECTOR_SERVICE_DEMANDS as Record<string, string[] | null>)[sector] ?? null;
      case 'extraction':
        return null; // Extraction only consumes electricity
      default:
        return null;
    }
  }

  /**
   * Get sector-specific additional product consumption that's not in the standard demand arrays
   * These are special cases where sectors consume products outside their normal demand patterns
   */
  getSectorSpecificConsumption(
    unitType: UnitType,
    sector: string,
    product: string
  ): number | null {
    // Production unit additional demands
    if (unitType === 'production') {
      if (product === 'Logistics Capacity') {
        if (sector === 'Energy') return ENERGY_LOGISTICS_CONSUMPTION;
        if (sector === 'Manufacturing') return MANUFACTURING_LOGISTICS_CONSUMPTION;
      }
      if (product === 'Manufactured Goods') {
        if (sector === 'Agriculture') return AGRICULTURE_MANUFACTURED_GOODS_CONSUMPTION;
        if (sector === 'Construction') return CONSTRUCTION_MANUFACTURED_GOODS_CONSUMPTION;
      }
      if (product === 'Technology Products') {
        if (sector === 'Pharmaceuticals') return PHARMACEUTICALS_TECHNOLOGY_CONSUMPTION;
        if (sector === 'Defense') return DEFENSE_TECHNOLOGY_CONSUMPTION;
      }
    }

    // Service unit additional demands
    if (unitType === 'service') {
      if (product === 'Logistics Capacity') {
        if (sector === 'Retail') return RETAIL_LOGISTICS_CONSUMPTION;
        if (sector === 'Real Estate') return REAL_ESTATE_LOGISTICS_CONSUMPTION;
      }
      if (product === 'Technology Products') {
        if (sector === 'Healthcare') return HEALTHCARE_TECHNOLOGY_CONSUMPTION;
      }
    }

    // Extraction unit additional demands
    if (unitType === 'extraction') {
      if (product === 'Manufactured Goods') {
        if (sector === 'Mining') return MINING_MANUFACTURED_GOODS_CONSUMPTION;
      }
    }

    return null;
  }

  /**
   * Compute product demand for a specific unit type
   */
  computeProductDemandByUnitType(
    unitType: UnitType,
    sector: string,
    product: string,
    unitCount: number
  ): number {
    if (unitCount <= 0) return 0;

    // Handle electricity separately
    if (product === 'Electricity') {
      switch (unitType) {
        case 'production':
          // Energy sector production units produce electricity, they don't consume it
          // (they only consume oil as their resource input)
          if (sector === 'Energy') {
            return 0;
          }
          return unitCount * PRODUCTION_ELECTRICITY_CONSUMPTION;
        case 'service':
          return unitCount * SERVICE_ELECTRICITY_CONSUMPTION;
        case 'extraction':
          return unitCount * EXTRACTION_ELECTRICITY_CONSUMPTION;
        case 'retail':
          // Check if retail demands electricity (some sectors might)
          const retailDemands = this.getProductDemands('retail', sector);
          if (retailDemands?.includes('Electricity')) {
            return unitCount * this.getConsumptionRate('retail', sector);
          }
          return 0;
        default:
          return 0;
      }
    }

    let demand = 0;

    // Check standard product demands first
    const demands = this.getProductDemands(unitType, sector);
    if (demands && demands.includes(product)) {
      demand += unitCount * this.getConsumptionRate(unitType, sector);
    }

    // Check sector-specific additional consumption
    const additionalConsumption = this.getSectorSpecificConsumption(unitType, sector, product);
    if (additionalConsumption !== null) {
      demand += unitCount * additionalConsumption;
    }

    return demand;
  }

  /**
   * Compute total product demand across all unit types for a sector
   */
  computeTotalProductDemand(
    sector: string,
    product: string,
    counts: UnitCounts
  ): number {
    let total = 0;

    total += this.computeProductDemandByUnitType('production', sector, product, counts.production);
    total += this.computeProductDemandByUnitType('retail', sector, product, counts.retail);
    total += this.computeProductDemandByUnitType('service', sector, product, counts.service);
    total += this.computeProductDemandByUnitType('extraction', sector, product, counts.extraction);

    return total;
  }

  /**
   * Compute product supply for a specific unit type
   */
  computeProductSupplyByUnitType(
    unitType: UnitType,
    sector: string,
    product: string,
    unitCount: number
  ): number {
    if (unitCount <= 0) return 0;

    // Only production units supply products
    if (unitType !== 'production') return 0;

    const producedProduct = (SECTOR_PRODUCTS as Record<string, string | null>)[sector];
    if (producedProduct !== product) return 0;

    return unitCount * this.getOutputRate('production');
  }

  /**
   * Compute commodity (resource) demand for a specific unit type
   */
  computeCommodityDemandByUnitType(
    unitType: UnitType,
    sector: string,
    resource: string,
    unitCount: number
  ): number {
    if (unitCount <= 0) return 0;

    // Only production units consume raw resources
    if (unitType !== 'production') return 0;

    const requiredResource = (SECTOR_RESOURCES as Record<string, string | null>)[sector];
    if (requiredResource !== resource) return 0;

    return unitCount * PRODUCTION_RESOURCE_CONSUMPTION;
  }

  /**
   * Compute total commodity demand across all unit types for a sector
   */
  computeTotalCommodityDemand(
    sector: string,
    resource: string,
    counts: UnitCounts
  ): number {
    // Currently only production units consume resources
    return this.computeCommodityDemandByUnitType('production', sector, resource, counts.production);
  }

  /**
   * Compute commodity (resource) supply for a specific unit type
   */
  computeCommoditySupplyByUnitType(
    unitType: UnitType,
    sector: string,
    resource: string,
    unitCount: number
  ): number {
    if (unitCount <= 0) return 0;

    // Only extraction units supply resources
    if (unitType !== 'extraction') return 0;

    const extractable = (SECTOR_EXTRACTION as Record<string, string[] | null>)[sector];
    if (!extractable || !extractable.includes(resource)) return 0;

    return unitCount * this.getOutputRate('extraction');
  }

  /**
   * Compute total commodity supply across all unit types for a sector
   */
  computeTotalCommoditySupply(
    sector: string,
    resource: string,
    counts: UnitCounts
  ): number {
    // Currently only extraction units supply resources
    return this.computeCommoditySupplyByUnitType('extraction', sector, resource, counts.extraction);
  }
}

// Singleton instance for convenience
export const businessUnitCalculator = new BusinessUnitCalculator();
