import express, { Response } from 'express';
import { authenticateToken, optionalAuth, AuthRequest } from '../middleware/auth';
import { BoardProposalModel, BoardVoteModel, BoardModel, ProposalType, ProposalData } from '../models/BoardProposal';
import { CorporationModel } from '../models/Corporation';
import { ShareholderModel } from '../models/Shareholder';
import { UserModel } from '../models/User';
import { MessageModel } from '../models/Message';
import { TransactionModel } from '../models/Transaction';
import { SECTORS, isValidSector, US_STATE_CODES, isValidStateCode, getStateLabel } from '../constants/sectors';
import { normalizeImageUrl } from '../utils/imageUrl';
import pool from '../db/connection';

const router = express.Router();

// GET /api/board/:corpId - Get board info, members, active proposals
router.get('/:corpId', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const corpId = parseInt(req.params.corpId, 10);
    if (isNaN(corpId)) {
      return res.status(400).json({ error: 'Invalid corporation ID' });
    }

    const corporation = await CorporationModel.findById(corpId);
    if (!corporation) {
      return res.status(404).json({ error: 'Corporation not found' });
    }

    // Get board members
    const boardMembers = await BoardModel.getBoardMembers(corpId);

    // Get effective CEO
    const effectiveCeo = await BoardModel.getEffectiveCeo(corpId);

    // Get active proposals with votes
    const userId = req.userId || undefined;
    const proposals = await BoardProposalModel.getProposalsWithVotes(corpId, userId);
    const activeProposals = proposals.filter(p => p.status === 'active');

    // Get shareholders list (for nominee/appointee selection) - batch fetch users
    const shareholders = await ShareholderModel.findByCorporationId(corpId);
    const userIds = [...new Set(shareholders.map(sh => sh.user_id))];
    let userMap = new Map<number, any>();
    if (userIds.length > 0) {
      const userResult = await pool.query(
        `SELECT id, username, player_name, profile_id 
         FROM users WHERE id = ANY($1)`,
        [userIds]
      );
      for (const user of userResult.rows) {
        userMap.set(user.id, user);
      }
    }
    const shareholdersWithUsers = shareholders.map((sh) => {
      const user = userMap.get(sh.user_id);
      return {
        user_id: sh.user_id,
        shares: sh.shares,
        username: user?.username,
        player_name: user?.player_name,
        profile_id: user?.profile_id,
      };
    });

    // Check if current user is on board
    const isOnBoard = userId ? await BoardModel.isOnBoard(corpId, userId) : false;

    // Check if current user is CEO
    const isCeo = effectiveCeo?.userId === userId;

    res.json({
      corporation: {
        id: corporation.id,
        name: corporation.name,
        type: corporation.type,
        hq_state: corporation.hq_state,
        board_size: corporation.board_size || 3,
        elected_ceo_id: corporation.elected_ceo_id,
        ceo_salary: corporation.ceo_salary || 100000,
        dividend_percentage: corporation.dividend_percentage || 0,
        special_dividend_last_paid_at: corporation.special_dividend_last_paid_at,
        special_dividend_last_amount: corporation.special_dividend_last_amount,
      },
      board_members: boardMembers.map(m => ({
        ...m,
        profile_image_url: normalizeImageUrl(m.profile_image_url),
      })),
      effective_ceo: effectiveCeo,
      active_proposals: activeProposals,
      shareholders: shareholdersWithUsers,
      is_on_board: isOnBoard,
      is_ceo: isCeo,
      sectors: SECTORS,
      us_states: US_STATE_CODES,
    });
  } catch (error) {
    console.error('Get board error:', error);
    res.status(500).json({ error: 'Failed to fetch board data' });
  }
});

// GET /api/board/:corpId/proposals - Get proposal history
router.get('/:corpId/proposals', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const corpId = parseInt(req.params.corpId, 10);
    if (isNaN(corpId)) {
      return res.status(400).json({ error: 'Invalid corporation ID' });
    }

    const userId = req.userId || undefined;
    const proposals = await BoardProposalModel.getProposalsWithVotes(corpId, userId);

    res.json(proposals);
  } catch (error) {
    console.error('Get proposals error:', error);
    res.status(500).json({ error: 'Failed to fetch proposals' });
  }
});

// POST /api/board/:corpId/proposals - Create a new proposal
router.post('/:corpId/proposals', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const corpId = parseInt(req.params.corpId, 10);
    if (isNaN(corpId)) {
      return res.status(400).json({ error: 'Invalid corporation ID' });
    }

    const userId = req.userId!;
    const { proposal_type, proposal_data } = req.body;

    // Verify corporation exists
    const corporation = await CorporationModel.findById(corpId);
    if (!corporation) {
      return res.status(404).json({ error: 'Corporation not found' });
    }

    // Verify user is on board
    const isOnBoard = await BoardModel.isOnBoard(corpId, userId);
    if (!isOnBoard) {
      return res.status(403).json({ error: 'Only board members can create proposals' });
    }

    // Validate proposal type
    const validTypes: ProposalType[] = ['ceo_nomination', 'sector_change', 'hq_change', 'board_size', 'appoint_member', 'ceo_salary_change', 'dividend_change', 'special_dividend', 'stock_split'];
    if (!validTypes.includes(proposal_type)) {
      return res.status(400).json({ error: 'Invalid proposal type' });
    }

    // Validate proposal data based on type
    let validatedData: ProposalData;

    switch (proposal_type) {
      case 'ceo_nomination': {
        const nomineeId = proposal_data.nominee_id;
        if (!nomineeId || typeof nomineeId !== 'number') {
          return res.status(400).json({ error: 'Nominee ID is required' });
        }
        // Verify nominee is a shareholder
        const isShareholder = await BoardModel.isShareholder(corpId, nomineeId);
        if (!isShareholder) {
          return res.status(400).json({ error: 'CEO nominee must be a shareholder' });
        }
        const nominee = await UserModel.findById(nomineeId);
        validatedData = { 
          nominee_id: nomineeId,
          nominee_name: nominee?.player_name || nominee?.username || 'Unknown',
        };
        break;
      }

      case 'sector_change': {
        const newSector = proposal_data.new_sector;
        if (!newSector || !isValidSector(newSector)) {
          return res.status(400).json({ error: 'Invalid sector. Must be from predefined list.' });
        }
        validatedData = { new_sector: newSector };
        break;
      }

      case 'hq_change': {
        const newState = proposal_data.new_state;
        if (!newState || !isValidStateCode(newState)) {
          return res.status(400).json({ error: 'Invalid state code' });
        }
        validatedData = { new_state: newState };
        break;
      }

      case 'board_size': {
        const newSize = proposal_data.new_size;
        if (!newSize || typeof newSize !== 'number' || newSize < 3 || newSize > 7) {
          return res.status(400).json({ error: 'Board size must be between 3 and 7' });
        }
        validatedData = { new_size: newSize };
        break;
      }

      case 'appoint_member': {
        const appointeeId = proposal_data.appointee_id;
        if (!appointeeId || typeof appointeeId !== 'number') {
          return res.status(400).json({ error: 'Appointee ID is required' });
        }
        // Verify appointee is a shareholder
        const isShareholder = await BoardModel.isShareholder(corpId, appointeeId);
        if (!isShareholder) {
          return res.status(400).json({ error: 'Appointee must be a shareholder' });
        }
        const appointee = await UserModel.findById(appointeeId);
        validatedData = { 
          appointee_id: appointeeId,
          appointee_name: appointee?.player_name || appointee?.username || 'Unknown',
        };
        break;
      }

      case 'ceo_salary_change': {
        const newSalary = proposal_data.new_salary;
        if (newSalary === undefined || typeof newSalary !== 'number' || newSalary < 0) {
          return res.status(400).json({ error: 'New salary must be a non-negative number' });
        }
        // Cap at $10 million per 96h
        if (newSalary > 10000000) {
          return res.status(400).json({ error: 'CEO salary cannot exceed $10,000,000 per 96 hours' });
        }
        validatedData = { new_salary: newSalary };
        break;
      }

      case 'dividend_change': {
        const newPercentage = proposal_data.new_percentage;
        if (newPercentage === undefined || typeof newPercentage !== 'number' || newPercentage < 0 || newPercentage > 100) {
          return res.status(400).json({ error: 'Dividend percentage must be between 0 and 100' });
        }
        validatedData = { new_percentage: newPercentage };
        break;
      }

      case 'special_dividend': {
        const capitalPercentage = proposal_data.capital_percentage;
        if (capitalPercentage === undefined || typeof capitalPercentage !== 'number' || capitalPercentage < 0 || capitalPercentage > 100) {
          return res.status(400).json({ error: 'Capital percentage must be between 0 and 100' });
        }
        
        // Check if 96 hours have passed since last special dividend
        const corp = await CorporationModel.findById(corpId);
        if (corp?.special_dividend_last_paid_at) {
          const lastPaid = new Date(corp.special_dividend_last_paid_at);
          const now = new Date();
          const hoursSinceLast = (now.getTime() - lastPaid.getTime()) / (1000 * 60 * 60);
          if (hoursSinceLast < 96) {
            const hoursRemaining = Math.ceil(96 - hoursSinceLast);
            return res.status(400).json({ 
              error: `Special dividend can only be paid once every 96 hours. ${hoursRemaining} hours remaining.` 
            });
          }
        }
        
        validatedData = { capital_percentage: capitalPercentage };
        break;
      }

      case 'stock_split': {
        // Stock split doubles all shares (2:1 split)
        // No additional data needed
        validatedData = {};
        break;
      }

      default:
        return res.status(400).json({ error: 'Invalid proposal type' });
    }

    // Create the proposal
    const proposal = await BoardProposalModel.create(corpId, userId, proposal_type, validatedData);

    // Send notifications to board members
    const boardMembers = await BoardModel.getBoardMembers(corpId);
    const proposer = await UserModel.findById(userId);
    const proposerName = proposer?.player_name || proposer?.username || 'A board member';

    const proposalDescription = getProposalDescription(proposal_type, validatedData);

    for (const member of boardMembers) {
      if (member.user_id !== userId) {
        await MessageModel.create({
          sender_id: userId,
          recipient_id: member.user_id,
          subject: `New Board Proposal: ${corporation.name}`,
          body: `${proposerName} has proposed: ${proposalDescription}\n\nThis vote will expire in 12 hours. Please visit the corporation board page to cast your vote.`,
        });
      }
    }

    res.status(201).json(proposal);
  } catch (error) {
    console.error('Create proposal error:', error);
    res.status(500).json({ error: 'Failed to create proposal' });
  }
});

// POST /api/board/:corpId/proposals/:proposalId/vote - Cast a vote
router.post('/:corpId/proposals/:proposalId/vote', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const corpId = parseInt(req.params.corpId, 10);
    const proposalId = parseInt(req.params.proposalId, 10);
    if (isNaN(corpId) || isNaN(proposalId)) {
      return res.status(400).json({ error: 'Invalid IDs' });
    }

    const userId = req.userId!;
    const { vote } = req.body;

    if (!vote || !['aye', 'nay'].includes(vote)) {
      return res.status(400).json({ error: 'Vote must be "aye" or "nay"' });
    }

    // Verify proposal exists and is active
    const proposal = await BoardProposalModel.findById(proposalId);
    if (!proposal) {
      return res.status(404).json({ error: 'Proposal not found' });
    }
    if (proposal.corporation_id !== corpId) {
      return res.status(400).json({ error: 'Proposal does not belong to this corporation' });
    }
    if (proposal.status !== 'active') {
      return res.status(400).json({ error: 'This proposal is no longer active' });
    }

    // Verify user is on board
    const isOnBoard = await BoardModel.isOnBoard(corpId, userId);
    if (!isOnBoard) {
      return res.status(403).json({ error: 'Only board members can vote' });
    }

    // Cast the vote
    const boardVote = await BoardVoteModel.castVote(proposalId, userId, vote);

    // Check if all board members have voted - if so, resolve immediately
    const allVoted = await BoardModel.haveAllBoardMembersVoted(proposalId, corpId);
    if (allVoted) {
      await resolveProposal(proposalId);
    }

    // Return updated vote counts
    const voteCounts = await BoardVoteModel.getVoteCounts(proposalId);

    res.json({
      vote: boardVote,
      votes: voteCounts,
      resolved: allVoted,
    });
  } catch (error) {
    console.error('Cast vote error:', error);
    res.status(500).json({ error: 'Failed to cast vote' });
  }
});

// POST /api/board/:corpId/ceo/resign - CEO resigns position
router.post('/:corpId/ceo/resign', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const corpId = parseInt(req.params.corpId, 10);
    if (isNaN(corpId)) {
      return res.status(400).json({ error: 'Invalid corporation ID' });
    }

    const userId = req.userId!;

    const corporation = await CorporationModel.findById(corpId);
    if (!corporation) {
      return res.status(404).json({ error: 'Corporation not found' });
    }

    // Only the elected CEO can resign
    if (corporation.elected_ceo_id !== userId) {
      return res.status(403).json({ error: 'Only the elected CEO can resign' });
    }

    // Clear the elected CEO
    await CorporationModel.clearElectedCeo(corpId);

    // Notify board members
    const boardMembers = await BoardModel.getBoardMembers(corpId);
    const ceo = await UserModel.findById(userId);
    const ceoName = ceo?.player_name || ceo?.username || 'The CEO';

    for (const member of boardMembers) {
      if (member.user_id !== userId) {
        await MessageModel.create({
          sender_id: userId,
          recipient_id: member.user_id,
          subject: `CEO Resignation: ${corporation.name}`,
          body: `${ceoName} has resigned as CEO of ${corporation.name}. The largest shareholder will serve as Acting CEO until a new CEO is elected by the board.`,
        });
      }
    }

    res.json({ success: true, message: 'Successfully resigned as CEO' });
  } catch (error) {
    console.error('CEO resign error:', error);
    res.status(500).json({ error: 'Failed to resign' });
  }
});

// Helper function to resolve a proposal
async function resolveProposal(proposalId: number): Promise<void> {
  const proposal = await BoardProposalModel.findById(proposalId);
  if (!proposal || proposal.status !== 'active') return;

  const voteCounts = await BoardVoteModel.getVoteCounts(proposalId);
  const passed = voteCounts.aye > voteCounts.nay;

  // Update proposal status
  await BoardProposalModel.updateStatus(proposalId, passed ? 'passed' : 'failed');

  if (passed) {
    // Apply the changes
    await applyProposalChanges(proposal);
  }

  // Notify board members of outcome (use proposer as sender, skip self-messages)
  const boardMembers = await BoardModel.getBoardMembers(proposal.corporation_id);
  const corporation = await CorporationModel.findById(proposal.corporation_id);
  const proposalDescription = getProposalDescription(proposal.proposal_type, proposal.proposal_data);
  const senderId = proposal.proposer_id;

  for (const member of boardMembers) {
    // Skip sending to the proposer (they already know, and self-messaging is not allowed)
    if (member.user_id === senderId) continue;

    try {
      await MessageModel.create({
        sender_id: senderId,
        recipient_id: member.user_id,
        subject: `Vote Result: ${corporation?.name || 'Corporation'}`,
        body: `The proposal "${proposalDescription}" has ${passed ? 'PASSED' : 'FAILED'}.\n\nVotes: ${voteCounts.aye} Aye, ${voteCounts.nay} Nay`,
      });
    } catch (msgErr) {
      console.warn(`Failed to send vote notification to user ${member.user_id}:`, msgErr);
    }
  }
}

// Helper function to apply passed proposal changes
async function applyProposalChanges(proposal: any): Promise<void> {
  const corpId = proposal.corporation_id;
  const data = proposal.proposal_data;

  switch (proposal.proposal_type) {
    case 'ceo_nomination':
      await CorporationModel.setElectedCeo(corpId, data.nominee_id);
      break;

    case 'sector_change':
      await CorporationModel.update(corpId, { type: data.new_sector });
      break;

    case 'hq_change':
      await CorporationModel.update(corpId, { hq_state: data.new_state });
      break;

    case 'board_size':
      await CorporationModel.update(corpId, { board_size: data.new_size });
      break;

    case 'appoint_member':
      // Appoint member doesn't directly change DB - it just increases board_size
      // which allows more shareholders to be on the board
      const corp = await CorporationModel.findById(corpId);
      if (corp && corp.board_size < 7) {
        await CorporationModel.update(corpId, { board_size: corp.board_size + 1 });
      }
      break;

    case 'ceo_salary_change':
      await CorporationModel.update(corpId, { ceo_salary: data.new_salary });
      break;

    case 'dividend_change':
      await CorporationModel.update(corpId, { dividend_percentage: data.new_percentage });
      break;

    case 'special_dividend':
      // Special dividend logic is handled in the cron job
      break;

    case 'stock_split':
      // 2:1 stock split: double all shares, halve the price
      // Execute as a single transaction for data integrity
      const splitCorp = await CorporationModel.findById(corpId);
      if (splitCorp) {
        // Get all shareholders BEFORE updating
        const shareholdersBeforeSplit = await ShareholderModel.findByCorporationId(corpId);
        
        // Calculate new values
        const newSharePrice = splitCorp.share_price / 2;
        
        // Calculate total shares from actual shareholder positions + public shares
        const totalHeldByPlayers = shareholdersBeforeSplit.reduce((sum, sh) => sum + sh.shares, 0);
        const actualTotalShares = totalHeldByPlayers + splitCorp.public_shares;
        
        // Double everything
        const newTotalShares = actualTotalShares * 2;
        const newPublicShares = splitCorp.public_shares * 2;
        
        console.log(`[Stock Split] Corp ${corpId}: Before split - Total: ${actualTotalShares}, Public: ${splitCorp.public_shares}, Held: ${totalHeldByPlayers}`);
        console.log(`[Stock Split] Corp ${corpId}: After split - Total: ${newTotalShares}, Public: ${newPublicShares}, Price: ${newSharePrice}`);
        
        // First, double all shareholder positions
        for (const sh of shareholdersBeforeSplit) {
          const newShares = sh.shares * 2;
          console.log(`[Stock Split] Corp ${corpId}: User ${sh.user_id}: ${sh.shares} -> ${newShares}`);
          await ShareholderModel.updateShares(corpId, sh.user_id, newShares);
        }
        
        // Then update corporation (total shares should match doubled held + doubled public)
        await CorporationModel.update(corpId, {
          shares: newTotalShares,
          public_shares: newPublicShares,
          share_price: newSharePrice,
        });
      }
      break;
  }
}

// Helper function to get human-readable proposal description
function getProposalDescription(type: string, data: any): string {
  switch (type) {
    case 'ceo_nomination':
      return `Elect ${data.nominee_name || 'a shareholder'} as CEO`;
    case 'sector_change':
      return `Change sector to ${data.new_sector}`;
    case 'hq_change':
      return `Move HQ to ${getStateLabel(data.new_state) || data.new_state}`;
    case 'board_size':
      return `Change board size to ${data.new_size} members`;
    case 'appoint_member':
      return `Appoint ${data.appointee_name || 'a shareholder'} to the board`;
    case 'ceo_salary_change':
      return `Change CEO salary to $${data.new_salary?.toLocaleString() || 0}/96h`;
    case 'dividend_change':
      return `Change dividend percentage to ${data.new_percentage?.toFixed(2) || 0}%`;
    case 'special_dividend':
      return `Pay special dividend of ${data.capital_percentage?.toFixed(2) || 0}% of capital`;
    case 'stock_split':
      return `Execute 2:1 stock split (double shares, halve price)`;
    default:
      return 'Unknown proposal';
  }
}

// Export the resolveProposal function for use in cron
export { resolveProposal };
export default router;

