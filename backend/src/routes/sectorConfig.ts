/**
 * Sector Configuration API Routes
 * FID-20251228-001: Unified Sector Configuration System
 *
 * Provides endpoints for:
 * - Public: Reading unified sector configuration (cached)
 * - Admin: Updating sector configuration values
 */

import express, { Request, Response } from 'express';
import { authenticateToken, requireAdmin, AuthRequest } from '../middleware/auth';
import { SectorConfigModel, UnitType } from '../models/SectorConfig';
import { SectorConfigService } from '../services/SectorConfigService';

const router = express.Router();

// ============================================================================
// PUBLIC ENDPOINTS (No authentication required)
// ============================================================================

/**
 * GET /api/sector-config
 * Get the full unified sector configuration
 * Returns cached data with version for client-side cache validation
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const config = await SectorConfigService.getConfiguration();

    // Support ETag-based caching
    const clientVersion = req.headers['if-none-match'];
    if (clientVersion === config.version) {
      return res.status(304).send();
    }

    res.setHeader('ETag', config.version);
    res.setHeader('Cache-Control', 'public, max-age=60');
    res.json(config);
  } catch (error) {
    console.error('Failed to get sector config:', error);
    res.status(500).json({ error: 'Failed to get sector configuration' });
  }
});

/**
 * GET /api/sector-config/version
 * Get just the version hash for cache validation
 */
router.get('/version', async (req: Request, res: Response) => {
  try {
    const version = await SectorConfigService.getConfigVersion();
    res.json({ version });
  } catch (error) {
    console.error('Failed to get config version:', error);
    res.status(500).json({ error: 'Failed to get config version' });
  }
});

/**
 * GET /api/sector-config/legacy
 * Get configuration in legacy format for backwards compatibility
 */
router.get('/legacy', async (req: Request, res: Response) => {
  try {
    const legacy = await SectorConfigService.toLegacyFormat();
    res.json(legacy);
  } catch (error) {
    console.error('Failed to get legacy config:', error);
    res.status(500).json({ error: 'Failed to get legacy configuration' });
  }
});

// ============================================================================
// ADMIN ENDPOINTS (Require authentication + admin role)
// ============================================================================

// Apply authentication to all admin routes
const adminRouter = express.Router();
adminRouter.use(authenticateToken, requireAdmin);

/**
 * GET /api/sector-config/admin
 * Get full config with all raw data for admin editing
 */
adminRouter.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const [sectors, unitConfigs, inputs, outputs, products, resources] = await Promise.all([
      SectorConfigModel.getAllSectors(),
      SectorConfigModel.getAllUnitConfigs(),
      SectorConfigModel.getAllInputs(),
      SectorConfigModel.getAllOutputs(),
      SectorConfigModel.getAllProducts(),
      SectorConfigModel.getAllResources(),
    ]);

    res.json({
      sectors,
      unitConfigs,
      inputs,
      outputs,
      products,
      resources,
    });
  } catch (error) {
    console.error('Failed to get admin config:', error);
    res.status(500).json({ error: 'Failed to get admin configuration' });
  }
});

/**
 * PUT /api/sector-config/admin/sectors/:name
 * Update sector properties
 */
adminRouter.put('/sectors/:name', async (req: AuthRequest, res: Response) => {
  try {
    const { name } = req.params;
    const { is_production_only, can_extract, produced_product, primary_resource } = req.body;

    const updated = await SectorConfigModel.updateSector(name, {
      is_production_only,
      can_extract,
      produced_product,
      primary_resource,
    });

    if (!updated) {
      return res.status(404).json({ error: 'Sector not found or no changes' });
    }

    SectorConfigService.invalidateCache();
    res.json(updated);
  } catch (error) {
    console.error('Failed to update sector:', error);
    res.status(500).json({ error: 'Failed to update sector' });
  }
});

/**
 * PUT /api/sector-config/admin/unit/:sector/:unitType
 * Update unit type configuration (economics)
 */
adminRouter.put('/unit/:sector/:unitType', async (req: AuthRequest, res: Response) => {
  try {
    const { sector, unitType } = req.params;
    const validUnitTypes: UnitType[] = ['production', 'retail', 'service', 'extraction'];

    if (!validUnitTypes.includes(unitType as UnitType)) {
      return res.status(400).json({ error: 'Invalid unit type' });
    }

    const { is_enabled, base_revenue, base_cost, labor_cost, output_rate } = req.body;

    const updated = await SectorConfigModel.updateUnitConfig(sector, unitType as UnitType, {
      is_enabled,
      base_revenue: base_revenue !== undefined ? Number(base_revenue) : undefined,
      base_cost: base_cost !== undefined ? Number(base_cost) : undefined,
      labor_cost: labor_cost !== undefined ? Number(labor_cost) : undefined,
      output_rate: output_rate !== undefined ? Number(output_rate) : undefined,
    });

    if (!updated) {
      return res.status(404).json({ error: 'Unit config not found or no changes' });
    }

    SectorConfigService.invalidateCache();
    res.json(updated);
  } catch (error) {
    console.error('Failed to update unit config:', error);
    res.status(500).json({ error: 'Failed to update unit config' });
  }
});

/**
 * PUT /api/sector-config/admin/input/:id
 * Update input consumption rate
 */
adminRouter.put('/input/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { consumption_rate } = req.body;

    if (consumption_rate === undefined || isNaN(Number(consumption_rate))) {
      return res.status(400).json({ error: 'consumption_rate is required and must be a number' });
    }

    const updated = await SectorConfigModel.updateInput(Number(id), Number(consumption_rate));

    if (!updated) {
      return res.status(404).json({ error: 'Input not found' });
    }

    SectorConfigService.invalidateCache();
    res.json(updated);
  } catch (error) {
    console.error('Failed to update input:', error);
    res.status(500).json({ error: 'Failed to update input' });
  }
});

/**
 * PUT /api/sector-config/admin/output/:id
 * Update output production rate
 */
adminRouter.put('/output/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { output_rate } = req.body;

    if (output_rate === undefined || isNaN(Number(output_rate))) {
      return res.status(400).json({ error: 'output_rate is required and must be a number' });
    }

    const updated = await SectorConfigModel.updateOutput(Number(id), Number(output_rate));

    if (!updated) {
      return res.status(404).json({ error: 'Output not found' });
    }

    SectorConfigService.invalidateCache();
    res.json(updated);
  } catch (error) {
    console.error('Failed to update output:', error);
    res.status(500).json({ error: 'Failed to update output' });
  }
});

/**
 * PUT /api/sector-config/admin/products/:name
 * Update product configuration
 */
adminRouter.put('/products/:name', async (req: AuthRequest, res: Response) => {
  try {
    const { name } = req.params;
    const { reference_value, min_price } = req.body;

    const updated = await SectorConfigModel.updateProduct(name, {
      reference_value: reference_value !== undefined ? Number(reference_value) : undefined,
      min_price: min_price !== undefined ? Number(min_price) : undefined,
    });

    if (!updated) {
      return res.status(404).json({ error: 'Product not found or no changes' });
    }

    SectorConfigService.invalidateCache();
    res.json(updated);
  } catch (error) {
    console.error('Failed to update product:', error);
    res.status(500).json({ error: 'Failed to update product' });
  }
});

/**
 * PUT /api/sector-config/admin/resources/:name
 * Update resource configuration
 */
adminRouter.put('/resources/:name', async (req: AuthRequest, res: Response) => {
  try {
    const { name } = req.params;
    const { base_price } = req.body;

    if (base_price === undefined || isNaN(Number(base_price))) {
      return res.status(400).json({ error: 'base_price is required and must be a number' });
    }

    const updated = await SectorConfigModel.updateResource(name, {
      base_price: Number(base_price),
    });

    if (!updated) {
      return res.status(404).json({ error: 'Resource not found' });
    }

    SectorConfigService.invalidateCache();
    res.json(updated);
  } catch (error) {
    console.error('Failed to update resource:', error);
    res.status(500).json({ error: 'Failed to update resource' });
  }
});

// Mount admin router
router.use('/admin', adminRouter);

export default router;
