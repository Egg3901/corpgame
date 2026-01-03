import { getDb, getNextId } from '../db/mongo';

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
    return await getDb().collection<SectorConfig>('sector_configs')
      .find({})
      .sort({ display_order: 1 })
      .toArray();
  }

  static async getSectorByName(sectorName: string): Promise<SectorConfig | null> {
    return await getDb().collection<SectorConfig>('sector_configs').findOne({ sector_name: sectorName });
  }

  static async updateSector(
    sectorName: string,
    data: Partial<Pick<SectorConfig, 'is_production_only' | 'can_extract' | 'produced_product' | 'primary_resource'>>
  ): Promise<SectorConfig | null> {
    if (Object.keys(data).length === 0) return null;

    const result = await getDb().collection<SectorConfig>('sector_configs').findOneAndUpdate(
      { sector_name: sectorName },
      { 
        $set: { ...data, updated_at: new Date() } 
      },
      { returnDocument: 'after' }
    );
    return result || null;
  }

  // --------------------------------------------------------------------------
  // UNIT CONFIG QUERIES
  // --------------------------------------------------------------------------

  static async getAllUnitConfigs(): Promise<SectorUnitConfig[]> {
    return await getDb().collection<SectorUnitConfig>('sector_unit_configs')
      .find({})
      .sort({ sector_name: 1, unit_type: 1 })
      .toArray();
  }

  static async getUnitConfig(sectorName: string, unitType: UnitType): Promise<SectorUnitConfig | null> {
    return await getDb().collection<SectorUnitConfig>('sector_unit_configs').findOne({
      sector_name: sectorName,
      unit_type: unitType
    });
  }

  static async getUnitConfigsBySector(sectorName: string): Promise<SectorUnitConfig[]> {
    return await getDb().collection<SectorUnitConfig>('sector_unit_configs')
      .find({ sector_name: sectorName })
      .sort({ unit_type: 1 })
      .toArray();
  }

  static async updateUnitConfig(
    sectorName: string,
    unitType: UnitType,
    data: Partial<Pick<SectorUnitConfig, 'is_enabled' | 'base_revenue' | 'base_cost' | 'labor_cost' | 'output_rate'>>
  ): Promise<SectorUnitConfig | null> {
    if (Object.keys(data).length === 0) return null;

    const result = await getDb().collection<SectorUnitConfig>('sector_unit_configs').findOneAndUpdate(
      { sector_name: sectorName, unit_type: unitType },
      { 
        $set: { ...data, updated_at: new Date() } 
      },
      { returnDocument: 'after' }
    );
    return result || null;
  }

  // --------------------------------------------------------------------------
  // INPUT QUERIES
  // --------------------------------------------------------------------------

  static async getAllInputs(): Promise<SectorUnitInput[]> {
    return await getDb().collection<SectorUnitInput>('sector_unit_inputs')
      .find({})
      .sort({ sector_name: 1, unit_type: 1, input_type: 1, input_name: 1 })
      .toArray();
  }

  static async getInputsForUnit(sectorName: string, unitType: UnitType): Promise<SectorUnitInput[]> {
    return await getDb().collection<SectorUnitInput>('sector_unit_inputs')
      .find({ sector_name: sectorName, unit_type: unitType })
      .sort({ input_type: 1, input_name: 1 })
      .toArray();
  }

  static async updateInput(id: number, consumptionRate: number): Promise<SectorUnitInput | null> {
    const result = await getDb().collection<SectorUnitInput>('sector_unit_inputs').findOneAndUpdate(
      { id },
      { 
        $set: { consumption_rate: consumptionRate, updated_at: new Date() } 
      },
      { returnDocument: 'after' }
    );
    return result || null;
  }

  static async getInputById(id: number): Promise<SectorUnitInput | null> {
    return await getDb().collection<SectorUnitInput>('sector_unit_inputs').findOne({ id });
  }

  static async createInput(params: {
    sectorName: string;
    unitType: UnitType;
    inputName: string;
    inputType: 'resource' | 'product';
    consumptionRate: number;
  }): Promise<SectorUnitInput> {
    const { sectorName, unitType, inputName, inputType, consumptionRate } = params;
    const db = getDb();

    // Check for duplicate
    const existing = await db.collection<SectorUnitInput>('sector_unit_inputs').findOne({
      sector_name: sectorName,
      unit_type: unitType,
      input_name: inputName,
      input_type: inputType
    });

    if (existing) {
      throw new Error(`Input ${inputName} already exists for ${sectorName} ${unitType}`);
    }

    const id = await getNextId('sector_unit_inputs_id');
    const now = new Date();

    const doc: SectorUnitInput = {
      id,
      sector_name: sectorName,
      unit_type: unitType,
      input_name: inputName,
      input_type: inputType,
      consumption_rate: consumptionRate,
      created_at: now,
      updated_at: now,
    };

    await db.collection<SectorUnitInput>('sector_unit_inputs').insertOne(doc);
    return doc;
  }

  static async deleteInput(inputId: number): Promise<void> {
    const result = await getDb().collection('sector_unit_inputs').deleteOne({ id: inputId });
    if (result.deletedCount === 0) {
      throw new Error(`Input ${inputId} not found`);
    }
  }

  // --------------------------------------------------------------------------
  // OUTPUT QUERIES
  // --------------------------------------------------------------------------

  static async getAllOutputs(): Promise<SectorUnitOutput[]> {
    return await getDb().collection<SectorUnitOutput>('sector_unit_outputs')
      .find({})
      .sort({ sector_name: 1, unit_type: 1, output_type: 1, output_name: 1 })
      .toArray();
  }

  static async getOutputsForUnit(sectorName: string, unitType: UnitType): Promise<SectorUnitOutput[]> {
    return await getDb().collection<SectorUnitOutput>('sector_unit_outputs')
      .find({ sector_name: sectorName, unit_type: unitType })
      .sort({ output_type: 1, output_name: 1 })
      .toArray();
  }

  static async updateOutput(id: number, outputRate: number): Promise<SectorUnitOutput | null> {
    const result = await getDb().collection<SectorUnitOutput>('sector_unit_outputs').findOneAndUpdate(
      { id },
      { 
        $set: { output_rate: outputRate, updated_at: new Date() } 
      },
      { returnDocument: 'after' }
    );
    return result || null;
  }

  static async getOutputById(id: number): Promise<SectorUnitOutput | null> {
    return await getDb().collection<SectorUnitOutput>('sector_unit_outputs').findOne({ id });
  }

  static async createOutput(params: {
    sectorName: string;
    unitType: UnitType;
    outputName: string;
    outputType: 'resource' | 'product';
    outputRate: number;
  }): Promise<SectorUnitOutput> {
    const { sectorName, unitType, outputName, outputType, outputRate } = params;
    const db = getDb();

    // Check for duplicate
    const existing = await db.collection<SectorUnitOutput>('sector_unit_outputs').findOne({
      sector_name: sectorName,
      unit_type: unitType,
      output_name: outputName,
      output_type: outputType
    });

    if (existing) {
      throw new Error(`Output ${outputName} already exists for ${sectorName} ${unitType}`);
    }

    const id = await getNextId('sector_unit_outputs_id');
    const now = new Date();

    const doc: SectorUnitOutput = {
      id,
      sector_name: sectorName,
      unit_type: unitType,
      output_name: outputName,
      output_type: outputType,
      output_rate: outputRate,
      created_at: now,
      updated_at: now,
    };

    await db.collection<SectorUnitOutput>('sector_unit_outputs').insertOne(doc);
    return doc;
  }

  static async deleteOutput(outputId: number): Promise<void> {
    const db = getDb();
    
    // Get the output to find sector_name and unit_type
    const output = await db.collection<SectorUnitOutput>('sector_unit_outputs').findOne({ id: outputId });

    if (!output) {
      throw new Error(`Output ${outputId} not found`);
    }

    const { sector_name, unit_type } = output;

    // Check if this is the last output for this unit type
    const count = await db.collection('sector_unit_outputs').countDocuments({
      sector_name,
      unit_type
    });

    if (count <= 1) {
      throw new Error(`Cannot delete the last output for ${sector_name} ${unit_type}`);
    }

    const result = await db.collection('sector_unit_outputs').deleteOne({ id: outputId });
    if (result.deletedCount === 0) {
      throw new Error(`Output ${outputId} not found`);
    }
  }

  static async getOutputCountForUnit(sectorName: string, unitType: UnitType): Promise<number> {
    return await getDb().collection('sector_unit_outputs').countDocuments({
      sector_name: sectorName,
      unit_type: unitType
    });
  }

  // --------------------------------------------------------------------------
  // PRODUCT CONFIG QUERIES
  // --------------------------------------------------------------------------

  static async getAllProducts(): Promise<ProductConfig[]> {
    return await getDb().collection<ProductConfig>('product_configs')
      .find({})
      .sort({ display_order: 1 })
      .toArray();
  }

  static async getProductByName(productName: string): Promise<ProductConfig | null> {
    return await getDb().collection<ProductConfig>('product_configs').findOne({ product_name: productName });
  }

  static async updateProduct(
    productName: string,
    data: Partial<Pick<ProductConfig, 'reference_value' | 'min_price'>>
  ): Promise<ProductConfig | null> {
    if (Object.keys(data).length === 0) return null;

    const result = await getDb().collection<ProductConfig>('product_configs').findOneAndUpdate(
      { product_name: productName },
      { 
        $set: { ...data, updated_at: new Date() } 
      },
      { returnDocument: 'after' }
    );
    return result || null;
  }

  // --------------------------------------------------------------------------
  // RESOURCE CONFIG QUERIES
  // --------------------------------------------------------------------------

  static async getAllResources(): Promise<ResourceConfig[]> {
    return await getDb().collection<ResourceConfig>('resource_configs')
      .find({})
      .sort({ display_order: 1 })
      .toArray();
  }

  static async getResourceByName(resourceName: string): Promise<ResourceConfig | null> {
    return await getDb().collection<ResourceConfig>('resource_configs').findOne({ resource_name: resourceName });
  }

  static async updateResource(
    resourceName: string,
    data: Partial<Pick<ResourceConfig, 'base_price'>>
  ): Promise<ResourceConfig | null> {
    if (data.base_price === undefined) return null;

    const result = await getDb().collection<ResourceConfig>('resource_configs').findOneAndUpdate(
      { resource_name: resourceName },
      { 
        $set: { base_price: data.base_price, updated_at: new Date() } 
      },
      { returnDocument: 'after' }
    );
    return result || null;
  }

  // --------------------------------------------------------------------------
  // UNIFIED CONFIGURATION
  // --------------------------------------------------------------------------

  static async getFullConfiguration(): Promise<UnifiedSectorConfig> {
    const [sectors, unitConfigs, inputs, outputs, products, resources] = await Promise.all([
      this.getAllSectors(),
      this.getAllUnitConfigs(),
      this.getAllInputs(),
      this.getAllOutputs(),
      this.getAllProducts(),
      this.getAllResources(),
    ]);

    const sectorMap: UnifiedSectorConfig['sectors'] = {};

    for (const sector of sectors) {
      const unitMap: Record<UnitType, UnifiedSectorConfig['sectors'][string]['units'][UnitType]> = {
        production: { isEnabled: false, baseRevenue: 0, baseCost: 0, laborCost: 0, outputRate: null, inputs: [], outputs: [] },
        retail: { isEnabled: false, baseRevenue: 0, baseCost: 0, laborCost: 0, outputRate: null, inputs: [], outputs: [] },
        service: { isEnabled: false, baseRevenue: 0, baseCost: 0, laborCost: 0, outputRate: null, inputs: [], outputs: [] },
        extraction: { isEnabled: false, baseRevenue: 0, baseCost: 0, laborCost: 0, outputRate: null, inputs: [], outputs: [] },
      };

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

      const sectorInputs = inputs.filter(i => i.sector_name === sector.sector_name);
      for (const input of sectorInputs) {
        unitMap[input.unit_type].inputs.push({
          type: input.input_type,
          name: input.input_name,
          rate: Number(input.consumption_rate),
        });
      }

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

    const productMap: UnifiedSectorConfig['products'] = {};
    for (const product of products) {
      productMap[product.product_name] = {
        referenceValue: Number(product.reference_value),
        minPrice: Number(product.min_price),
        displayOrder: product.display_order,
      };
    }

    const resourceMap: UnifiedSectorConfig['resources'] = {};
    for (const resource of resources) {
      resourceMap[resource.resource_name] = {
        basePrice: Number(resource.base_price),
        displayOrder: resource.display_order,
      };
    }

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

  static async createNewVersion(config: UnifiedSectorConfig, reason: string): Promise<void> {
    const db = getDb();
    
    // This is a bulk update operation.
    // Strategy:
    // 1. Update/Insert Sectors
    // 2. Update/Insert Unit Configs
    // 3. Update/Insert Inputs/Outputs (this is tricky, might need to clear and recreate or diff)
    // 4. Update/Insert Products
    // 5. Update/Insert Resources

    // 1. Sectors
    for (const [sectorName, sectorData] of Object.entries(config.sectors)) {
      await db.collection<SectorConfig>('sector_configs').updateOne(
        { sector_name: sectorName },
        { 
          $set: {
            display_order: sectorData.displayOrder,
            is_production_only: sectorData.isProductionOnly,
            can_extract: sectorData.canExtract,
            produced_product: sectorData.producedProduct,
            primary_resource: sectorData.primaryResource,
            updated_at: new Date()
          },
          $setOnInsert: {
            id: await getNextId('sector_configs_id'),
            sector_name: sectorName,
            created_at: new Date()
          }
        },
        { upsert: true }
      );

      // 2. Unit Configs
      for (const [unitType, unitData] of Object.entries(sectorData.units)) {
        await db.collection<SectorUnitConfig>('sector_unit_configs').updateOne(
          { sector_name: sectorName, unit_type: unitType as UnitType },
          {
            $set: {
              is_enabled: unitData.isEnabled,
              base_revenue: unitData.baseRevenue,
              base_cost: unitData.baseCost,
              labor_cost: unitData.laborCost,
              output_rate: unitData.outputRate,
              updated_at: new Date()
            },
            $setOnInsert: {
              id: await getNextId('sector_unit_configs_id'),
              created_at: new Date()
            }
          },
          { upsert: true }
        );

        // 3. Inputs (Replace strategy for simplicity: delete all for this unit, then insert new)
        await db.collection('sector_unit_inputs').deleteMany({ sector_name: sectorName, unit_type: unitType });
        if (unitData.inputs && unitData.inputs.length > 0) {
          const inputs = [];
          for (const input of unitData.inputs) {
            inputs.push({
              id: await getNextId('sector_unit_inputs_id'),
              sector_name: sectorName,
              unit_type: unitType,
              input_name: input.name,
              input_type: input.type,
              consumption_rate: input.rate,
              created_at: new Date(),
              updated_at: new Date()
            });
          }
          if (inputs.length > 0) {
             await db.collection('sector_unit_inputs').insertMany(inputs);
          }
        }

        // Outputs (Replace strategy)
        await db.collection('sector_unit_outputs').deleteMany({ sector_name: sectorName, unit_type: unitType });
        if (unitData.outputs && unitData.outputs.length > 0) {
           const outputs = [];
           for (const output of unitData.outputs) {
             outputs.push({
               id: await getNextId('sector_unit_outputs_id'),
               sector_name: sectorName,
               unit_type: unitType,
               output_name: output.name,
               output_type: output.type,
               output_rate: output.rate,
               created_at: new Date(),
               updated_at: new Date()
             });
           }
           if (outputs.length > 0) {
             await db.collection('sector_unit_outputs').insertMany(outputs);
           }
        }
      }
    }

    // 4. Products
    if (config.products) {
      for (const [productName, productData] of Object.entries(config.products)) {
        await db.collection<ProductConfig>('product_configs').updateOne(
          { product_name: productName },
          {
            $set: {
              reference_value: productData.referenceValue,
              min_price: productData.minPrice,
              display_order: productData.displayOrder,
              updated_at: new Date()
            },
            $setOnInsert: {
               id: await getNextId('product_configs_id'),
               created_at: new Date()
            }
          },
          { upsert: true }
        );
      }
    }

    // 5. Resources
    if (config.resources) {
      for (const [resourceName, resourceData] of Object.entries(config.resources)) {
        await db.collection<ResourceConfig>('resource_configs').updateOne(
          { resource_name: resourceName },
          {
             $set: {
               base_price: resourceData.basePrice,
               display_order: resourceData.displayOrder,
               updated_at: new Date()
             },
             $setOnInsert: {
               id: await getNextId('resource_configs_id'),
               created_at: new Date()
             }
          },
          { upsert: true }
        );
      }
    }
  }

  static async getConfigVersion(): Promise<string> {
    const db = getDb();
    
    // Helper to get max updated_at
    const getMaxUpdated = async (collectionName: string): Promise<number> => {
      const result = await db.collection(collectionName)
        .find({}, { projection: { updated_at: 1 } })
        .sort({ updated_at: -1 })
        .limit(1)
        .toArray();
      return result.length > 0 && result[0].updated_at ? new Date(result[0].updated_at).getTime() : 0;
    };

    const timestamps = await Promise.all([
      getMaxUpdated('sector_configs'),
      getMaxUpdated('sector_unit_configs'),
      getMaxUpdated('sector_unit_inputs'),
      getMaxUpdated('sector_unit_outputs'),
      getMaxUpdated('product_configs'),
      getMaxUpdated('resource_configs')
    ]);

    const maxTimestamp = Math.max(...timestamps, 0);
    return `v${maxTimestamp}`;
  }
}
