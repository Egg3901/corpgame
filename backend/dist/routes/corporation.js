"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const auth_1 = require("../middleware/auth");
const Corporation_1 = require("../models/Corporation");
const Shareholder_1 = require("../models/Shareholder");
const User_1 = require("../models/User");
const Transaction_1 = require("../models/Transaction");
const imageUrl_1 = require("../utils/imageUrl");
const sectors_1 = require("../constants/sectors");
const MarketEntry_1 = require("../models/MarketEntry");
const connection_1 = __importDefault(require("../db/connection"));
const router = express_1.default.Router();
// Use '..', '..' to go from dist/routes/ to backend/uploads/ (same as server.ts serves)
const uploadsDir = path_1.default.join(__dirname, '..', '..', 'uploads');
const corporationsDir = path_1.default.join(uploadsDir, 'corporations');
fs_1.default.mkdirSync(corporationsDir, { recursive: true });
const allowedMimeToExt = {
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/webp': '.webp',
};
const storage = multer_1.default.diskStorage({
    destination: (_req, _file, cb) => cb(null, corporationsDir),
    filename: (req, file, cb) => {
        const ext = allowedMimeToExt[file.mimetype] || path_1.default.extname(file.originalname) || '.png';
        const corpId = (req.params.id || 'new');
        const safeName = `corp-${corpId}-${Date.now()}${ext}`;
        cb(null, safeName);
    },
});
const upload = (0, multer_1.default)({
    storage,
    limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
    fileFilter: (_req, file, cb) => {
        if (!allowedMimeToExt[file.mimetype]) {
            return cb(new Error('Only JPG, PNG, or WEBP images are allowed'));
        }
        cb(null, true);
    },
});
const uploadMiddleware = upload.single('logo');
// Helper to check if user is CEO of corporation
async function isCeo(corporationId, userId) {
    const corp = await Corporation_1.CorporationModel.findById(corporationId);
    return corp?.ceo_id === userId;
}
// GET /api/corporation - List all corporations
router.get('/', async (req, res) => {
    try {
        const corporations = await Corporation_1.CorporationModel.findAll();
        // Get all unique CEO IDs
        const ceoIds = [...new Set(corporations.map(c => c.ceo_id))];
        const corpIds = corporations.map(c => c.id);
        // Batch fetch all CEOs in a single query
        let ceoMap = new Map();
        if (ceoIds.length > 0) {
            const ceoResult = await connection_1.default.query(`SELECT id, profile_id, username, player_name, profile_slug, profile_image_url
         FROM users WHERE id = ANY($1)`, [ceoIds]);
            for (const ceo of ceoResult.rows) {
                ceoMap.set(ceo.id, {
                    id: ceo.id,
                    profile_id: ceo.profile_id,
                    username: ceo.username,
                    player_name: ceo.player_name,
                    profile_slug: ceo.profile_slug,
                    profile_image_url: (0, imageUrl_1.normalizeImageUrl)(ceo.profile_image_url),
                });
            }
        }
        // Batch fetch 4-hour price change for all corporations
        // Gets the oldest price within the last 4 hours for each corporation
        let priceChangeMap = new Map();
        if (corpIds.length > 0) {
            const priceResult = await connection_1.default.query(`SELECT DISTINCT ON (corporation_id)
           corporation_id, share_price
         FROM share_price_history
         WHERE corporation_id = ANY($1)
           AND recorded_at >= NOW() - INTERVAL '4 hours'
         ORDER BY corporation_id, recorded_at ASC`, [corpIds]);
            for (const row of priceResult.rows) {
                const oldPrice = parseFloat(row.share_price);
                priceChangeMap.set(row.corporation_id, oldPrice);
            }
        }
        // Build corporations with CEO details and price change using pre-fetched data
        const corporationsWithCeo = corporations.map((corp) => {
            const oldPrice = priceChangeMap.get(corp.id);
            const priceChange4h = oldPrice && oldPrice > 0
                ? ((corp.share_price - oldPrice) / oldPrice) * 100
                : 0;
            return {
                ...corp,
                logo: (0, imageUrl_1.normalizeImageUrl)(corp.logo),
                ceo: ceoMap.get(corp.ceo_id) || null,
                price_change_4h: priceChange4h,
            };
        });
        res.json(corporationsWithCeo);
    }
    catch (error) {
        console.error('List corporations error:', error);
        res.status(500).json({ error: 'Failed to fetch corporations' });
    }
});
// GET /api/corporation/list - Paginated corporations with metrics, search, sorting, filtering
router.get('/list', async (req, res) => {
    try {
        const page = parseInt(req.query.page || '1', 10);
        const limit = parseInt(req.query.limit || '25', 10);
        const sort = req.query.sort || 'revenue';
        const dir = (req.query.dir || 'desc').toLowerCase() === 'asc' ? 'asc' : 'desc';
        const sector = req.query.sector || '';
        const q = req.query.q || '';
        const ceo = req.query.ceo || '';
        // Base query with optional filters
        let whereClauses = [];
        let params = [];
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
        const countResult = await connection_1.default.query(`SELECT COUNT(*)::int as total FROM corporations c ${ceoFilterJoin} ${whereSQL}`, params);
        const total = countResult.rows[0]?.total || 0;
        // Fetch all matching corporations (for sorting on computed metrics)
        const corpResult = await connection_1.default.query(`SELECT c.* FROM corporations c ${ceoFilterJoin} ${whereSQL}`, params);
        const corporations = corpResult.rows;
        // Batch CEO details
        const ceoIds = [...new Set(corporations.map((c) => c.ceo_id))];
        let ceoMap = new Map();
        if (ceoIds.length > 0) {
            const ceoResult = await connection_1.default.query(`SELECT id, profile_id, username, player_name, profile_slug, profile_image_url FROM users WHERE id = ANY($1)`, [ceoIds]);
            for (const u of ceoResult.rows) {
                ceoMap.set(u.id, {
                    id: u.id,
                    profile_id: u.profile_id,
                    username: u.username,
                    player_name: u.player_name,
                    profile_slug: u.profile_slug,
                    profile_image_url: (0, imageUrl_1.normalizeImageUrl)(u.profile_image_url),
                });
            }
        }
        // Compute metrics (revenue/cost/profit 96h, assets/book, market cap)
        const itemsWithMetrics = await Promise.all(corporations.map(async (c) => {
            const financesResult = await MarketEntry_1.MarketEntryModel.calculateCorporationFinances(c.id).catch(() => null);
            const { calculateBalanceSheet } = await Promise.resolve().then(() => __importStar(require('../utils/valuation')));
            const balanceSheet = await calculateBalanceSheet(c.id).catch(() => null);
            const marketCap = (Number(c.shares) || 0) * (Number(c.share_price) || 0);
            return {
                id: c.id,
                name: c.name,
                logo: (0, imageUrl_1.normalizeImageUrl)(c.logo),
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
        }));
        // Sorting
        const sortKey = ['revenue', 'profit', 'assets', 'market_cap', 'share_price', 'book_value', 'name'].includes(sort)
            ? sort
            : 'revenue';
        const keyMap = {
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
            sectors: sectors_1.SECTORS,
        });
    }
    catch (error) {
        console.error('Corporations list error:', error);
        res.status(500).json({ error: 'Failed to fetch corporations list' });
    }
});
// GET /api/corporation/:id - Get corporation details with shareholders
router.get('/:id', async (req, res) => {
    try {
        const id = parseInt(req.params.id, 10);
        if (isNaN(id)) {
            return res.status(400).json({ error: 'Invalid corporation ID' });
        }
        const corporation = await Corporation_1.CorporationModel.findById(id);
        if (!corporation) {
            return res.status(404).json({ error: 'Corporation not found' });
        }
        // Get shareholders
        const shareholders = await Shareholder_1.ShareholderModel.findByCorporationId(id);
        // Batch fetch all users (shareholders + CEO) in a single query
        const userIds = [...new Set([...shareholders.map(sh => sh.user_id), corporation.ceo_id])];
        let userMap = new Map();
        if (userIds.length > 0) {
            const userResult = await connection_1.default.query(`SELECT id, profile_id, username, player_name, profile_slug, profile_image_url 
         FROM users WHERE id = ANY($1)`, [userIds]);
            for (const user of userResult.rows) {
                userMap.set(user.id, {
                    id: user.id,
                    profile_id: user.profile_id,
                    username: user.username,
                    player_name: user.player_name,
                    profile_slug: user.profile_slug,
                    profile_image_url: (0, imageUrl_1.normalizeImageUrl)(user.profile_image_url),
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
            logo: (0, imageUrl_1.normalizeImageUrl)(corporation.logo),
            ceo: ceo || null,
            shareholders: shareholdersWithUsers,
        });
    }
    catch (error) {
        console.error('Get corporation error:', error);
        res.status(500).json({ error: 'Failed to fetch corporation' });
    }
});
// POST /api/corporation - Create corporation
router.post('/', auth_1.authenticateToken, async (req, res) => {
    try {
        const userId = req.userId;
        const { name, type, focus } = req.body;
        if (!name || typeof name !== 'string' || name.trim().length === 0) {
            return res.status(400).json({ error: 'Corporation name is required' });
        }
        // Validate sector if provided
        if (type && !(0, sectors_1.isValidSector)(type.trim())) {
            return res.status(400).json({
                error: `Invalid sector: "${type}". Must be one of: ${sectors_1.SECTORS.join(', ')}`,
                valid_sectors: sectors_1.SECTORS,
            });
        }
        // Validate focus if provided
        const corpFocus = focus || 'diversified';
        if (!(0, sectors_1.isValidCorpFocus)(corpFocus)) {
            return res.status(400).json({
                error: `Invalid focus: "${focus}". Must be one of: ${sectors_1.CORP_FOCUS_TYPES.join(', ')}`,
                valid_focus_types: sectors_1.CORP_FOCUS_TYPES,
            });
        }
        // Check if user already has a corporation
        const existingCorporations = await Corporation_1.CorporationModel.findByCeoId(userId);
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
        const corporation = await Corporation_1.CorporationModel.create({
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
        await Shareholder_1.ShareholderModel.create({
            corporation_id: corporation.id,
            user_id: userId,
            shares: 400000,
        });
        // Record corporation founding transaction
        await Transaction_1.TransactionModel.create({
            transaction_type: 'corp_founding',
            amount: 500000, // Initial capital
            from_user_id: userId,
            corporation_id: corporation.id,
            description: `Founded ${corporation.name} with $500,000 initial capital`,
        });
        res.status(201).json(corporation);
    }
    catch (error) {
        console.error('Create corporation error:', error);
        // Handle validation errors from the model
        if (error.message?.includes('Invalid sector') || error.message?.includes('Invalid focus')) {
            return res.status(400).json({ error: error.message });
        }
        res.status(500).json({ error: 'Failed to create corporation' });
    }
});
// POST /api/corporation/:id/logo - Upload corporation logo
router.post('/:id/logo', auth_1.authenticateToken, (req, res, next) => {
    console.log('Logo upload request received for corporation:', req.params.id);
    console.log('Corporations upload directory:', corporationsDir, '- exists:', fs_1.default.existsSync(corporationsDir));
    uploadMiddleware(req, res, async (err) => {
        if (err) {
            console.error('Logo upload middleware error:', err);
            if (err instanceof multer_1.default.MulterError && err.code === 'LIMIT_FILE_SIZE') {
                return res.status(400).json({ error: 'Image is too large (max 2MB)' });
            }
            return res.status(400).json({ error: err.message || 'Invalid file upload' });
        }
        // Check if user is CEO
        const corpId = parseInt(req.params.id, 10);
        if (isNaN(corpId)) {
            return res.status(400).json({ error: 'Invalid corporation ID' });
        }
        const userId = req.userId;
        const ceoCheck = await isCeo(corpId, userId);
        if (!ceoCheck) {
            return res.status(403).json({ error: 'Only the CEO can upload the logo' });
        }
        next();
    });
}, async (req, res) => {
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
        const fullPath = path_1.default.join(corporationsDir, req.file.filename);
        console.log('Full file path:', fullPath, '- exists:', fs_1.default.existsSync(fullPath));
        // Remove old logo if present
        const existing = await Corporation_1.CorporationModel.findById(corpId);
        console.log('Existing corporation logo:', existing?.logo);
        if (existing?.logo) {
            const absoluteOld = path_1.default.join(corporationsDir, path_1.default.basename(existing.logo));
            console.log('Removing old logo at:', absoluteOld);
            try {
                if (fs_1.default.existsSync(absoluteOld)) {
                    fs_1.default.unlinkSync(absoluteOld);
                }
            }
            catch (err) {
                console.warn('Could not remove old logo:', err);
            }
        }
        // Update corporation with new logo path
        console.log('Updating database with new logo path...');
        const updated = await Corporation_1.CorporationModel.update(corpId, { logo: relativePath });
        if (!updated) {
            return res.status(404).json({ error: 'Corporation not found' });
        }
        console.log('Logo upload successful, returning:', { logo: relativePath });
        res.json({ logo: relativePath });
    }
    catch (error) {
        console.error('Logo upload error:', error);
        res.status(500).json({ error: 'Failed to upload logo' });
    }
});
// PATCH /api/corporation/:id - Update corporation
router.patch('/:id', auth_1.authenticateToken, async (req, res) => {
    try {
        const id = parseInt(req.params.id, 10);
        if (isNaN(id)) {
            return res.status(400).json({ error: 'Invalid corporation ID' });
        }
        const userId = req.userId;
        const ceoCheck = await isCeo(id, userId);
        if (!ceoCheck) {
            return res.status(403).json({ error: 'Only the CEO can update the corporation' });
        }
        // Get current user to check admin status
        const user = await User_1.UserModel.findById(userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        const updates = {};
        // Handle name change - costs 10 actions (admins bypass)
        if (req.body.name !== undefined) {
            const corporation = await Corporation_1.CorporationModel.findById(id);
            if (!corporation) {
                return res.status(404).json({ error: 'Corporation not found' });
            }
            // Only charge actions if name is actually changing
            if (req.body.name.trim() !== corporation.name) {
                const NAME_CHANGE_COST = 10;
                // Check if user is admin (admins bypass action cost)
                if (!user.is_admin) {
                    const currentActions = await User_1.UserModel.getActions(userId);
                    if (currentActions < NAME_CHANGE_COST) {
                        return res.status(400).json({
                            error: `Changing corporation name requires ${NAME_CHANGE_COST} actions. You have ${currentActions} actions.`,
                            actions_required: NAME_CHANGE_COST,
                            actions_available: currentActions
                        });
                    }
                    // Deduct actions
                    await User_1.UserModel.updateActions(userId, -NAME_CHANGE_COST);
                }
                updates.name = req.body.name.trim();
            }
        }
        if (req.body.type !== undefined) {
            // Validate sector
            if (req.body.type !== null && !(0, sectors_1.isValidSector)(req.body.type)) {
                return res.status(400).json({
                    error: `Invalid sector: "${req.body.type}". Must be one of: ${sectors_1.SECTORS.join(', ')}`,
                    valid_sectors: sectors_1.SECTORS,
                });
            }
            updates.type = req.body.type;
        }
        if (req.body.focus !== undefined) {
            // Validate focus
            if (!(0, sectors_1.isValidCorpFocus)(req.body.focus)) {
                return res.status(400).json({
                    error: `Invalid focus: "${req.body.focus}". Must be one of: ${sectors_1.CORP_FOCUS_TYPES.join(', ')}`,
                    valid_focus_types: sectors_1.CORP_FOCUS_TYPES,
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
        const updated = await Corporation_1.CorporationModel.update(id, updates);
        if (!updated) {
            return res.status(404).json({ error: 'Corporation not found' });
        }
        res.json(updated);
    }
    catch (error) {
        console.error('Update corporation error:', error);
        res.status(500).json({ error: 'Failed to update corporation' });
    }
});
// DELETE /api/corporation/:id - Delete corporation
router.delete('/:id', auth_1.authenticateToken, async (req, res) => {
    try {
        const id = parseInt(req.params.id, 10);
        if (isNaN(id)) {
            return res.status(400).json({ error: 'Invalid corporation ID' });
        }
        const userId = req.userId;
        const ceoCheck = await isCeo(id, userId);
        if (!ceoCheck) {
            return res.status(403).json({ error: 'Only the CEO can delete the corporation' });
        }
        await Corporation_1.CorporationModel.delete(id);
        res.status(204).send();
    }
    catch (error) {
        console.error('Delete corporation error:', error);
        res.status(500).json({ error: 'Failed to delete corporation' });
    }
});
exports.default = router;
