import express, { Request, Response } from 'express';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { MarketEntryModel } from '../models/MarketEntry';
import { BusinessUnitModel } from '../models/BusinessUnit';
import { CorporationModel } from '../models/Corporation';
import { UserModel } from '../models/User';
import { TransactionModel } from '../models/Transaction';
import { CommodityPriceHistoryModel } from '../models/CommodityPriceHistory';
import { ProductPriceHistoryModel } from '../models/ProductPriceHistory';
import {
  US_STATES,
  US_REGIONS,
  STATE_MULTIPLIERS,
  SECTORS,
  isValidSector,
  isValidStateCode,
  getStateLabel,
  getStateRegion,
  UNIT_TYPES,
  UnitType,
  MARKET_ENTRY_COST,
  MARKET_ENTRY_ACTIONS,
  BUILD_UNIT_COST,
  BUILD_UNIT_ACTIONS,
  getAllCommodityPrices,
  calculateAllCommodityPrices,
  getStateResourceBreakdown,
  RESOURCES,
  SECTOR_RESOURCES,
  SECTOR_EXTRACTION,
  PRODUCTS,
  SECTOR_PRODUCTS,
  SECTOR_PRODUCT_DEMANDS,
  calculateProductPrice,
  calculateCommodityPrice,
  getAllProductsInfo,
  getProductInfo,
  getResourceInfo,
  Product,
  Sector,
  Resource,
  CorpFocus,
  CORP_FOCUS_TYPES,
  canBuildUnit,
  sectorCanExtract,
  getSectorExtractableResources,
  canBuildMoreUnits,
  getStateSectorCapacity,
  getStateCapacityTier,
  getStateResources,
  getDynamicUnitEconomics,
  // Sector-specific consumption constants
  ENERGY_LOGISTICS_CONSUMPTION,
  MANUFACTURING_LOGISTICS_CONSUMPTION,
  AGRICULTURE_MANUFACTURED_GOODS_CONSUMPTION,
  PHARMACEUTICALS_TECHNOLOGY_CONSUMPTION,
  DEFENSE_TECHNOLOGY_CONSUMPTION,
  MINING_MANUFACTURED_GOODS_CONSUMPTION,
  HEALTHCARE_TECHNOLOGY_CONSUMPTION,
  RETAIL_LOGISTICS_CONSUMPTION,
  REAL_ESTATE_LOGISTICS_CONSUMPTION,
  CONSTRUCTION_MANUFACTURED_GOODS_CONSUMPTION,
  CONSTRUCTION_LUMBER_CONSUMPTION,
  CONSTRUCTION_STEEL_CONSUMPTION,
} from '../constants/sectors';
import { SectorCalculator } from '../services/SectorCalculator';
import { marketDataService } from '../services/MarketDataService';
import fs from 'fs';
import path from 'path';
import pool from '../db/connection';
import { calculateBalanceSheet, updateStockPrice } from '../utils/valuation';

const router = express.Router();

// GET /api/markets/commodities - Get all commodity prices and product market data
router.get('/commodities', async (req: Request, res: Response) => {
  try {
    // Get extraction units count by sector to calculate commodity supply
    const extractionQuery = await pool.query(`
      SELECT 
        me.sector_type,
        COALESCE(SUM(bu.count), 0)::int as extraction_units
      FROM market_entries me
      LEFT JOIN business_units bu ON me.id = bu.market_entry_id AND bu.unit_type = 'extraction'
      GROUP BY me.sector_type
    `);
    
    // Build sector -> extraction unit count map
    const sectorExtractionUnits: Record<string, number> = {};
    for (const row of extractionQuery.rows) {
      sectorExtractionUnits[row.sector_type] = row.extraction_units || 0;
    }
    
    const calculator = new SectorCalculator();
    
    // Get production units count by sector to calculate commodity demand
    const productionQuery = await pool.query(`
      SELECT 
        me.sector_type,
        COALESCE(SUM(bu.count), 0)::int as production_units
      FROM market_entries me
      LEFT JOIN business_units bu ON me.id = bu.market_entry_id AND bu.unit_type = 'production'
      GROUP BY me.sector_type
    `);
    
    // Build sector -> production unit count map
    const sectorProductionUnits: Record<string, number> = {};
    for (const row of productionQuery.rows) {
      sectorProductionUnits[row.sector_type] = row.production_units || 0;
    }

    const retailQuery = await pool.query(`
      SELECT 
        me.sector_type,
        COALESCE(SUM(bu.count), 0)::int as retail_units
      FROM market_entries me
      LEFT JOIN business_units bu ON me.id = bu.market_entry_id AND bu.unit_type = 'retail'
      GROUP BY me.sector_type
    `);

    const sectorRetailUnits: Record<string, number> = {};
    for (const row of retailQuery.rows) {
      sectorRetailUnits[row.sector_type] = row.retail_units || 0;
    }

    const serviceQuery = await pool.query(`
      SELECT 
        me.sector_type,
        COALESCE(SUM(bu.count), 0)::int as service_units
      FROM market_entries me
      LEFT JOIN business_units bu ON me.id = bu.market_entry_id AND bu.unit_type = 'service'
      GROUP BY me.sector_type
    `);

    const sectorServiceUnits: Record<string, number> = {};
    for (const row of serviceQuery.rows) {
      sectorServiceUnits[row.sector_type] = row.service_units || 0;
    }
    
    // Build unit maps
    const unitMaps = {
      production: sectorProductionUnits,
      retail: sectorRetailUnits,
      service: sectorServiceUnits,
      extraction: sectorExtractionUnits,
    };
    // Calculate commodity prices with actual supply/demand
    const { summary: commoditySummary, supply: commoditySupply, demand: commodityDemand } = await marketDataService.getCommoditySummary();
    const commodities = commoditySummary.map((c: any) => ({
      resource: c.resource,
      basePrice: c.price.basePrice,
      currentPrice: c.price.currentPrice,
      priceChange: c.price.priceChange,
      totalSupply: c.price.totalSupply,
      scarcityFactor: c.price.scarcityFactor,
      topProducers: [],
      demandingSectors: [],
    }));
    
    // Calculate supply for each product (sum of production units in producing sectors * output rate)
    const { summary: productSummary, supply: productSupply, demand: productDemand } = await marketDataService.getProductSummary();
    
    
    
    // Calculate prices for all products
    const products = productSummary.map((p: any) => p.price);
    
    res.json({
      commodities,
      products,
      resources: RESOURCES,
      product_types: PRODUCTS,
      sector_resources: SECTOR_RESOURCES,
      sector_products: SECTOR_PRODUCTS,
      sector_product_demands: SECTOR_PRODUCT_DEMANDS,
      commodity_supply: commoditySupply,
      commodity_demand: commodityDemand,
      product_supply: productSupply,
      product_demand: productDemand,
    });
  } catch (error) {
    console.error('Get commodities error:', error);
    res.status(500).json({ error: 'Failed to fetch commodity prices' });
  }
});

router.get('/metadata', async (req: Request, res: Response) => {
  try {
    const {
      SECTORS,
      RESOURCES,
      PRODUCTS,
      SECTOR_RESOURCES,
      SECTOR_PRODUCTS,
      SECTOR_PRODUCT_DEMANDS,
      SECTOR_RETAIL_DEMANDS,
      SECTOR_SERVICE_DEMANDS,
      SECTOR_EXTRACTION,
      EXTRACTION_OUTPUT_RATE,
      EXTRACTION_ELECTRICITY_CONSUMPTION,
      PRODUCTION_OUTPUT_RATE,
      PRODUCTION_RESOURCE_CONSUMPTION,
      PRODUCTION_ELECTRICITY_CONSUMPTION,
      PRODUCTION_PRODUCT_CONSUMPTION,
      RETAIL_PRODUCT_CONSUMPTION,
      SERVICE_ELECTRICITY_CONSUMPTION,
      SERVICE_PRODUCT_CONSUMPTION,
    } = await import('../constants/sectors');

    type UnitType = 'retail' | 'production' | 'service' | 'extraction';
    type UnitFlow = {
      inputs: { resources: Record<string, number>; products: Record<string, number> };
      outputs: { resources: Record<string, number>; products: Record<string, number> };
    };

    const sector_unit_flows: Record<string, Record<UnitType, UnitFlow>> = {};

    for (const sector of SECTORS) {
      const requiredResource = SECTOR_RESOURCES[sector] ?? null;
      const producedProduct = SECTOR_PRODUCTS[sector] ?? null;
      const productionProductDemands = SECTOR_PRODUCT_DEMANDS[sector] ?? null;
      const retailDemands = SECTOR_RETAIL_DEMANDS[sector] ?? null;
      const serviceDemands = SECTOR_SERVICE_DEMANDS[sector] ?? null;
      const extractableResources = SECTOR_EXTRACTION[sector] ?? null;

      const productionInputsResources: Record<string, number> = {};
      // Construction sector consumes multiple resources (Lumber + Steel)
      if (sector === 'Construction') {
        productionInputsResources['Lumber'] = CONSTRUCTION_LUMBER_CONSUMPTION;
        productionInputsResources['Steel'] = CONSTRUCTION_STEEL_CONSUMPTION;
      } else if (requiredResource) {
        productionInputsResources[requiredResource] = PRODUCTION_RESOURCE_CONSUMPTION;
      }

      const productionInputsProducts: Record<string, number> = {};
      if (PRODUCTION_ELECTRICITY_CONSUMPTION > 0) {
        productionInputsProducts['Electricity'] = PRODUCTION_ELECTRICITY_CONSUMPTION;
      }
      if (productionProductDemands) {
        for (const product of productionProductDemands) {
          productionInputsProducts[product] = PRODUCTION_PRODUCT_CONSUMPTION;
        }
      }

      // Sector-specific production product demands
      if (sector === 'Construction') {
        productionInputsProducts['Manufactured Goods'] = CONSTRUCTION_MANUFACTURED_GOODS_CONSUMPTION;
      }
      if (sector === 'Energy') {
        productionInputsProducts['Logistics Capacity'] = ENERGY_LOGISTICS_CONSUMPTION;
      }
      if (sector === 'Manufacturing') {
        productionInputsProducts['Logistics Capacity'] = MANUFACTURING_LOGISTICS_CONSUMPTION;
      }
      if (sector === 'Agriculture') {
        productionInputsProducts['Manufactured Goods'] = AGRICULTURE_MANUFACTURED_GOODS_CONSUMPTION;
      }
      if (sector === 'Pharmaceuticals') {
        productionInputsProducts['Technology Products'] = PHARMACEUTICALS_TECHNOLOGY_CONSUMPTION;
      }
      if (sector === 'Defense') {
        productionInputsProducts['Technology Products'] = DEFENSE_TECHNOLOGY_CONSUMPTION;
      }

      const productionOutputsProducts: Record<string, number> = {};
      if (producedProduct) {
        productionOutputsProducts[producedProduct] = PRODUCTION_OUTPUT_RATE;
      }

      const retailInputsProducts: Record<string, number> = {};
      if (retailDemands) {
        for (const product of retailDemands) {
          let consumed = RETAIL_PRODUCT_CONSUMPTION;
          if (sector === 'Defense') consumed = 1.0;
          retailInputsProducts[product] = consumed;
        }
      }

      const serviceInputsProducts: Record<string, number> = {};
      if (serviceDemands) {
        for (const product of serviceDemands) {
          let consumed = product === 'Electricity' ? SERVICE_ELECTRICITY_CONSUMPTION : SERVICE_PRODUCT_CONSUMPTION;
          if (sector === 'Defense' && product !== 'Electricity') {
            consumed = 1.0;
          } else if (sector === 'Manufacturing' && product !== 'Electricity') {
            consumed = 0.5; // Manufacturing service demands less
          }
          serviceInputsProducts[product] = consumed;
        }
      }

      // Sector-specific service product demands
      if (sector === 'Healthcare') {
        serviceInputsProducts['Technology Products'] = HEALTHCARE_TECHNOLOGY_CONSUMPTION;
      }
      if (sector === 'Retail') {
        serviceInputsProducts['Logistics Capacity'] = RETAIL_LOGISTICS_CONSUMPTION;
      }
      if (sector === 'Real Estate') {
        serviceInputsProducts['Logistics Capacity'] = REAL_ESTATE_LOGISTICS_CONSUMPTION;
      }

      const extractionInputsProducts: Record<string, number> = {};
      if (EXTRACTION_ELECTRICITY_CONSUMPTION > 0) {
        extractionInputsProducts['Electricity'] = EXTRACTION_ELECTRICITY_CONSUMPTION;
      }

      // Sector-specific extraction product demands
      if (sector === 'Mining') {
        extractionInputsProducts['Manufactured Goods'] = MINING_MANUFACTURED_GOODS_CONSUMPTION;
      }

      const extractionOutputsResources: Record<string, number> = {};
      if (extractableResources) {
        for (const resource of extractableResources) {
          extractionOutputsResources[resource] = EXTRACTION_OUTPUT_RATE;
        }
      }

      sector_unit_flows[sector] = {
        retail: {
          inputs: { resources: {}, products: retailInputsProducts },
          outputs: { resources: {}, products: {} },
        },
        production: {
          inputs: { resources: productionInputsResources, products: productionInputsProducts },
          outputs: { resources: {}, products: productionOutputsProducts },
        },
        service: {
          inputs: { resources: {}, products: serviceInputsProducts },
          outputs: { resources: {}, products: {} },
        },
        extraction: {
          inputs: { resources: {}, products: extractionInputsProducts },
          outputs: { resources: extractionOutputsResources, products: {} },
        },
      };
    }

    const product_consumers: Record<string, string[]> = {};
    const product_suppliers: Record<string, string[]> = {};
    for (const product of PRODUCTS) {
      const consumers: string[] = [];
      const suppliers: string[] = [];
      for (const sector of SECTORS) {
        const flows = sector_unit_flows[sector];
        const consumes = Object.prototype.hasOwnProperty.call(flows.production.inputs.products, product)
          || Object.prototype.hasOwnProperty.call(flows.retail.inputs.products, product)
          || Object.prototype.hasOwnProperty.call(flows.service.inputs.products, product)
          || Object.prototype.hasOwnProperty.call(flows.extraction.inputs.products, product);
        const supplies = Object.prototype.hasOwnProperty.call(flows.production.outputs.products, product)
          || Object.prototype.hasOwnProperty.call(flows.retail.outputs.products, product)
          || Object.prototype.hasOwnProperty.call(flows.service.outputs.products, product)
          || Object.prototype.hasOwnProperty.call(flows.extraction.outputs.products, product);
        if (consumes) consumers.push(sector);
        if (supplies) suppliers.push(sector);
      }
      product_consumers[product] = consumers;
      product_suppliers[product] = suppliers;
    }

    const resource_consumers: Record<string, string[]> = {};
    const resource_suppliers: Record<string, string[]> = {};
    for (const resource of RESOURCES) {
      const consumers: string[] = [];
      const suppliers: string[] = [];
      for (const sector of SECTORS) {
        const flows = sector_unit_flows[sector];
        const consumes = Object.prototype.hasOwnProperty.call(flows.production.inputs.resources, resource)
          || Object.prototype.hasOwnProperty.call(flows.retail.inputs.resources, resource)
          || Object.prototype.hasOwnProperty.call(flows.service.inputs.resources, resource)
          || Object.prototype.hasOwnProperty.call(flows.extraction.inputs.resources, resource);
        const supplies = Object.prototype.hasOwnProperty.call(flows.production.outputs.resources, resource)
          || Object.prototype.hasOwnProperty.call(flows.retail.outputs.resources, resource)
          || Object.prototype.hasOwnProperty.call(flows.service.outputs.resources, resource)
          || Object.prototype.hasOwnProperty.call(flows.extraction.outputs.resources, resource);
        if (consumes) consumers.push(sector);
        if (supplies) suppliers.push(sector);
      }
      resource_consumers[resource] = consumers;
      resource_suppliers[resource] = suppliers;
    }

    res.json({
      sector_unit_flows,
      product_consumers,
      product_suppliers,
      resource_consumers,
      resource_suppliers,
    });
  } catch (error) {
    console.error('Get market metadata error:', error);
    res.status(500).json({ error: 'Failed to fetch market metadata' });
  }
});

// GET /api/markets/config - Get current sector rules (admin only)
router.get('/config', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user || !req.user.is_admin) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const cfgPath = path.resolve(process.cwd(), 'config', 'sector_rules.json');
    if (!fs.existsSync(cfgPath)) {
      return res.json({ categories: {}, sectors: {} });
    }
    const raw = fs.readFileSync(cfgPath, 'utf8');
    const json = JSON.parse(raw);
    res.json(json);
  } catch (error) {
    console.error('Get markets config error:', error);
    res.status(500).json({ error: 'Failed to fetch config' });
  }
});

// PUT /api/markets/config - Update sector rules (admin only)
router.put('/config', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user || !req.user.is_admin) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const body = req.body;
    if (typeof body !== 'object' || body === null) {
      return res.status(400).json({ error: 'Invalid config body' });
    }
    const cfgPath = path.resolve(process.cwd(), 'config', 'sector_rules.json');
    const safe = {
      categories: body.categories || {},
      sectors: body.sectors || {},
    };
    fs.writeFileSync(cfgPath, JSON.stringify(safe, null, 2), 'utf8');
    res.json({ ok: true });
  } catch (error) {
    console.error('Update markets config error:', error);
    res.status(500).json({ error: 'Failed to update config' });
  }
});

// GET /api/markets/validate - Run market data validation and audit (admin only)
router.get('/validate', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user || !req.user.is_admin) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const result = await marketDataService.validateAndAudit();
    res.json({ ok: true, result });
  } catch (error) {
    console.error('Market validation error:', error);
    res.status(500).json({ error: 'Failed to run validation' });
  }
});

// GET /api/markets/resource/:name - Get detailed resource/commodity info
router.get('/resource/:name', async (req: Request, res: Response) => {
  try {
    const resourceName = decodeURIComponent(req.params.name) as Resource;
    
    // Validate resource exists
    if (!RESOURCES.includes(resourceName)) {
      return res.status(404).json({ error: 'Resource not found' });
    }
    
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = (page - 1) * limit;
    const filter = (req.query.filter as string) || 'demanders'; // 'producers' or 'demanders'
    
    // Calculate actual commodity supply/demand (unified)
    const { EXTRACTION_OUTPUT_RATE, PRODUCTION_RESOURCE_CONSUMPTION } = await import('../constants/sectors');
    
    // Get sectors that extract this resource
    const extractingSectors = Object.keys(SECTOR_EXTRACTION).filter(s => {
      const extractable = SECTOR_EXTRACTION[s as Sector];
      return extractable && extractable.includes(resourceName);
    });
    
    // Get extraction units for sectors that extract this resource
    const extractionQuery = await pool.query(`
      SELECT 
        me.sector_type,
        COALESCE(SUM(bu.count), 0)::int as extraction_units
      FROM market_entries me
      LEFT JOIN business_units bu ON me.id = bu.market_entry_id AND bu.unit_type = 'extraction'
      WHERE me.sector_type = ANY($1::text[])
      GROUP BY me.sector_type
    `, [extractingSectors]);
    
    // Unified supply/demand via MarketDataService
    const detail = await marketDataService.getCommodityDetail(resourceName);
    const actualSupply = detail.supply;
    
    // Get top producing states by actual extraction units
    const topProducingStatesQuery = await pool.query(`
      SELECT 
        me.state_code,
        sm.name as state_name,
        COALESCE(SUM(bu.count), 0)::int as extraction_units,
        COALESCE(SUM(bu.count), 0)::int * $1::numeric as production_level
      FROM market_entries me
      LEFT JOIN business_units bu ON me.id = bu.market_entry_id AND bu.unit_type = 'extraction'
      LEFT JOIN state_metadata sm ON me.state_code = sm.state_code
      WHERE me.sector_type = ANY($2::text[])
      GROUP BY me.state_code, sm.name
      HAVING COALESCE(SUM(bu.count), 0) > 0
      ORDER BY extraction_units DESC
      LIMIT 5
    `, [EXTRACTION_OUTPUT_RATE, extractingSectors]);
    
    const topProducingStates = topProducingStatesQuery.rows.map((row, idx) => ({
      stateCode: row.state_code,
      stateName: row.state_name || row.state_code,
      extractionUnits: row.extraction_units,
      productionLevel: parseFloat(row.production_level),
      rank: idx + 1,
    }));
    
    // Get production units for sectors that demand this resource
    const demandingSectors: Sector[] = [];
    for (const [sector, resource] of Object.entries(SECTOR_RESOURCES)) {
      if (resource === resourceName) {
        demandingSectors.push(sector as Sector);
      }
    }
    
    // Unified demand and price
    const actualDemand = detail.demand;
    const commodityPrice = detail.price;
    const resourceInfo = getResourceInfo(resourceName);
    
    // Get top producers (corporations extracting this resource) or top demanders based on filter
    let listQuery, countQuery, totalCount;
    
    if (filter === 'producers') {
      // Get top producers (corporations with most extraction units)
      listQuery = await pool.query(`
        SELECT 
          c.id as corporation_id,
          c.name as corporation_name,
          c.logo as corporation_logo,
          me.sector_type,
          me.state_code,
          sm.name as state_name,
          COALESCE(SUM(bu.count), 0)::int as extraction_units
        FROM corporations c
        JOIN market_entries me ON c.id = me.corporation_id
        LEFT JOIN business_units bu ON me.id = bu.market_entry_id AND bu.unit_type = 'extraction'
        LEFT JOIN state_metadata sm ON me.state_code = sm.state_code
        WHERE me.sector_type = ANY($1::text[])
        GROUP BY c.id, c.name, c.logo, me.sector_type, me.state_code, sm.name
        HAVING COALESCE(SUM(bu.count), 0) > 0
        ORDER BY extraction_units DESC
        LIMIT $2 OFFSET $3
      `, [extractingSectors, limit, offset]);
      
      countQuery = await pool.query(`
        SELECT COUNT(DISTINCT (c.id, me.sector_type, me.state_code))::int as total
        FROM corporations c
        JOIN market_entries me ON c.id = me.corporation_id
        LEFT JOIN business_units bu ON me.id = bu.market_entry_id AND bu.unit_type = 'extraction'
        WHERE me.sector_type = ANY($1::text[])
        GROUP BY c.id, me.sector_type, me.state_code
        HAVING COALESCE(SUM(bu.count), 0) > 0
      `, [extractingSectors]);
    } else {
      // Get top demanders (corporations with most production units in sectors that demand this resource)
      listQuery = await pool.query(`
        SELECT 
          c.id as corporation_id,
          c.name as corporation_name,
          c.logo as corporation_logo,
          me.sector_type,
          me.state_code,
          sm.name as state_name,
          COALESCE(SUM(bu.count), 0)::int as production_units
        FROM corporations c
        JOIN market_entries me ON c.id = me.corporation_id
        LEFT JOIN business_units bu ON me.id = bu.market_entry_id AND bu.unit_type = 'production'
        LEFT JOIN state_metadata sm ON me.state_code = sm.state_code
        WHERE me.sector_type = ANY($1::text[])
        GROUP BY c.id, c.name, c.logo, me.sector_type, me.state_code, sm.name
        HAVING COALESCE(SUM(bu.count), 0) > 0
        ORDER BY production_units DESC
        LIMIT $2 OFFSET $3
      `, [demandingSectors, limit, offset]);
      
      countQuery = await pool.query(`
        SELECT COUNT(DISTINCT (c.id, me.sector_type, me.state_code))::int as total
        FROM corporations c
        JOIN market_entries me ON c.id = me.corporation_id
        LEFT JOIN business_units bu ON me.id = bu.market_entry_id AND bu.unit_type = 'production'
        WHERE me.sector_type = ANY($1::text[])
        GROUP BY c.id, me.sector_type, me.state_code
        HAVING COALESCE(SUM(bu.count), 0) > 0
      `, [demandingSectors]);
    }
    
    totalCount = countQuery.rows.length;
    
    const totalDemand = actualDemand;
    
    res.json({
      resource: resourceName,
      price: commodityPrice,
      info: resourceInfo,
      total_supply: actualSupply,
      total_demand: totalDemand,
      demanding_sectors: demandingSectors,
      top_producing_states: topProducingStates,
      demanders: filter === 'demanders' ? listQuery.rows.map(row => ({
        corporation_id: row.corporation_id,
        corporation_name: row.corporation_name,
        corporation_logo: row.corporation_logo,
        sector_type: row.sector_type,
        state_code: row.state_code,
        state_name: row.state_name,
        production_units: row.production_units,
        resource_demand: row.production_units * PRODUCTION_RESOURCE_CONSUMPTION,
      })) : [],
      producers: filter === 'producers' ? listQuery.rows.map(row => ({
        corporation_id: row.corporation_id,
        corporation_name: row.corporation_name,
        corporation_logo: row.corporation_logo,
        sector_type: row.sector_type,
        state_code: row.state_code,
        state_name: row.state_name,
        extraction_units: row.extraction_units,
        production_level: row.extraction_units * EXTRACTION_OUTPUT_RATE,
      })) : [],
      filter,
      pagination: {
        page,
        limit,
        total: totalCount,
        total_pages: Math.ceil(totalCount / limit),
      },
    });
  } catch (error) {
    console.error('Get resource detail error:', error);
    res.status(500).json({ error: 'Failed to fetch resource details' });
  }
});

// GET /api/markets/product/:name - Get detailed product info
router.get('/product/:name', async (req: Request, res: Response) => {
  try {
    const productName = decodeURIComponent(req.params.name) as Product;
    
    // Validate product exists
    if (!PRODUCTS.includes(productName)) {
      return res.status(404).json({ error: 'Product not found' });
    }
    
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = (page - 1) * limit;
    const tab = req.query.tab as string || 'suppliers';
    
    // Get sectors that produce this product
    const producingSectors: Sector[] = [];
    for (const [sector, product] of Object.entries(SECTOR_PRODUCTS)) {
      if (product === productName) {
        producingSectors.push(sector as Sector);
      }
    }
    
    // Get sectors that demand this product
    const demandingSectors: Sector[] = [];
    for (const [sector, products] of Object.entries(SECTOR_PRODUCT_DEMANDS)) {
      if (products && products.includes(productName)) {
        demandingSectors.push(sector as Sector);
      }
    }
    
    // Unified supply/demand and price via MarketDataService
    const detail = await marketDataService.getProductDetail(productName);
    const totalSupply = detail.supply;
    const totalDemand = detail.demand;
    const productPrice = detail.price;
    const productInfo = getProductInfo(productName);
    
    // Get top suppliers or demanders based on tab
    let listData: any[] = [];
    let totalCount = 0;
    
    if (tab === 'suppliers') {
      const suppliersQuery = await pool.query(`
        SELECT 
          c.id as corporation_id,
          c.name as corporation_name,
          c.logo as corporation_logo,
          me.sector_type,
          me.state_code,
          sm.name as state_name,
          COALESCE(SUM(bu.count), 0)::int as production_units
        FROM corporations c
        JOIN market_entries me ON c.id = me.corporation_id
        LEFT JOIN business_units bu ON me.id = bu.market_entry_id AND bu.unit_type = 'production'
        LEFT JOIN state_metadata sm ON me.state_code = sm.state_code
        WHERE me.sector_type = ANY($1::text[])
        GROUP BY c.id, c.name, c.logo, me.sector_type, me.state_code, sm.name
        HAVING COALESCE(SUM(bu.count), 0) > 0
        ORDER BY production_units DESC
        LIMIT $2 OFFSET $3
      `, [producingSectors, limit, offset]);
      
      listData = suppliersQuery.rows.map(row => ({
        corporation_id: row.corporation_id,
        corporation_name: row.corporation_name,
        corporation_logo: row.corporation_logo,
        sector_type: row.sector_type,
        state_code: row.state_code,
        state_name: row.state_name,
        units: row.production_units,
        type: 'supplier',
      }));
      
      // Count total suppliers
      const countQuery = await pool.query(`
        SELECT COUNT(*)::int as total FROM (
          SELECT c.id, me.sector_type, me.state_code
          FROM corporations c
          JOIN market_entries me ON c.id = me.corporation_id
          LEFT JOIN business_units bu ON me.id = bu.market_entry_id AND bu.unit_type = 'production'
          WHERE me.sector_type = ANY($1::text[])
          GROUP BY c.id, me.sector_type, me.state_code
          HAVING COALESCE(SUM(bu.count), 0) > 0
        ) sub
      `, [producingSectors]);
      totalCount = countQuery.rows[0]?.total || 0;
      
    } else {
      // Get demanders
      const productDemandersQuery = await pool.query(`
        SELECT 
          c.id as corporation_id,
          c.name as corporation_name,
          c.logo as corporation_logo,
          me.sector_type,
          me.state_code,
          sm.name as state_name,
          COALESCE(SUM(bu.count), 0)::int as production_units
        FROM corporations c
        JOIN market_entries me ON c.id = me.corporation_id
        LEFT JOIN business_units bu ON me.id = bu.market_entry_id AND bu.unit_type = 'production'
        LEFT JOIN state_metadata sm ON me.state_code = sm.state_code
        WHERE me.sector_type = ANY($1::text[])
        GROUP BY c.id, c.name, c.logo, me.sector_type, me.state_code, sm.name
        HAVING COALESCE(SUM(bu.count), 0) > 0
        ORDER BY production_units DESC
        LIMIT $2 OFFSET $3
      `, [demandingSectors, limit, offset]);
      
      listData = productDemandersQuery.rows.map(row => ({
        corporation_id: row.corporation_id,
        corporation_name: row.corporation_name,
        corporation_logo: row.corporation_logo,
        sector_type: row.sector_type,
        state_code: row.state_code,
        state_name: row.state_name,
        units: row.production_units,
        type: 'demander',
      }));
      
      // Count total demanders
      const countQuery = await pool.query(`
        SELECT COUNT(*)::int as total FROM (
          SELECT c.id, me.sector_type, me.state_code
          FROM corporations c
          JOIN market_entries me ON c.id = me.corporation_id
          LEFT JOIN business_units bu ON me.id = bu.market_entry_id AND bu.unit_type = 'production'
          WHERE me.sector_type = ANY($1::text[])
          GROUP BY c.id, me.sector_type, me.state_code
          HAVING COALESCE(SUM(bu.count), 0) > 0
        ) sub
      `, [demandingSectors]);
      totalCount = countQuery.rows[0]?.total || 0;
    }
    
    res.json({
      product: productName,
      price: productPrice,
      info: productInfo,
      total_supply: totalSupply,
      total_demand: totalDemand,
      producing_sectors: producingSectors,
      demanding_sectors: demandingSectors,
      [tab]: listData,
      pagination: {
        page,
        limit,
        total: totalCount,
        total_pages: Math.ceil(totalCount / limit),
      },
    });
  } catch (error) {
    console.error('Get product detail error:', error);
    res.status(500).json({ error: 'Failed to fetch product details' });
  }
});

// GET /api/markets/states - List all states with region grouping
router.get('/states', async (req: Request, res: Response) => {
  try {
    // Get state metadata from database
    const stateMetaResult = await pool.query('SELECT * FROM state_metadata ORDER BY name');
    const stateMeta = stateMetaResult.rows;

    // Compute growth factor per state (last 24h unit builds normalized by current units)
    const currentUnitsByStateSector = await pool.query(`
      SELECT me.state_code, me.sector_type, COALESCE(SUM(bu.count), 0)::int AS units
      FROM market_entries me
      LEFT JOIN business_units bu ON me.id = bu.market_entry_id
      GROUP BY me.state_code, me.sector_type
    `);
    const buildsLastDayByStateSector = await pool.query(`
      SELECT me.state_code, me.sector_type, COUNT(*)::int AS builds
      FROM transactions t
      JOIN business_units bu ON t.reference_type = 'business_unit' AND t.reference_id = bu.id
      JOIN market_entries me ON bu.market_entry_id = me.id
      WHERE t.transaction_type = 'unit_build'
        AND t.created_at >= NOW() - INTERVAL '24 hours'
      GROUP BY me.state_code, me.sector_type
    `);
    const unitsMap = new Map<string, Map<string, number>>(); // state -> sector -> units
    for (const row of currentUnitsByStateSector.rows) {
      if (!unitsMap.has(row.state_code)) unitsMap.set(row.state_code, new Map());
      unitsMap.get(row.state_code)!.set(row.sector_type, row.units || 0);
    }
    const buildsMap = new Map<string, Map<string, number>>();
    for (const row of buildsLastDayByStateSector.rows) {
      if (!buildsMap.has(row.state_code)) buildsMap.set(row.state_code, new Map());
      buildsMap.get(row.state_code)!.set(row.sector_type, row.builds || 0);
    }
    const growthFactorByState: Record<string, number> = {};
    for (const st of stateMeta) {
      const stateCode = st.state_code;
      const sectorUnits = unitsMap.get(stateCode) || new Map();
      const sectorBuilds = buildsMap.get(stateCode) || new Map();
      const sectors = new Set<string>([...sectorUnits.keys(), ...sectorBuilds.keys()]);
      let ratiosSum = 0;
      let count = 0;
      for (const sector of sectors) {
        const u = sectorUnits.get(sector) || 0;
        const b = sectorBuilds.get(sector) || 0;
        const ratio = u > 0 ? (b / u) : 0;
        ratiosSum += ratio;
        count += 1;
      }
      const avg = count > 0 ? (ratiosSum / count) : 0;
      growthFactorByState[stateCode] = 1 + 0.25 * avg;
    }

    // Group states by region
    const statesByRegion: Record<string, Array<{
      code: string;
      name: string;
      region: string;
      multiplier: number;
      growth_factor?: number;
      capacity?: number;
      capacity_tier?: string;
      extractable_resources?: string[];
    }>> = {};

    for (const state of stateMeta) {
      const region = state.region;
      if (!statesByRegion[region]) {
        statesByRegion[region] = [];
      }
      statesByRegion[region].push({
        code: state.state_code,
        name: state.name,
        region: state.region,
        multiplier: parseFloat(state.population_multiplier),
        growth_factor: growthFactorByState[state.state_code] || 1,
        capacity: getStateSectorCapacity(state.state_code),
        capacity_tier: getStateCapacityTier(state.state_code),
        extractable_resources: Object.keys(getStateResources(state.state_code)),
      });
    }

    // Sort states within each region by name
    for (const region of Object.keys(statesByRegion)) {
      statesByRegion[region].sort((a, b) => a.name.localeCompare(b.name));
    }

    res.json({
      regions: Object.keys(US_REGIONS),
      states_by_region: statesByRegion,
      total_states: stateMeta.length,
    });
  } catch (error) {
    console.error('Get states error:', error);
    res.status(500).json({ error: 'Failed to fetch states' });
  }
});

// GET /api/markets/states/:code - Get state detail
router.get('/states/:code', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const stateCode = req.params.code.toUpperCase();
    
    if (!isValidStateCode(stateCode)) {
      return res.status(400).json({ error: 'Invalid state code' });
    }

    // Get state metadata
    const stateMetaResult = await pool.query(
      'SELECT * FROM state_metadata WHERE state_code = $1',
      [stateCode]
    );
    
    if (stateMetaResult.rows.length === 0) {
      return res.status(404).json({ error: 'State not found' });
    }

    const stateMeta = stateMetaResult.rows[0];

    // Compute growth factor for this state (last 24h builds normalized by current units)
    const currentUnitsBySector = await pool.query(`
      SELECT me.sector_type, COALESCE(SUM(bu.count), 0)::int AS units
      FROM market_entries me
      LEFT JOIN business_units bu ON me.id = bu.market_entry_id
      WHERE me.state_code = $1
      GROUP BY me.sector_type
    `, [stateCode]);
    const buildsLastDayBySector = await pool.query(`
      SELECT me.sector_type, COUNT(*)::int AS builds
      FROM transactions t
      JOIN business_units bu ON t.reference_type = 'business_unit' AND t.reference_id = bu.id
      JOIN market_entries me ON bu.market_entry_id = me.id
      WHERE t.transaction_type = 'unit_build'
        AND t.created_at >= NOW() - INTERVAL '24 hours'
        AND me.state_code = $1
      GROUP BY me.sector_type
    `, [stateCode]);
    const unitsBySector = new Map<string, number>();
    for (const row of currentUnitsBySector.rows) unitsBySector.set(row.sector_type, row.units || 0);
    const buildsBySector = new Map<string, number>();
    for (const row of buildsLastDayBySector.rows) buildsBySector.set(row.sector_type, row.builds || 0);
    const sectorsSet = new Set<string>([...unitsBySector.keys(), ...buildsBySector.keys()]);
    let sumRatios = 0; let cnt = 0;
    for (const sector of sectorsSet) {
      const u = unitsBySector.get(sector) || 0;
      const b = buildsBySector.get(sector) || 0;
      const ratio = u > 0 ? (b / u) : 0;
      sumRatios += ratio; cnt++;
    }
    const growthFactor = 1 + 0.25 * (cnt > 0 ? (sumRatios / cnt) : 0);

    // Get all market entries for this state
    const marketEntries = await MarketEntryModel.findByStateCode(stateCode);

    // Get all corporation IDs and entry IDs in one go
    const corpIds = [...new Set(marketEntries.map(e => e.corporation_id))];
    const entryIds = marketEntries.map(e => e.id);

    // Batch fetch corporations and unit counts
    const [corporations, unitCountsMap] = await Promise.all([
      corpIds.length > 0 
        ? pool.query('SELECT id, name, logo FROM corporations WHERE id = ANY($1)', [corpIds])
        : { rows: [] },
      BusinessUnitModel.getBulkUnitCounts(entryIds),
    ]);

    // Create corporation lookup map
    const corpMap = new Map<number, { id: number; name: string; logo: string | null }>();
    for (const corp of corporations.rows) {
      corpMap.set(corp.id, { id: corp.id, name: corp.name, logo: corp.logo });
    }

    // Build markets with details using the pre-fetched data
    const marketsWithDetails = marketEntries.map((entry) => ({
      ...entry,
      corporation: corpMap.get(entry.corporation_id) || null,
      units: unitCountsMap.get(entry.id) || { retail: 0, production: 0, service: 0, extraction: 0 },
    }));

    // Get user's corporation if they are CEO
    const userId = req.userId!;
    const userCorps = await CorporationModel.findByCeoId(userId);
    const userCorp = userCorps.length > 0 ? userCorps[0] : null;

    // Get user's market entries in this state with unit counts
    let userMarketEntries: any[] = [];
    if (userCorp) {
      const entries = await MarketEntryModel.findByCorpAndState(userCorp.id, stateCode);
      const userEntryIds = entries.map(e => e.id);
      const userUnitCountsMap = await BusinessUnitModel.getBulkUnitCounts(userEntryIds);
      
      userMarketEntries = entries.map((entry) => ({
        ...entry,
        units: userUnitCountsMap.get(entry.id) || { retail: 0, production: 0, service: 0, extraction: 0 },
      }));
    }

    // Get resource breakdown for this state
    const resourceBreakdown = getStateResourceBreakdown(stateCode);

    // Get capacity for this state
    const stateCapacity = getStateSectorCapacity(stateCode);

    res.json({
      state: {
        code: stateMeta.state_code,
        name: stateMeta.name,
        region: stateMeta.region,
        multiplier: parseFloat(stateMeta.population_multiplier),
        growth_factor: growthFactor,
        capacity: stateCapacity,
      },
      markets: marketsWithDetails,
      sectors: SECTORS,
      sector_resources: SECTOR_RESOURCES,
      resources: resourceBreakdown,
      user_corporation: userCorp ? {
        id: userCorp.id,
        name: userCorp.name,
        capital: userCorp.capital,
      } : null,
      user_market_entries: userMarketEntries,
    });
  } catch (error) {
    console.error('Get state detail error:', error);
    res.status(500).json({ error: 'Failed to fetch state details' });
  }
});

// POST /api/markets/states/:code/enter - Enter a market
router.post('/states/:code/enter', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const stateCode = req.params.code.toUpperCase();
    const { sector_type, corporation_id } = req.body;
    const userId = req.userId!;

    // Validate inputs
    if (!isValidStateCode(stateCode)) {
      return res.status(400).json({ error: 'Invalid state code' });
    }

    if (!sector_type || !isValidSector(sector_type)) {
      return res.status(400).json({ error: 'Invalid sector type' });
    }

    if (!corporation_id) {
      return res.status(400).json({ error: 'Corporation ID is required' });
    }

    // Check if user is CEO of the corporation
    const corporation = await CorporationModel.findById(corporation_id);
    if (!corporation) {
      return res.status(404).json({ error: 'Corporation not found' });
    }

    if (corporation.ceo_id !== userId) {
      return res.status(403).json({ error: 'Only the CEO can enter new markets' });
    }

    // Check if already in this market
    const existingEntry = await MarketEntryModel.exists(corporation_id, stateCode, sector_type);
    if (existingEntry) {
      return res.status(400).json({ error: 'Already in this market' });
    }

    // Check capital
    if (corporation.capital < MARKET_ENTRY_COST) {
      return res.status(400).json({
        error: `Insufficient capital. Need ${MARKET_ENTRY_COST.toLocaleString()}, have ${corporation.capital.toLocaleString()}`,
        required: MARKET_ENTRY_COST,
        available: corporation.capital,
      });
    }

    // Check actions
    const userActions = await UserModel.getActions(userId);
    if (userActions < MARKET_ENTRY_ACTIONS) {
      return res.status(400).json({
        error: `Insufficient actions. Need ${MARKET_ENTRY_ACTIONS}, have ${userActions}`,
        required: MARKET_ENTRY_ACTIONS,
        available: userActions,
      });
    }

    // Deduct capital and actions
    await CorporationModel.update(corporation_id, {
      capital: corporation.capital - MARKET_ENTRY_COST,
    });
    await UserModel.updateActions(userId, -MARKET_ENTRY_ACTIONS);

    // Create market entry
    const marketEntry = await MarketEntryModel.create({
      corporation_id,
      state_code: stateCode,
      sector_type,
    });

    // Record transaction
    await TransactionModel.create({
      transaction_type: 'market_entry',
      amount: MARKET_ENTRY_COST,
      from_user_id: userId,
      corporation_id: corporation_id,
      description: `Entered ${getStateLabel(stateCode) || stateCode} market in ${sector_type} sector`,
      reference_id: marketEntry.id,
      reference_type: 'market_entry',
    });

    res.status(201).json({
      success: true,
      market_entry: marketEntry,
      capital_deducted: MARKET_ENTRY_COST,
      actions_deducted: MARKET_ENTRY_ACTIONS,
      new_capital: corporation.capital - MARKET_ENTRY_COST,
    });
    try { marketDataService.invalidateAll(); } catch {}
  } catch (error) {
    console.error('Enter market error:', error);
    res.status(500).json({ error: 'Failed to enter market' });
  }
});

// POST /api/markets/entries/:entryId/build - Build a unit
router.post('/entries/:entryId/build', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const entryId = parseInt(req.params.entryId, 10);
    const { unit_type } = req.body;
    const userId = req.userId!;

    if (isNaN(entryId)) {
      return res.status(400).json({ error: 'Invalid entry ID' });
    }

    if (!unit_type || !UNIT_TYPES.includes(unit_type)) {
      return res.status(400).json({ error: 'Invalid unit type. Must be retail, production, service, or extraction' });
    }

    // Get market entry
    const marketEntry = await MarketEntryModel.findById(entryId);
    if (!marketEntry) {
      return res.status(404).json({ error: 'Market entry not found' });
    }

    // Check if user is CEO of the corporation
    const corporation = await CorporationModel.findById(marketEntry.corporation_id);
    if (!corporation) {
      return res.status(404).json({ error: 'Corporation not found' });
    }

    if (corporation.ceo_id !== userId) {
      return res.status(403).json({ error: 'Only the CEO can build units' });
    }

    const corpFocus = corporation.focus || 'diversified';
    const entrySector = marketEntry.sector_type;
    const buildCheck = canBuildUnit(entrySector, corpFocus as CorpFocus, unit_type as UnitType);
    
    if (!buildCheck.allowed) {
      return res.status(400).json({ 
        error: buildCheck.reason || `Cannot build ${unit_type} units`,
        focus: corpFocus,
        sector: entrySector,
      });
    }

    // Check state capacity
    const currentUnitCounts = await BusinessUnitModel.getUnitCounts(entryId);
    const currentTotalUnits = currentUnitCounts.retail + currentUnitCounts.production + 
                              currentUnitCounts.service + currentUnitCounts.extraction;
    const capacityCheck = canBuildMoreUnits(marketEntry.state_code, currentTotalUnits);
    
    if (!capacityCheck.allowed) {
      return res.status(400).json({
        error: `State capacity reached. ${marketEntry.state_code} allows ${capacityCheck.capacity} units per sector.`,
        capacity: capacityCheck.capacity,
        current: currentTotalUnits,
        remaining: 0,
      });
    }

    // Check capital
    if (corporation.capital < BUILD_UNIT_COST) {
      return res.status(400).json({
        error: `Insufficient capital. Need ${BUILD_UNIT_COST.toLocaleString()}, have ${corporation.capital.toLocaleString()}`,
        required: BUILD_UNIT_COST,
        available: corporation.capital,
      });
    }

    // Check actions
    const userActions = await UserModel.getActions(userId);
    if (userActions < BUILD_UNIT_ACTIONS) {
      return res.status(400).json({
        error: `Insufficient actions. Need ${BUILD_UNIT_ACTIONS}, have ${userActions}`,
        required: BUILD_UNIT_ACTIONS,
        available: userActions,
      });
    }

    // Deduct capital and actions
    await CorporationModel.update(marketEntry.corporation_id, {
      capital: corporation.capital - BUILD_UNIT_COST,
    });
    await UserModel.updateActions(userId, -BUILD_UNIT_ACTIONS);

    // Build unit
    const unit = await BusinessUnitModel.incrementUnit(entryId, unit_type, 1);

    // Get updated unit counts
    const unitCounts = await BusinessUnitModel.getUnitCounts(entryId);

    // Record transaction
    await TransactionModel.create({
      transaction_type: 'unit_build',
      amount: BUILD_UNIT_COST,
      from_user_id: userId,
      corporation_id: marketEntry.corporation_id,
      description: `Built ${unit_type} unit in ${marketEntry.state_code}`,
      reference_id: unit.id,
      reference_type: 'business_unit',
    });

    // Update stock price
    const newStockPrice = await updateStockPrice(marketEntry.corporation_id);

    const newTotalUnits = unitCounts.retail + unitCounts.production + 
                          unitCounts.service + unitCounts.extraction;
    const stateCapacity = getStateSectorCapacity(marketEntry.state_code);

    res.json({
      success: true,
      unit,
      unit_counts: unitCounts,
      capital_deducted: BUILD_UNIT_COST,
      actions_deducted: BUILD_UNIT_ACTIONS,
      new_capital: corporation.capital - BUILD_UNIT_COST,
      new_stock_price: newStockPrice,
      capacity: {
        current: newTotalUnits,
        max: stateCapacity,
        remaining: stateCapacity - newTotalUnits,
      },
    });
    try { marketDataService.invalidateAll(); } catch {}
  } catch (error) {
    console.error('Build unit error:', error);
    res.status(500).json({ error: 'Failed to build unit' });
  }
});

// GET /api/markets/corporation/:corpId/finances - Get corporation finances
router.get('/corporation/:corpId/finances', async (req: Request, res: Response) => {
  try {
    const corpId = parseInt(req.params.corpId, 10);
    
    if (isNaN(corpId)) {
      return res.status(400).json({ error: 'Invalid corporation ID' });
    }

    const corporation = await CorporationModel.findById(corpId);
    if (!corporation) {
      return res.status(404).json({ error: 'Corporation not found' });
    }

    const [finances, balanceSheet] = await Promise.all([
      MarketEntryModel.calculateCorporationFinances(corpId),
      calculateBalanceSheet(corpId),
    ]);

    const dividendPercentage = typeof corporation.dividend_percentage === 'string' ? parseFloat(corporation.dividend_percentage) : (corporation.dividend_percentage || 0);
    const totalShares = corporation.shares || 1;
    const totalProfit96h = finances.display_profit;
    
    const dividendPerShare96h = totalShares > 0 && dividendPercentage > 0 
      ? (totalProfit96h * dividendPercentage / 100) / totalShares 
      : 0;

    const specialDividendLastPaidAt = corporation.special_dividend_last_paid_at;
    const specialDividendLastAmount = typeof corporation.special_dividend_last_amount === 'string' 
      ? parseFloat(corporation.special_dividend_last_amount) 
      : (corporation.special_dividend_last_amount || null);
    const specialDividendPerShareLast = specialDividendLastAmount && totalShares > 0
      ? specialDividendLastAmount / totalShares
      : null;

    const financesWithDividends = {
      ...finances,
      dividend_per_share_96h: dividendPerShare96h,
      special_dividend_last_paid_at: specialDividendLastPaidAt,
      special_dividend_last_amount: specialDividendLastAmount,
      special_dividend_per_share_last: specialDividendPerShareLast,
    };

    const entries = await MarketEntryModel.findByCorporationIdWithUnits(corpId);
    
    const stateCodes = [...new Set(entries.map(e => e.state_code))];
    
    let stateMetadataMap: Record<string, { name: string; multiplier: number }> = {};
    if (stateCodes.length > 0) {
      const stateMetaResult = await pool.query(
        'SELECT state_code, name, population_multiplier FROM state_metadata WHERE state_code = ANY($1)',
        [stateCodes]
      );
      for (const row of stateMetaResult.rows) {
        stateMetadataMap[row.state_code] = {
          name: row.name || row.state_code,
          multiplier: parseFloat(row.population_multiplier || '1'),
        };
      }
    }

    const marketsWithDetails = entries.map((entry) => {
      const stateMeta = stateMetadataMap[entry.state_code];
      return {
        ...entry,
        state_name: stateMeta?.name || entry.state_code,
        state_multiplier: stateMeta?.multiplier || 1,
      };
    });

    res.json({
      corporation_id: corpId,
      finances: financesWithDividends,
      balance_sheet: balanceSheet,
      market_entries: marketsWithDetails,
    });
  } catch (error) {
    console.error('Get corporation finances error:', error);
    res.status(500).json({ error: 'Failed to fetch corporation finances' });
  }
});

// GET /api/markets/corporation/:corpId/entries - Get corporation market entries
router.get('/corporation/:corpId/entries', async (req: Request, res: Response) => {
  try {
    const corpId = parseInt(req.params.corpId, 10);
    
    if (isNaN(corpId)) {
      return res.status(400).json({ error: 'Invalid corporation ID' });
    }

    const entries = await MarketEntryModel.findByCorporationIdWithUnits(corpId);

    const stateCodes = [...new Set(entries.map(e => e.state_code))];
    
    let stateMetadataMap: Record<string, { name: string; region: string; multiplier: number }> = {};
    if (stateCodes.length > 0) {
      const stateMetaResult = await pool.query(
        'SELECT state_code, name, region, population_multiplier FROM state_metadata WHERE state_code = ANY($1)',
        [stateCodes]
      );
      for (const row of stateMetaResult.rows) {
        stateMetadataMap[row.state_code] = {
          name: row.name || row.state_code,
          region: row.region || 'Unknown',
          multiplier: parseFloat(row.population_multiplier || '1'),
        };
      }
    }

    const marketsWithDetails = entries.map((entry) => {
      const stateMeta = stateMetadataMap[entry.state_code];
      return {
        ...entry,
        state_name: stateMeta?.name || entry.state_code,
        state_region: stateMeta?.region || 'Unknown',
        state_multiplier: stateMeta?.multiplier || 1,
      };
    });

    res.json(marketsWithDetails);
  } catch (error) {
    console.error('Get corporation entries error:', error);
    res.status(500).json({ error: 'Failed to fetch corporation market entries' });
  }
});

// DELETE /api/markets/entries/:entryId/abandon - Abandon a sector
router.delete('/entries/:entryId/abandon', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const entryId = parseInt(req.params.entryId, 10);
    const userId = req.userId!;

    if (isNaN(entryId)) {
      return res.status(400).json({ error: 'Invalid entry ID' });
    }

    const marketEntry = await MarketEntryModel.findById(entryId);
    if (!marketEntry) {
      return res.status(404).json({ error: 'Market entry not found' });
    }

    const corporation = await CorporationModel.findById(marketEntry.corporation_id);
    if (!corporation) {
      return res.status(404).json({ error: 'Corporation not found' });
    }

    if (corporation.ceo_id !== userId) {
      return res.status(403).json({ error: 'Only the CEO can abandon sectors' });
    }

    const unitCounts = await BusinessUnitModel.getUnitCounts(entryId);
    const totalUnits = unitCounts.retail + unitCounts.production + unitCounts.service + unitCounts.extraction;

    await MarketEntryModel.delete(entryId);

    await TransactionModel.create({
      transaction_type: 'sector_abandon',
      amount: 0,
      from_user_id: userId,
      corporation_id: marketEntry.corporation_id,
      description: `Abandoned ${marketEntry.sector_type} sector in ${getStateLabel(marketEntry.state_code) || marketEntry.state_code} (${totalUnits} units removed)`,
      reference_id: entryId,
      reference_type: 'market_entry',
    });

    const newStockPrice = await updateStockPrice(marketEntry.corporation_id);

    res.json({
      success: true,
      message: `Abandoned ${marketEntry.sector_type} sector in ${getStateLabel(marketEntry.state_code) || marketEntry.state_code}`,
      market_entry_id: entryId,
      units_removed: totalUnits,
      new_stock_price: newStockPrice,
    });
  } catch (error) {
    console.error('Abandon sector error:', error);
    res.status(500).json({ error: 'Failed to abandon sector' });
  }
});

// GET /api/markets/resource/:name/history - Get price history for a commodity
router.get('/resource/:name/history', async (req: Request, res: Response) => {
  try {
    const resourceName = decodeURIComponent(req.params.name);
    const hours = parseInt(req.query.hours as string) || 96;
    const limit = parseInt(req.query.limit as string) || 1000;
    
    const history = await CommodityPriceHistoryModel.findByResourceName(
      resourceName,
      limit,
      hours
    );
    
    res.json(history);
  } catch (error) {
    console.error('Get commodity price history error:', error);
    res.status(500).json({ error: 'Failed to fetch commodity price history' });
  }
});

// GET /api/markets/product/:name/history - Get price history for a product
router.get('/product/:name/history', async (req: Request, res: Response) => {
  try {
    const productName = decodeURIComponent(req.params.name);
    const hours = parseInt(req.query.hours as string) || 96;
    const limit = parseInt(req.query.limit as string) || 1000;
    
    const history = await ProductPriceHistoryModel.findByProductName(
      productName,
      limit,
      hours
    );
    
    res.json(history);
  } catch (error) {
    console.error('Get product price history error:', error);
    res.status(500).json({ error: 'Failed to fetch product price history' });
  }
});

export default router;
