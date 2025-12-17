import express, { Request, Response, NextFunction } from 'express';
import multer, { FileFilterCallback } from 'multer';
import path from 'path';
import fs from 'fs';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { UserModel } from '../models/User';

const router = express.Router();

const uploadsDir = path.join(__dirname, '..', 'uploads');
const avatarsDir = path.join(uploadsDir, 'avatars');
fs.mkdirSync(avatarsDir, { recursive: true });

const allowedMimeToExt: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};

const storage = multer.diskStorage({
  destination: (_req: Request, _file, cb) => cb(null, avatarsDir),
  filename: (req: AuthRequest, file, cb) => {
    const ext = allowedMimeToExt[file.mimetype] || path.extname(file.originalname) || '.png';
    const userId = (req as AuthRequest).userId || 'anon';
    const safeName = `user-${userId}-${Date.now()}${ext}`;
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

const removeFileIfExists = (absolutePath: string) => {
  try {
    if (fs.existsSync(absolutePath)) {
      fs.unlinkSync(absolutePath);
    }
  } catch (err) {
    console.warn('Could not remove old avatar:', err);
  }
};

type UploadRequest = AuthRequest & { file?: Express.Multer.File };
const uploadMiddleware = upload.single('avatar');

router.post('/avatar', authenticateToken, (req: AuthRequest, res: Response, next: NextFunction) => {
  uploadMiddleware(req as Request, res, (err: any) => {
    if (err) {
      if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'Image is too large (max 2MB)' });
      }
      return res.status(400).json({ error: err.message || 'Invalid file upload' });
    }
    next();
  });
}, async (req: UploadRequest, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const userId = req.userId!;
    const relativePath = `/uploads/avatars/${req.file.filename}`;

    // Remove previous avatar if present
    const existing = await UserModel.findById(userId);
    if (existing?.profile_image_url) {
      const absoluteOld = path.join(avatarsDir, path.basename(existing.profile_image_url));
      removeFileIfExists(absoluteOld);
    }

    await UserModel.updateProfileImage(userId, relativePath);

    res.json({ profile_image_url: relativePath });
  } catch (error) {
    console.error('Avatar upload error:', error);
    res.status(500).json({ error: 'Failed to upload image' });
  }
});

export default router;
