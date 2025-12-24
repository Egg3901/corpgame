import express, { Request, Response } from 'express';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { getNextCronTimes } from '../cron/actions';

const router = express.Router();

// Game start date - set this to when your game world "began"
// You can override this with GAME_START_DATE environment variable
const GAME_START_DATE = process.env.GAME_START_DATE 
  ? new Date(process.env.GAME_START_DATE)
  : new Date('2024-01-01T00:00:00Z'); // Default: Jan 1, 2024

// Placeholder for future game routes
router.get('/status', authenticateToken, async (req: AuthRequest, res: Response) => {
  res.json({ message: 'Game API - Coming soon' });
});

// GET /api/game/time - Get server time and next cron update times
router.get('/time', async (req: Request, res: Response) => {
  try {
    const now = new Date();
    const { nextActionUpdate, nextProposalCheck } = getNextCronTimes();
    
    const secondsUntilActionUpdate = Math.max(0, Math.floor((nextActionUpdate.getTime() - now.getTime()) / 1000));
    const secondsUntilProposalCheck = Math.max(0, Math.floor((nextProposalCheck.getTime() - now.getTime()) / 1000));
    
    res.json({
      server_time: now.toISOString(),
      game_start_date: GAME_START_DATE.toISOString(),
      next_action_update: nextActionUpdate.toISOString(),
      next_proposal_check: nextProposalCheck.toISOString(),
      seconds_until_action_update: secondsUntilActionUpdate,
      seconds_until_proposal_check: secondsUntilProposalCheck,
    });
  } catch (error) {
    console.error('Get server time error:', error);
    res.status(500).json({ error: 'Failed to get server time' });
  }
});

export default router;





