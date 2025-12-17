import express, { Request, Response, NextFunction } from 'express';
import multer, { FileFilterCallback } from 'multer';
import path from 'path';
import fs from 'fs';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { UserModel } from '../models/User';

const router = express.Router();

const uploadsDir = path.join(__dirname, '..', 'uploads');
const avatarsDir = path.join(uploadsDir, 'avatars');
console.log('Avatar route setup:');
console.log('  uploadsDir:', uploadsDir, '- exists:', fs.existsSync(uploadsDir));
console.log('  avatarsDir:', avatarsDir, '- exists:', fs.existsSync(avatarsDir));

fs.mkdirSync(avatarsDir, { recursive: true });
console.log('Avatar directories created/verified');

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
  console.log('Avatar upload request received for user:', req.userId);
  uploadMiddleware(req as Request, res, (err: any) => {
    if (err) {
      console.error('Avatar upload middleware error:', err);
      if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'Image is too large (max 2MB)' });
      }
      return res.status(400).json({ error: err.message || 'Invalid file upload' });
    }
    next();
  });
}, async (req: UploadRequest, res: Response) => {
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

    const userId = req.userId!;
    const relativePath = `/uploads/avatars/${req.file.filename}`;
    console.log('Generated relative path:', relativePath);

    // Remove previous avatar if present
    const existing = await UserModel.findById(userId);
    console.log('Existing user profile_image_url:', existing?.profile_image_url);
    if (existing?.profile_image_url) {
      const absoluteOld = path.join(avatarsDir, path.basename(existing.profile_image_url));
      console.log('Removing old avatar at:', absoluteOld);
      removeFileIfExists(absoluteOld);
    }

    console.log('Updating database with new image path...');
    await UserModel.updateProfileImage(userId, relativePath);

    console.log('Avatar upload successful, returning:', { profile_image_url: relativePath });
    res.json({ profile_image_url: relativePath });
  } catch (error) {
    console.error('Avatar upload error:', error);
    res.status(500).json({ error: 'Failed to upload image' });
  }
});

export default router;
