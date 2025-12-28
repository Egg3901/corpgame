import express, { Request, Response } from 'express';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { CorporateActionModel, ActionType } from '../models/CorporateAction';
import { CorporationModel } from '../models/Corporation';
import { TransactionModel } from '../models/Transaction';
import pool from '../db/connection';

const router = express.Router();

// Helper to check if user is CEO of corporation
async function isCeo(corporationId: number, userId: number): Promise<boolean> {
  const corp = await CorporationModel.findById(corporationId);
  return corp?.ceo_id === userId;
}

// Calculate market capitalization
async function getMarketCapitalization(corporationId: number): Promise<number> {
  const corp = await CorporationModel.findById(corporationId);
  if (!corp) return 0;
  return corp.shares * corp.share_price;
}

// Calculate cost for an action: $500,000 + 1% of market cap
function calculateActionCost(marketCap: number): number {
  return 500000 + (marketCap * 0.01);
}

// GET /api/corporate-actions/:corporationId - Get all corporate actions for a corporation
router.get('/:corporationId', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const corporationId = parseInt(req.params.corporationId, 10);
    if (isNaN(corporationId)) {
      return res.status(400).json({ error: 'Invalid corporation ID' });
    }

    const actions = await CorporateActionModel.findByCorporationId(corporationId);
    res.json(actions);
  } catch (error) {
    console.error('Get corporate actions error:', error);
    res.status(500).json({ error: 'Failed to fetch corporate actions' });
  }
});

// GET /api/corporate-actions/:corporationId/active - Get active actions for a corporation
router.get('/:corporationId/active', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const corporationId = parseInt(req.params.corporationId, 10);
    if (isNaN(corporationId)) {
      return res.status(400).json({ error: 'Invalid corporation ID' });
    }

    const actions = await CorporateActionModel.findAllActiveActions(corporationId);
    res.json(actions);
  } catch (error) {
    console.error('Get active corporate actions error:', error);
    res.status(500).json({ error: 'Failed to fetch active corporate actions' });
  }
});

// POST /api/corporate-actions/:corporationId/supply-rush - Activate supply rush
router.post('/:corporationId/supply-rush', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const corporationId = parseInt(req.params.corporationId, 10);
    if (isNaN(corporationId)) {
      return res.status(400).json({ error: 'Invalid corporation ID' });
    }

    const userId = req.userId!;
    
    // Check if user is CEO
    const ceoCheck = await isCeo(corporationId, userId);
    if (!ceoCheck) {
      return res.status(403).json({ error: 'Only the CEO can activate corporate actions' });
    }

    // Check if already active
    const hasActive = await CorporateActionModel.hasActiveAction(corporationId, 'supply_rush');
    if (hasActive) {
      const activeAction = await CorporateActionModel.findActiveAction(corporationId, 'supply_rush');
      return res.status(400).json({ 
        error: 'Supply rush is already active',
        expiresAt: activeAction?.expires_at
      });
    }

    // Calculate cost
    const marketCap = await getMarketCapitalization(corporationId);
    const cost = calculateActionCost(marketCap);

    // Check if corporation has enough capital
    const corp = await CorporationModel.findById(corporationId);
    if (!corp) {
      return res.status(404).json({ error: 'Corporation not found' });
    }

    if (corp.capital < cost) {
      return res.status(400).json({ 
        error: 'Insufficient capital',
        required: cost,
        available: corp.capital
      });
    }

    // Deduct cost from corporation capital
    await CorporationModel.update(corporationId, { 
      capital: corp.capital - cost 
    });

    // Create action (expires in 4 hours)
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 4);

    const action = await CorporateActionModel.create({
      corporation_id: corporationId,
      action_type: 'supply_rush',
      cost,
      expires_at: expiresAt,
    });

    // Record transaction
    await TransactionModel.create({
      transaction_type: 'corporate_action',
      amount: -cost,
      from_user_id: userId,
      corporation_id: corporationId,
      description: `Supply Rush activated - ${formatCost(cost)}`,
    });

    res.status(201).json(action);
  } catch (error) {
    console.error('Activate supply rush error:', error);
    res.status(500).json({ error: 'Failed to activate supply rush' });
  }
});

// POST /api/corporate-actions/:corporationId/marketing-campaign - Activate marketing campaign
router.post('/:corporationId/marketing-campaign', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const corporationId = parseInt(req.params.corporationId, 10);
    if (isNaN(corporationId)) {
      return res.status(400).json({ error: 'Invalid corporation ID' });
    }

    const userId = req.userId!;
    
    // Check if user is CEO
    const ceoCheck = await isCeo(corporationId, userId);
    if (!ceoCheck) {
      return res.status(403).json({ error: 'Only the CEO can activate corporate actions' });
    }

    // Check if already active
    const hasActive = await CorporateActionModel.hasActiveAction(corporationId, 'marketing_campaign');
    if (hasActive) {
      const activeAction = await CorporateActionModel.findActiveAction(corporationId, 'marketing_campaign');
      return res.status(400).json({ 
        error: 'Marketing campaign is already active',
        expiresAt: activeAction?.expires_at
      });
    }

    // Calculate cost
    const marketCap = await getMarketCapitalization(corporationId);
    const cost = calculateActionCost(marketCap);

    // Check if corporation has enough capital
    const corp = await CorporationModel.findById(corporationId);
    if (!corp) {
      return res.status(404).json({ error: 'Corporation not found' });
    }

    if (corp.capital < cost) {
      return res.status(400).json({ 
        error: 'Insufficient capital',
        required: cost,
        available: corp.capital
      });
    }

    // Deduct cost from corporation capital
    await CorporationModel.update(corporationId, { 
      capital: corp.capital - cost 
    });

    // Create action (expires in 4 hours)
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 4);

    const action = await CorporateActionModel.create({
      corporation_id: corporationId,
      action_type: 'marketing_campaign',
      cost,
      expires_at: expiresAt,
    });

    // Record transaction
    await TransactionModel.create({
      transaction_type: 'corporate_action',
      amount: -cost,
      from_user_id: userId,
      corporation_id: corporationId,
      description: `Marketing Campaign activated - ${formatCost(cost)}`,
    });

    res.status(201).json(action);
  } catch (error) {
    console.error('Activate marketing campaign error:', error);
    res.status(500).json({ error: 'Failed to activate marketing campaign' });
  }
});

// Helper function to format cost
function formatCost(cost: number): string {
  return `$${cost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default router;

