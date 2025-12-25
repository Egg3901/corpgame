import pool from '../db/connection';
import { ShareholderModel } from './Shareholder';
import { CorporationModel } from './Corporation';

// Proposal types
export type ProposalType = 'ceo_nomination' | 'sector_change' | 'hq_change' | 'board_size' | 'appoint_member' | 'ceo_salary_change' | 'dividend_change' | 'special_dividend' | 'stock_split';

// Proposal data structures
export interface CeoNominationData {
  nominee_id: number;
  nominee_name?: string;
}

export interface SectorChangeData {
  new_sector: string;
}

export interface HqChangeData {
  new_state: string;
}

export interface BoardSizeData {
  new_size: number;
}

export interface AppointMemberData {
  appointee_id: number;
  appointee_name?: string;
}

export interface CeoSalaryChangeData {
  new_salary: number; // Per 96 hours
}

export interface DividendChangeData {
  new_percentage: number; // 0-100
}

export interface SpecialDividendData {
  capital_percentage: number; // 0-100
}

export interface StockSplitData {
  // 2:1 split - doubles shares, halves price
}

export type ProposalData = CeoNominationData | SectorChangeData | HqChangeData | BoardSizeData | AppointMemberData | CeoSalaryChangeData | DividendChangeData | SpecialDividendData | StockSplitData;

export interface BoardProposal {
  id: number;
  corporation_id: number;
  proposer_id: number;
  proposal_type: ProposalType;
  proposal_data: ProposalData;
  status: 'active' | 'passed' | 'failed';
  created_at: Date;
  resolved_at: Date | null;
  expires_at: Date;
}

export interface BoardVote {
  id: number;
  proposal_id: number;
  voter_id: number;
  vote: 'aye' | 'nay';
  voted_at: Date;
}

export interface BoardMember {
  user_id: number;
  shares: number;
  username: string;
  player_name?: string;
  profile_id: number;
  profile_slug?: string;
  profile_image_url?: string | null;
  is_ceo: boolean;
  is_acting_ceo: boolean;
}

export interface ProposalWithVotes extends BoardProposal {
  proposer?: {
    id: number;
    username: string;
    player_name?: string;
    profile_id: number;
  };
  votes: {
    aye: number;
    nay: number;
    total: number;
  };
  user_vote?: 'aye' | 'nay' | null;
}

export class BoardProposalModel {
  // Create a new proposal
  static async create(
    corporationId: number,
    proposerId: number,
    proposalType: ProposalType,
    proposalData: ProposalData,
    expiresInHours: number = 12
  ): Promise<BoardProposal> {
    const expiresAt = new Date(Date.now() + expiresInHours * 60 * 60 * 1000);
    
    const result = await pool.query(
      `INSERT INTO board_proposals (corporation_id, proposer_id, proposal_type, proposal_data, expires_at)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [corporationId, proposerId, proposalType, JSON.stringify(proposalData), expiresAt]
    );
    
    return result.rows[0];
  }

  // Get a proposal by ID
  static async findById(id: number): Promise<BoardProposal | null> {
    const result = await pool.query('SELECT * FROM board_proposals WHERE id = $1', [id]);
    return result.rows[0] || null;
  }

  // Get active proposals for a corporation
  static async getActiveProposals(corporationId: number): Promise<BoardProposal[]> {
    const result = await pool.query(
      `SELECT * FROM board_proposals 
       WHERE corporation_id = $1 AND status = 'active'
       ORDER BY created_at DESC`,
      [corporationId]
    );
    return result.rows;
  }

  // Get proposal history (non-active) for a corporation
  static async getProposalHistory(corporationId: number, limit: number = 20): Promise<BoardProposal[]> {
    const result = await pool.query(
      `SELECT * FROM board_proposals 
       WHERE corporation_id = $1 AND status != 'active'
       ORDER BY resolved_at DESC NULLS LAST, created_at DESC
       LIMIT $2`,
      [corporationId, limit]
    );
    return result.rows;
  }

  // Get user's corporate history (CEO elections, founding, etc.)
  static async getUserCorporateHistory(userId: number, limit: number = 50): Promise<{
    type: 'founded' | 'elected_ceo' | 'lost_ceo' | 'ceo_resigned';
    corporation_id: number;
    corporation_name: string;
    date: Date;
    details?: string;
  }[]> {
    const history: {
      type: 'founded' | 'elected_ceo' | 'lost_ceo' | 'ceo_resigned';
      corporation_id: number;
      corporation_name: string;
      date: Date;
      details?: string;
    }[] = [];

    // 1. Get corporations this user founded (is the original CEO)
    const foundedResult = await pool.query(
      `SELECT id, name, created_at FROM corporations WHERE ceo_id = $1 ORDER BY created_at DESC`,
      [userId]
    );
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
    const electedResult = await pool.query(
      `SELECT bp.resolved_at, bp.corporation_id, c.name as corporation_name, bp.proposal_data
       FROM board_proposals bp
       JOIN corporations c ON bp.corporation_id = c.id
       WHERE bp.proposal_type = 'ceo_nomination'
         AND bp.status = 'passed'
         AND (bp.proposal_data->>'nominee_id')::int = $1
       ORDER BY bp.resolved_at DESC`,
      [userId]
    );
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
    const lostCeoResult = await pool.query(
      `SELECT bp.resolved_at, bp.corporation_id, c.name as corporation_name, 
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
       ORDER BY bp.resolved_at DESC`,
      [userId]
    );
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

  // Get all proposals (active and history) with vote counts
  static async getProposalsWithVotes(
    corporationId: number,
    userId?: number
  ): Promise<ProposalWithVotes[]> {
    const result = await pool.query(
      `SELECT bp.*,
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
       ORDER BY bp.status = 'active' DESC, bp.created_at DESC`,
      [corporationId]
    );

    // Get user's votes if userId provided
    let userVotes: Record<number, 'aye' | 'nay'> = {};
    if (userId) {
      const votesResult = await pool.query(
        `SELECT proposal_id, vote FROM board_votes WHERE voter_id = $1`,
        [userId]
      );
      userVotes = votesResult.rows.reduce((acc, row) => {
        acc[row.proposal_id] = row.vote;
        return acc;
      }, {} as Record<number, 'aye' | 'nay'>);
    }

    return result.rows.map(row => ({
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
    }));
  }

  // Get expired active proposals that need resolution
  static async getExpiredActiveProposals(): Promise<BoardProposal[]> {
    const result = await pool.query(
      `SELECT * FROM board_proposals 
       WHERE status = 'active' AND expires_at <= NOW()
       ORDER BY expires_at ASC`
    );
    return result.rows;
  }

  // Update proposal status
  static async updateStatus(
    id: number,
    status: 'passed' | 'failed'
  ): Promise<BoardProposal | null> {
    const result = await pool.query(
      `UPDATE board_proposals 
       SET status = $1, resolved_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [status, id]
    );
    return result.rows[0] || null;
  }
}

export class BoardVoteModel {
  // Cast a vote (or update existing vote)
  static async castVote(
    proposalId: number,
    voterId: number,
    vote: 'aye' | 'nay'
  ): Promise<BoardVote> {
    const result = await pool.query(
      `INSERT INTO board_votes (proposal_id, voter_id, vote)
       VALUES ($1, $2, $3)
       ON CONFLICT (proposal_id, voter_id) 
       DO UPDATE SET vote = EXCLUDED.vote, voted_at = NOW()
       RETURNING *`,
      [proposalId, voterId, vote]
    );
    return result.rows[0];
  }

  // Get all votes for a proposal
  static async getVotesForProposal(proposalId: number): Promise<BoardVote[]> {
    const result = await pool.query(
      `SELECT * FROM board_votes WHERE proposal_id = $1`,
      [proposalId]
    );
    return result.rows;
  }

  // Get vote counts for a proposal
  static async getVoteCounts(proposalId: number): Promise<{ aye: number; nay: number; total: number }> {
    const result = await pool.query(
      `SELECT 
         COALESCE(SUM(CASE WHEN vote = 'aye' THEN 1 ELSE 0 END), 0)::int as aye,
         COALESCE(SUM(CASE WHEN vote = 'nay' THEN 1 ELSE 0 END), 0)::int as nay,
         COUNT(*)::int as total
       FROM board_votes WHERE proposal_id = $1`,
      [proposalId]
    );
    return result.rows[0];
  }

  // Check if user has voted on a proposal
  static async getUserVote(proposalId: number, userId: number): Promise<'aye' | 'nay' | null> {
    const result = await pool.query(
      `SELECT vote FROM board_votes WHERE proposal_id = $1 AND voter_id = $2`,
      [proposalId, userId]
    );
    return result.rows[0]?.vote || null;
  }

  // Get count of voters for a proposal
  static async getVoterCount(proposalId: number): Promise<number> {
    const result = await pool.query(
      `SELECT COUNT(DISTINCT voter_id)::int as count FROM board_votes WHERE proposal_id = $1`,
      [proposalId]
    );
    return result.rows[0].count;
  }
}

export class BoardModel {
  // Get board members for a corporation (top N shareholders)
  static async getBoardMembers(corporationId: number): Promise<BoardMember[]> {
    // Get corporation to find elected CEO
    const corp = await CorporationModel.findById(corporationId);
    if (!corp) return [];

    const members: BoardMember[] = [];

    // Get CEO (if elected)
    if (corp.elected_ceo_id) {
      const ceoResult = await pool.query(
        `SELECT s.shares, u.id as user_id, u.username, u.player_name, u.profile_id, u.profile_slug, u.profile_image_url
         FROM users u
         LEFT JOIN shareholders s ON s.user_id = u.id AND s.corporation_id = $1
         WHERE u.id = $2`,
        [corporationId, corp.elected_ceo_id]
      );

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
    } else {
      // If no elected CEO, find largest shareholder as acting CEO
      const actingCeoResult = await pool.query(
        `SELECT s.user_id, s.shares, u.username, u.player_name, u.profile_id, u.profile_slug, u.profile_image_url
         FROM shareholders s
         JOIN users u ON s.user_id = u.id
         WHERE s.corporation_id = $1
         ORDER BY s.shares DESC
         LIMIT 1`,
        [corporationId]
      );

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
    const appointedResult = await pool.query(
      `SELECT ba.user_id, COALESCE(s.shares, 0) as shares, u.username, u.player_name, u.profile_id, u.profile_slug, u.profile_image_url
       FROM board_appointments ba
       JOIN users u ON ba.user_id = u.id
       LEFT JOIN shareholders s ON s.user_id = ba.user_id AND s.corporation_id = ba.corporation_id
       WHERE ba.corporation_id = $1
       ORDER BY ba.appointed_at ASC`,
      [corporationId]
    );

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
  static async isOnBoard(corporationId: number, userId: number): Promise<boolean> {
    const members = await this.getBoardMembers(corporationId);
    return members.some(m => m.user_id === userId);
  }

  // Get the effective CEO (elected or largest shareholder)
  static async getEffectiveCeo(corporationId: number): Promise<{ userId: number; isActing: boolean } | null> {
    const corp = await CorporationModel.findById(corporationId);
    if (!corp) return null;

    // If there's an elected CEO, return them
    if (corp.elected_ceo_id) {
      return { userId: corp.elected_ceo_id, isActing: false };
    }

    // Otherwise, get largest shareholder
    const result = await pool.query(
      `SELECT user_id FROM shareholders 
       WHERE corporation_id = $1 
       ORDER BY shares DESC 
       LIMIT 1`,
      [corporationId]
    );

    if (result.rows.length === 0) return null;
    return { userId: result.rows[0].user_id, isActing: true };
  }

  // Check if all board members have voted on a proposal
  static async haveAllBoardMembersVoted(proposalId: number, corporationId: number): Promise<boolean> {
    const members = await this.getBoardMembers(corporationId);
    const voterCount = await BoardVoteModel.getVoterCount(proposalId);
    return voterCount >= members.length;
  }

  // Check if user is a shareholder
  static async isShareholder(corporationId: number, userId: number): Promise<boolean> {
    const shareholders = await ShareholderModel.findByCorporationId(corporationId);
    return shareholders.some(s => s.user_id === userId);
  }
}

