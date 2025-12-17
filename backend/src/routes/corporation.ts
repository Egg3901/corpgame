import express, { Request, Response, NextFunction } from 'express';
import multer, { FileFilterCallback } from 'multer';
import path from 'path';
import fs from 'fs';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { CorporationModel } from '../models/Corporation';
import { ShareholderModel } from '../models/Shareholder';
import { UserModel } from '../models/User';
import { normalizeImageUrl } from '../utils/imageUrl';

const router = express.Router();

const uploadsDir = path.join(__dirname, '..', 'uploads');
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
    
    // Get CEO details for each corporation
    const corporationsWithCeo = await Promise.all(
      corporations.map(async (corp) => {
        const ceo = await UserModel.findById(corp.ceo_id);
        return {
          ...corp,
          ceo: ceo ? {
            id: ceo.id,
            profile_id: ceo.profile_id,
            username: ceo.username,
            player_name: ceo.player_name,
            profile_slug: ceo.profile_slug,
            profile_image_url: normalizeImageUrl(ceo.profile_image_url),
          } : null,
        };
      })
    );
    
    res.json(corporationsWithCeo);
  } catch (error) {
    console.error('List corporations error:', error);
    res.status(500).json({ error: 'Failed to fetch corporations' });
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
    
    // Get user details for shareholders
    const shareholdersWithUsers = await Promise.all(
      shareholders.map(async (sh) => {
        const user = await UserModel.findById(sh.user_id);
        return {
          ...sh,
          user: user ? {
            id: user.id,
            profile_id: user.profile_id,
            username: user.username,
            player_name: user.player_name,
            profile_slug: user.profile_slug,
            profile_image_url: normalizeImageUrl(user.profile_image_url),
          } : null,
        };
      })
    );

    // Get CEO details
    const ceo = await UserModel.findById(corporation.ceo_id);

    res.json({
      ...corporation,
      ceo: ceo ? {
        id: ceo.id,
        profile_id: ceo.profile_id,
        username: ceo.username,
        player_name: ceo.player_name,
        profile_slug: ceo.profile_slug,
        profile_image_url: ceo.profile_image_url,
      } : null,
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
    const { name, type } = req.body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return res.status(400).json({ error: 'Corporation name is required' });
    }

    // Create corporation with defaults: 500k shares, 100k public, $1.00 price, 500k capital
    const corporation = await CorporationModel.create({
      ceo_id: userId,
      name: name.trim(),
      type: type?.trim() || null,
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

    res.status(201).json(corporation);
  } catch (error) {
    console.error('Create corporation error:', error);
    res.status(500).json({ error: 'Failed to create corporation' });
  }
});

// POST /api/corporation/:id/logo - Upload corporation logo
router.post('/:id/logo', authenticateToken, (req: AuthRequest, res: Response, next: NextFunction) => {
  uploadMiddleware(req as Request, res, async (err: any) => {
    if (err) {
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
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const corpId = parseInt(req.params.id, 10);
    const relativePath = `/uploads/corporations/${req.file.filename}`;

    // Remove old logo if present
    const existing = await CorporationModel.findById(corpId);
    if (existing?.logo) {
      const absoluteOld = path.join(corporationsDir, path.basename(existing.logo));
      try {
        if (fs.existsSync(absoluteOld)) {
          fs.unlinkSync(absoluteOld);
        }
      } catch (err) {
        console.warn('Could not remove old logo:', err);
      }
    }

    // Update corporation with new logo path
    const updated = await CorporationModel.update(corpId, { logo: relativePath });
    if (!updated) {
      return res.status(404).json({ error: 'Corporation not found' });
    }

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

    const updates: any = {};
    if (req.body.name !== undefined) updates.name = req.body.name;
    if (req.body.type !== undefined) updates.type = req.body.type;
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
