import express, { Response } from 'express';
import { authenticateToken, optionalAuth, AuthRequest } from '../middleware/auth';
import { BoardProposalModel, BoardVoteModel, BoardModel, ProposalType, ProposalData } from '../models/BoardProposal';
import { CorporationModel } from '../models/Corporation';
import { ShareholderModel } from '../models/Shareholder';
import { UserModel } from '../models/User';
import { MessageModel } from '../models/Message';
import { SECTORS, isValidSector, US_STATE_CODES, isValidStateCode, getStateLabel } from '../constants/sectors';
import { normalizeImageUrl } from '../utils/imageUrl';

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

    // Get shareholders list (for nominee/appointee selection)
    const shareholders = await ShareholderModel.findByCorporationId(corpId);
    const shareholdersWithUsers = await Promise.all(
      shareholders.map(async (sh) => {
        const user = await UserModel.findById(sh.user_id);
        return {
          user_id: sh.user_id,
          shares: sh.shares,
          username: user?.username,
          player_name: user?.player_name,
          profile_id: user?.profile_id,
        };
      })
    );

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
    const validTypes: ProposalType[] = ['ceo_nomination', 'sector_change', 'hq_change', 'board_size', 'appoint_member'];
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
    default:
      return 'Unknown proposal';
  }
}

// Export the resolveProposal function for use in cron
export { resolveProposal };
export default router;
