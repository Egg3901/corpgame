"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveProposal = resolveProposal;
const express_1 = __importDefault(require("express"));
const auth_1 = require("../middleware/auth");
const BoardProposal_1 = require("../models/BoardProposal");
const Corporation_1 = require("../models/Corporation");
const Shareholder_1 = require("../models/Shareholder");
const User_1 = require("../models/User");
const Message_1 = require("../models/Message");
const Transaction_1 = require("../models/Transaction");
const sectors_1 = require("../constants/sectors");
const imageUrl_1 = require("../utils/imageUrl");
const connection_1 = __importDefault(require("../db/connection"));
const router = express_1.default.Router();
// GET /api/board/:corpId - Get board info, members, active proposals
router.get('/:corpId', auth_1.optionalAuth, async (req, res) => {
    try {
        const corpId = parseInt(req.params.corpId, 10);
        if (isNaN(corpId)) {
            return res.status(400).json({ error: 'Invalid corporation ID' });
        }
        const corporation = await Corporation_1.CorporationModel.findById(corpId);
        if (!corporation) {
            return res.status(404).json({ error: 'Corporation not found' });
        }
        // Get board members
        const boardMembers = await BoardProposal_1.BoardModel.getBoardMembers(corpId);
        // Get effective CEO
        const effectiveCeo = await BoardProposal_1.BoardModel.getEffectiveCeo(corpId);
        // Get active proposals with votes
        const userId = req.userId || undefined;
        const proposals = await BoardProposal_1.BoardProposalModel.getProposalsWithVotes(corpId, userId);
        const activeProposals = proposals.filter(p => p.status === 'active');
        // Get shareholders list (for nominee/appointee selection) - batch fetch users
        const shareholders = await Shareholder_1.ShareholderModel.findByCorporationId(corpId);
        const userIds = [...new Set(shareholders.map(sh => sh.user_id))];
        let userMap = new Map();
        if (userIds.length > 0) {
            const userResult = await connection_1.default.query(`SELECT id, username, player_name, profile_id 
         FROM users WHERE id = ANY($1)`, [userIds]);
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
        const isOnBoard = userId ? await BoardProposal_1.BoardModel.isOnBoard(corpId, userId) : false;
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
                focus: corporation.focus || 'diversified',
            },
            board_members: boardMembers.map(m => ({
                ...m,
                profile_image_url: (0, imageUrl_1.normalizeImageUrl)(m.profile_image_url),
            })),
            effective_ceo: effectiveCeo,
            active_proposals: activeProposals,
            shareholders: shareholdersWithUsers,
            is_on_board: isOnBoard,
            is_ceo: isCeo,
            sectors: sectors_1.SECTORS,
            us_states: sectors_1.US_STATE_CODES,
        });
    }
    catch (error) {
        console.error('Get board error:', error);
        res.status(500).json({ error: 'Failed to fetch board data' });
    }
});
// GET /api/board/:corpId/proposals - Get proposal history
router.get('/:corpId/proposals', auth_1.optionalAuth, async (req, res) => {
    try {
        const corpId = parseInt(req.params.corpId, 10);
        if (isNaN(corpId)) {
            return res.status(400).json({ error: 'Invalid corporation ID' });
        }
        const userId = req.userId || undefined;
        const proposals = await BoardProposal_1.BoardProposalModel.getProposalsWithVotes(corpId, userId);
        res.json(proposals);
    }
    catch (error) {
        console.error('Get proposals error:', error);
        res.status(500).json({ error: 'Failed to fetch proposals' });
    }
});
// POST /api/board/:corpId/proposals - Create a new proposal
router.post('/:corpId/proposals', auth_1.authenticateToken, async (req, res) => {
    try {
        const corpId = parseInt(req.params.corpId, 10);
        if (isNaN(corpId)) {
            return res.status(400).json({ error: 'Invalid corporation ID' });
        }
        const userId = req.userId;
        const { proposal_type, proposal_data } = req.body;
        // Verify corporation exists
        const corporation = await Corporation_1.CorporationModel.findById(corpId);
        if (!corporation) {
            return res.status(404).json({ error: 'Corporation not found' });
        }
        // Verify user is on board
        const isOnBoard = await BoardProposal_1.BoardModel.isOnBoard(corpId, userId);
        if (!isOnBoard) {
            return res.status(403).json({ error: 'Only board members can create proposals' });
        }
        // Validate proposal type
        const validTypes = ['ceo_nomination', 'sector_change', 'hq_change', 'board_size', 'appoint_member', 'ceo_salary_change', 'dividend_change', 'special_dividend', 'stock_split', 'focus_change'];
        if (!validTypes.includes(proposal_type)) {
            return res.status(400).json({ error: 'Invalid proposal type' });
        }
        // Validate proposal data based on type
        let validatedData;
        switch (proposal_type) {
            case 'ceo_nomination': {
                const nomineeId = proposal_data.nominee_id;
                if (!nomineeId || typeof nomineeId !== 'number') {
                    return res.status(400).json({ error: 'Nominee ID is required' });
                }
                // Verify nominee is a shareholder
                const isShareholder = await BoardProposal_1.BoardModel.isShareholder(corpId, nomineeId);
                if (!isShareholder) {
                    return res.status(400).json({ error: 'CEO nominee must be a shareholder' });
                }
                const nominee = await User_1.UserModel.findById(nomineeId);
                validatedData = {
                    nominee_id: nomineeId,
                    nominee_name: nominee?.player_name || nominee?.username || 'Unknown',
                };
                break;
            }
            case 'sector_change': {
                const newSector = proposal_data.new_sector;
                if (!newSector || !(0, sectors_1.isValidSector)(newSector)) {
                    return res.status(400).json({ error: 'Invalid sector. Must be from predefined list.' });
                }
                validatedData = { new_sector: newSector };
                break;
            }
            case 'hq_change': {
                const newState = proposal_data.new_state;
                if (!newState || !(0, sectors_1.isValidStateCode)(newState)) {
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
                const isShareholder = await BoardProposal_1.BoardModel.isShareholder(corpId, appointeeId);
                if (!isShareholder) {
                    return res.status(400).json({ error: 'Appointee must be a shareholder' });
                }
                const appointee = await User_1.UserModel.findById(appointeeId);
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
                const corp = await Corporation_1.CorporationModel.findById(corpId);
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
            case 'focus_change': {
                const newFocus = proposal_data.new_focus;
                const validFocuses = ['extraction', 'production', 'retail', 'service', 'diversified'];
                if (!newFocus || !validFocuses.includes(newFocus)) {
                    return res.status(400).json({ error: 'Invalid focus type. Must be extraction, production, retail, service, or diversified.' });
                }
                validatedData = { new_focus: newFocus };
                break;
            }
            default:
                return res.status(400).json({ error: 'Invalid proposal type' });
        }
        // Create the proposal
        const proposal = await BoardProposal_1.BoardProposalModel.create(corpId, userId, proposal_type, validatedData);
        // Send notifications to board members (system message)
        const boardMembers = await BoardProposal_1.BoardModel.getBoardMembers(corpId);
        const proposer = await User_1.UserModel.findById(userId);
        const proposerName = proposer?.player_name || proposer?.username || 'A board member';
        const proposalDescription = getProposalDescription(proposal_type, validatedData);
        for (const member of boardMembers) {
            await Message_1.MessageModel.create({
                sender_id: 1, // System user ID
                recipient_id: member.user_id,
                subject: `New Board Proposal: ${corporation.name}`,
                body: `${proposerName} has proposed: ${proposalDescription}\n\nThis vote will expire in 12 hours. Please visit the corporation board page to cast your vote.`,
            });
        }
        res.status(201).json(proposal);
    }
    catch (error) {
        console.error('Create proposal error:', error);
        res.status(500).json({ error: 'Failed to create proposal' });
    }
});
// POST /api/board/:corpId/proposals/:proposalId/vote - Cast a vote
router.post('/:corpId/proposals/:proposalId/vote', auth_1.authenticateToken, async (req, res) => {
    try {
        const corpId = parseInt(req.params.corpId, 10);
        const proposalId = parseInt(req.params.proposalId, 10);
        if (isNaN(corpId) || isNaN(proposalId)) {
            return res.status(400).json({ error: 'Invalid IDs' });
        }
        const userId = req.userId;
        const { vote } = req.body;
        if (!vote || !['aye', 'nay'].includes(vote)) {
            return res.status(400).json({ error: 'Vote must be "aye" or "nay"' });
        }
        // Verify proposal exists and is active
        const proposal = await BoardProposal_1.BoardProposalModel.findById(proposalId);
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
        const isOnBoard = await BoardProposal_1.BoardModel.isOnBoard(corpId, userId);
        if (!isOnBoard) {
            return res.status(403).json({ error: 'Only board members can vote' });
        }
        // Cast the vote
        const boardVote = await BoardProposal_1.BoardVoteModel.castVote(proposalId, userId, vote);
        // Get current vote counts and board size
        const voteCounts = await BoardProposal_1.BoardVoteModel.getVoteCounts(proposalId);
        const boardMembers = await BoardProposal_1.BoardModel.getBoardMembers(corpId);
        const boardSize = boardMembers.length;
        const majorityNeeded = Math.floor(boardSize / 2) + 1;
        // Check if supermajority is reached (autopass/autofail)
        let resolved = false;
        if (voteCounts.aye >= majorityNeeded) {
            // Majority voted aye - auto-pass
            await resolveProposal(proposalId);
            resolved = true;
        }
        else if (voteCounts.nay >= majorityNeeded) {
            // Majority voted nay - auto-fail
            await resolveProposal(proposalId);
            resolved = true;
        }
        else {
            // Check if all board members have voted - if so, resolve immediately
            const allVoted = await BoardProposal_1.BoardModel.haveAllBoardMembersVoted(proposalId, corpId);
            if (allVoted) {
                await resolveProposal(proposalId);
                resolved = true;
            }
        }
        res.json({
            vote: boardVote,
            votes: voteCounts,
            resolved,
        });
    }
    catch (error) {
        console.error('Cast vote error:', error);
        res.status(500).json({ error: 'Failed to cast vote' });
    }
});
// POST /api/board/:corpId/ceo/resign - CEO resigns position
router.post('/:corpId/ceo/resign', auth_1.authenticateToken, async (req, res) => {
    try {
        const corpId = parseInt(req.params.corpId, 10);
        if (isNaN(corpId)) {
            return res.status(400).json({ error: 'Invalid corporation ID' });
        }
        const userId = req.userId;
        const corporation = await Corporation_1.CorporationModel.findById(corpId);
        if (!corporation) {
            return res.status(404).json({ error: 'Corporation not found' });
        }
        // Only the elected CEO can resign
        if (corporation.elected_ceo_id !== userId) {
            return res.status(403).json({ error: 'Only the elected CEO can resign' });
        }
        // Clear the elected CEO
        await Corporation_1.CorporationModel.clearElectedCeo(corpId);
        // Notify board members (system message)
        const boardMembers = await BoardProposal_1.BoardModel.getBoardMembers(corpId);
        const ceo = await User_1.UserModel.findById(userId);
        const ceoName = ceo?.player_name || ceo?.username || 'The CEO';
        for (const member of boardMembers) {
            await Message_1.MessageModel.create({
                sender_id: 1, // System user ID
                recipient_id: member.user_id,
                subject: `CEO Resignation: ${corporation.name}`,
                body: `${ceoName} has resigned as CEO of ${corporation.name}. The largest shareholder will serve as Acting CEO until a new CEO is elected by the board.`,
            });
        }
        res.json({ success: true, message: 'Successfully resigned as CEO' });
    }
    catch (error) {
        console.error('CEO resign error:', error);
        res.status(500).json({ error: 'Failed to resign' });
    }
});
// Helper function to resolve a proposal
async function resolveProposal(proposalId) {
    const proposal = await BoardProposal_1.BoardProposalModel.findById(proposalId);
    if (!proposal || proposal.status !== 'active')
        return;
    const voteCounts = await BoardProposal_1.BoardVoteModel.getVoteCounts(proposalId);
    const passed = voteCounts.aye > voteCounts.nay;
    // Update proposal status
    await BoardProposal_1.BoardProposalModel.updateStatus(proposalId, passed ? 'passed' : 'failed');
    if (passed) {
        // Apply the changes
        await applyProposalChanges(proposal);
    }
    // Notify board members of outcome (system message)
    const boardMembers = await BoardProposal_1.BoardModel.getBoardMembers(proposal.corporation_id);
    const corporation = await Corporation_1.CorporationModel.findById(proposal.corporation_id);
    const proposalDescription = getProposalDescription(proposal.proposal_type, proposal.proposal_data);
    for (const member of boardMembers) {
        try {
            await Message_1.MessageModel.create({
                sender_id: 1, // System user ID
                recipient_id: member.user_id,
                subject: `Board Vote Result: ${corporation?.name || 'Corporation'}`,
                body: `The proposal "${proposalDescription}" has ${passed ? 'PASSED' : 'FAILED'}.\n\nVotes: ${voteCounts.aye} Aye, ${voteCounts.nay} Nay`,
            });
        }
        catch (msgErr) {
            console.warn(`Failed to send vote notification to user ${member.user_id}:`, msgErr);
        }
    }
}
// Helper function to apply passed proposal changes
async function applyProposalChanges(proposal) {
    const corpId = proposal.corporation_id;
    const data = proposal.proposal_data;
    switch (proposal.proposal_type) {
        case 'ceo_nomination':
            await Corporation_1.CorporationModel.setElectedCeo(corpId, data.nominee_id);
            // Clean up votes since CEO is always on the board and this may change board composition
            await BoardProposal_1.BoardVoteModel.cleanupNonBoardMemberVotes(corpId);
            break;
        case 'sector_change':
            await Corporation_1.CorporationModel.update(corpId, { type: data.new_sector });
            break;
        case 'hq_change':
            await Corporation_1.CorporationModel.update(corpId, { hq_state: data.new_state });
            break;
        case 'board_size':
            await Corporation_1.CorporationModel.update(corpId, { board_size: data.new_size });
            // Clean up votes from removed board members if board size decreased
            await BoardProposal_1.BoardVoteModel.cleanupNonBoardMemberVotes(corpId);
            break;
        case 'appoint_member':
            // Create board appointment
            await connection_1.default.query(`INSERT INTO board_appointments (corporation_id, user_id, appointed_by_proposal_id)
         VALUES ($1, $2, $3)
         ON CONFLICT (corporation_id, user_id) DO NOTHING`, [corpId, data.appointee_id, proposal.id]);
            // Clean up votes in case board composition changed
            await BoardProposal_1.BoardVoteModel.cleanupNonBoardMemberVotes(corpId);
            break;
        case 'ceo_salary_change':
            await Corporation_1.CorporationModel.update(corpId, { ceo_salary: data.new_salary });
            break;
        case 'dividend_change':
            await Corporation_1.CorporationModel.update(corpId, { dividend_percentage: data.new_percentage });
            break;
        case 'special_dividend':
            // Pay special dividend immediately when proposal passes
            const specialCorp = await Corporation_1.CorporationModel.findById(corpId);
            if (specialCorp) {
                const capitalPercentage = data.capital_percentage / 100;
                const currentCapital = typeof specialCorp.capital === 'string' ? parseFloat(specialCorp.capital) : specialCorp.capital;
                const dividendAmount = currentCapital * capitalPercentage;
                // Get all shareholders
                const shareholders = await Shareholder_1.ShareholderModel.findByCorporationId(corpId);
                const totalShares = shareholders.reduce((sum, sh) => sum + sh.shares, 0) + specialCorp.public_shares;
                if (totalShares > 0 && dividendAmount > 0) {
                    // Pay each shareholder their proportional share
                    for (const shareholder of shareholders) {
                        const shareholderPayout = (dividendAmount * shareholder.shares) / totalShares;
                        await User_1.UserModel.updateCash(shareholder.user_id, shareholderPayout);
                        // Record transaction
                        await Transaction_1.TransactionModel.create({
                            transaction_type: 'special_dividend',
                            amount: shareholderPayout,
                            from_user_id: null,
                            to_user_id: shareholder.user_id,
                            corporation_id: corpId,
                            description: `Special dividend from ${specialCorp.name} (${data.capital_percentage}% of capital)`,
                        });
                    }
                    // Deduct dividend from corporation capital
                    const newCapital = currentCapital - dividendAmount;
                    await Corporation_1.CorporationModel.update(corpId, {
                        capital: newCapital,
                        special_dividend_last_paid_at: new Date(),
                        special_dividend_last_amount: dividendAmount,
                    });
                }
            }
            break;
        case 'stock_split':
            // 2:1 stock split: double all shares, halve the price
            // Execute as a single transaction for data integrity
            const splitCorp = await Corporation_1.CorporationModel.findById(corpId);
            if (splitCorp) {
                // Get all shareholders BEFORE updating
                const shareholdersBeforeSplit = await Shareholder_1.ShareholderModel.findByCorporationId(corpId);
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
                    await Shareholder_1.ShareholderModel.updateShares(corpId, sh.user_id, newShares);
                }
                // Then update corporation (total shares should match doubled held + doubled public)
                await Corporation_1.CorporationModel.update(corpId, {
                    shares: newTotalShares,
                    public_shares: newPublicShares,
                    share_price: newSharePrice,
                });
            }
            break;
        case 'focus_change':
            await Corporation_1.CorporationModel.update(corpId, { focus: data.new_focus });
            break;
    }
}
// Helper function to get human-readable proposal description
function getProposalDescription(type, data) {
    switch (type) {
        case 'ceo_nomination':
            return `Elect ${data.nominee_name || 'a shareholder'} as CEO`;
        case 'sector_change':
            return `Change sector to ${data.new_sector}`;
        case 'hq_change':
            return `Move HQ to ${(0, sectors_1.getStateLabel)(data.new_state) || data.new_state}`;
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
        case 'focus_change':
            const focusLabels = {
                extraction: 'Extraction',
                production: 'Production',
                retail: 'Retail',
                service: 'Service',
                diversified: 'Diversified',
            };
            return `Change corporate focus to ${focusLabels[data.new_focus] || data.new_focus}`;
        default:
            return 'Unknown proposal';
    }
}
exports.default = router;
