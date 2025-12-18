import express, { Request, Response } from 'express';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { MarketEntryModel } from '../models/MarketEntry';
import { BusinessUnitModel } from '../models/BusinessUnit';
import { CorporationModel } from '../models/Corporation';
import { UserModel } from '../models/User';
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
  MARKET_ENTRY_COST,
  MARKET_ENTRY_ACTIONS,
  BUILD_UNIT_COST,
  BUILD_UNIT_ACTIONS,
} from '../constants/sectors';
import pool from '../db/connection';
import { calculateBalanceSheet, updateStockPrice } from '../utils/valuation';

const router = express.Router();

// GET /api/markets/states - List all states with region grouping
router.get('/states', async (req: Request, res: Response) => {
  try {
    // Get state metadata from database
    const stateMetaResult = await pool.query('SELECT * FROM state_metadata ORDER BY name');
    const stateMeta = stateMetaResult.rows;

    // Group states by region
    const statesByRegion: Record<string, Array<{
      code: string;
      name: string;
      region: string;
      multiplier: number;
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

    // Get all market entries for this state
    const marketEntries = await MarketEntryModel.findByStateCode(stateCode);

    // Get corporation details for each entry
    const marketsWithDetails = await Promise.all(
      marketEntries.map(async (entry) => {
        const corp = await CorporationModel.findById(entry.corporation_id);
        const units = await BusinessUnitModel.getUnitCounts(entry.id);
        return {
          ...entry,
          corporation: corp ? {
            id: corp.id,
            name: corp.name,
            logo: corp.logo,
          } : null,
          units,
        };
      })
    );

    // Get user's corporation if they are CEO
    const userId = req.userId!;
    const userCorps = await CorporationModel.findByCeoId(userId);
    const userCorp = userCorps.length > 0 ? userCorps[0] : null;

    // Get user's market entries in this state
    let userMarketEntries: any[] = [];
    if (userCorp) {
      const entries = await MarketEntryModel.findByCorpAndState(userCorp.id, stateCode);
      userMarketEntries = await Promise.all(
        entries.map(async (entry) => {
          const units = await BusinessUnitModel.getUnitCounts(entry.id);
          return { ...entry, units };
        })
      );
    }

    res.json({
      state: {
        code: stateMeta.state_code,
        name: stateMeta.name,
        region: stateMeta.region,
        multiplier: parseFloat(stateMeta.population_multiplier),
      },
      markets: marketsWithDetails,
      sectors: SECTORS,
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

    res.status(201).json({
      success: true,
      market_entry: marketEntry,
      capital_deducted: MARKET_ENTRY_COST,
      actions_deducted: MARKET_ENTRY_ACTIONS,
      new_capital: corporation.capital - MARKET_ENTRY_COST,
    });
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
      return res.status(400).json({ error: 'Invalid unit type. Must be retail, production, or service' });
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

    // Build unit (increment count)
    const unit = await BusinessUnitModel.incrementUnit(entryId, unit_type, 1);

    // Get updated unit counts
    const unitCounts = await BusinessUnitModel.getUnitCounts(entryId);

    // Update stock price since asset value changed
    const newStockPrice = await updateStockPrice(marketEntry.corporation_id);

    res.json({
      success: true,
      unit,
      unit_counts: unitCounts,
      capital_deducted: BUILD_UNIT_COST,
      actions_deducted: BUILD_UNIT_ACTIONS,
      new_capital: corporation.capital - BUILD_UNIT_COST,
      new_stock_price: newStockPrice,
    });
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

    // Check corporation exists
    const corporation = await CorporationModel.findById(corpId);
    if (!corporation) {
      return res.status(404).json({ error: 'Corporation not found' });
    }

    // Calculate finances and balance sheet
    const [finances, balanceSheet] = await Promise.all([
      MarketEntryModel.calculateCorporationFinances(corpId),
      calculateBalanceSheet(corpId),
    ]);

    // Get market entries with details
    const entries = await MarketEntryModel.findByCorporationIdWithUnits(corpId);

    const marketsWithDetails = await Promise.all(
      entries.map(async (entry) => {
        const stateMeta = await pool.query(
          'SELECT * FROM state_metadata WHERE state_code = $1',
          [entry.state_code]
        );
        return {
          ...entry,
          state_name: stateMeta.rows[0]?.name || entry.state_code,
          state_multiplier: parseFloat(stateMeta.rows[0]?.population_multiplier || '1'),
        };
      })
    );

    res.json({
      corporation_id: corpId,
      finances,
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

    const marketsWithDetails = await Promise.all(
      entries.map(async (entry) => {
        const stateMeta = await pool.query(
          'SELECT * FROM state_metadata WHERE state_code = $1',
          [entry.state_code]
        );
        return {
          ...entry,
          state_name: stateMeta.rows[0]?.name || entry.state_code,
          state_region: stateMeta.rows[0]?.region || 'Unknown',
          state_multiplier: parseFloat(stateMeta.rows[0]?.population_multiplier || '1'),
        };
      })
    );

    res.json(marketsWithDetails);
  } catch (error) {
    console.error('Get corporation entries error:', error);
    res.status(500).json({ error: 'Failed to fetch corporation market entries' });
  }
});

export default router;
