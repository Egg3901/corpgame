import express, { Request, Response, NextFunction } from 'express';
import multer, { FileFilterCallback } from 'multer';
import path from 'path';
import fs from 'fs';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { CorporationModel } from '../models/Corporation';
import { ShareholderModel } from '../models/Shareholder';
import { UserModel } from '../models/User';
import { TransactionModel } from '../models/Transaction';
import { normalizeImageUrl } from '../utils/imageUrl';
import { SECTORS, isValidSector, CORP_FOCUS_TYPES, isValidCorpFocus, CorpFocus } from '../constants/sectors';
import { MarketEntryModel } from '../models/MarketEntry';
import pool from '../db/connection';

const router = express.Router();

// Use '..', '..' to go from dist/routes/ to backend/uploads/ (same as server.ts serves)
const uploadsDir = path.join(__dirname, '..', '..', 'uploads');
const corporationsDir = path.join(uploadsDir, 'corporations');
fs.mkdirSync(corporationsDir, { recursive: true });

const allowedMimeToExt: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};

const storage = multer.diskStorage({
  destination: (_req: Request, _file, cb) => cb(null, corporationsDir),
  filename: (req: AuthRequest, file, cb) => {
    const ext = allowedMimeToExt[file.mimetype] || path.extname(file.originalname) || '.png';
    const corpId = (req.params.id || 'new') as string;
    const safeName = `corp-${corpId}-${Date.now()}${ext}`;
    cb(null, safeName);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
  fileFilter: (_req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
    if (!allowedMimeToExt[file.mimetype]) {
      return cb(new Error('Only JPG, PNG, or WEBP images are allowed'));
    }
    cb(null, true);
  },
});

type UploadRequest = AuthRequest & { file?: Express.Multer.File };
const uploadMiddleware = upload.single('logo');

// Helper to check if user is CEO of corporation
async function isCeo(corporationId: number, userId: number): Promise<boolean> {
  const corp = await CorporationModel.findById(corporationId);
  return corp?.ceo_id === userId;
}

// GET /api/corporation - List all corporations
router.get('/', async (req: Request, res: Response) => {
  try {
    const corporations = await CorporationModel.findAll();
    
    // Get all unique CEO IDs
    const ceoIds = [...new Set(corporations.map(c => c.ceo_id))];
    
    // Batch fetch all CEOs in a single query
    let ceoMap = new Map<number, any>();
    if (ceoIds.length > 0) {
      const ceoResult = await pool.query(
        `SELECT id, profile_id, username, player_name, profile_slug, profile_image_url 
         FROM users WHERE id = ANY($1)`,
        [ceoIds]
      );
      for (const ceo of ceoResult.rows) {
        ceoMap.set(ceo.id, {
          id: ceo.id,
          profile_id: ceo.profile_id,
          username: ceo.username,
          player_name: ceo.player_name,
          profile_slug: ceo.profile_slug,
          profile_image_url: normalizeImageUrl(ceo.profile_image_url),
        });
      }
    }
    
    // Build corporations with CEO details using pre-fetched data
    const corporationsWithCeo = corporations.map((corp) => ({
      ...corp,
      logo: normalizeImageUrl(corp.logo),
      ceo: ceoMap.get(corp.ceo_id) || null,
    }));
    
    res.json(corporationsWithCeo);
  } catch (error) {
    console.error('List corporations error:', error);
    res.status(500).json({ error: 'Failed to fetch corporations' });
  }
});

// GET /api/corporation/list - Paginated corporations with metrics, search, sorting, filtering
router.get('/list', async (req: Request, res: Response) => {
  try {
    const page = parseInt((req.query.page as string) || '1', 10);
    const limit = parseInt((req.query.limit as string) || '25', 10);
    const sort = (req.query.sort as string) || 'revenue';
    const dir = ((req.query.dir as string) || 'desc').toLowerCase() === 'asc' ? 'asc' : 'desc';
    const sector = (req.query.sector as string) || '';
    const q = (req.query.q as string) || '';
    const ceo = (req.query.ceo as string) || '';

    // Base query with optional filters
    let whereClauses: string[] = [];
    let params: any[] = [];
    let idx = 1;

    if (sector) {
      whereClauses.push(`type = $${idx++}`);
      params.push(sector);
    }
    if (q) {
      whereClauses.push(`LOWER(name) LIKE LOWER($${idx++})`);
      params.push(`%${q}%`);
    }
    let ceoFilterJoin = '';
    if (ceo) {
      ceoFilterJoin = 'JOIN users u ON u.id = c.ceo_id';
      whereClauses.push(`(LOWER(u.username) LIKE LOWER($${idx}) OR LOWER(u.player_name) LIKE LOWER($${idx}))`);
      params.push(`%${ceo}%`);
      idx++;
    }

    const whereSQL = whereClauses.length ? `WHERE ${whereClauses.join(' AND ')}` : '';

    // Count total
    const countResult = await pool.query(
      `SELECT COUNT(*)::int as total FROM corporations c ${ceoFilterJoin} ${whereSQL}`,
      params
    );
    const total = countResult.rows[0]?.total || 0;

    // Fetch all matching corporations (for sorting on computed metrics)
    const corpResult = await pool.query(
      `SELECT c.* FROM corporations c ${ceoFilterJoin} ${whereSQL}`,
      params
    );
    const corporations = corpResult.rows;

    // Batch CEO details
    const ceoIds = [...new Set(corporations.map((c: any) => c.ceo_id))];
    let ceoMap = new Map<number, any>();
    if (ceoIds.length > 0) {
      const ceoResult = await pool.query(
        `SELECT id, profile_id, username, player_name, profile_slug, profile_image_url FROM users WHERE id = ANY($1)`,
        [ceoIds]
      );
      for (const u of ceoResult.rows) {
        ceoMap.set(u.id, {
          id: u.id,
          profile_id: u.profile_id,
          username: u.username,
          player_name: u.player_name,
          profile_slug: u.profile_slug,
          profile_image_url: normalizeImageUrl(u.profile_image_url),
        });
      }
    }

    // Compute metrics (revenue/cost/profit 96h, assets/book, market cap)
    const itemsWithMetrics = await Promise.all(
      corporations.map(async (c: any) => {
        const financesResult = await MarketEntryModel.calculateCorporationFinances(c.id).catch(() => null);
        const { calculateBalanceSheet } = await import('../utils/valuation');
        const balanceSheet = await calculateBalanceSheet(c.id).catch(() => null);
        const marketCap = (Number(c.shares) || 0) * (Number(c.share_price) || 0);
        return {
          id: c.id,
          name: c.name,
          logo: normalizeImageUrl(c.logo),
          sector: c.type,
          ceo: ceoMap.get(c.ceo_id) || null,
          shares: c.shares,
          share_price: c.share_price,
          market_cap: marketCap,
          revenue_96h: financesResult?.display_revenue || 0,
          costs_96h: financesResult?.display_costs || 0,
          profit_96h: financesResult?.display_profit || 0,
          assets: balanceSheet?.totalAssets || 0,
          book_value: balanceSheet?.shareholdersEquity || 0,
        };
      })
    );

    // Sorting
    const sortKey = (
      ['revenue', 'profit', 'assets', 'market_cap', 'share_price', 'book_value', 'name'] as const
    ).includes(sort as any)
      ? sort
      : 'revenue';
    const keyMap: Record<string, (x: any) => number | string> = {
      revenue: (x) => x.revenue_96h,
      profit: (x) => x.profit_96h,
      assets: (x) => x.assets,
      market_cap: (x) => x.market_cap,
      share_price: (x) => x.share_price,
      book_value: (x) => x.book_value,
      name: (x) => x.name,
    };
    itemsWithMetrics.sort((a, b) => {
      const ka = keyMap[sortKey](a);
      const kb = keyMap[sortKey](b);
      if (typeof ka === 'string' && typeof kb === 'string') {
        return dir === 'asc' ? String(ka).localeCompare(String(kb)) : String(kb).localeCompare(String(ka));
      }
      return dir === 'asc' ? Number(ka) - Number(kb) : Number(kb) - Number(ka);
    });

    // Pagination
    const start = (page - 1) * limit;
    const end = start + limit;
    const pageItems = itemsWithMetrics.slice(start, end);

    res.json({
      items: pageItems,
      total,
      page,
      limit,
      available_metrics: ['revenue', 'profit', 'assets', 'market_cap', 'share_price', 'book_value'],
      sectors: SECTORS,
    });
  } catch (error) {
    console.error('Corporations list error:', error);
    res.status(500).json({ error: 'Failed to fetch corporations list' });
  }
});

// GET /api/corporation/:id - Get corporation details with shareholders
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid corporation ID' });
    }

    const corporation = await CorporationModel.findById(id);
    if (!corporation) {
      return res.status(404).json({ error: 'Corporation not found' });
    }

    // Get shareholders
    const shareholders = await ShareholderModel.findByCorporationId(id);
    
    // Batch fetch all users (shareholders + CEO) in a single query
    const userIds = [...new Set([...shareholders.map(sh => sh.user_id), corporation.ceo_id])];
    let userMap = new Map<number, any>();
    if (userIds.length > 0) {
      const userResult = await pool.query(
        `SELECT id, profile_id, username, player_name, profile_slug, profile_image_url 
         FROM users WHERE id = ANY($1)`,
        [userIds]
      );
      for (const user of userResult.rows) {
        userMap.set(user.id, {
          id: user.id,
          profile_id: user.profile_id,
          username: user.username,
          player_name: user.player_name,
          profile_slug: user.profile_slug,
          profile_image_url: normalizeImageUrl(user.profile_image_url),
        });
      }
    }
    
    // Build shareholders with user details using pre-fetched data
    const shareholdersWithUsers = shareholders.map((sh) => ({
      ...sh,
      user: userMap.get(sh.user_id) || null,
    }));

    const ceo = userMap.get(corporation.ceo_id);

    res.json({
      ...corporation,
      logo: normalizeImageUrl(corporation.logo),
      ceo: ceo || null,
      shareholders: shareholdersWithUsers,
    });
  } catch (error) {
    console.error('Get corporation error:', error);
    res.status(500).json({ error: 'Failed to fetch corporation' });
  }
});

// POST /api/corporation - Create corporation
router.post('/', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { name, type, focus } = req.body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return res.status(400).json({ error: 'Corporation name is required' });
    }

    // Validate sector if provided
    if (type && !isValidSector(type.trim())) {
      return res.status(400).json({ 
        error: `Invalid sector: "${type}". Must be one of: ${SECTORS.join(', ')}`,
        valid_sectors: SECTORS,
      });
    }

    // Validate focus if provided
    const corpFocus: CorpFocus = focus || 'diversified';
    if (!isValidCorpFocus(corpFocus)) {
      return res.status(400).json({ 
        error: `Invalid focus: "${focus}". Must be one of: ${CORP_FOCUS_TYPES.join(', ')}`,
        valid_focus_types: CORP_FOCUS_TYPES,
      });
    }

    // Check if user already has a corporation
    const existingCorporations = await CorporationModel.findByCeoId(userId);
    if (existingCorporations.length > 0) {
      return res.status(400).json({ 
        error: 'You can only be CEO of one corporation at a time',
        existingCorporation: {
          id: existingCorporations[0].id,
          name: existingCorporations[0].name,
        }
      });
    }

    // Create corporation with defaults: 500k shares, 100k public, $1.00 price, 500k capital
    const corporation = await CorporationModel.create({
      ceo_id: userId,
      name: name.trim(),
      type: type?.trim() || null,
      focus: corpFocus,
      shares: 500000,
      public_shares: 100000,
      share_price: 1.00,
      capital: 500000.00,
    });

    // Create shareholder record for CEO with 400,000 shares (80%)
    await ShareholderModel.create({
      corporation_id: corporation.id,
      user_id: userId,
      shares: 400000,
    });

    // Record corporation founding transaction
    await TransactionModel.create({
      transaction_type: 'corp_founding',
      amount: 500000, // Initial capital
      from_user_id: userId,
      corporation_id: corporation.id,
      description: `Founded ${corporation.name} with $500,000 initial capital`,
    });

    res.status(201).json(corporation);
  } catch (error: any) {
    console.error('Create corporation error:', error);
    // Handle validation errors from the model
    if (error.message?.includes('Invalid sector') || error.message?.includes('Invalid focus')) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to create corporation' });
  }
});

// POST /api/corporation/:id/logo - Upload corporation logo
router.post('/:id/logo', authenticateToken, (req: AuthRequest, res: Response, next: NextFunction) => {
  console.log('Logo upload request received for corporation:', req.params.id);
  console.log('Corporations upload directory:', corporationsDir, '- exists:', fs.existsSync(corporationsDir));
  
  uploadMiddleware(req as Request, res, async (err: any) => {
    if (err) {
      console.error('Logo upload middleware error:', err);
      if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'Image is too large (max 2MB)' });
      }
      return res.status(400).json({ error: err.message || 'Invalid file upload' });
    }
    
    // Check if user is CEO
    const corpId = parseInt(req.params.id, 10);
    if (isNaN(corpId)) {
      return res.status(400).json({ error: 'Invalid corporation ID' });
    }

    const userId = req.userId!;
    const ceoCheck = await isCeo(corpId, userId);
    if (!ceoCheck) {
      return res.status(403).json({ error: 'Only the CEO can upload the logo' });
    }

    next();
  });
}, async (req: UploadRequest, res: Response) => {
  try {
    console.log('Processing logo upload...');
    if (!req.file) {
      console.error('No file in request');
      return res.status(400).json({ error: 'No file uploaded' });
    }

    console.log('File received:', {
      filename: req.file.filename,
      originalname: req.file.originalname,
      size: req.file.size,
      mimetype: req.file.mimetype,
      path: req.file.path
    });

    const corpId = parseInt(req.params.id, 10);
    const relativePath = `/uploads/corporations/${req.file.filename}`;
    console.log('Generated relative path:', relativePath);

    // Verify file was actually written
    const fullPath = path.join(corporationsDir, req.file.filename);
    console.log('Full file path:', fullPath, '- exists:', fs.existsSync(fullPath));

    // Remove old logo if present
    const existing = await CorporationModel.findById(corpId);
    console.log('Existing corporation logo:', existing?.logo);
    if (existing?.logo) {
      const absoluteOld = path.join(corporationsDir, path.basename(existing.logo));
      console.log('Removing old logo at:', absoluteOld);
      try {
        if (fs.existsSync(absoluteOld)) {
          fs.unlinkSync(absoluteOld);
        }
      } catch (err) {
        console.warn('Could not remove old logo:', err);
      }
    }

    // Update corporation with new logo path
    console.log('Updating database with new logo path...');
    const updated = await CorporationModel.update(corpId, { logo: relativePath });
    if (!updated) {
      return res.status(404).json({ error: 'Corporation not found' });
    }

    console.log('Logo upload successful, returning:', { logo: relativePath });
    res.json({ logo: relativePath });
  } catch (error) {
    console.error('Logo upload error:', error);
    res.status(500).json({ error: 'Failed to upload logo' });
  }
});

// PATCH /api/corporation/:id - Update corporation
router.patch('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid corporation ID' });
    }

    const userId = req.userId!;
    const ceoCheck = await isCeo(id, userId);
    if (!ceoCheck) {
      return res.status(403).json({ error: 'Only the CEO can update the corporation' });
    }

    // Get current user to check admin status
    const user = await UserModel.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const updates: any = {};
    
    // Handle name change - costs 10 actions (admins bypass)
    if (req.body.name !== undefined) {
      const corporation = await CorporationModel.findById(id);
      if (!corporation) {
        return res.status(404).json({ error: 'Corporation not found' });
      }
      
      // Only charge actions if name is actually changing
      if (req.body.name.trim() !== corporation.name) {
        const NAME_CHANGE_COST = 10;
        
        // Check if user is admin (admins bypass action cost)
        if (!user.is_admin) {
          const currentActions = await UserModel.getActions(userId);
          if (currentActions < NAME_CHANGE_COST) {
            return res.status(400).json({ 
              error: `Changing corporation name requires ${NAME_CHANGE_COST} actions. You have ${currentActions} actions.`,
              actions_required: NAME_CHANGE_COST,
              actions_available: currentActions
            });
          }
          
          // Deduct actions
          await UserModel.updateActions(userId, -NAME_CHANGE_COST);
        }
        
        updates.name = req.body.name.trim();
      }
    }
    
    if (req.body.type !== undefined) {
      // Validate sector
      if (req.body.type !== null && !isValidSector(req.body.type)) {
        return res.status(400).json({ 
          error: `Invalid sector: "${req.body.type}". Must be one of: ${SECTORS.join(', ')}`,
          valid_sectors: SECTORS,
        });
      }
      updates.type = req.body.type;
    }
    if (req.body.focus !== undefined) {
      // Validate focus
      if (!isValidCorpFocus(req.body.focus)) {
        return res.status(400).json({ 
          error: `Invalid focus: "${req.body.focus}". Must be one of: ${CORP_FOCUS_TYPES.join(', ')}`,
          valid_focus_types: CORP_FOCUS_TYPES,
        });
      }
      updates.focus = req.body.focus;
    }
    if (req.body.share_price !== undefined) {
      const price = parseFloat(req.body.share_price);
      if (isNaN(price) || price < 1.00) {
        return res.status(400).json({ error: 'Share price must be at least $1.00' });
      }
      updates.share_price = price;
    }

    const updated = await CorporationModel.update(id, updates);
    if (!updated) {
      return res.status(404).json({ error: 'Corporation not found' });
    }

    res.json(updated);
  } catch (error) {
    console.error('Update corporation error:', error);
    res.status(500).json({ error: 'Failed to update corporation' });
  }
});

// DELETE /api/corporation/:id - Delete corporation
router.delete('/:id', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid corporation ID' });
    }

    const userId = req.userId!;
    const ceoCheck = await isCeo(id, userId);
    if (!ceoCheck) {
      return res.status(403).json({ error: 'Only the CEO can delete the corporation' });
    }

    await CorporationModel.delete(id);
    res.status(204).send();
  } catch (error) {
    console.error('Delete corporation error:', error);
    res.status(500).json({ error: 'Failed to delete corporation' });
  }
});

export default router;

