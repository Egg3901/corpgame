"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BoardModel = exports.BoardVoteModel = exports.BoardProposalModel = void 0;
const connection_1 = __importDefault(require("../db/connection"));
const Shareholder_1 = require("./Shareholder");
const Corporation_1 = require("./Corporation");
class BoardProposalModel {
    // Create a new proposal
    static async create(corporationId, proposerId, proposalType, proposalData, expiresInHours = 12) {
        const expiresAt = new Date(Date.now() + expiresInHours * 60 * 60 * 1000);
        const result = await connection_1.default.query(`INSERT INTO board_proposals (corporation_id, proposer_id, proposal_type, proposal_data, expires_at)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`, [corporationId, proposerId, proposalType, JSON.stringify(proposalData), expiresAt]);
        return result.rows[0];
    }
    // Get a proposal by ID
    static async findById(id) {
        const result = await connection_1.default.query('SELECT * FROM board_proposals WHERE id = $1', [id]);
        return result.rows[0] || null;
    }
    // Get active proposals for a corporation
    static async getActiveProposals(corporationId) {
        const result = await connection_1.default.query(`SELECT * FROM board_proposals 
       WHERE corporation_id = $1 AND status = 'active'
       ORDER BY created_at DESC`, [corporationId]);
        return result.rows;
    }
    // Get proposal history (non-active) for a corporation
    static async getProposalHistory(corporationId, limit = 20) {
        const result = await connection_1.default.query(`SELECT * FROM board_proposals 
       WHERE corporation_id = $1 AND status != 'active'
       ORDER BY resolved_at DESC NULLS LAST, created_at DESC
       LIMIT $2`, [corporationId, limit]);
        return result.rows;
    }
    // Get user's corporate history (CEO elections, founding, etc.)
    static async getUserCorporateHistory(userId, limit = 50) {
        const history = [];
        // 1. Get corporations this user founded (is the original CEO)
        const foundedResult = await connection_1.default.query(`SELECT id, name, created_at FROM corporations WHERE ceo_id = $1 ORDER BY created_at DESC`, [userId]);
        for (const corp of foundedResult.rows) {
            history.push({
                type: 'founded',
                corporation_id: corp.id,
                corporation_name: corp.name,
                date: corp.created_at,
                details: 'Founded corporation as CEO',
            });
        }
        // 2. Get CEO elections where this user was elected (passed ceo_nomination proposals)
        const electedResult = await connection_1.default.query(`SELECT bp.resolved_at, bp.corporation_id, c.name as corporation_name, bp.proposal_data
       FROM board_proposals bp
       JOIN corporations c ON bp.corporation_id = c.id
       WHERE bp.proposal_type = 'ceo_nomination'
         AND bp.status = 'passed'
         AND (bp.proposal_data->>'nominee_id')::int = $1
       ORDER BY bp.resolved_at DESC`, [userId]);
        for (const row of electedResult.rows) {
            history.push({
                type: 'elected_ceo',
                corporation_id: row.corporation_id,
                corporation_name: row.corporation_name,
                date: row.resolved_at,
                details: 'Elected as CEO by board vote',
            });
        }
        // 3. Get CEO elections where this user LOST their position (another user was elected while they were CEO)
        // This requires checking historical data - we look for proposals where the user was previously CEO
        const lostCeoResult = await connection_1.default.query(`SELECT bp.resolved_at, bp.corporation_id, c.name as corporation_name, 
              bp.proposal_data->>'nominee_name' as new_ceo_name
       FROM board_proposals bp
       JOIN corporations c ON bp.corporation_id = c.id
       WHERE bp.proposal_type = 'ceo_nomination'
         AND bp.status = 'passed'
         AND (bp.proposal_data->>'nominee_id')::int != $1
         AND EXISTS (
           -- Check if the user was elected CEO before this proposal passed
           SELECT 1 FROM board_proposals prev
           WHERE prev.corporation_id = bp.corporation_id
             AND prev.proposal_type = 'ceo_nomination'
             AND prev.status = 'passed'
             AND (prev.proposal_data->>'nominee_id')::int = $1
             AND prev.resolved_at < bp.resolved_at
         )
       ORDER BY bp.resolved_at DESC`, [userId]);
        for (const row of lostCeoResult.rows) {
            history.push({
                type: 'lost_ceo',
                corporation_id: row.corporation_id,
                corporation_name: row.corporation_name,
                date: row.resolved_at,
                details: `Replaced as CEO by ${row.new_ceo_name || 'another executive'}`,
            });
        }
        // Sort by date descending
        history.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        return history.slice(0, limit);
    }
    // Get voter details for a proposal
    static async getVoterDetailsForProposal(proposalId, corporationId) {
        // Get all board members
        const boardMembers = await BoardModel.getBoardMembers(corporationId);
        // Get votes for this proposal
        const votesResult = await connection_1.default.query(`SELECT bv.voter_id, bv.vote, u.username, u.player_name, u.profile_id, u.profile_slug, u.profile_image_url,
              COALESCE(s.shares, 0) as shares
       FROM board_votes bv
       JOIN users u ON bv.voter_id = u.id
       LEFT JOIN shareholders s ON s.user_id = bv.voter_id AND s.corporation_id = $2
       WHERE bv.proposal_id = $1`, [proposalId, corporationId]);
        const votes = {};
        votesResult.rows.forEach(row => {
            votes[row.voter_id] = row.vote;
        });
        const aye = [];
        const nay = [];
        const abstained = [];
        for (const member of boardMembers) {
            const vote = votes[member.user_id];
            if (vote === 'aye') {
                aye.push(member);
            }
            else if (vote === 'nay') {
                nay.push(member);
            }
            else {
                abstained.push(member);
            }
        }
        return { aye, nay, abstained };
    }
    // Get all proposals (active and history) with vote counts
    static async getProposalsWithVotes(corporationId, userId, includeVoterDetails = true) {
        const result = await connection_1.default.query(`SELECT bp.*,
              u.id as proposer_user_id, u.username as proposer_username,
              u.player_name as proposer_player_name, u.profile_id as proposer_profile_id,
              COALESCE(SUM(CASE WHEN bv.vote = 'aye' THEN 1 ELSE 0 END), 0)::int as aye_count,
              COALESCE(SUM(CASE WHEN bv.vote = 'nay' THEN 1 ELSE 0 END), 0)::int as nay_count,
              COUNT(bv.id)::int as total_votes
       FROM board_proposals bp
       LEFT JOIN users u ON bp.proposer_id = u.id
       LEFT JOIN board_votes bv ON bp.id = bv.proposal_id
       WHERE bp.corporation_id = $1
       GROUP BY bp.id, u.id, u.username, u.player_name, u.profile_id
       ORDER BY bp.status = 'active' DESC, bp.created_at DESC`, [corporationId]);
        // Get user's votes if userId provided
        let userVotes = {};
        if (userId) {
            const votesResult = await connection_1.default.query(`SELECT proposal_id, vote FROM board_votes WHERE voter_id = $1`, [userId]);
            userVotes = votesResult.rows.reduce((acc, row) => {
                acc[row.proposal_id] = row.vote;
                return acc;
            }, {});
        }
        const proposals = [];
        for (const row of result.rows) {
            const proposal = {
                id: row.id,
                corporation_id: row.corporation_id,
                proposer_id: row.proposer_id,
                proposal_type: row.proposal_type,
                proposal_data: row.proposal_data,
                status: row.status,
                created_at: row.created_at,
                resolved_at: row.resolved_at,
                expires_at: row.expires_at,
                proposer: row.proposer_user_id ? {
                    id: row.proposer_user_id,
                    username: row.proposer_username,
                    player_name: row.proposer_player_name,
                    profile_id: row.proposer_profile_id,
                } : undefined,
                votes: {
                    aye: row.aye_count,
                    nay: row.nay_count,
                    total: row.total_votes,
                },
                user_vote: userId ? userVotes[row.id] || null : null,
            };
            // Add voter details if requested
            if (includeVoterDetails) {
                proposal.voter_details = await this.getVoterDetailsForProposal(row.id, corporationId);
            }
            proposals.push(proposal);
        }
        return proposals;
    }
    // Get expired active proposals that need resolution
    static async getExpiredActiveProposals() {
        const result = await connection_1.default.query(`SELECT * FROM board_proposals 
       WHERE status = 'active' AND expires_at <= NOW()
       ORDER BY expires_at ASC`);
        return result.rows;
    }
    // Update proposal status
    static async updateStatus(id, status) {
        const result = await connection_1.default.query(`UPDATE board_proposals 
       SET status = $1, resolved_at = NOW()
       WHERE id = $2
       RETURNING *`, [status, id]);
        return result.rows[0] || null;
    }
}
exports.BoardProposalModel = BoardProposalModel;
class BoardVoteModel {
    // Clean up votes from users who are no longer board members
    static async cleanupNonBoardMemberVotes(corporationId) {
        const boardMembers = await BoardModel.getBoardMembers(corporationId);
        const boardMemberIds = boardMembers.map(m => m.user_id);
        if (boardMemberIds.length === 0) {
            // If no board members, delete all votes for this corp's proposals
            const result = await connection_1.default.query(`DELETE FROM board_votes
         WHERE proposal_id IN (SELECT id FROM board_proposals WHERE corporation_id = $1)`, [corporationId]);
            return result.rowCount || 0;
        }
        // Delete votes from users who aren't on the board
        const result = await connection_1.default.query(`DELETE FROM board_votes
       WHERE proposal_id IN (SELECT id FROM board_proposals WHERE corporation_id = $1)
       AND voter_id NOT IN (${boardMemberIds.map((_, i) => `$${i + 2}`).join(', ')})`, [corporationId, ...boardMemberIds]);
        return result.rowCount || 0;
    }
    // Cast a vote (or update existing vote)
    static async castVote(proposalId, voterId, vote) {
        const result = await connection_1.default.query(`INSERT INTO board_votes (proposal_id, voter_id, vote)
       VALUES ($1, $2, $3)
       ON CONFLICT (proposal_id, voter_id)
       DO UPDATE SET vote = EXCLUDED.vote, voted_at = NOW()
       RETURNING *`, [proposalId, voterId, vote]);
        return result.rows[0];
    }
    // Get all votes for a proposal
    static async getVotesForProposal(proposalId) {
        const result = await connection_1.default.query(`SELECT * FROM board_votes WHERE proposal_id = $1`, [proposalId]);
        return result.rows;
    }
    // Get vote counts for a proposal
    static async getVoteCounts(proposalId) {
        const result = await connection_1.default.query(`SELECT 
         COALESCE(SUM(CASE WHEN vote = 'aye' THEN 1 ELSE 0 END), 0)::int as aye,
         COALESCE(SUM(CASE WHEN vote = 'nay' THEN 1 ELSE 0 END), 0)::int as nay,
         COUNT(*)::int as total
       FROM board_votes WHERE proposal_id = $1`, [proposalId]);
        return result.rows[0];
    }
    // Check if user has voted on a proposal
    static async getUserVote(proposalId, userId) {
        const result = await connection_1.default.query(`SELECT vote FROM board_votes WHERE proposal_id = $1 AND voter_id = $2`, [proposalId, userId]);
        return result.rows[0]?.vote || null;
    }
    // Get count of voters for a proposal
    static async getVoterCount(proposalId) {
        const result = await connection_1.default.query(`SELECT COUNT(DISTINCT voter_id)::int as count FROM board_votes WHERE proposal_id = $1`, [proposalId]);
        return result.rows[0].count;
    }
}
exports.BoardVoteModel = BoardVoteModel;
class BoardModel {
    // Get board members for a corporation (top N shareholders)
    static async getBoardMembers(corporationId) {
        // Get corporation to find elected CEO
        const corp = await Corporation_1.CorporationModel.findById(corporationId);
        if (!corp)
            return [];
        const members = [];
        // Get CEO (if elected)
        if (corp.elected_ceo_id) {
            const ceoResult = await connection_1.default.query(`SELECT s.shares, u.id as user_id, u.username, u.player_name, u.profile_id, u.profile_slug, u.profile_image_url
         FROM users u
         LEFT JOIN shareholders s ON s.user_id = u.id AND s.corporation_id = $1
         WHERE u.id = $2`, [corporationId, corp.elected_ceo_id]);
            if (ceoResult.rows.length > 0) {
                const ceo = ceoResult.rows[0];
                members.push({
                    user_id: ceo.user_id,
                    shares: ceo.shares || 0,
                    username: ceo.username,
                    player_name: ceo.player_name,
                    profile_id: ceo.profile_id,
                    profile_slug: ceo.profile_slug,
                    profile_image_url: ceo.profile_image_url,
                    is_ceo: true,
                    is_acting_ceo: false,
                });
            }
        }
        else {
            // If no elected CEO, find largest shareholder as acting CEO
            const actingCeoResult = await connection_1.default.query(`SELECT s.user_id, s.shares, u.username, u.player_name, u.profile_id, u.profile_slug, u.profile_image_url
         FROM shareholders s
         JOIN users u ON s.user_id = u.id
         WHERE s.corporation_id = $1
         ORDER BY s.shares DESC
         LIMIT 1`, [corporationId]);
            if (actingCeoResult.rows.length > 0) {
                const actingCeo = actingCeoResult.rows[0];
                members.push({
                    user_id: actingCeo.user_id,
                    shares: actingCeo.shares,
                    username: actingCeo.username,
                    player_name: actingCeo.player_name,
                    profile_id: actingCeo.profile_id,
                    profile_slug: actingCeo.profile_slug,
                    profile_image_url: actingCeo.profile_image_url,
                    is_ceo: false,
                    is_acting_ceo: true,
                });
            }
        }
        // Get appointed board members (excluding CEO if they're already in the list)
        const appointedResult = await connection_1.default.query(`SELECT ba.user_id, COALESCE(s.shares, 0) as shares, u.username, u.player_name, u.profile_id, u.profile_slug, u.profile_image_url
       FROM board_appointments ba
       JOIN users u ON ba.user_id = u.id
       LEFT JOIN shareholders s ON s.user_id = ba.user_id AND s.corporation_id = ba.corporation_id
       WHERE ba.corporation_id = $1
       ORDER BY ba.appointed_at ASC`, [corporationId]);
        // Add appointed members (skip if they're already CEO)
        for (const row of appointedResult.rows) {
            if (!members.some(m => m.user_id === row.user_id)) {
                members.push({
                    user_id: row.user_id,
                    shares: row.shares,
                    username: row.username,
                    player_name: row.player_name,
                    profile_id: row.profile_id,
                    profile_slug: row.profile_slug,
                    profile_image_url: row.profile_image_url,
                    is_ceo: false,
                    is_acting_ceo: false,
                });
            }
        }
        return members;
    }
    // Check if a user is on the board
    static async isOnBoard(corporationId, userId) {
        const members = await this.getBoardMembers(corporationId);
        return members.some(m => m.user_id === userId);
    }
    // Get the effective CEO (elected or largest shareholder)
    static async getEffectiveCeo(corporationId) {
        const corp = await Corporation_1.CorporationModel.findById(corporationId);
        if (!corp)
            return null;
        // If there's an elected CEO, return them
        if (corp.elected_ceo_id) {
            return { userId: corp.elected_ceo_id, isActing: false };
        }
        // Otherwise, get largest shareholder
        const result = await connection_1.default.query(`SELECT user_id FROM shareholders 
       WHERE corporation_id = $1 
       ORDER BY shares DESC 
       LIMIT 1`, [corporationId]);
        if (result.rows.length === 0)
            return null;
        return { userId: result.rows[0].user_id, isActing: true };
    }
    // Check if all board members have voted on a proposal
    static async haveAllBoardMembersVoted(proposalId, corporationId) {
        const members = await this.getBoardMembers(corporationId);
        const voterCount = await BoardVoteModel.getVoterCount(proposalId);
        return voterCount >= members.length;
    }
    // Check if user is a shareholder
    static async isShareholder(corporationId, userId) {
        const shareholders = await Shareholder_1.ShareholderModel.findByCorporationId(corporationId);
        return shareholders.some(s => s.user_id === userId);
    }
}
exports.BoardModel = BoardModel;
