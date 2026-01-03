"use strict";
/**
 * SectorConfigService
 * FID-20251228-001: Unified Sector Configuration System
 *
 * Provides a caching layer over SectorConfigModel and transforms
 * raw DB data into formats expected by existing calculators.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SectorConfigService = void 0;
const SectorConfig_1 = require("../models/SectorConfig");
// Cache for the unified configuration
let configCache = null;
let cacheVersion = '';
class SectorConfigService {
    /**
     * Get the full unified configuration, using cache if available
     */
    static async getConfiguration() {
        const currentVersion = await SectorConfig_1.SectorConfigModel.getConfigVersion();
        // Return cached config if version matches
        if (configCache && cacheVersion === currentVersion) {
            return configCache;
        }
        // Fetch fresh config from database
        const config = await SectorConfig_1.SectorConfigModel.getFullConfiguration();
        // Update cache
        configCache = config;
        cacheVersion = currentVersion;
        return config;
    }
    /**
     * Get just the version string for cache validation
     */
    static async getConfigVersion() {
        return SectorConfig_1.SectorConfigModel.getConfigVersion();
    }
    /**
     * Invalidate the cache (call after any admin update)
     */
    static invalidateCache() {
        configCache = null;
        cacheVersion = '';
    }
    /**
     * Transform unified config to legacy format for backwards compatibility
     * This allows existing code to continue working during migration
     */
    static async toLegacyFormat() {
        const config = await this.getConfiguration();
        const SECTORS = Object.keys(config.sectors).sort((a, b) => config.sectors[a].displayOrder - config.sectors[b].displayOrder);
        const PRODUCTS = Object.keys(config.products).sort((a, b) => config.products[a].displayOrder - config.products[b].displayOrder);
        const RESOURCES = Object.keys(config.resources).sort((a, b) => config.resources[a].displayOrder - config.resources[b].displayOrder);
        const SECTOR_PRODUCTS = {};
        const SECTOR_RESOURCES = {};
        const SECTOR_EXTRACTION = {};
        const SECTOR_PRODUCT_DEMANDS = {};
        const SECTOR_RETAIL_DEMANDS = {};
        const SECTOR_SERVICE_DEMANDS = {};
        for (const [sectorName, sector] of Object.entries(config.sectors)) {
            SECTOR_PRODUCTS[sectorName] = sector.producedProduct;
            SECTOR_RESOURCES[sectorName] = sector.primaryResource;
            // Extraction outputs
            const extractionOutputs = sector.units.extraction.outputs
                .filter(o => o.type === 'resource')
                .map(o => o.name);
            SECTOR_EXTRACTION[sectorName] = extractionOutputs.length > 0 ? extractionOutputs : null;
            // Production unit demands (products consumed)
            const productionDemands = sector.units.production.inputs
                .filter(i => i.type === 'product' && i.name !== 'Electricity')
                .map(i => i.name);
            SECTOR_PRODUCT_DEMANDS[sectorName] = productionDemands.length > 0 ? productionDemands : null;
            // Retail unit demands
            const retailDemands = sector.units.retail.inputs
                .filter(i => i.type === 'product')
                .map(i => i.name);
            SECTOR_RETAIL_DEMANDS[sectorName] = sector.units.retail.isEnabled && retailDemands.length > 0
                ? retailDemands : null;
            // Service unit demands
            const serviceDemands = sector.units.service.inputs
                .filter(i => i.type === 'product')
                .map(i => i.name);
            SECTOR_SERVICE_DEMANDS[sectorName] = sector.units.service.isEnabled && serviceDemands.length > 0
                ? serviceDemands : null;
        }
        // Build unit economics from first enabled sector of each type
        const UNIT_ECONOMICS = {
            retail: { baseRevenue: 500, baseCost: 300 },
            production: { baseRevenue: 800, baseCost: 600 },
            service: { baseRevenue: 400, baseCost: 200 },
            extraction: { baseRevenue: 1000, baseCost: 700 },
        };
        const UNIT_LABOR_COSTS = {
            retail: 250,
            production: 400,
            service: 150,
            extraction: 500,
        };
        // Find representative unit configs
        for (const [, sector] of Object.entries(config.sectors)) {
            for (const unitType of ['retail', 'production', 'service', 'extraction']) {
                const unit = sector.units[unitType];
                if (unit.isEnabled && unit.baseRevenue > 0) {
                    UNIT_ECONOMICS[unitType] = {
                        baseRevenue: unit.baseRevenue,
                        baseCost: unit.baseCost,
                    };
                    UNIT_LABOR_COSTS[unitType] = unit.laborCost;
                    break;
                }
            }
        }
        const PRODUCT_REFERENCE_VALUES = {};
        for (const [name, product] of Object.entries(config.products)) {
            PRODUCT_REFERENCE_VALUES[name] = product.referenceValue;
        }
        const RESOURCE_BASE_PRICES = {};
        for (const [name, resource] of Object.entries(config.resources)) {
            RESOURCE_BASE_PRICES[name] = resource.basePrice;
        }
        // Default consumption/production rates (can be refined later)
        return {
            SECTORS,
            PRODUCTS,
            RESOURCES,
            SECTOR_PRODUCTS,
            SECTOR_RESOURCES,
            SECTOR_EXTRACTION,
            SECTOR_PRODUCT_DEMANDS,
            SECTOR_RETAIL_DEMANDS,
            SECTOR_SERVICE_DEMANDS,
            UNIT_ECONOMICS,
            UNIT_LABOR_COSTS,
            PRODUCT_REFERENCE_VALUES,
            RESOURCE_BASE_PRICES,
            PRODUCTION_RESOURCE_CONSUMPTION: 0.5,
            PRODUCTION_PRODUCT_CONSUMPTION: 0.5,
            PRODUCTION_OUTPUT_RATE: 1.0,
            EXTRACTION_OUTPUT_RATE: 2.0,
            RETAIL_PRODUCT_CONSUMPTION: 2.0,
            SERVICE_PRODUCT_CONSUMPTION: 1.5,
        };
    }
    /**
     * Get unit flows for a specific sector (used by markets API)
     */
    static async getUnitFlowsForSector(sectorName) {
        const config = await this.getConfiguration();
        const sector = config.sectors[sectorName];
        if (!sector)
            return null;
        const result = {};
        for (const unitType of ['retail', 'production', 'service', 'extraction']) {
            const unit = sector.units[unitType];
            const inputs = {
                resources: {},
                products: {},
            };
            const outputs = {
                resources: {},
                products: {},
            };
            for (const input of unit.inputs) {
                if (input.type === 'resource') {
                    inputs.resources[input.name] = input.rate;
                }
                else {
                    inputs.products[input.name] = input.rate;
                }
            }
            for (const output of unit.outputs) {
                if (output.type === 'resource') {
                    outputs.resources[output.name] = output.rate;
                }
                else {
                    outputs.products[output.name] = output.rate;
                }
            }
            result[unitType] = { inputs, outputs };
        }
        return result;
    }
    /**
     * Get all sectors that demand a specific product
     */
    static async getSectorsDemandingProduct(productName) {
        const config = await this.getConfiguration();
        const result = [];
        for (const [sectorName, sector] of Object.entries(config.sectors)) {
            const unitTypes = [];
            for (const unitType of ['production', 'retail', 'service', 'extraction']) {
                const unit = sector.units[unitType];
                if (unit.isEnabled && unit.inputs.some(i => i.type === 'product' && i.name === productName)) {
                    unitTypes.push(unitType);
                }
            }
            if (unitTypes.length > 0) {
                result.push({ sector: sectorName, unitTypes });
            }
        }
        return result;
    }
    /**
     * Get all sectors that produce a specific product
     */
    static async getSectorsProducingProduct(productName) {
        const config = await this.getConfiguration();
        const result = [];
        for (const [sectorName, sector] of Object.entries(config.sectors)) {
            if (sector.producedProduct === productName) {
                result.push(sectorName);
            }
        }
        return result;
    }
    /**
     * Get all sectors that demand a specific resource
     */
    static async getSectorsDemandingResource(resourceName) {
        const config = await this.getConfiguration();
        const result = [];
        for (const [sectorName, sector] of Object.entries(config.sectors)) {
            const unitTypes = [];
            for (const unitType of ['production', 'retail', 'service', 'extraction']) {
                const unit = sector.units[unitType];
                if (unit.isEnabled && unit.inputs.some(i => i.type === 'resource' && i.name === resourceName)) {
                    unitTypes.push(unitType);
                }
            }
            if (unitTypes.length > 0) {
                result.push({ sector: sectorName, unitTypes });
            }
        }
        return result;
    }
    /**
     * Get all sectors that extract a specific resource
     */
    static async getSectorsExtractingResource(resourceName) {
        const config = await this.getConfiguration();
        const result = [];
        for (const [sectorName, sector] of Object.entries(config.sectors)) {
            const extractionOutputs = sector.units.extraction.outputs;
            if (extractionOutputs.some(o => o.type === 'resource' && o.name === resourceName)) {
                result.push(sectorName);
            }
        }
        return result;
    }
    /**
     * Get product reference value
     */
    static async getProductReferenceValue(productName) {
        const config = await this.getConfiguration();
        return config.products[productName]?.referenceValue ?? 1000;
    }
    /**
     * Get resource base price
     */
    static async getResourceBasePrice(resourceName) {
        const config = await this.getConfiguration();
        return config.resources[resourceName]?.basePrice ?? 100;
    }
}
exports.SectorConfigService = SectorConfigService;
