import { getDb, getNextId } from '../db/mongo';
import { ObjectId, Filter } from 'mongodb';
import { ShareholderModel } from './Shareholder';
import { CorporationModel } from './Corporation';
import { UserModel } from './User';
import type { BoardMember, VoterDetails } from './Board';
import { TransactionModel } from './Transaction';
import { MessageModel } from './Message';
import { getErrorMessage } from '../utils';

// Proposal types
export type ProposalType = 'ceo_nomination' | 'sector_change' | 'hq_change' | 'board_size' | 'appoint_member' | 'ceo_salary_change' | 'dividend_change' | 'special_dividend' | 'stock_split' | 'focus_change' | 'issue_shares' | 'go_public' | 'buyback_shares';

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
  split_ratio: number; // Multiplier (2 = 2:1 split, 3 = 3:1 split, 0.5 = 1:2 reverse split)
}

export interface FocusChangeData {
  new_focus: 'extraction' | 'production' | 'retail' | 'service' | 'diversified';
}

export interface IssueSharesData {
  shares_to_issue: number; // Number of new shares to issue
}

export interface GoPublicData {
  initial_public_shares: number; // Shares to make public in IPO
}

export interface BuybackSharesData {
  shares_to_buyback: number; // Number of shares to buy back from market
  max_price_per_share: number; // Maximum price to pay per share
}

export type ProposalData = CeoNominationData | SectorChangeData | HqChangeData | BoardSizeData | AppointMemberData | CeoSalaryChangeData | DividendChangeData | SpecialDividendData | StockSplitData | FocusChangeData | IssueSharesData | GoPublicData | BuybackSharesData;

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
  id?: number; // Optional in Mongo as we might not use auto-increment for join table rows, but legacy had it.
  _id?: ObjectId;
  proposal_id: number;
  voter_id: number;
  vote: 'aye' | 'nay';
  voted_at: Date;
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
  voter_details?: VoterDetails;
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
    const id = await getNextId('board_proposals_id');
    
    const doc: BoardProposal = {
      id,
      corporation_id: corporationId,
      proposer_id: proposerId,
      proposal_type: proposalType,
      proposal_data: proposalData,
      status: 'active',
      created_at: new Date(),
      resolved_at: null,
      expires_at: expiresAt,
    };
    
    await getDb().collection('board_proposals').insertOne(doc);
    return doc;
  }

  // Get a proposal by ID
  static async findById(id: number): Promise<BoardProposal | null> {
    const doc = await getDb().collection('board_proposals').findOne({ id });
    return doc as unknown as BoardProposal | null;
  }

  // Get active proposals for a corporation
  static async getActiveProposals(corporationId: number): Promise<BoardProposal[]> {
    const docs = await getDb().collection('board_proposals')
      .find({ corporation_id: corporationId, status: 'active' })
      .sort({ created_at: -1 })
      .toArray();
    return docs as unknown as BoardProposal[];
  }

  // Get proposal history (non-active) for a corporation
  static async getProposalHistory(corporationId: number, limit: number = 20): Promise<BoardProposal[]> {
    const docs = await getDb().collection('board_proposals')
      .find({ corporation_id: corporationId, status: { $ne: 'active' } })
      .sort({ resolved_at: -1, created_at: -1 }) // NULLS LAST handling might need check, but resolved_at should be set if not active usually
      .limit(limit)
      .toArray();
    return docs as unknown as BoardProposal[];
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

    const db = getDb();

    // 1. Get corporations this user founded (is the original CEO - approximation by created_at desc)
    // Note: In original code, it checked `ceo_id` in `corporations` table. 
    // In migrated `CorporationModel.create`, `ceo_id` is set.
    const foundedCorps = await db.collection('corporations')
      .find({ ceo_id: userId })
      .sort({ created_at: -1 })
      .toArray();

    for (const corp of foundedCorps) {
      history.push({
        type: 'founded',
        corporation_id: corp.id,
        corporation_name: corp.name,
        date: corp.created_at,
        details: 'Founded corporation as CEO',
      });
    }

    // 2. Get CEO elections where this user was elected
    const electedProposals = await db.collection('board_proposals').aggregate([
      {
        $match: {
          proposal_type: 'ceo_nomination',
          status: 'passed',
          'proposal_data.nominee_id': userId
        }
      },
      {
        $lookup: {
          from: 'corporations',
          localField: 'corporation_id',
          foreignField: 'id',
          as: 'corporation'
        }
      },
      { $unwind: '$corporation' },
      { $sort: { resolved_at: -1 } }
    ]).toArray();

    for (const row of electedProposals) {
      history.push({
        type: 'elected_ceo',
        corporation_id: row.corporation_id,
        corporation_name: row.corporation.name,
        date: row.resolved_at,
        details: 'Elected as CEO by board vote',
      });
    }

    // 3. Get CEO elections where this user LOST their position
    // Find all passed CEO nominations where nominee != userId
    const lostProposals = await db.collection('board_proposals').aggregate([
      {
        $match: {
          proposal_type: 'ceo_nomination',
          status: 'passed',
          'proposal_data.nominee_id': { $ne: userId }
        }
      },
      {
        $lookup: {
          from: 'corporations',
          localField: 'corporation_id',
          foreignField: 'id',
          as: 'corporation'
        }
      },
      { $unwind: '$corporation' },
      { $sort: { resolved_at: -1 } }
    ]).toArray();

    for (const row of lostProposals) {
      // Check if user was the previous CEO
      // We need to check if there was a previous passed nomination for this user
      // OR if they were the founder and this is the first change? 
      // The logic in SQL was: EXISTS (SELECT 1 FROM board_proposals prev WHERE ... prev.nominee_id = userId AND prev.resolved_at < bp.resolved_at)
      
      const prevElection = await db.collection('board_proposals').findOne({
        corporation_id: row.corporation_id,
        proposal_type: 'ceo_nomination',
        status: 'passed',
        'proposal_data.nominee_id': userId,
        resolved_at: { $lt: row.resolved_at }
      });

      // Also check if they were founder and no intervening elections?
      // Simplified check for now: if they were elected before.
      if (prevElection) {
         history.push({
          type: 'lost_ceo',
          corporation_id: row.corporation_id,
          corporation_name: row.corporation.name,
          date: row.resolved_at,
          details: `Replaced as CEO by ${row.proposal_data.nominee_name || 'another executive'}`,
        });
      }
    }

    // Sort by date descending
    history.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return history.slice(0, limit);
  }

  // Get voter details for a proposal
  static async getVoterDetailsForProposal(
    proposalId: number,
    corporationId: number
  ): Promise<VoterDetails> {
    // Get all board members
    const boardMembers = await BoardModel.getBoardMembers(corporationId);

    // Get votes for this proposal
    const votes = await BoardVoteModel.getVotesForProposal(proposalId);
    
    // Map votes
    const votesMap: Record<number, 'aye' | 'nay'> = {};
    votes.forEach(v => {
      votesMap[v.voter_id] = v.vote;
    });

    const aye: BoardMember[] = [];
    const nay: BoardMember[] = [];
    const abstained: BoardMember[] = [];

    for (const member of boardMembers) {
      const vote = votesMap[member.user_id];
      if (vote === 'aye') {
        aye.push(member);
      } else if (vote === 'nay') {
        nay.push(member);
      } else {
        abstained.push(member);
      }
    }

    return { aye, nay, abstained };
  }

  // Get all proposals (active and history) with vote counts
  static async getProposalsWithVotes(
    corporationId: number,
    userId?: number,
    includeVoterDetails: boolean = true
  ): Promise<ProposalWithVotes[]> {
    const db = getDb();
    
    // Get all proposals
    const proposals = await db.collection('board_proposals')
      .find({ corporation_id: corporationId })
      .sort({ status: -1, created_at: -1 }) // active sorts before others if 'active' > 'passed'/'failed' alphabetically? No. 
      // 'active' < 'failed' < 'passed'. 
      // SQL: ORDER BY status = 'active' DESC.
      // We might need to sort in memory or accept alpha sort. 
      // Let's sort in memory for correct order.
      .toArray() as unknown as BoardProposal[];

    // Sort manually to match SQL behavior: Active first, then created_at desc
    proposals.sort((a, b) => {
      if (a.status === 'active' && b.status !== 'active') return -1;
      if (a.status !== 'active' && b.status === 'active') return 1;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    // Get all votes for these proposals
    // Optimization: we could group by proposal_id in aggregation
    const proposalIds = proposals.map(p => p.id);
    const allVotes = await db.collection('board_votes')
      .find({ proposal_id: { $in: proposalIds } })
      .toArray() as unknown as BoardVote[];
    
    // Get proposers info
    const proposerIds = [...new Set(proposals.map(p => p.proposer_id))];
    const proposers = await db.collection('users')
      .find({ id: { $in: proposerIds } })
      .project({ id: 1, username: 1, player_name: 1, profile_id: 1 })
      .toArray();
    const proposersMap = new Map(proposers.map(u => [u.id, u]));

    const result: ProposalWithVotes[] = [];

    for (const p of proposals) {
      const pVotes = allVotes.filter(v => v.proposal_id === p.id);
      const ayeCount = pVotes.filter(v => v.vote === 'aye').length;
      const nayCount = pVotes.filter(v => v.vote === 'nay').length;
      
      const proposer = proposersMap.get(p.proposer_id);
      
      const proposalWithVotes: ProposalWithVotes = {
        ...p,
        proposer: proposer ? {
          id: proposer.id,
          username: proposer.username,
          player_name: proposer.player_name,
          profile_id: proposer.profile_id
        } : undefined,
        votes: {
          aye: ayeCount,
          nay: nayCount,
          total: pVotes.length
        },
        user_vote: userId ? (pVotes.find(v => v.voter_id === userId)?.vote || null) : null
      };

      if (includeVoterDetails) {
        proposalWithVotes.voter_details = await this.getVoterDetailsForProposal(p.id, corporationId);
      }

      result.push(proposalWithVotes);
    }

    return result;
  }

  // Get expired active proposals that need resolution
  static async getExpiredActiveProposals(): Promise<BoardProposal[]> {
    const docs = await getDb().collection('board_proposals')
      .find({ status: 'active', expires_at: { $lte: new Date() } })
      .sort({ expires_at: 1 })
      .toArray();
    return docs as unknown as BoardProposal[];
  }

  // Update proposal status
  static async updateStatus(
    id: number,
    status: 'passed' | 'failed'
  ): Promise<BoardProposal | null> {
    const result = await getDb().collection('board_proposals').findOneAndUpdate(
      { id },
      { $set: { status, resolved_at: new Date() } },
      { returnDocument: 'after' }
    );
    return result ? result as unknown as BoardProposal : null;
  }

  // Resolve a proposal (calculate result, update status, apply changes, notify)
  static async resolve(proposalId: number): Promise<void> {
    const proposal = await this.findById(proposalId);
    if (!proposal || proposal.status !== 'active') return;

    const voteCounts = await BoardVoteModel.getVoteCounts(proposalId);
    const passed = voteCounts.aye > voteCounts.nay;

    // Update proposal status
    await this.updateStatus(proposalId, passed ? 'passed' : 'failed');

    if (passed) {
      // Apply the changes
      await this.applyChanges(proposal);
    }

    // Notify board members of outcome (system message)
    const boardMembers = await BoardModel.getBoardMembers(proposal.corporation_id);
    const corporation = await CorporationModel.findById(proposal.corporation_id);
    const proposalDescription = this.getProposalDescription(proposal.proposal_type, proposal.proposal_data);

    for (const member of boardMembers) {
      try {
        await MessageModel.create({
          sender_id: 1, // System user ID
          recipient_id: member.user_id,
          subject: `Board Vote Result: ${corporation?.name || 'Corporation'}`,
          body: `The proposal "${proposalDescription}" has ${passed ? 'PASSED' : 'FAILED'}.\n\nVotes: ${voteCounts.aye} Aye, ${voteCounts.nay} Nay`,
        });
      } catch (msgErr: unknown) {
        console.warn(`Failed to send vote notification to user ${member.user_id}:`, msgErr);
      }
    }
  }

  // Apply passed proposal changes
  static async applyChanges(proposal: BoardProposal): Promise<void> {
    const corpId = proposal.corporation_id;
    const data = proposal.proposal_data;

    switch (proposal.proposal_type) {
      case 'ceo_nomination':
        if ('nominee_id' in data) {
          await CorporationModel.setElectedCeo(corpId, data.nominee_id);
          // Clean up votes since CEO is always on the board and this may change board composition
          await BoardVoteModel.cleanupNonBoardMemberVotes(corpId);
        }
        break;

      case 'sector_change':
        if ('new_sector' in data) {
          await CorporationModel.update(corpId, { type: data.new_sector });
        }
        break;

      case 'hq_change':
        if ('new_state' in data) {
          await CorporationModel.update(corpId, { hq_state: data.new_state });
        }
        break;

      case 'board_size':
        if ('new_size' in data) {
          await CorporationModel.update(corpId, { board_size: data.new_size });
          // Clean up votes from removed board members if board size decreased
          await BoardVoteModel.cleanupNonBoardMemberVotes(corpId);
        }
        break;

      case 'appoint_member':
        if ('appointee_id' in data) {
          // Create board appointment
          await getDb().collection('board_appointments').updateOne(
            { corporation_id: corpId, user_id: data.appointee_id },
            { 
              $set: { 
                corporation_id: corpId, 
                user_id: data.appointee_id, 
                appointed_by_proposal_id: proposal.id,
                appointed_at: new Date()
              } 
            },
            { upsert: true }
          );
          // Clean up votes in case board composition changed
          await BoardVoteModel.cleanupNonBoardMemberVotes(corpId);
        }
        break;

      case 'ceo_salary_change':
        if ('new_salary' in data) {
          await CorporationModel.update(corpId, { ceo_salary: data.new_salary });
        }
        break;

      case 'dividend_change':
        if ('new_percentage' in data) {
          await CorporationModel.update(corpId, { dividend_percentage: data.new_percentage });
        }
        break;

      case 'special_dividend':
        if ('capital_percentage' in data) {
          // Pay special dividend immediately when proposal passes
          const specialCorp = await CorporationModel.findById(corpId);
          if (specialCorp) {
            const capitalPercentage = data.capital_percentage / 100;
            const currentCapital = typeof specialCorp.capital === 'string' ? parseFloat(String(specialCorp.capital)) : (specialCorp.capital || 0);
            const dividendAmount = currentCapital * capitalPercentage;

            // Get all shareholders
            const shareholders = await ShareholderModel.findByCorporationId(corpId);
            const totalShares = shareholders.reduce((sum, sh) => sum + sh.shares, 0) + specialCorp.public_shares;

            if (totalShares > 0 && dividendAmount > 0) {
              // Pay each shareholder their proportional share
              for (const shareholder of shareholders) {
                const shareholderPayout = (dividendAmount * shareholder.shares) / totalShares;
                await UserModel.updateCash(shareholder.user_id, shareholderPayout);

                // Record transaction
                await TransactionModel.create({
                  transaction_type: 'special_dividend',
                  amount: shareholderPayout,
                  description: `Special dividend payout from ${specialCorp.name}`,
                  corporation_id: corpId,
                  from_user_id: null,
                  to_user_id: shareholder.user_id
                });
              }
              
              // Deduct from corporation capital
              const newCapital = Math.max(0, currentCapital - dividendAmount);
              await CorporationModel.update(corpId, { 
                capital: newCapital,
                special_dividend_last_paid_at: new Date(),
                special_dividend_last_amount: dividendAmount
              });
            }
          }
        }
        break;

      case 'stock_split':
        // Flexible stock split (2:1, 3:1, or reverse splits like 1:2)
        const splitRatio = 'split_ratio' in data ? data.split_ratio : 2; // Default 2:1 for backwards compatibility
        const splitCorp = await CorporationModel.findById(corpId);
        if (splitCorp) {
          // Apply ratio to all shareholders
          const shareholders = await ShareholderModel.findByCorporationId(corpId);
          for (const sh of shareholders) {
            const newShares = Math.floor(sh.shares * splitRatio);
            await ShareholderModel.updateShares(corpId, sh.user_id, newShares);
          }

          // Apply ratio to public shares and total shares
          const newPublicShares = Math.floor(splitCorp.public_shares * splitRatio);
          const newTotalShares = Math.floor(splitCorp.shares * splitRatio);

          // Adjust share price inversely
          const currentPrice = typeof splitCorp.share_price === 'string' ? parseFloat(String(splitCorp.share_price)) : (splitCorp.share_price || 0);
          const newPrice = currentPrice / splitRatio;

          // Update corporation
          await CorporationModel.update(corpId, {
            public_shares: newPublicShares,
            share_price: newPrice,
            shares: newTotalShares
          });
        }
        break;

      case 'focus_change':
        if ('new_focus' in data) {
          await CorporationModel.update(corpId, { focus: data.new_focus });
        }
        break;

      case 'issue_shares':
        if ('shares_to_issue' in data) {
          const issueCorp = await CorporationModel.findById(corpId);
          if (issueCorp) {
            const sharesToIssue = data.shares_to_issue;

            // Calculate capital raised at current share price
            const currentPrice = typeof issueCorp.share_price === 'string'
              ? parseFloat(String(issueCorp.share_price))
              : (issueCorp.share_price || 1);
            const capitalRaised = sharesToIssue * currentPrice;

            // Increase total shares
            await CorporationModel.incrementShares(corpId, sharesToIssue);
            // For public corps, increase public shares; for private corps, shares stay private
            if (issueCorp.structure === 'public') {
              await CorporationModel.incrementPublicShares(corpId, sharesToIssue);
            }
            // Increase capital
            await CorporationModel.incrementCapital(corpId, capitalRaised);

            // Record transaction
            await TransactionModel.create({
              transaction_type: 'share_issue',
              amount: capitalRaised,
              description: `Issued ${sharesToIssue.toLocaleString()} new shares at $${currentPrice.toFixed(2)}/share`,
              corporation_id: corpId,
              from_user_id: null,
              to_user_id: null
            });
          }
        }
        break;

      case 'go_public':
        if ('initial_public_shares' in data) {
          const ipoCorp = await CorporationModel.findById(corpId);
          if (ipoCorp && ipoCorp.structure === 'private') {
            // Convert to public
            await CorporationModel.update(corpId, {
              structure: 'public',
              public_shares: data.initial_public_shares,
              ipo_date: new Date()
            });

            // Record transaction
            await TransactionModel.create({
              transaction_type: 'corporate_action',
              amount: 0,
              description: `IPO completed - ${data.initial_public_shares.toLocaleString()} shares made public`,
              corporation_id: corpId,
              from_user_id: null,
              to_user_id: null
            });
          }
        }
        break;

      case 'buyback_shares':
        if ('shares_to_buyback' in data && 'max_price_per_share' in data) {
          const buybackCorp = await CorporationModel.findById(corpId);
          if (buybackCorp && buybackCorp.public_shares >= data.shares_to_buyback) {
            const sharesToBuy = data.shares_to_buyback;
            const currentPrice = typeof buybackCorp.share_price === 'string'
              ? parseFloat(String(buybackCorp.share_price))
              : (buybackCorp.share_price || 1);

            // Use the lower of max price or current price
            const buyPrice = Math.min(data.max_price_per_share, currentPrice);
            const totalCost = sharesToBuy * buyPrice;

            // Check if corporation has enough capital
            const corpCapital = typeof buybackCorp.capital === 'string'
              ? parseFloat(String(buybackCorp.capital))
              : (buybackCorp.capital || 0);

            if (corpCapital >= totalCost) {
              // Reduce public shares
              await CorporationModel.update(corpId, {
                public_shares: buybackCorp.public_shares - sharesToBuy,
                shares: buybackCorp.shares - sharesToBuy,
                capital: corpCapital - totalCost
              });

              // Record transaction
              await TransactionModel.create({
                transaction_type: 'corporate_action',
                amount: totalCost,
                description: `Bought back ${sharesToBuy.toLocaleString()} shares at $${buyPrice.toFixed(2)}/share`,
                corporation_id: corpId,
                from_user_id: null,
                to_user_id: null
              });
            }
          }
        }
        break;
    }
  }

  // Helper to get description text
  static getProposalDescription(type: ProposalType, data: ProposalData): string {
    switch (type) {
      case 'ceo_nomination': return `Nominate ${'nominee_name' in data ? data.nominee_name : 'unknown'} for CEO`;
      case 'sector_change': return `Change sector to ${'new_sector' in data ? data.new_sector : 'unknown'}`;
      case 'hq_change': return `Move HQ to ${'new_state' in data ? data.new_state : 'unknown'}`;
      case 'board_size': return `Change board size to ${'new_size' in data ? data.new_size : 'unknown'}`;
      case 'appoint_member': return `Appoint ${'appointee_name' in data ? data.appointee_name : 'unknown'} to board`;
      case 'ceo_salary_change': return `Change CEO salary to $${'new_salary' in data ? data.new_salary : 'unknown'}`;
      case 'dividend_change': return `Change dividend to ${'new_percentage' in data ? data.new_percentage : 'unknown'}%`;
      case 'special_dividend': return `Pay special dividend of ${'capital_percentage' in data ? data.capital_percentage : 'unknown'}% capital`;
      case 'stock_split': {
        const ratio = 'split_ratio' in data ? data.split_ratio : 2;
        if (ratio < 1) {
          // Reverse split: 0.5 = 1:2 reverse split
          return `1:${Math.round(1 / ratio)} Reverse Stock Split`;
        }
        return `${ratio}:1 Stock Split`;
      }
      case 'focus_change': return `Change focus to ${'new_focus' in data ? data.new_focus : 'unknown'}`;
      case 'issue_shares': return `Issue ${'shares_to_issue' in data ? data.shares_to_issue.toLocaleString() : 'unknown'} new shares`;
      case 'go_public': return `Go public (IPO) with ${'initial_public_shares' in data ? data.initial_public_shares.toLocaleString() : 'unknown'} public shares`;
      case 'buyback_shares': return `Buy back ${'shares_to_buyback' in data ? data.shares_to_buyback.toLocaleString() : 'unknown'} shares`;
      default: return type;
    }
  }
}

export class BoardVoteModel {
  // Clean up votes from users who are no longer board members
  static async cleanupNonBoardMemberVotes(corporationId: number): Promise<number> {
    const boardMembers = await BoardModel.getBoardMembers(corporationId);
    const boardMemberIds = boardMembers.map(m => m.user_id);
    
    // Get all proposals for this corp
    const proposals = await getDb().collection('board_proposals')
      .find({ corporation_id: corporationId })
      .project({ id: 1 })
      .toArray();
    const proposalIds = proposals.map(p => p.id);

    if (proposalIds.length === 0) return 0;

    let filter: Filter<BoardVote> = { proposal_id: { $in: proposalIds } };
    
    if (boardMemberIds.length > 0) {
      filter.voter_id = { $nin: boardMemberIds };
    }
    // If no board members, we delete all votes (filter remains just proposal_id check)

    const result = await getDb().collection<BoardVote>('board_votes').deleteMany(filter);
    return result.deletedCount;
  }

  // Cast a vote (or update existing vote)
  static async castVote(
    proposalId: number,
    voterId: number,
    vote: 'aye' | 'nay'
  ): Promise<BoardVote> {
    const now = new Date();
    // upsert
    const result = await getDb().collection<BoardVote>('board_votes').findOneAndUpdate(
      { proposal_id: proposalId, voter_id: voterId },
      { 
        $set: { vote, voted_at: now },
        $setOnInsert: { proposal_id: proposalId, voter_id: voterId } // ensure fields are set on insert
      },
      { upsert: true, returnDocument: 'after' }
    );
    return result as unknown as BoardVote;
  }

  // Get all votes for a proposal
  static async getVotesForProposal(proposalId: number): Promise<BoardVote[]> {
    const docs = await getDb().collection<BoardVote>('board_votes')
      .find({ proposal_id: proposalId })
      .toArray();
    return docs as unknown as BoardVote[];
  }

  // Get vote counts for a proposal
  static async getVoteCounts(proposalId: number): Promise<{ aye: number; nay: number; total: number }> {
    const docs = await getDb().collection<BoardVote>('board_votes')
      .find({ proposal_id: proposalId })
      .toArray();
    
    const aye = docs.filter(d => d.vote === 'aye').length;
    const nay = docs.filter(d => d.vote === 'nay').length;
    return { aye, nay, total: docs.length };
  }

  // Check if user has voted on a proposal
  static async getUserVote(proposalId: number, userId: number): Promise<'aye' | 'nay' | null> {
    const doc = await getDb().collection<BoardVote>('board_votes')
      .findOne({ proposal_id: proposalId, voter_id: userId });
    return doc ? (doc as unknown as BoardVote).vote : null;
  }

  // Get count of voters for a proposal
  static async getVoterCount(proposalId: number): Promise<number> {
    // Distinct voter_ids (though should be unique by index anyway)
    const count = await getDb().collection<BoardVote>('board_votes').countDocuments({ proposal_id: proposalId });
    return count;
  }
}

export class BoardModel {
  // Get board members for a corporation (top N shareholders)
  static async getBoardMembers(corporationId: number): Promise<BoardMember[]> {
    // Get corporation to find elected CEO
    const corp = await CorporationModel.findById(corporationId);
    if (!corp) return [];

    const members: BoardMember[] = [];
    const db = getDb();

    // Get CEO (if elected)
    if (corp.elected_ceo_id) {
      const user = await db.collection('users').findOne({ id: corp.elected_ceo_id });
      if (user) {
        // Get shares
        const shareholder = await db.collection('shareholders').findOne({ user_id: user.id, corporation_id: corporationId });
        
        members.push({
          user_id: user.id,
          shares: shareholder ? shareholder.shares : 0,
          username: user.username,
          player_name: user.player_name,
          profile_id: user.profile_id,
          profile_slug: user.profile_slug,
          profile_image_url: user.profile_image_url,
          is_ceo: true,
          is_acting_ceo: false,
        });
      }
    } else {
      // If no elected CEO, find largest shareholder as acting CEO
      // Using ShareholderModel might be cleaner if it has a sorted method, but direct query is fine
      const largestShareholder = await db.collection('shareholders')
        .find({ corporation_id: corporationId })
        .sort({ shares: -1 })
        .limit(1)
        .toArray();
      
      if (largestShareholder.length > 0) {
        const s = largestShareholder[0];
        const user = await db.collection('users').findOne({ id: s.user_id });
        if (user) {
          members.push({
            user_id: user.id,
            shares: s.shares,
            username: user.username,
            player_name: user.player_name,
            profile_id: user.profile_id,
            profile_slug: user.profile_slug,
            profile_image_url: user.profile_image_url,
            is_ceo: false,
            is_acting_ceo: true,
          });
        }
      }
    }

    // Get appointed board members
    // We assume there's a 'board_appointments' collection
    const appointments = await db.collection('board_appointments')
      .find({ corporation_id: corporationId })
      .sort({ appointed_at: 1 })
      .toArray();

    for (const app of appointments) {
      // Skip if already in members (CEO/Acting CEO)
      if (members.some(m => m.user_id === app.user_id)) continue;

      const user = await db.collection('users').findOne({ id: app.user_id });
      if (user) {
        const shareholder = await db.collection('shareholders').findOne({ user_id: user.id, corporation_id: corporationId });
        
        members.push({
          user_id: user.id,
          shares: shareholder ? shareholder.shares : 0,
          username: user.username,
          player_name: user.player_name,
          profile_id: user.profile_id,
          profile_slug: user.profile_slug,
          profile_image_url: user.profile_image_url,
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
    const largest = await getDb().collection('shareholders')
      .find({ corporation_id: corporationId })
      .sort({ shares: -1 })
      .limit(1)
      .toArray();

    if (largest.length === 0) return null;
    return { userId: largest[0].user_id, isActing: true };
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
