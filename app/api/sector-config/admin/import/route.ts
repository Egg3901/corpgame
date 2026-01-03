import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { SectorConfigModel, UnitType } from '@/lib/models/SectorConfig';
import { SectorConfigService } from '@/lib/services/SectorConfigService';
import { getErrorMessage } from '@/lib/utils';

// v1 flat format (legacy)
interface ImportDataV1 {
  version?: '1.0';
  sectors?: Array<{
    sector_name: string;
    is_enabled: boolean;
  }>;
  products?: Array<{
    product_name: string;
    reference_value: number;
    min_price: number;
  }>;
  resources?: Array<{
    resource_name: string;
    base_price: number;
  }>;
  unitConfigs?: Array<{
    sector_name: string;
    unit_type: UnitType;
    is_enabled: boolean;
    base_revenue: number;
    base_cost: number;
    labor_cost: number;
    output_rate: number | null;
  }>;
  inputs?: Array<{
    id: number;
    sector_name: string;
    unit_type: UnitType;
    input_type: 'resource' | 'product';
    input_name: string;
    consumption_rate: number;
  }>;
  outputs?: Array<{
    id: number;
    sector_name: string;
    unit_type: UnitType;
    output_type: 'resource' | 'product';
    output_name: string;
    output_rate: number;
  }>;
}

// v2 nested format (new)
interface ImportDataV2 {
  version: '2.0';
  sectors: Array<{
    sector_name: string;
    is_enabled?: boolean;
    units: Record<string, {
      is_enabled: boolean;
      base_revenue: number;
      base_cost: number;
      labor_cost: number;
      output_rate: number | null;
      inputs: Array<{ input_name: string; input_type: string; consumption_rate: number }>;
      outputs: Array<{ output_name: string; output_type: string; output_rate: number }>;
    }>;
  }>;
  products?: Array<{
    product_name: string;
    reference_value: number;
    min_price: number;
  }>;
  resources?: Array<{
    resource_name: string;
    base_price: number;
  }>;
}

type ImportData = ImportDataV1 | ImportDataV2;

export async function POST(req: NextRequest) {
  try {
    await requireAdmin(req);

    const body: ImportData = await req.json();
    const updated = { sectors: 0, products: 0, resources: 0, unitConfigs: 0, inputs: 0, outputs: 0 };

    // Check if v2 format (nested)
    if (body.version === '2.0') {
      const v2Body = body as ImportDataV2;

      // Process nested sectors
      if (v2Body.sectors && Array.isArray(v2Body.sectors)) {
        for (const sector of v2Body.sectors) {
          if (!sector.sector_name) continue;

          // Update sector is_enabled if provided
          if (sector.is_enabled !== undefined) {
            await SectorConfigModel.updateSector(sector.sector_name, {
              is_enabled: sector.is_enabled,
            });
            updated.sectors++;
          }

          // Process unit configs
          if (sector.units) {
            for (const [unitType, unitData] of Object.entries(sector.units)) {
              // Update unit config economics
              await SectorConfigModel.updateUnitConfig(sector.sector_name, unitType as UnitType, {
                is_enabled: unitData.is_enabled,
                base_revenue: unitData.base_revenue,
                base_cost: unitData.base_cost,
                labor_cost: unitData.labor_cost,
                output_rate: unitData.output_rate,
              });
              updated.unitConfigs++;

              // Update inputs by matching sector_name, unit_type, and input_name
              if (unitData.inputs && Array.isArray(unitData.inputs)) {
                const existingInputs = await SectorConfigModel.getInputsForUnit(sector.sector_name, unitType as UnitType);
                for (const importInput of unitData.inputs) {
                  const existing = existingInputs.find(
                    e => e.input_name === importInput.input_name && e.input_type === importInput.input_type
                  );
                  if (existing) {
                    await SectorConfigModel.updateInput(existing.id, importInput.consumption_rate);
                    updated.inputs++;
                  }
                }
              }

              // Update outputs by matching sector_name, unit_type, and output_name
              if (unitData.outputs && Array.isArray(unitData.outputs)) {
                const existingOutputs = await SectorConfigModel.getOutputsForUnit(sector.sector_name, unitType as UnitType);
                for (const importOutput of unitData.outputs) {
                  const existing = existingOutputs.find(
                    e => e.output_name === importOutput.output_name && e.output_type === importOutput.output_type
                  );
                  if (existing) {
                    await SectorConfigModel.updateOutput(existing.id, importOutput.output_rate);
                    updated.outputs++;
                  }
                }
              }
            }
          }
        }
      }

      // Update products
      if (v2Body.products && Array.isArray(v2Body.products)) {
        for (const product of v2Body.products) {
          if (product.product_name) {
            await SectorConfigModel.updateProduct(product.product_name, {
              reference_value: product.reference_value,
              min_price: product.min_price,
            });
            updated.products++;
          }
        }
      }

      // Update resources
      if (v2Body.resources && Array.isArray(v2Body.resources)) {
        for (const resource of v2Body.resources) {
          if (resource.resource_name && resource.base_price !== undefined) {
            await SectorConfigModel.updateResource(resource.resource_name, {
              base_price: resource.base_price,
            });
            updated.resources++;
          }
        }
      }
    } else {
      // v1 flat format (legacy)
      const v1Body = body as ImportDataV1;

      // Update sectors (is_enabled)
      if (v1Body.sectors && Array.isArray(v1Body.sectors)) {
        for (const sector of v1Body.sectors) {
          if (sector.sector_name && sector.is_enabled !== undefined) {
            await SectorConfigModel.updateSector(sector.sector_name, {
              is_enabled: sector.is_enabled,
            });
            updated.sectors++;
          }
        }
      }

      // Update products
      if (v1Body.products && Array.isArray(v1Body.products)) {
        for (const product of v1Body.products) {
          if (product.product_name) {
            await SectorConfigModel.updateProduct(product.product_name, {
              reference_value: product.reference_value,
              min_price: product.min_price,
            });
            updated.products++;
          }
        }
      }

      // Update resources
      if (v1Body.resources && Array.isArray(v1Body.resources)) {
        for (const resource of v1Body.resources) {
          if (resource.resource_name && resource.base_price !== undefined) {
            await SectorConfigModel.updateResource(resource.resource_name, {
              base_price: resource.base_price,
            });
            updated.resources++;
          }
        }
      }

      // Update unit configs
      if (v1Body.unitConfigs && Array.isArray(v1Body.unitConfigs)) {
        for (const config of v1Body.unitConfigs) {
          if (config.sector_name && config.unit_type) {
            await SectorConfigModel.updateUnitConfig(config.sector_name, config.unit_type, {
              is_enabled: config.is_enabled,
              base_revenue: config.base_revenue,
              base_cost: config.base_cost,
              labor_cost: config.labor_cost,
              output_rate: config.output_rate,
            });
            updated.unitConfigs++;
          }
        }
      }

      // Update inputs (consumption rates)
      if (v1Body.inputs && Array.isArray(v1Body.inputs)) {
        for (const input of v1Body.inputs) {
          if (input.id && input.consumption_rate !== undefined) {
            try {
              await SectorConfigModel.updateInput(input.id, input.consumption_rate);
              updated.inputs++;
            } catch {
              // Input may not exist, skip
            }
          }
        }
      }

      // Update outputs (output rates)
      if (v1Body.outputs && Array.isArray(v1Body.outputs)) {
        for (const output of v1Body.outputs) {
          if (output.id && output.output_rate !== undefined) {
            try {
              await SectorConfigModel.updateOutput(output.id, output.output_rate);
              updated.outputs++;
            } catch {
              // Output may not exist, skip
            }
          }
        }
      }
    }

    // Invalidate cache
    SectorConfigService.invalidateCache();

    const parts = [];
    if (updated.sectors > 0) parts.push(`${updated.sectors} sectors`);
    if (updated.products > 0) parts.push(`${updated.products} products`);
    if (updated.resources > 0) parts.push(`${updated.resources} resources`);
    if (updated.unitConfigs > 0) parts.push(`${updated.unitConfigs} unit configs`);
    if (updated.inputs > 0) parts.push(`${updated.inputs} inputs`);
    if (updated.outputs > 0) parts.push(`${updated.outputs} outputs`);

    return NextResponse.json({
      message: `Imported: ${parts.join(', ') || 'nothing'}`,
      updated,
    });
  } catch (error: unknown) {
    const errorMessage = getErrorMessage(error);
    if (errorMessage === 'Unauthorized' || errorMessage === 'Forbidden') {
      return NextResponse.json({ error: errorMessage }, { status: 401 });
    }
    console.error('Failed to import config:', error);
    return NextResponse.json({ error: getErrorMessage(error, 'Failed to import configuration') }, { status: 500 });
  }
}
