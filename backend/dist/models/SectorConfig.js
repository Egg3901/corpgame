"use strict";
/**
 * SectorConfig Model
 * FID-20251228-001: Unified Sector Configuration System
 *
 * Provides database access for sector configuration data including:
 * - Sector definitions and properties
 * - Unit type configurations (production, retail, service, extraction)
 * - Input/output mappings with consumption/production rates
 * - Product and resource reference values
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SectorConfigModel = void 0;
const connection_1 = __importDefault(require("../db/connection"));
// ============================================================================
// MODEL CLASS
// ============================================================================
class SectorConfigModel {
    // --------------------------------------------------------------------------
    // SECTOR QUERIES
    // --------------------------------------------------------------------------
    static async getAllSectors() {
        const result = await connection_1.default.query('SELECT * FROM sector_configs ORDER BY display_order');
        return result.rows;
    }
    static async getSectorByName(sectorName) {
        const result = await connection_1.default.query('SELECT * FROM sector_configs WHERE sector_name = $1', [sectorName]);
        return result.rows[0] || null;
    }
    static async updateSector(sectorName, data) {
        const fields = [];
        const values = [];
        let paramIndex = 1;
        if (data.is_production_only !== undefined) {
            fields.push(`is_production_only = $${paramIndex++}`);
            values.push(data.is_production_only);
        }
        if (data.can_extract !== undefined) {
            fields.push(`can_extract = $${paramIndex++}`);
            values.push(data.can_extract);
        }
        if (data.produced_product !== undefined) {
            fields.push(`produced_product = $${paramIndex++}`);
            values.push(data.produced_product);
        }
        if (data.primary_resource !== undefined) {
            fields.push(`primary_resource = $${paramIndex++}`);
            values.push(data.primary_resource);
        }
        if (fields.length === 0)
            return null;
        fields.push(`updated_at = CURRENT_TIMESTAMP`);
        values.push(sectorName);
        const result = await connection_1.default.query(`UPDATE sector_configs SET ${fields.join(', ')} WHERE sector_name = $${paramIndex} RETURNING *`, values);
        return result.rows[0] || null;
    }
    // --------------------------------------------------------------------------
    // UNIT CONFIG QUERIES
    // --------------------------------------------------------------------------
    static async getAllUnitConfigs() {
        const result = await connection_1.default.query('SELECT * FROM sector_unit_configs ORDER BY sector_name, unit_type');
        return result.rows;
    }
    static async getUnitConfig(sectorName, unitType) {
        const result = await connection_1.default.query('SELECT * FROM sector_unit_configs WHERE sector_name = $1 AND unit_type = $2', [sectorName, unitType]);
        return result.rows[0] || null;
    }
    static async getUnitConfigsBySector(sectorName) {
        const result = await connection_1.default.query('SELECT * FROM sector_unit_configs WHERE sector_name = $1 ORDER BY unit_type', [sectorName]);
        return result.rows;
    }
    static async updateUnitConfig(sectorName, unitType, data) {
        const fields = [];
        const values = [];
        let paramIndex = 1;
        if (data.is_enabled !== undefined) {
            fields.push(`is_enabled = $${paramIndex++}`);
            values.push(data.is_enabled);
        }
        if (data.base_revenue !== undefined) {
            fields.push(`base_revenue = $${paramIndex++}`);
            values.push(data.base_revenue);
        }
        if (data.base_cost !== undefined) {
            fields.push(`base_cost = $${paramIndex++}`);
            values.push(data.base_cost);
        }
        if (data.labor_cost !== undefined) {
            fields.push(`labor_cost = $${paramIndex++}`);
            values.push(data.labor_cost);
        }
        if (data.output_rate !== undefined) {
            fields.push(`output_rate = $${paramIndex++}`);
            values.push(data.output_rate);
        }
        if (fields.length === 0)
            return null;
        fields.push(`updated_at = CURRENT_TIMESTAMP`);
        values.push(sectorName, unitType);
        const result = await connection_1.default.query(`UPDATE sector_unit_configs SET ${fields.join(', ')}
       WHERE sector_name = $${paramIndex} AND unit_type = $${paramIndex + 1}
       RETURNING *`, values);
        return result.rows[0] || null;
    }
    // --------------------------------------------------------------------------
    // INPUT QUERIES
    // --------------------------------------------------------------------------
    static async getAllInputs() {
        const result = await connection_1.default.query('SELECT * FROM sector_unit_inputs ORDER BY sector_name, unit_type, input_type, input_name');
        return result.rows;
    }
    static async getInputsForUnit(sectorName, unitType) {
        const result = await connection_1.default.query('SELECT * FROM sector_unit_inputs WHERE sector_name = $1 AND unit_type = $2 ORDER BY input_type, input_name', [sectorName, unitType]);
        return result.rows;
    }
    static async updateInput(id, consumptionRate) {
        const result = await connection_1.default.query(`UPDATE sector_unit_inputs
       SET consumption_rate = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING *`, [consumptionRate, id]);
        return result.rows[0] || null;
    }
    static async getInputById(id) {
        const result = await connection_1.default.query('SELECT * FROM sector_unit_inputs WHERE id = $1', [id]);
        return result.rows[0] || null;
    }
    /**
     * FID-20251228-003: Create a new input for a sector unit
     */
    static async createInput(params) {
        const { sectorName, unitType, inputName, inputType, consumptionRate } = params;
        // Check for duplicate
        const existing = await connection_1.default.query(`SELECT id FROM sector_unit_inputs
       WHERE sector_name = $1 AND unit_type = $2 AND input_name = $3 AND input_type = $4`, [sectorName, unitType, inputName, inputType]);
        if (existing.rows.length > 0) {
            throw new Error(`Input ${inputName} already exists for ${sectorName} ${unitType}`);
        }
        // Insert new input
        const result = await connection_1.default.query(`INSERT INTO sector_unit_inputs (sector_name, unit_type, input_name, input_type, consumption_rate)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`, [sectorName, unitType, inputName, inputType, consumptionRate]);
        return result.rows[0];
    }
    /**
     * FID-20251228-003: Delete an input by ID
     */
    static async deleteInput(inputId) {
        const result = await connection_1.default.query('DELETE FROM sector_unit_inputs WHERE id = $1', [inputId]);
        if (result.rowCount === 0) {
            throw new Error(`Input ${inputId} not found`);
        }
    }
    // --------------------------------------------------------------------------
    // OUTPUT QUERIES
    // --------------------------------------------------------------------------
    static async getAllOutputs() {
        const result = await connection_1.default.query('SELECT * FROM sector_unit_outputs ORDER BY sector_name, unit_type, output_type, output_name');
        return result.rows;
    }
    static async getOutputsForUnit(sectorName, unitType) {
        const result = await connection_1.default.query('SELECT * FROM sector_unit_outputs WHERE sector_name = $1 AND unit_type = $2 ORDER BY output_type, output_name', [sectorName, unitType]);
        return result.rows;
    }
    static async updateOutput(id, outputRate) {
        const result = await connection_1.default.query(`UPDATE sector_unit_outputs
       SET output_rate = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING *`, [outputRate, id]);
        return result.rows[0] || null;
    }
    static async getOutputById(id) {
        const result = await connection_1.default.query('SELECT * FROM sector_unit_outputs WHERE id = $1', [id]);
        return result.rows[0] || null;
    }
    /**
     * FID-20251228-003: Create a new output for a sector unit
     */
    static async createOutput(params) {
        const { sectorName, unitType, outputName, outputType, outputRate } = params;
        // Check for duplicate
        const existing = await connection_1.default.query(`SELECT id FROM sector_unit_outputs
       WHERE sector_name = $1 AND unit_type = $2 AND output_name = $3 AND output_type = $4`, [sectorName, unitType, outputName, outputType]);
        if (existing.rows.length > 0) {
            throw new Error(`Output ${outputName} already exists for ${sectorName} ${unitType}`);
        }
        // Insert new output
        const result = await connection_1.default.query(`INSERT INTO sector_unit_outputs (sector_name, unit_type, output_name, output_type, output_rate)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`, [sectorName, unitType, outputName, outputType, outputRate]);
        return result.rows[0];
    }
    /**
     * FID-20251228-003: Delete an output by ID
     * Prevents deleting the last output for a unit type
     */
    static async deleteOutput(outputId) {
        // Get the output to find sector_name and unit_type
        const output = await connection_1.default.query('SELECT sector_name, unit_type FROM sector_unit_outputs WHERE id = $1', [outputId]);
        if (output.rows.length === 0) {
            throw new Error(`Output ${outputId} not found`);
        }
        const { sector_name, unit_type } = output.rows[0];
        // Check if this is the last output for this unit type
        const count = await connection_1.default.query(`SELECT COUNT(*) as count FROM sector_unit_outputs
       WHERE sector_name = $1 AND unit_type = $2`, [sector_name, unit_type]);
        if (parseInt(count.rows[0].count) <= 1) {
            throw new Error(`Cannot delete the last output for ${sector_name} ${unit_type}`);
        }
        // Delete the output
        const result = await connection_1.default.query('DELETE FROM sector_unit_outputs WHERE id = $1', [outputId]);
        if (result.rowCount === 0) {
            throw new Error(`Output ${outputId} not found`);
        }
    }
    /**
     * FID-20251228-003: Get count of outputs for a specific unit
     */
    static async getOutputCountForUnit(sectorName, unitType) {
        const result = await connection_1.default.query(`SELECT COUNT(*) as count FROM sector_unit_outputs
       WHERE sector_name = $1 AND unit_type = $2`, [sectorName, unitType]);
        return parseInt(result.rows[0].count);
    }
    // --------------------------------------------------------------------------
    // PRODUCT CONFIG QUERIES
    // --------------------------------------------------------------------------
    static async getAllProducts() {
        const result = await connection_1.default.query('SELECT * FROM product_configs ORDER BY display_order');
        return result.rows;
    }
    static async getProductByName(productName) {
        const result = await connection_1.default.query('SELECT * FROM product_configs WHERE product_name = $1', [productName]);
        return result.rows[0] || null;
    }
    static async updateProduct(productName, data) {
        const fields = [];
        const values = [];
        let paramIndex = 1;
        if (data.reference_value !== undefined) {
            fields.push(`reference_value = $${paramIndex++}`);
            values.push(data.reference_value);
        }
        if (data.min_price !== undefined) {
            fields.push(`min_price = $${paramIndex++}`);
            values.push(data.min_price);
        }
        if (fields.length === 0)
            return null;
        fields.push(`updated_at = CURRENT_TIMESTAMP`);
        values.push(productName);
        const result = await connection_1.default.query(`UPDATE product_configs SET ${fields.join(', ')} WHERE product_name = $${paramIndex} RETURNING *`, values);
        return result.rows[0] || null;
    }
    // --------------------------------------------------------------------------
    // RESOURCE CONFIG QUERIES
    // --------------------------------------------------------------------------
    static async getAllResources() {
        const result = await connection_1.default.query('SELECT * FROM resource_configs ORDER BY display_order');
        return result.rows;
    }
    static async getResourceByName(resourceName) {
        const result = await connection_1.default.query('SELECT * FROM resource_configs WHERE resource_name = $1', [resourceName]);
        return result.rows[0] || null;
    }
    static async updateResource(resourceName, data) {
        if (data.base_price === undefined)
            return null;
        const result = await connection_1.default.query(`UPDATE resource_configs
       SET base_price = $1, updated_at = CURRENT_TIMESTAMP
       WHERE resource_name = $2
       RETURNING *`, [data.base_price, resourceName]);
        return result.rows[0] || null;
    }
    // --------------------------------------------------------------------------
    // UNIFIED CONFIGURATION
    // --------------------------------------------------------------------------
    /**
     * Get the full unified configuration for the API
     * This assembles all sector, product, and resource data into a single response
     */
    static async getFullConfiguration() {
        // Fetch all data in parallel
        const [sectors, unitConfigs, inputs, outputs, products, resources] = await Promise.all([
            this.getAllSectors(),
            this.getAllUnitConfigs(),
            this.getAllInputs(),
            this.getAllOutputs(),
            this.getAllProducts(),
            this.getAllResources(),
        ]);
        // Build sector map with unit configs
        const sectorMap = {};
        for (const sector of sectors) {
            const unitMap = {
                production: { isEnabled: false, baseRevenue: 0, baseCost: 0, laborCost: 0, outputRate: null, inputs: [], outputs: [] },
                retail: { isEnabled: false, baseRevenue: 0, baseCost: 0, laborCost: 0, outputRate: null, inputs: [], outputs: [] },
                service: { isEnabled: false, baseRevenue: 0, baseCost: 0, laborCost: 0, outputRate: null, inputs: [], outputs: [] },
                extraction: { isEnabled: false, baseRevenue: 0, baseCost: 0, laborCost: 0, outputRate: null, inputs: [], outputs: [] },
            };
            // Populate unit configs
            const sectorUnitConfigs = unitConfigs.filter(uc => uc.sector_name === sector.sector_name);
            for (const uc of sectorUnitConfigs) {
                unitMap[uc.unit_type] = {
                    isEnabled: uc.is_enabled,
                    baseRevenue: Number(uc.base_revenue),
                    baseCost: Number(uc.base_cost),
                    laborCost: Number(uc.labor_cost),
                    outputRate: uc.output_rate ? Number(uc.output_rate) : null,
                    inputs: [],
                    outputs: [],
                };
            }
            // Populate inputs
            const sectorInputs = inputs.filter(i => i.sector_name === sector.sector_name);
            for (const input of sectorInputs) {
                unitMap[input.unit_type].inputs.push({
                    type: input.input_type,
                    name: input.input_name,
                    rate: Number(input.consumption_rate),
                });
            }
            // Populate outputs
            const sectorOutputs = outputs.filter(o => o.sector_name === sector.sector_name);
            for (const output of sectorOutputs) {
                if (output.unit_type === 'production' || output.unit_type === 'extraction') {
                    unitMap[output.unit_type].outputs.push({
                        type: output.output_type,
                        name: output.output_name,
                        rate: Number(output.output_rate),
                    });
                }
            }
            sectorMap[sector.sector_name] = {
                displayOrder: sector.display_order,
                isProductionOnly: sector.is_production_only,
                canExtract: sector.can_extract,
                producedProduct: sector.produced_product,
                primaryResource: sector.primary_resource,
                units: unitMap,
            };
        }
        // Build product map
        const productMap = {};
        for (const product of products) {
            productMap[product.product_name] = {
                referenceValue: Number(product.reference_value),
                minPrice: Number(product.min_price),
                displayOrder: product.display_order,
            };
        }
        // Build resource map
        const resourceMap = {};
        for (const resource of resources) {
            resourceMap[resource.resource_name] = {
                basePrice: Number(resource.base_price),
                displayOrder: resource.display_order,
            };
        }
        // Generate version hash from last updated timestamps
        const allTimestamps = [
            ...sectors.map(s => s.updated_at?.getTime() || 0),
            ...unitConfigs.map(u => u.updated_at?.getTime() || 0),
            ...inputs.map(i => i.updated_at?.getTime() || 0),
            ...outputs.map(o => o.updated_at?.getTime() || 0),
            ...products.map(p => p.updated_at?.getTime() || 0),
            ...resources.map(r => r.updated_at?.getTime() || 0),
        ];
        const maxTimestamp = Math.max(...allTimestamps, 0);
        const version = `v${maxTimestamp}`;
        return {
            version,
            sectors: sectorMap,
            products: productMap,
            resources: resourceMap,
        };
    }
    /**
     * Get just the version string for cache validation
     */
    static async getConfigVersion() {
        const result = await connection_1.default.query(`
      SELECT GREATEST(
        COALESCE((SELECT MAX(updated_at) FROM sector_configs), '1970-01-01'),
        COALESCE((SELECT MAX(updated_at) FROM sector_unit_configs), '1970-01-01'),
        COALESCE((SELECT MAX(updated_at) FROM sector_unit_inputs), '1970-01-01'),
        COALESCE((SELECT MAX(updated_at) FROM sector_unit_outputs), '1970-01-01'),
        COALESCE((SELECT MAX(updated_at) FROM product_configs), '1970-01-01'),
        COALESCE((SELECT MAX(updated_at) FROM resource_configs), '1970-01-01')
      ) as max_updated
    `);
        const maxUpdated = result.rows[0]?.max_updated;
        const timestamp = maxUpdated ? new Date(maxUpdated).getTime() : 0;
        return `v${timestamp}`;
    }
}
exports.SectorConfigModel = SectorConfigModel;
