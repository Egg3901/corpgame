import express, { Request, Response } from 'express';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = express.Router();

// Placeholder for future game routes
router.get('/status', authenticateToken, async (req: AuthRequest, res: Response) => {
  res.json({ message: 'Game API - Coming soon' });
});

export default router;


