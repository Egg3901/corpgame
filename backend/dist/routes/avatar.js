"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const auth_1 = require("../middleware/auth");
const User_1 = require("../models/User");
const router = express_1.default.Router();
// Use '..', '..' to go from dist/routes/ to backend/uploads/ (same as server.ts serves)
const uploadsDir = path_1.default.join(__dirname, '..', '..', 'uploads');
const avatarsDir = path_1.default.join(uploadsDir, 'avatars');
console.log('Avatar route setup:');
console.log('  uploadsDir:', uploadsDir, '- exists:', fs_1.default.existsSync(uploadsDir));
console.log('  avatarsDir:', avatarsDir, '- exists:', fs_1.default.existsSync(avatarsDir));
fs_1.default.mkdirSync(avatarsDir, { recursive: true });
console.log('Avatar directories created/verified');
const allowedMimeToExt = {
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/webp': '.webp',
};
const storage = multer_1.default.diskStorage({
    destination: (_req, _file, cb) => cb(null, avatarsDir),
    filename: (req, file, cb) => {
        const ext = allowedMimeToExt[file.mimetype] || path_1.default.extname(file.originalname) || '.png';
        const userId = req.userId || 'anon';
        const safeName = `user-${userId}-${Date.now()}${ext}`;
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
const removeFileIfExists = (absolutePath) => {
    try {
        if (fs_1.default.existsSync(absolutePath)) {
            fs_1.default.unlinkSync(absolutePath);
        }
    }
    catch (err) {
        console.warn('Could not remove old avatar:', err);
    }
};
const uploadMiddleware = upload.single('avatar');
router.post('/avatar', auth_1.authenticateToken, (req, res, next) => {
    console.log('Avatar upload request received for user:', req.userId);
    uploadMiddleware(req, res, (err) => {
        if (err) {
            console.error('Avatar upload middleware error:', err);
            if (err instanceof multer_1.default.MulterError && err.code === 'LIMIT_FILE_SIZE') {
                return res.status(400).json({ error: 'Image is too large (max 2MB)' });
            }
            return res.status(400).json({ error: err.message || 'Invalid file upload' });
        }
        next();
    });
}, async (req, res) => {
    try {
        console.log('Processing avatar upload...');
        if (!req.file) {
            console.error('No file in request');
            return res.status(400).json({ error: 'No file uploaded' });
        }
        console.log('File received:', {
            filename: req.file.filename,
            originalname: req.file.originalname,
            size: req.file.size,
            mimetype: req.file.mimetype
        });
        const userId = req.userId;
        const relativePath = `/uploads/avatars/${req.file.filename}`;
        console.log('Generated relative path:', relativePath);
        // Remove previous avatar if present
        const existing = await User_1.UserModel.findById(userId);
        console.log('Existing user profile_image_url:', existing?.profile_image_url);
        if (existing?.profile_image_url) {
            const absoluteOld = path_1.default.join(avatarsDir, path_1.default.basename(existing.profile_image_url));
            console.log('Removing old avatar at:', absoluteOld);
            removeFileIfExists(absoluteOld);
        }
        console.log('Updating database with new image path...');
        await User_1.UserModel.updateProfileImage(userId, relativePath);
        console.log('Avatar upload successful, returning:', { profile_image_url: relativePath });
        res.json({ profile_image_url: relativePath });
    }
    catch (error) {
        console.error('Avatar upload error:', error);
        res.status(500).json({ error: 'Failed to upload image' });
    }
});
exports.default = router;
