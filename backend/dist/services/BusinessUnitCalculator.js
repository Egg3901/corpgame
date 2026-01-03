"use strict";
/**
 * BusinessUnitCalculator - Unified economics calculator for all business unit types
 *
 * This replaces the fragmented ProductionSector/RetailServiceSector/ExtractionSector
 * approach with a single calculator that computes demand/supply based on unit type.
 *
 * FID-20251225-001
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.businessUnitCalculator = exports.BusinessUnitCalculator = exports.SECTOR_RULES = void 0;
const sectors_1 = require("../constants/sectors");
/**
 * Sector-specific consumption rate overrides
 * These override the default rates for specific sectors
 */
exports.SECTOR_RULES = {
    'Defense': {
        retailConsumption: 1.0, // 1.0 instead of 2.0
        serviceConsumption: 1.0, // 1.0 instead of 1.5
    },
    // Note: Light Industry is production-only and cannot build service units
};
class BusinessUnitCalculator {
    /**
     * Get consumption rate for a unit type in a specific sector
     */
    getConsumptionRate(unitType, sector, isElectricity = false) {
        const rules = exports.SECTOR_RULES[sector];
        switch (unitType) {
            case 'production':
                if (isElectricity)
                    return sectors_1.PRODUCTION_ELECTRICITY_CONSUMPTION;
                return rules?.productionConsumption ?? sectors_1.PRODUCTION_PRODUCT_CONSUMPTION;
            case 'retail':
                // Retail doesn't consume electricity separately (it's included in product demands)
                return rules?.retailConsumption ?? sectors_1.RETAIL_PRODUCT_CONSUMPTION;
            case 'service':
                if (isElectricity)
                    return sectors_1.SERVICE_ELECTRICITY_CONSUMPTION;
                return rules?.serviceConsumption ?? sectors_1.SERVICE_PRODUCT_CONSUMPTION;
            case 'extraction':
                if (isElectricity)
                    return sectors_1.EXTRACTION_ELECTRICITY_CONSUMPTION;
                return 0; // Extraction only consumes electricity
            default:
                return 0;
        }
    }
    /**
     * Get output rate for a unit type
     */
    getOutputRate(unitType) {
        switch (unitType) {
            case 'production':
                return sectors_1.PRODUCTION_OUTPUT_RATE;
            case 'extraction':
                return sectors_1.EXTRACTION_OUTPUT_RATE;
            default:
                return 0; // Retail and service don't produce outputs
        }
    }
    /**
     * Get what products a unit type demands for a given sector
     */
    getProductDemands(unitType, sector) {
        switch (unitType) {
            case 'production':
                return sectors_1.SECTOR_PRODUCT_DEMANDS[sector] ?? null;
            case 'retail':
                return sectors_1.SECTOR_RETAIL_DEMANDS[sector] ?? null;
            case 'service':
                return sectors_1.SECTOR_SERVICE_DEMANDS[sector] ?? null;
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
    getSectorSpecificConsumption(unitType, sector, product) {
        // Production unit additional demands
        if (unitType === 'production') {
            if (product === 'Logistics Capacity') {
                if (sector === 'Energy')
                    return sectors_1.ENERGY_LOGISTICS_CONSUMPTION;
                if (sector === 'Light Industry')
                    return sectors_1.MANUFACTURING_LOGISTICS_CONSUMPTION;
            }
            if (product === 'Manufactured Goods') {
                if (sector === 'Agriculture')
                    return sectors_1.AGRICULTURE_MANUFACTURED_GOODS_CONSUMPTION;
                if (sector === 'Construction')
                    return sectors_1.CONSTRUCTION_MANUFACTURED_GOODS_CONSUMPTION;
            }
            if (product === 'Technology Products') {
                if (sector === 'Pharmaceuticals')
                    return sectors_1.PHARMACEUTICALS_TECHNOLOGY_CONSUMPTION;
                if (sector === 'Defense')
                    return sectors_1.DEFENSE_TECHNOLOGY_CONSUMPTION;
            }
        }
        // Service unit additional demands
        if (unitType === 'service') {
            if (product === 'Logistics Capacity') {
                if (sector === 'Retail')
                    return sectors_1.RETAIL_LOGISTICS_CONSUMPTION;
                if (sector === 'Real Estate')
                    return sectors_1.REAL_ESTATE_LOGISTICS_CONSUMPTION;
            }
            if (product === 'Technology Products') {
                if (sector === 'Healthcare')
                    return sectors_1.HEALTHCARE_TECHNOLOGY_CONSUMPTION;
            }
        }
        // Extraction unit additional demands
        if (unitType === 'extraction') {
            if (product === 'Manufactured Goods') {
                if (sector === 'Mining')
                    return sectors_1.MINING_MANUFACTURED_GOODS_CONSUMPTION;
            }
        }
        return null;
    }
    /**
     * Compute product demand for a specific unit type
     */
    computeProductDemandByUnitType(unitType, sector, product, unitCount) {
        if (unitCount <= 0)
            return 0;
        // Handle electricity separately
        if (product === 'Electricity') {
            switch (unitType) {
                case 'production':
                    // Energy sector production units produce electricity, they don't consume it
                    // (they only consume oil as their resource input)
                    if (sector === 'Energy') {
                        return 0;
                    }
                    // Heavy Industry has higher electricity consumption
                    if (sector === 'Heavy Industry') {
                        return unitCount * sectors_1.HEAVY_INDUSTRY_ELECTRICITY_CONSUMPTION;
                    }
                    return unitCount * sectors_1.PRODUCTION_ELECTRICITY_CONSUMPTION;
                case 'service':
                    return unitCount * sectors_1.SERVICE_ELECTRICITY_CONSUMPTION;
                case 'extraction':
                    return unitCount * sectors_1.EXTRACTION_ELECTRICITY_CONSUMPTION;
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
    computeTotalProductDemand(sector, product, counts) {
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
    computeProductSupplyByUnitType(unitType, sector, product, unitCount) {
        if (unitCount <= 0)
            return 0;
        // Only production units supply products
        if (unitType !== 'production')
            return 0;
        const producedProduct = sectors_1.SECTOR_PRODUCTS[sector];
        if (producedProduct !== product)
            return 0;
        return unitCount * this.getOutputRate('production');
    }
    /**
     * Compute commodity (resource) demand for a specific unit type
     */
    computeCommodityDemandByUnitType(unitType, sector, resource, unitCount) {
        if (unitCount <= 0)
            return 0;
        // Only production units consume raw resources
        if (unitType !== 'production')
            return 0;
        // SPECIAL CASE: Heavy Industry consumes Iron Ore + Coal (multi-resource)
        if (sector === 'Heavy Industry') {
            const heavyInput = sectors_1.HEAVY_INDUSTRY_INPUTS[resource];
            if (heavyInput !== undefined) {
                return unitCount * heavyInput;
            }
            return 0;
        }
        // SPECIAL CASE: Energy sector consumes Oil + Coal (multi-resource)
        if (sector === 'Energy') {
            const energyInput = sectors_1.ENERGY_INPUTS[resource];
            if (energyInput !== undefined) {
                return unitCount * energyInput;
            }
            return 0;
        }
        // Standard single resource consumption
        const requiredResource = sectors_1.SECTOR_RESOURCES[sector];
        if (requiredResource !== resource)
            return 0;
        return unitCount * sectors_1.PRODUCTION_RESOURCE_CONSUMPTION;
    }
    /**
     * Compute total commodity demand across all unit types for a sector
     */
    computeTotalCommodityDemand(sector, resource, counts) {
        // Currently only production units consume resources
        return this.computeCommodityDemandByUnitType('production', sector, resource, counts.production);
    }
    /**
     * Compute commodity (resource) supply for a specific unit type
     */
    computeCommoditySupplyByUnitType(unitType, sector, resource, unitCount) {
        if (unitCount <= 0)
            return 0;
        // Only extraction units supply resources
        if (unitType !== 'extraction')
            return 0;
        const extractable = sectors_1.SECTOR_EXTRACTION[sector];
        if (!extractable || !extractable.includes(resource))
            return 0;
        return unitCount * this.getOutputRate('extraction');
    }
    /**
     * Compute total commodity supply across all unit types for a sector
     */
    computeTotalCommoditySupply(sector, resource, counts) {
        // Currently only extraction units supply resources
        return this.computeCommoditySupplyByUnitType('extraction', sector, resource, counts.extraction);
    }
}
exports.BusinessUnitCalculator = BusinessUnitCalculator;
// Singleton instance for convenience
exports.businessUnitCalculator = new BusinessUnitCalculator();
