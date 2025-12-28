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

import pool from '../db/connection';

// ============================================================================
// TYPES
// ============================================================================

export type UnitType = 'production' | 'retail' | 'service' | 'extraction';

export interface SectorConfig {
  id: number;
  sector_name: string;
  display_order: number;
  is_production_only: boolean;
  can_extract: boolean;
  produced_product: string | null;
  primary_resource: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface SectorUnitConfig {
  id: number;
  sector_name: string;
  unit_type: UnitType;
  is_enabled: boolean;
  base_revenue: number;
  base_cost: number;
  labor_cost: number;
  output_rate: number | null;
  created_at: Date;
  updated_at: Date;
}

export interface SectorUnitInput {
  id: number;
  sector_name: string;
  unit_type: UnitType;
  input_type: 'resource' | 'product';
  input_name: string;
  consumption_rate: number;
  created_at: Date;
  updated_at: Date;
}

export interface SectorUnitOutput {
  id: number;
  sector_name: string;
  unit_type: UnitType;
  output_type: 'resource' | 'product';
  output_name: string;
  output_rate: number;
  created_at: Date;
  updated_at: Date;
}

export interface ProductConfig {
  id: number;
  product_name: string;
  reference_value: number;
  min_price: number;
  display_order: number;
  created_at: Date;
  updated_at: Date;
}

export interface ResourceConfig {
  id: number;
  resource_name: string;
  base_price: number;
  display_order: number;
  created_at: Date;
  updated_at: Date;
}

// Unified configuration structure for API responses
export interface UnifiedSectorConfig {
  version: string;
  sectors: Record<string, {
    displayOrder: number;
    isProductionOnly: boolean;
    canExtract: boolean;
    producedProduct: string | null;
    primaryResource: string | null;
    units: Record<UnitType, {
      isEnabled: boolean;
      baseRevenue: number;
      baseCost: number;
      laborCost: number;
      outputRate: number | null;
      inputs: Array<{ type: 'resource' | 'product'; name: string; rate: number }>;
      outputs: Array<{ type: 'resource' | 'product'; name: string; rate: number }>;
    }>;
  }>;
  products: Record<string, {
    referenceValue: number;
    minPrice: number;
    displayOrder: number;
  }>;
  resources: Record<string, {
    basePrice: number;
    displayOrder: number;
  }>;
}

// ============================================================================
// MODEL CLASS
// ============================================================================

export class SectorConfigModel {
  // --------------------------------------------------------------------------
  // SECTOR QUERIES
  // --------------------------------------------------------------------------

  static async getAllSectors(): Promise<SectorConfig[]> {
    const result = await pool.query(
      'SELECT * FROM sector_configs ORDER BY display_order'
    );
    return result.rows;
  }

  static async getSectorByName(sectorName: string): Promise<SectorConfig | null> {
    const result = await pool.query(
      'SELECT * FROM sector_configs WHERE sector_name = $1',
      [sectorName]
    );
    return result.rows[0] || null;
  }

  static async updateSector(
    sectorName: string,
    data: Partial<Pick<SectorConfig, 'is_production_only' | 'can_extract' | 'produced_product' | 'primary_resource'>>
  ): Promise<SectorConfig | null> {
    const fields: string[] = [];
    const values: (string | boolean | null)[] = [];
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

    if (fields.length === 0) return null;

    fields.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(sectorName);

    const result = await pool.query(
      `UPDATE sector_configs SET ${fields.join(', ')} WHERE sector_name = $${paramIndex} RETURNING *`,
      values
    );
    return result.rows[0] || null;
  }

  // --------------------------------------------------------------------------
  // UNIT CONFIG QUERIES
  // --------------------------------------------------------------------------

  static async getAllUnitConfigs(): Promise<SectorUnitConfig[]> {
    const result = await pool.query(
      'SELECT * FROM sector_unit_configs ORDER BY sector_name, unit_type'
    );
    return result.rows;
  }

  static async getUnitConfig(sectorName: string, unitType: UnitType): Promise<SectorUnitConfig | null> {
    const result = await pool.query(
      'SELECT * FROM sector_unit_configs WHERE sector_name = $1 AND unit_type = $2',
      [sectorName, unitType]
    );
    return result.rows[0] || null;
  }

  static async getUnitConfigsBySector(sectorName: string): Promise<SectorUnitConfig[]> {
    const result = await pool.query(
      'SELECT * FROM sector_unit_configs WHERE sector_name = $1 ORDER BY unit_type',
      [sectorName]
    );
    return result.rows;
  }

  static async updateUnitConfig(
    sectorName: string,
    unitType: UnitType,
    data: Partial<Pick<SectorUnitConfig, 'is_enabled' | 'base_revenue' | 'base_cost' | 'labor_cost' | 'output_rate'>>
  ): Promise<SectorUnitConfig | null> {
    const fields: string[] = [];
    const values: (string | boolean | number | null)[] = [];
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

    if (fields.length === 0) return null;

    fields.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(sectorName, unitType);

    const result = await pool.query(
      `UPDATE sector_unit_configs SET ${fields.join(', ')}
       WHERE sector_name = $${paramIndex} AND unit_type = $${paramIndex + 1}
       RETURNING *`,
      values
    );
    return result.rows[0] || null;
  }

  // --------------------------------------------------------------------------
  // INPUT QUERIES
  // --------------------------------------------------------------------------

  static async getAllInputs(): Promise<SectorUnitInput[]> {
    const result = await pool.query(
      'SELECT * FROM sector_unit_inputs ORDER BY sector_name, unit_type, input_type, input_name'
    );
    return result.rows;
  }

  static async getInputsForUnit(sectorName: string, unitType: UnitType): Promise<SectorUnitInput[]> {
    const result = await pool.query(
      'SELECT * FROM sector_unit_inputs WHERE sector_name = $1 AND unit_type = $2 ORDER BY input_type, input_name',
      [sectorName, unitType]
    );
    return result.rows;
  }

  static async updateInput(id: number, consumptionRate: number): Promise<SectorUnitInput | null> {
    const result = await pool.query(
      `UPDATE sector_unit_inputs
       SET consumption_rate = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING *`,
      [consumptionRate, id]
    );
    return result.rows[0] || null;
  }

  static async getInputById(id: number): Promise<SectorUnitInput | null> {
    const result = await pool.query(
      'SELECT * FROM sector_unit_inputs WHERE id = $1',
      [id]
    );
    return result.rows[0] || null;
  }

  // --------------------------------------------------------------------------
  // OUTPUT QUERIES
  // --------------------------------------------------------------------------

  static async getAllOutputs(): Promise<SectorUnitOutput[]> {
    const result = await pool.query(
      'SELECT * FROM sector_unit_outputs ORDER BY sector_name, unit_type, output_type, output_name'
    );
    return result.rows;
  }

  static async getOutputsForUnit(sectorName: string, unitType: UnitType): Promise<SectorUnitOutput[]> {
    const result = await pool.query(
      'SELECT * FROM sector_unit_outputs WHERE sector_name = $1 AND unit_type = $2 ORDER BY output_type, output_name',
      [sectorName, unitType]
    );
    return result.rows;
  }

  static async updateOutput(id: number, outputRate: number): Promise<SectorUnitOutput | null> {
    const result = await pool.query(
      `UPDATE sector_unit_outputs
       SET output_rate = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING *`,
      [outputRate, id]
    );
    return result.rows[0] || null;
  }

  static async getOutputById(id: number): Promise<SectorUnitOutput | null> {
    const result = await pool.query(
      'SELECT * FROM sector_unit_outputs WHERE id = $1',
      [id]
    );
    return result.rows[0] || null;
  }

  // --------------------------------------------------------------------------
  // PRODUCT CONFIG QUERIES
  // --------------------------------------------------------------------------

  static async getAllProducts(): Promise<ProductConfig[]> {
    const result = await pool.query(
      'SELECT * FROM product_configs ORDER BY display_order'
    );
    return result.rows;
  }

  static async getProductByName(productName: string): Promise<ProductConfig | null> {
    const result = await pool.query(
      'SELECT * FROM product_configs WHERE product_name = $1',
      [productName]
    );
    return result.rows[0] || null;
  }

  static async updateProduct(
    productName: string,
    data: Partial<Pick<ProductConfig, 'reference_value' | 'min_price'>>
  ): Promise<ProductConfig | null> {
    const fields: string[] = [];
    const values: (string | number)[] = [];
    let paramIndex = 1;

    if (data.reference_value !== undefined) {
      fields.push(`reference_value = $${paramIndex++}`);
      values.push(data.reference_value);
    }
    if (data.min_price !== undefined) {
      fields.push(`min_price = $${paramIndex++}`);
      values.push(data.min_price);
    }

    if (fields.length === 0) return null;

    fields.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(productName);

    const result = await pool.query(
      `UPDATE product_configs SET ${fields.join(', ')} WHERE product_name = $${paramIndex} RETURNING *`,
      values
    );
    return result.rows[0] || null;
  }

  // --------------------------------------------------------------------------
  // RESOURCE CONFIG QUERIES
  // --------------------------------------------------------------------------

  static async getAllResources(): Promise<ResourceConfig[]> {
    const result = await pool.query(
      'SELECT * FROM resource_configs ORDER BY display_order'
    );
    return result.rows;
  }

  static async getResourceByName(resourceName: string): Promise<ResourceConfig | null> {
    const result = await pool.query(
      'SELECT * FROM resource_configs WHERE resource_name = $1',
      [resourceName]
    );
    return result.rows[0] || null;
  }

  static async updateResource(
    resourceName: string,
    data: Partial<Pick<ResourceConfig, 'base_price'>>
  ): Promise<ResourceConfig | null> {
    if (data.base_price === undefined) return null;

    const result = await pool.query(
      `UPDATE resource_configs
       SET base_price = $1, updated_at = CURRENT_TIMESTAMP
       WHERE resource_name = $2
       RETURNING *`,
      [data.base_price, resourceName]
    );
    return result.rows[0] || null;
  }

  // --------------------------------------------------------------------------
  // UNIFIED CONFIGURATION
  // --------------------------------------------------------------------------

  /**
   * Get the full unified configuration for the API
   * This assembles all sector, product, and resource data into a single response
   */
  static async getFullConfiguration(): Promise<UnifiedSectorConfig> {
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
    const sectorMap: UnifiedSectorConfig['sectors'] = {};

    for (const sector of sectors) {
      const unitMap: Record<UnitType, UnifiedSectorConfig['sectors'][string]['units'][UnitType]> = {
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
    const productMap: UnifiedSectorConfig['products'] = {};
    for (const product of products) {
      productMap[product.product_name] = {
        referenceValue: Number(product.reference_value),
        minPrice: Number(product.min_price),
        displayOrder: product.display_order,
      };
    }

    // Build resource map
    const resourceMap: UnifiedSectorConfig['resources'] = {};
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
  static async getConfigVersion(): Promise<string> {
    const result = await pool.query(`
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
