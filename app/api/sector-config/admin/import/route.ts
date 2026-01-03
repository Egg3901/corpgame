import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { SectorConfigModel } from '@/lib/models/SectorConfig';
import { SectorConfigService } from '@/lib/services/SectorConfigService';
import { getErrorMessage } from '@/lib/utils';
import { UnitType } from '@/lib/api';

interface ImportData {
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

export async function POST(req: NextRequest) {
  try {
    await requireAdmin(req);

    const body: ImportData = await req.json();
    const updated = { sectors: 0, products: 0, resources: 0, unitConfigs: 0, inputs: 0, outputs: 0 };

    // Update sectors (is_enabled)
    if (body.sectors && Array.isArray(body.sectors)) {
      for (const sector of body.sectors) {
        if (sector.sector_name && sector.is_enabled !== undefined) {
          await SectorConfigModel.updateSector(sector.sector_name, {
            is_enabled: sector.is_enabled,
          });
          updated.sectors++;
        }
      }
    }

    // Update products
    if (body.products && Array.isArray(body.products)) {
      for (const product of body.products) {
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
    if (body.resources && Array.isArray(body.resources)) {
      for (const resource of body.resources) {
        if (resource.resource_name && resource.base_price !== undefined) {
          await SectorConfigModel.updateResource(resource.resource_name, {
            base_price: resource.base_price,
          });
          updated.resources++;
        }
      }
    }

    // Update unit configs
    if (body.unitConfigs && Array.isArray(body.unitConfigs)) {
      for (const config of body.unitConfigs) {
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
    if (body.inputs && Array.isArray(body.inputs)) {
      for (const input of body.inputs) {
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
    if (body.outputs && Array.isArray(body.outputs)) {
      for (const output of body.outputs) {
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
