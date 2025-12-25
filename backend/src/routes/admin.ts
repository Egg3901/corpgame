import express, { Request, Response } from 'express';
import { authenticateToken, requireAdmin, AuthRequest } from '../middleware/auth';
import { BannedIpModel } from '../models/BannedIp';
import { UserModel } from '../models/User';
import { ReportedChatModel } from '../models/ReportedChat';
import { MessageModel } from '../models/Message';
import { CorporationModel } from '../models/Corporation';
import { ShareholderModel } from '../models/Shareholder';
import { TransactionModel, TransactionType } from '../models/Transaction';
import { normalizeImageUrl } from '../utils/imageUrl';
import { triggerActionsIncrement, triggerMarketRevenue, triggerCeoSalaries } from '../cron/actions';
import { updateStockPrice } from '../utils/valuation';
import { resetGameTime } from '../utils/gameTime';
import { BoardModel } from '../models/BoardProposal';
import pool from '../db/connection';

const router = express.Router();

router.use(authenticateToken, requireAdmin);

router.post('/ban-ip', async (req: AuthRequest, res: Response) => {
  try {
    const { ip, reason } = req.body;
    if (!ip || typeof ip !== 'string') {
      return res.status(400).json({ error: 'IP address is required' });
    }

    await BannedIpModel.banIp(ip, reason || null, req.userId || null);
    await UserModel.banUsersByIp(BannedIpModel.normalize(ip), reason || null, req.userId || null);

    res.json({ message: `IP ${ip} banned` });
  } catch (error) {
    console.error('Ban IP error:', error);
    res.status(500).json({ error: 'Failed to ban IP' });
  }
});

router.post('/users/:id/ban', async (req: AuthRequest, res: Response) => {
  try {
    const userId = parseInt(req.params.id, 10);
    if (isNaN(userId)) {
      return res.status(400).json({ error: 'Invalid user id' });
    }

    if (req.userId === userId) {
      return res.status(400).json({ error: 'You cannot ban yourself' });
    }

    const { reason } = req.body;
    await UserModel.banUser(userId, reason || null, req.userId || null);
    res.json({ message: 'User banned' });
  } catch (error) {
    console.error('Ban user error:', error);
    res.status(500).json({ error: 'Failed to ban user' });
  }
});

router.get('/users', async (req: AuthRequest, res: Response) => {
  try {
    const users = await UserModel.getAllUsers();
    // Don't return password_hash
    const sanitizedUsers = users.map(({ password_hash, ...user }) => user);
    res.json(sanitizedUsers);
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Failed to get users' });
  }
});

router.patch('/users/:id/admin', async (req: AuthRequest, res: Response) => {
  try {
    const userId = parseInt(req.params.id, 10);
    if (isNaN(userId)) {
      return res.status(400).json({ error: 'Invalid user id' });
    }

    if (req.userId === userId) {
      return res.status(400).json({ error: 'You cannot change your own admin status' });
    }

    const updatedUser = await UserModel.toggleAdminStatus(userId);
    const { password_hash, ...sanitizedUser } = updatedUser;
    res.json(sanitizedUser);
  } catch (error) {
    console.error('Toggle admin status error:', error);
    res.status(500).json({ error: 'Failed to toggle admin status' });
  }
});

router.delete('/users/:id', async (req: AuthRequest, res: Response) => {
  try {
    const userId = parseInt(req.params.id, 10);
    if (isNaN(userId)) {
      return res.status(400).json({ error: 'Invalid user id' });
    }

    if (req.userId === userId) {
      return res.status(400).json({ error: 'You cannot delete yourself' });
    }

    await UserModel.deleteUser(userId);
    res.json({ message: 'User deleted' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// GET /api/admin/reported-chats - Get all reported chats
router.get('/reported-chats', async (req: AuthRequest, res: Response) => {
  try {
    const { include_reviewed } = req.query;
    const includeReviewed = include_reviewed === 'true';
    
    const reportedChats = await ReportedChatModel.findAll(includeReviewed);
    
    // Normalize image URLs
    const normalizedChats = reportedChats.map(chat => ({
      ...chat,
      reporter: chat.reporter ? {
        ...chat.reporter,
        profile_image_url: normalizeImageUrl(chat.reporter.profile_image_url),
      } : null,
      reported_user: chat.reported_user ? {
        ...chat.reported_user,
        profile_image_url: normalizeImageUrl(chat.reported_user.profile_image_url),
      } : null,
    }));
    
    res.json(normalizedChats);
  } catch (error) {
    console.error('Get reported chats error:', error);
    res.status(500).json({ error: 'Failed to get reported chats' });
  }
});

// DELETE /api/admin/reported-chats/:id - Mark reported chat as reviewed (clear from display)
router.delete('/reported-chats/:id', async (req: AuthRequest, res: Response) => {
  try {
    const reportId = parseInt(req.params.id, 10);
    if (isNaN(reportId)) {
      return res.status(400).json({ error: 'Invalid report id' });
    }

    const reviewed = await ReportedChatModel.markAsReviewed(reportId, req.userId!);
    if (!reviewed) {
      return res.status(404).json({ error: 'Report not found' });
    }

    res.json({ message: 'Report marked as reviewed', report: reviewed });
  } catch (error) {
    console.error('Mark report as reviewed error:', error);
    res.status(500).json({ error: 'Failed to mark report as reviewed' });
  }
});

// GET /api/admin/conversation/:userId1/:userId2 - Admin-only: View conversation between any two users
router.get('/conversation/:userId1/:userId2', async (req: AuthRequest, res: Response) => {
  try {
    const userId1 = parseInt(req.params.userId1, 10);
    const userId2 = parseInt(req.params.userId2, 10);
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 100;
    const offset = req.query.offset ? parseInt(req.query.offset as string, 10) : 0;

    if (isNaN(userId1) || isNaN(userId2)) {
      return res.status(400).json({ error: 'Invalid user IDs' });
    }

    // Verify both users exist
    const user1 = await UserModel.findById(userId1);
    const user2 = await UserModel.findById(userId2);

    if (!user1 || !user2) {
      return res.status(404).json({ error: 'One or both users not found' });
    }

    // Get conversation messages
    const messages = await MessageModel.findConversation(userId1, userId2, limit, offset);

    // Normalize image URLs
    const normalizedMessages = messages.map(msg => ({
      ...msg,
      sender: msg.sender ? {
        ...msg.sender,
        profile_image_url: normalizeImageUrl(msg.sender.profile_image_url),
      } : null,
      recipient: msg.recipient ? {
        ...msg.recipient,
        profile_image_url: normalizeImageUrl(msg.recipient.profile_image_url),
      } : null,
    }));

    res.json({
      messages: normalizedMessages,
      user1: {
        id: user1.id,
        profile_id: user1.profile_id,
        username: user1.username,
        player_name: user1.player_name,
        profile_image_url: normalizeImageUrl(user1.profile_image_url),
      },
      user2: {
        id: user2.id,
        profile_id: user2.profile_id,
        username: user2.username,
        player_name: user2.player_name,
        profile_image_url: normalizeImageUrl(user2.profile_image_url),
      },
    });
  } catch (error) {
    console.error('Admin view conversation error:', error);
    res.status(500).json({ error: 'Failed to fetch conversation' });
  }
});

// POST /api/admin/run-turn - Manually trigger hourly turn (actions + market revenue + CEO salaries)
router.post('/run-turn', async (req: AuthRequest, res: Response) => {
  try {
    console.log('[Admin] Manual turn trigger by user:', req.userId);
    
    // Run actions increment
    const actionsResult = await triggerActionsIncrement();
    
    // Run market revenue processing (includes stock price updates)
    const revenueResult = await triggerMarketRevenue();
    
    // Run CEO salary processing
    const salaryResult = await triggerCeoSalaries();
    
    res.json({
      success: true,
      actions: {
        users_updated: actionsResult.updated,
        ceo_count: actionsResult.ceoCount,
      },
      market_revenue: {
        corporations_processed: revenueResult.processed,
        total_profit: revenueResult.totalProfit,
      },
      ceo_salaries: {
        ceos_paid: salaryResult.ceosPaid,
        total_paid: salaryResult.totalPaid,
        salaries_zeroed: salaryResult.salariesZeroed,
      },
    });
  } catch (error) {
    console.error('Run turn error:', error);
    res.status(500).json({ error: 'Failed to run turn' });
  }
});

// POST /api/admin/recalculate-prices - Recalculate all stock prices based on fundamentals
router.post('/recalculate-prices', async (req: AuthRequest, res: Response) => {
  try {
    console.log('[Admin] Recalculating all stock prices by user:', req.userId);
    
    const corporations = await CorporationModel.findAll();
    const results: { corporation_id: number; name: string; old_price: number; new_price: number }[] = [];
    
    for (const corp of corporations) {
      const oldPrice = typeof corp.share_price === 'string' 
        ? parseFloat(corp.share_price) 
        : corp.share_price;
      
      const newPrice = await updateStockPrice(corp.id);
      
      results.push({
        corporation_id: corp.id,
        name: corp.name,
        old_price: oldPrice,
        new_price: newPrice,
      });
    }
    
    res.json({
      success: true,
      corporations_updated: results.length,
      changes: results,
    });
  } catch (error) {
    console.error('Recalculate prices error:', error);
    res.status(500).json({ error: 'Failed to recalculate prices' });
  }
});

// POST /api/admin/set-game-time - Reset game time to a specific year/quarter
router.post('/set-game-time', async (req: AuthRequest, res: Response) => {
  try {
    const { year, quarter } = req.body;
    const parsedYear = parseInt(year, 10);
    const parsedQuarter = parseInt(quarter, 10);

    if (!Number.isFinite(parsedYear)) {
      return res.status(400).json({ error: 'A valid year is required' });
    }

    if (!Number.isFinite(parsedQuarter) || parsedQuarter < 1 || parsedQuarter > 4) {
      return res.status(400).json({ error: 'Quarter must be between 1 and 4' });
    }

    const result = resetGameTime(parsedYear, parsedQuarter);

    res.json({
      success: true,
      message: `Game time set to Q${parsedQuarter} ${parsedYear}`,
      game_time: result.gameTime,
      game_start_date: result.gameStartDate.toISOString(),
      quarters_from_start: result.quartersFromStart,
      applied_at: result.appliedAt.toISOString(),
    });
  } catch (error) {
    console.error('Set game time error:', error);
    res.status(500).json({ error: 'Failed to set game time' });
  }
});

// GET /api/admin/transactions - Get all transactions with filters
router.get('/transactions', async (req: AuthRequest, res: Response) => {
  try {
    const {
      user_id,
      corporation_id,
      type,
      search,
      from_date,
      to_date,
      limit = '50',
      offset = '0',
    } = req.query;

    const filters: {
      user_id?: number;
      corporation_id?: number;
      transaction_type?: TransactionType;
      search?: string;
      from_date?: Date;
      to_date?: Date;
    } = {};

    if (user_id) {
      const parsedUserId = parseInt(user_id as string, 10);
      if (!isNaN(parsedUserId)) {
        filters.user_id = parsedUserId;
      }
    }

    if (corporation_id) {
      const parsedCorpId = parseInt(corporation_id as string, 10);
      if (!isNaN(parsedCorpId)) {
        filters.corporation_id = parsedCorpId;
      }
    }

    if (type) {
      filters.transaction_type = type as TransactionType;
    }

    if (search) {
      filters.search = search as string;
    }

    if (from_date) {
      filters.from_date = new Date(from_date as string);
    }

    if (to_date) {
      filters.to_date = new Date(to_date as string);
    }

    const parsedLimit = parseInt(limit as string, 10) || 50;
    const parsedOffset = parseInt(offset as string, 10) || 0;

    const [transactions, totalCount] = await Promise.all([
      TransactionModel.findAll(filters, parsedLimit, parsedOffset),
      TransactionModel.getCount(filters),
    ]);

    // Normalize image URLs
    const normalizedTransactions = transactions.map(tx => ({
      ...tx,
      from_user: tx.from_user ? {
        ...tx.from_user,
        profile_image_url: normalizeImageUrl(tx.from_user.profile_image_url),
      } : null,
      to_user: tx.to_user ? {
        ...tx.to_user,
        profile_image_url: normalizeImageUrl(tx.to_user.profile_image_url),
      } : null,
    }));

    res.json({
      transactions: normalizedTransactions,
      total: totalCount,
      limit: parsedLimit,
      offset: parsedOffset,
    });
  } catch (error) {
    console.error('Get transactions error:', error);
    res.status(500).json({ error: 'Failed to get transactions' });
  }
});

// POST /api/admin/fix-shares/:corpId - Fix corrupted share data by recalculating total shares
router.post('/fix-shares/:corpId', async (req: AuthRequest, res: Response) => {
  try {
    const corpId = parseInt(req.params.corpId, 10);
    if (isNaN(corpId)) {
      return res.status(400).json({ error: 'Invalid corporation ID' });
    }

    const corporation = await CorporationModel.findById(corpId);
    if (!corporation) {
      return res.status(404).json({ error: 'Corporation not found' });
    }

    // Get all shareholders for this corporation
    const shareholders = await ShareholderModel.findByCorporationId(corpId);
    
    // Calculate total held by players
    const totalHeldByPlayers = shareholders.reduce((sum, sh) => sum + sh.shares, 0);
    
    // Calculate what the correct total shares should be
    const correctTotalShares = totalHeldByPlayers + corporation.public_shares;
    
    const oldData = {
      total_shares: corporation.shares,
      public_shares: corporation.public_shares,
      held_by_players: totalHeldByPlayers,
    };

    // Check if there's actually a mismatch
    if (corporation.shares === correctTotalShares) {
      return res.json({
        success: true,
        message: 'Share data is already correct',
        corporation_id: corpId,
        data: oldData,
      });
    }

    // Fix the total shares
    await CorporationModel.update(corpId, { shares: correctTotalShares });

    console.log(`[Admin] Fixed shares for corp ${corpId}: ${corporation.shares} -> ${correctTotalShares}`);

    res.json({
      success: true,
      message: 'Share data corrected',
      corporation_id: corpId,
      old_data: oldData,
      new_data: {
        total_shares: correctTotalShares,
        public_shares: corporation.public_shares,
        held_by_players: totalHeldByPlayers,
      },
    });
  } catch (error) {
    console.error('Fix shares error:', error);
    res.status(500).json({ error: 'Failed to fix shares' });
  }
});

// POST /api/admin/force-stock-split/:corpId - Force a 2:1 stock split on a corporation
router.post('/force-stock-split/:corpId', async (req: AuthRequest, res: Response) => {
  try {
    const corpId = parseInt(req.params.corpId, 10);
    if (isNaN(corpId)) {
      return res.status(400).json({ error: 'Invalid corporation ID' });
    }

    const corporation = await CorporationModel.findById(corpId);
    if (!corporation) {
      return res.status(404).json({ error: 'Corporation not found' });
    }

    console.log(`[Admin] Force stock split for corp ${corpId} (${corporation.name}) by user:`, req.userId);

    // Get all shareholders
    const shareholders = await ShareholderModel.findByCorporationId(corpId);
    const totalHeldByPlayers = shareholders.reduce((sum, sh) => sum + sh.shares, 0);
    const actualTotalShares = totalHeldByPlayers + corporation.public_shares;

    // Calculate new values (2:1 split)
    const newTotalShares = actualTotalShares * 2;
    const newPublicShares = corporation.public_shares * 2;
    const oldPrice = typeof corporation.share_price === 'string' 
      ? parseFloat(corporation.share_price) 
      : corporation.share_price;
    const newSharePrice = Math.max(0.01, oldPrice / 2);

    console.log(`[Admin Stock Split] Corp ${corpId}: Before - Total: ${actualTotalShares}, Public: ${corporation.public_shares}, Price: ${oldPrice}`);
    console.log(`[Admin Stock Split] Corp ${corpId}: After - Total: ${newTotalShares}, Public: ${newPublicShares}, Price: ${newSharePrice}`);

    // Update corporation
    await CorporationModel.update(corpId, {
      shares: newTotalShares,
      public_shares: newPublicShares,
      share_price: newSharePrice,
    });

    // Double all shareholder positions
    const shareholderUpdates: { user_id: number; old_shares: number; new_shares: number }[] = [];
    for (const sh of shareholders) {
      const newShares = sh.shares * 2;
      await ShareholderModel.updateShares(corpId, sh.user_id, newShares);
      shareholderUpdates.push({
        user_id: sh.user_id,
        old_shares: sh.shares,
        new_shares: newShares,
      });
      console.log(`[Admin Stock Split] Corp ${corpId}: User ${sh.user_id}: ${sh.shares} -> ${newShares}`);
    }

    res.json({
      success: true,
      corporation_id: corpId,
      corporation_name: corporation.name,
      split_ratio: '2:1',
      before: {
        total_shares: actualTotalShares,
        public_shares: corporation.public_shares,
        share_price: oldPrice,
      },
      after: {
        total_shares: newTotalShares,
        public_shares: newPublicShares,
        share_price: newSharePrice,
      },
      shareholders_updated: shareholderUpdates.length,
      shareholder_details: shareholderUpdates,
    });
  } catch (error) {
    console.error('Force stock split error:', error);
    res.status(500).json({ error: 'Failed to execute stock split' });
  }
});

// POST /api/admin/fix-all-shares - Fix corrupted share data for ALL corporations
router.post('/fix-all-shares', async (req: AuthRequest, res: Response) => {
  try {
    console.log('[Admin] Fixing all corporation share data by user:', req.userId);
    
    const corporations = await CorporationModel.findAll();
    const results: { 
      corporation_id: number; 
      name: string; 
      fixed: boolean;
      old_total: number;
      new_total: number;
      public_shares: number;
      held_by_players: number;
    }[] = [];
    
    for (const corp of corporations) {
      const shareholders = await ShareholderModel.findByCorporationId(corp.id);
      const totalHeldByPlayers = shareholders.reduce((sum, sh) => sum + sh.shares, 0);
      const correctTotalShares = totalHeldByPlayers + corp.public_shares;
      
      const needsFix = corp.shares !== correctTotalShares;
      
      if (needsFix) {
        await CorporationModel.update(corp.id, { shares: correctTotalShares });
        console.log(`[Admin] Fixed shares for ${corp.name}: ${corp.shares} -> ${correctTotalShares}`);
      }
      
      results.push({
        corporation_id: corp.id,
        name: corp.name,
        fixed: needsFix,
        old_total: corp.shares,
        new_total: correctTotalShares,
        public_shares: corp.public_shares,
        held_by_players: totalHeldByPlayers,
      });
    }
    
    const fixedCount = results.filter(r => r.fixed).length;
    
    res.json({
      success: true,
      corporations_checked: results.length,
      corporations_fixed: fixedCount,
      details: results,
    });
  } catch (error) {
    console.error('Fix all shares error:', error);
    res.status(500).json({ error: 'Failed to fix shares' });
  }
});

/**
 * POST /api/admin/corporation/:corpId/reset-board
 * Admin-only: Remove all board members except the CEO by setting board size to 1
 */
router.post('/corporation/:corpId/reset-board', async (req: AuthRequest, res: Response) => {
  const client = await pool.connect();

  try {
    const corpId = parseInt(req.params.corpId, 10);
    if (isNaN(corpId)) {
      return res.status(400).json({ error: 'Invalid corporation ID' });
    }

    const adminUserId = req.userId!;

    // Verify corporation exists
    const corporation = await CorporationModel.findById(corpId);
    if (!corporation) {
      return res.status(404).json({ error: 'Corporation not found' });
    }

    // Get current effective CEO
    const effectiveCeo = await BoardModel.getEffectiveCeo(corpId);
    const ceoUserId = effectiveCeo?.userId || null;

    // Get current board members before reset
    const currentBoardMembers = await BoardModel.getBoardMembers(corpId);

    // Begin transaction
    await client.query('BEGIN');

    // Board size should be at least 1 (CEO only)
    const newBoardSize = 1;
    await CorporationModel.update(corpId, { board_size: newBoardSize });

    // The CEO (if exists) will remain on the board automatically as they're the top shareholder
    // or elected CEO. All others are removed by virtue of board_size = 1

    await client.query('COMMIT');

    // Send system messages to removed board members
    const admin = await UserModel.findById(adminUserId);
    const adminName = admin?.player_name || admin?.username || 'Administrator';

    for (const member of currentBoardMembers) {
      // Skip CEO
      if (ceoUserId && member.user_id === ceoUserId) {
        continue;
      }

      // Send notification to removed member
      await MessageModel.create({
        sender_id: 1, // System user ID
        recipient_id: member.user_id,
        subject: `Board Reset: ${corporation.name}`,
        body: `The board of directors for ${corporation.name} has been reset by ${adminName}. All board members except the CEO have been removed. The board size has been set to 1.`,
      });
    }

    // Get updated board members
    const updatedBoardMembers = await BoardModel.getBoardMembers(corpId);

    console.log(`[Admin] Reset board for corp ${corpId} (${corporation.name}) by user ${adminUserId}`);

    res.json({
      success: true,
      message: 'Board reset successfully',
      board_members: updatedBoardMembers,
      removed_count: currentBoardMembers.length - updatedBoardMembers.length,
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Reset board error:', error);
    res.status(500).json({ error: 'Failed to reset board' });
  } finally {
    client.release();
  }
});

/**
 * DELETE /api/admin/corporation/:corpId/shares/:userId
 * Admin-only: Delete specified number of shares from a user
 */
router.delete('/corporation/:corpId/shares/:userId', async (req: AuthRequest, res: Response) => {
  const client = await pool.connect();

  try {
    const corpId = parseInt(req.params.corpId, 10);
    const userId = parseInt(req.params.userId, 10);
    const { amount } = req.body;

    if (isNaN(corpId) || isNaN(userId)) {
      return res.status(400).json({ error: 'Invalid IDs' });
    }

    if (!amount || typeof amount !== 'number' || amount <= 0) {
      return res.status(400).json({ error: 'Amount must be a positive number' });
    }

    const adminUserId = req.userId!;

    // Verify corporation exists
    const corporation = await CorporationModel.findById(corpId);
    if (!corporation) {
      return res.status(404).json({ error: 'Corporation not found' });
    }

    // Get current shareholder record
    const shareholders = await ShareholderModel.findByCorporationId(corpId);
    const shareholderRecord = shareholders.find(sh => sh.user_id === userId);

    if (!shareholderRecord) {
      return res.status(404).json({ error: 'User is not a shareholder of this corporation' });
    }

    if (amount > shareholderRecord.shares) {
      return res.status(400).json({
        error: `Cannot delete ${amount} shares. User only has ${shareholderRecord.shares} shares.`
      });
    }

    // Begin transaction
    await client.query('BEGIN');

    const newShareCount = shareholderRecord.shares - amount;

    if (newShareCount === 0) {
      // Delete shareholder record entirely
      await ShareholderModel.delete(corpId, userId);
    } else {
      // Update shares
      await ShareholderModel.updateShares(corpId, userId, newShareCount);
    }

    // Update corporation total shares
    const newTotalShares = corporation.shares - amount;
    await CorporationModel.update(corpId, { shares: newTotalShares });

    await client.query('COMMIT');

    // Send system message to affected user
    const admin = await UserModel.findById(adminUserId);
    const adminName = admin?.player_name || admin?.username || 'Administrator';

    await MessageModel.create({
      sender_id: 1, // System user ID
      recipient_id: userId,
      subject: `Share Adjustment: ${corporation.name}`,
      body: `${amount.toLocaleString()} shares of ${corporation.name} have been removed from your portfolio by ${adminName}. ${newShareCount > 0 ? `You now hold ${newShareCount.toLocaleString()} shares.` : 'You no longer hold any shares.'}`,
    });

    console.log(`[Admin] Deleted ${amount} shares from user ${userId} for corp ${corpId} by admin ${adminUserId}`);

    res.json({
      success: true,
      message: `Successfully deleted ${amount} shares`,
      user_id: userId,
      previous_shares: shareholderRecord.shares,
      new_shares: newShareCount,
      deleted_shares: amount,
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Delete shares error:', error);
    res.status(500).json({ error: 'Failed to delete shares' });
  } finally {
    client.release();
  }
});

/**
 * DELETE /api/admin/corporation/:corpId/public-shares
 * Admin-only: Delete specified number of public shares
 */
router.delete('/corporation/:corpId/public-shares', async (req: AuthRequest, res: Response) => {
  const client = await pool.connect();

  try {
    const corpId = parseInt(req.params.corpId, 10);
    const { amount } = req.body;

    if (isNaN(corpId)) {
      return res.status(400).json({ error: 'Invalid corporation ID' });
    }

    if (!amount || typeof amount !== 'number' || amount <= 0) {
      return res.status(400).json({ error: 'Amount must be a positive number' });
    }

    const adminUserId = req.userId!;

    // Verify corporation exists
    const corporation = await CorporationModel.findById(corpId);
    if (!corporation) {
      return res.status(404).json({ error: 'Corporation not found' });
    }

    if (amount > corporation.public_shares) {
      return res.status(400).json({
        error: `Cannot delete ${amount} public shares. Only ${corporation.public_shares} public shares available.`
      });
    }

    // Begin transaction
    await client.query('BEGIN');

    const newPublicShares = corporation.public_shares - amount;
    const newTotalShares = corporation.shares - amount;

    await CorporationModel.update(corpId, {
      public_shares: newPublicShares,
      shares: newTotalShares,
    });

    await client.query('COMMIT');

    // Get all board members to notify
    const boardMembers = await BoardModel.getBoardMembers(corpId);
    const admin = await UserModel.findById(adminUserId);
    const adminName = admin?.player_name || admin?.username || 'Administrator';

    // Notify board members about public share reduction
    for (const member of boardMembers) {
      await MessageModel.create({
        sender_id: 1, // System user ID
        recipient_id: member.user_id,
        subject: `Public Shares Reduced: ${corporation.name}`,
        body: `${amount.toLocaleString()} public shares of ${corporation.name} have been removed by ${adminName}. Public shares: ${corporation.public_shares.toLocaleString()} → ${newPublicShares.toLocaleString()}. Total shares: ${corporation.shares.toLocaleString()} → ${newTotalShares.toLocaleString()}.`,
      });
    }

    console.log(`[Admin] Deleted ${amount} public shares for corp ${corpId} by admin ${adminUserId}`);

    res.json({
      success: true,
      message: `Successfully deleted ${amount} public shares`,
      previous_public_shares: corporation.public_shares,
      new_public_shares: newPublicShares,
      previous_total_shares: corporation.shares,
      new_total_shares: newTotalShares,
      deleted_shares: amount,
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Delete public shares error:', error);
    res.status(500).json({ error: 'Failed to delete public shares' });
  } finally {
    client.release();
  }
});

export default router;
