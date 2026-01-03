"use strict";
/**
 * Sector Configuration API Routes
 * FID-20251228-001: Unified Sector Configuration System
 *
 * Provides endpoints for:
 * - Public: Reading unified sector configuration (cached)
 * - Admin: Updating sector configuration values
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_1 = require("../middleware/auth");
const SectorConfig_1 = require("../models/SectorConfig");
const SectorConfigService_1 = require("../services/SectorConfigService");
const router = express_1.default.Router();
// ============================================================================
// PUBLIC ENDPOINTS (No authentication required)
// ============================================================================
/**
 * GET /api/sector-config
 * Get the full unified sector configuration
 * Returns cached data with version for client-side cache validation
 */
router.get('/', async (req, res) => {
    try {
        const config = await SectorConfigService_1.SectorConfigService.getConfiguration();
        // Support ETag-based caching
        const clientVersion = req.headers['if-none-match'];
        if (clientVersion === config.version) {
            return res.status(304).send();
        }
        res.setHeader('ETag', config.version);
        res.setHeader('Cache-Control', 'public, max-age=60');
        res.json(config);
    }
    catch (error) {
        console.error('Failed to get sector config:', error);
        res.status(500).json({ error: 'Failed to get sector configuration' });
    }
});
/**
 * GET /api/sector-config/version
 * Get just the version hash for cache validation
 */
router.get('/version', async (req, res) => {
    try {
        const version = await SectorConfigService_1.SectorConfigService.getConfigVersion();
        res.json({ version });
    }
    catch (error) {
        console.error('Failed to get config version:', error);
        res.status(500).json({ error: 'Failed to get config version' });
    }
});
/**
 * GET /api/sector-config/legacy
 * Get configuration in legacy format for backwards compatibility
 */
router.get('/legacy', async (req, res) => {
    try {
        const legacy = await SectorConfigService_1.SectorConfigService.toLegacyFormat();
        res.json(legacy);
    }
    catch (error) {
        console.error('Failed to get legacy config:', error);
        res.status(500).json({ error: 'Failed to get legacy configuration' });
    }
});
// ============================================================================
// ADMIN ENDPOINTS (Require authentication + admin role)
// ============================================================================
// Apply authentication to all admin routes
const adminRouter = express_1.default.Router();
adminRouter.use(auth_1.authenticateToken, auth_1.requireAdmin);
/**
 * GET /api/sector-config/admin
 * Get full config with all raw data for admin editing
 */
adminRouter.get('/', async (req, res) => {
    try {
        const [sectors, unitConfigs, inputs, outputs, products, resources] = await Promise.all([
            SectorConfig_1.SectorConfigModel.getAllSectors(),
            SectorConfig_1.SectorConfigModel.getAllUnitConfigs(),
            SectorConfig_1.SectorConfigModel.getAllInputs(),
            SectorConfig_1.SectorConfigModel.getAllOutputs(),
            SectorConfig_1.SectorConfigModel.getAllProducts(),
            SectorConfig_1.SectorConfigModel.getAllResources(),
        ]);
        res.json({
            sectors,
            unitConfigs,
            inputs,
            outputs,
            products,
            resources,
        });
    }
    catch (error) {
        console.error('Failed to get admin config:', error);
        res.status(500).json({ error: 'Failed to get admin configuration' });
    }
});
/**
 * PUT /api/sector-config/admin/sectors/:name
 * Update sector properties
 */
adminRouter.put('/sectors/:name', async (req, res) => {
    try {
        const { name } = req.params;
        const { is_production_only, can_extract, produced_product, primary_resource } = req.body;
        const updated = await SectorConfig_1.SectorConfigModel.updateSector(name, {
            is_production_only,
            can_extract,
            produced_product,
            primary_resource,
        });
        if (!updated) {
            return res.status(404).json({ error: 'Sector not found or no changes' });
        }
        SectorConfigService_1.SectorConfigService.invalidateCache();
        res.json(updated);
    }
    catch (error) {
        console.error('Failed to update sector:', error);
        res.status(500).json({ error: 'Failed to update sector' });
    }
});
/**
 * PUT /api/sector-config/admin/unit/:sector/:unitType
 * Update unit type configuration (economics)
 */
adminRouter.put('/unit/:sector/:unitType', async (req, res) => {
    try {
        const { sector, unitType } = req.params;
        const validUnitTypes = ['production', 'retail', 'service', 'extraction'];
        if (!validUnitTypes.includes(unitType)) {
            return res.status(400).json({ error: 'Invalid unit type' });
        }
        const { is_enabled, base_revenue, base_cost, labor_cost, output_rate } = req.body;
        const updated = await SectorConfig_1.SectorConfigModel.updateUnitConfig(sector, unitType, {
            is_enabled,
            base_revenue: base_revenue !== undefined ? Number(base_revenue) : undefined,
            base_cost: base_cost !== undefined ? Number(base_cost) : undefined,
            labor_cost: labor_cost !== undefined ? Number(labor_cost) : undefined,
            output_rate: output_rate !== undefined ? Number(output_rate) : undefined,
        });
        if (!updated) {
            return res.status(404).json({ error: 'Unit config not found or no changes' });
        }
        SectorConfigService_1.SectorConfigService.invalidateCache();
        res.json(updated);
    }
    catch (error) {
        console.error('Failed to update unit config:', error);
        res.status(500).json({ error: 'Failed to update unit config' });
    }
});
/**
 * PUT /api/sector-config/admin/input/:id
 * Update input consumption rate
 */
adminRouter.put('/input/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { consumption_rate } = req.body;
        if (consumption_rate === undefined || isNaN(Number(consumption_rate))) {
            return res.status(400).json({ error: 'consumption_rate is required and must be a number' });
        }
        const updated = await SectorConfig_1.SectorConfigModel.updateInput(Number(id), Number(consumption_rate));
        if (!updated) {
            return res.status(404).json({ error: 'Input not found' });
        }
        SectorConfigService_1.SectorConfigService.invalidateCache();
        res.json(updated);
    }
    catch (error) {
        console.error('Failed to update input:', error);
        res.status(500).json({ error: 'Failed to update input' });
    }
});
/**
 * PUT /api/sector-config/admin/output/:id
 * Update output production rate
 */
adminRouter.put('/output/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { output_rate } = req.body;
        if (output_rate === undefined || isNaN(Number(output_rate))) {
            return res.status(400).json({ error: 'output_rate is required and must be a number' });
        }
        const updated = await SectorConfig_1.SectorConfigModel.updateOutput(Number(id), Number(output_rate));
        if (!updated) {
            return res.status(404).json({ error: 'Output not found' });
        }
        SectorConfigService_1.SectorConfigService.invalidateCache();
        res.json(updated);
    }
    catch (error) {
        console.error('Failed to update output:', error);
        res.status(500).json({ error: 'Failed to update output' });
    }
});
/**
 * PUT /api/sector-config/admin/products/:name
 * Update product configuration
 */
adminRouter.put('/products/:name', async (req, res) => {
    try {
        const { name } = req.params;
        const { reference_value, min_price } = req.body;
        const updated = await SectorConfig_1.SectorConfigModel.updateProduct(name, {
            reference_value: reference_value !== undefined ? Number(reference_value) : undefined,
            min_price: min_price !== undefined ? Number(min_price) : undefined,
        });
        if (!updated) {
            return res.status(404).json({ error: 'Product not found or no changes' });
        }
        SectorConfigService_1.SectorConfigService.invalidateCache();
        res.json(updated);
    }
    catch (error) {
        console.error('Failed to update product:', error);
        res.status(500).json({ error: 'Failed to update product' });
    }
});
/**
 * PUT /api/sector-config/admin/resources/:name
 * Update resource configuration
 */
adminRouter.put('/resources/:name', async (req, res) => {
    try {
        const { name } = req.params;
        const { base_price } = req.body;
        if (base_price === undefined || isNaN(Number(base_price))) {
            return res.status(400).json({ error: 'base_price is required and must be a number' });
        }
        const updated = await SectorConfig_1.SectorConfigModel.updateResource(name, {
            base_price: Number(base_price),
        });
        if (!updated) {
            return res.status(404).json({ error: 'Resource not found' });
        }
        SectorConfigService_1.SectorConfigService.invalidateCache();
        res.json(updated);
    }
    catch (error) {
        console.error('Failed to update resource:', error);
        res.status(500).json({ error: 'Failed to update resource' });
    }
});
// ============================================================================
// FID-20251228-003: CRUD ENDPOINTS FOR INPUTS/OUTPUTS
// ============================================================================
/**
 * POST /api/sector-config/admin/input
 * Create a new input for a sector unit
 */
adminRouter.post('/input', async (req, res) => {
    try {
        const { sectorName, unitType, inputName, inputType, consumptionRate } = req.body;
        // Validation
        if (!sectorName || !unitType || !inputName || !inputType || consumptionRate === undefined) {
            return res.status(400).json({ error: 'Missing required fields: sectorName, unitType, inputName, inputType, consumptionRate' });
        }
        if (consumptionRate <= 0) {
            return res.status(400).json({ error: 'Consumption rate must be positive' });
        }
        if (!['resource', 'product'].includes(inputType)) {
            return res.status(400).json({ error: 'Input type must be resource or product' });
        }
        const validUnitTypes = ['production', 'retail', 'service', 'extraction'];
        if (!validUnitTypes.includes(unitType)) {
            return res.status(400).json({ error: 'Invalid unit type' });
        }
        const created = await SectorConfig_1.SectorConfigModel.createInput({
            sectorName,
            unitType: unitType,
            inputName,
            inputType,
            consumptionRate: Number(consumptionRate),
        });
        SectorConfigService_1.SectorConfigService.invalidateCache();
        res.status(201).json({ id: created.id, message: 'Input created successfully', input: created });
    }
    catch (error) {
        console.error('Failed to create input:', error);
        res.status(500).json({ error: error.message });
    }
});
/**
 * DELETE /api/sector-config/admin/input/:id
 * Delete an input by ID
 */
adminRouter.delete('/input/:id', async (req, res) => {
    try {
        const inputId = parseInt(req.params.id);
        if (isNaN(inputId)) {
            return res.status(400).json({ error: 'Invalid input ID' });
        }
        await SectorConfig_1.SectorConfigModel.deleteInput(inputId);
        SectorConfigService_1.SectorConfigService.invalidateCache();
        res.json({ message: 'Input deleted successfully' });
    }
    catch (error) {
        console.error('Failed to delete input:', error);
        res.status(500).json({ error: error.message });
    }
});
/**
 * POST /api/sector-config/admin/output
 * Create a new output for a sector unit
 */
adminRouter.post('/output', async (req, res) => {
    try {
        const { sectorName, unitType, outputName, outputType, outputRate } = req.body;
        // Validation
        if (!sectorName || !unitType || !outputName || !outputType || outputRate === undefined) {
            return res.status(400).json({ error: 'Missing required fields: sectorName, unitType, outputName, outputType, outputRate' });
        }
        if (outputRate <= 0) {
            return res.status(400).json({ error: 'Output rate must be positive' });
        }
        if (!['resource', 'product'].includes(outputType)) {
            return res.status(400).json({ error: 'Output type must be resource or product' });
        }
        const validUnitTypes = ['production', 'retail', 'service', 'extraction'];
        if (!validUnitTypes.includes(unitType)) {
            return res.status(400).json({ error: 'Invalid unit type' });
        }
        const created = await SectorConfig_1.SectorConfigModel.createOutput({
            sectorName,
            unitType: unitType,
            outputName,
            outputType,
            outputRate: Number(outputRate),
        });
        SectorConfigService_1.SectorConfigService.invalidateCache();
        res.status(201).json({ id: created.id, message: 'Output created successfully', output: created });
    }
    catch (error) {
        console.error('Failed to create output:', error);
        res.status(500).json({ error: error.message });
    }
});
/**
 * DELETE /api/sector-config/admin/output/:id
 * Delete an output by ID (prevents deleting the last output)
 */
adminRouter.delete('/output/:id', async (req, res) => {
    try {
        const outputId = parseInt(req.params.id);
        if (isNaN(outputId)) {
            return res.status(400).json({ error: 'Invalid output ID' });
        }
        await SectorConfig_1.SectorConfigModel.deleteOutput(outputId);
        SectorConfigService_1.SectorConfigService.invalidateCache();
        res.json({ message: 'Output deleted successfully' });
    }
    catch (error) {
        console.error('Failed to delete output:', error);
        res.status(500).json({ error: error.message });
    }
});
/**
 * PUT /api/sector-config/admin/sectors/:name/product
 * Update the produced product for a sector
 */
adminRouter.put('/sectors/:name/product', async (req, res) => {
    try {
        const { name } = req.params;
        const { producedProduct } = req.body;
        if (!producedProduct) {
            return res.status(400).json({ error: 'producedProduct is required' });
        }
        const updated = await SectorConfig_1.SectorConfigModel.updateSector(name, {
            produced_product: producedProduct,
        });
        if (!updated) {
            return res.status(404).json({ error: 'Sector not found' });
        }
        SectorConfigService_1.SectorConfigService.invalidateCache();
        res.json({ message: 'Produced product updated successfully', sector: updated });
    }
    catch (error) {
        console.error('Failed to update produced product:', error);
        res.status(500).json({ error: error.message });
    }
});
// Mount admin router
router.use('/admin', adminRouter);
exports.default = router;
