'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { boardAPI, BoardResponse, BoardProposal, CreateProposalData, adminAPI } from '@/lib/api';
import { 
  Users, Crown, Clock, CheckCircle, XCircle, 
  ThumbsUp, ThumbsDown, Plus, ChevronDown, ChevronUp,
  Building2, MapPin, UsersRound, UserPlus, DollarSign, Percent, Gift, Split
} from 'lucide-react';

// US States for display
const US_STATES: Record<string, string> = {
  'AL': 'Alabama', 'AK': 'Alaska', 'AZ': 'Arizona', 'AR': 'Arkansas',
  'CA': 'California', 'CO': 'Colorado', 'CT': 'Connecticut', 'DE': 'Delaware',
  'FL': 'Florida', 'GA': 'Georgia', 'HI': 'Hawaii', 'ID': 'Idaho',
  'IL': 'Illinois', 'IN': 'Indiana', 'IA': 'Iowa', 'KS': 'Kansas',
  'KY': 'Kentucky', 'LA': 'Louisiana', 'ME': 'Maine', 'MD': 'Maryland',
  'MA': 'Massachusetts', 'MI': 'Michigan', 'MN': 'Minnesota', 'MS': 'Mississippi',
  'MO': 'Missouri', 'MT': 'Montana', 'NE': 'Nebraska', 'NV': 'Nevada',
  'NH': 'New Hampshire', 'NJ': 'New Jersey', 'NM': 'New Mexico', 'NY': 'New York',
  'NC': 'North Carolina', 'ND': 'North Dakota', 'OH': 'Ohio', 'OK': 'Oklahoma',
  'OR': 'Oregon', 'PA': 'Pennsylvania', 'RI': 'Rhode Island', 'SC': 'South Carolina',
  'SD': 'South Dakota', 'TN': 'Tennessee', 'TX': 'Texas', 'UT': 'Utah',
  'VT': 'Vermont', 'VA': 'Virginia', 'WA': 'Washington', 'WV': 'West Virginia',
  'WI': 'Wisconsin', 'WY': 'Wyoming'
};

interface BoardTabProps {
  corporationId: number;
  corporationName: string;
  viewerUserId: number | null;
  isAdmin?: boolean;
}

export default function BoardTab({ corporationId, corporationName, viewerUserId, isAdmin = false }: BoardTabProps) {
  const [boardData, setBoardData] = useState<BoardResponse | null>(null);
  const [proposals, setProposals] = useState<BoardProposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [voting, setVoting] = useState<number | null>(null);
  const [resettingBoard, setResettingBoard] = useState(false);

  // Form state
  const [proposalType, setProposalType] = useState<CreateProposalData['proposal_type']>('ceo_nomination');
  const [nomineeId, setNomineeId] = useState<number | ''>('');
  const [newSector, setNewSector] = useState('');
  const [newState, setNewState] = useState('');
  const [newBoardSize, setNewBoardSize] = useState(3);
  const [appointeeId, setAppointeeId] = useState<number | ''>('');
  const [newSalary, setNewSalary] = useState<number>(100000);
  const [newDividendPercentage, setNewDividendPercentage] = useState<number>(0);
  const [specialDividendCapitalPercentage, setSpecialDividendCapitalPercentage] = useState<number>(0);

  const fetchBoardData = useCallback(async () => {
    try {
      const [board, allProposals] = await Promise.all([
        boardAPI.getBoard(corporationId),
        boardAPI.getProposals(corporationId),
      ]);
      setBoardData(board);
      setProposals(allProposals);
    } catch (err: any) {
      console.error('Failed to fetch board data:', err);
      setError(err.response?.data?.error || 'Failed to load board data');
    } finally {
      setLoading(false);
    }
  }, [corporationId]);

  useEffect(() => {
    fetchBoardData();
  }, [fetchBoardData]);

  const handleCreateProposal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!boardData) return;

    setSubmitting(true);
    try {
      let data: CreateProposalData;

      switch (proposalType) {
        case 'ceo_nomination':
          if (!nomineeId) {
            alert('Please select a nominee');
            setSubmitting(false);
            return;
          }
          data = { proposal_type: 'ceo_nomination', proposal_data: { nominee_id: Number(nomineeId) } };
          break;
        case 'sector_change':
          if (!newSector) {
            alert('Please select a sector');
            setSubmitting(false);
            return;
          }
          data = { proposal_type: 'sector_change', proposal_data: { new_sector: newSector } };
          break;
        case 'hq_change':
          if (!newState) {
            alert('Please select a state');
            setSubmitting(false);
            return;
          }
          data = { proposal_type: 'hq_change', proposal_data: { new_state: newState } };
          break;
        case 'board_size':
          data = { proposal_type: 'board_size', proposal_data: { new_size: newBoardSize } };
          break;
        case 'appoint_member':
          if (!appointeeId) {
            alert('Please select an appointee');
            setSubmitting(false);
            return;
          }
          data = { proposal_type: 'appoint_member', proposal_data: { appointee_id: Number(appointeeId) } };
          break;
        case 'ceo_salary_change':
          if (newSalary < 0) {
            alert('Salary must be non-negative');
            setSubmitting(false);
            return;
          }
          if (newSalary > 10000000) {
            alert('Salary cannot exceed $10,000,000');
            setSubmitting(false);
            return;
          }
          data = { proposal_type: 'ceo_salary_change', proposal_data: { new_salary: newSalary } };
          break;
        case 'dividend_change':
          if (newDividendPercentage < 0 || newDividendPercentage > 100) {
            alert('Dividend percentage must be between 0 and 100');
            setSubmitting(false);
            return;
          }
          data = { proposal_type: 'dividend_change', proposal_data: { new_percentage: newDividendPercentage } };
          break;
        case 'special_dividend':
          if (specialDividendCapitalPercentage < 0 || specialDividendCapitalPercentage > 100) {
            alert('Capital percentage must be between 0 and 100');
            setSubmitting(false);
            return;
          }
          data = { proposal_type: 'special_dividend', proposal_data: { capital_percentage: specialDividendCapitalPercentage } };
          break;
        case 'stock_split':
          data = { proposal_type: 'stock_split', proposal_data: {} };
          break;
        default:
          return;
      }

      await boardAPI.createProposal(corporationId, data);
      setShowCreateForm(false);
      resetForm();
      await fetchBoardData();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to create proposal');
    } finally {
      setSubmitting(false);
    }
  };

  const handleVote = async (proposalId: number, vote: 'aye' | 'nay') => {
    setVoting(proposalId);
    try {
      await boardAPI.castVote(corporationId, proposalId, vote);
      await fetchBoardData();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to cast vote');
    } finally {
      setVoting(null);
    }
  };

  const handleResignCeo = async () => {
    if (!confirm('Are you sure you want to resign as CEO? The largest shareholder will become Acting CEO.')) {
      return;
    }

    try {
      await boardAPI.resignCeo(corporationId);
      await fetchBoardData();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to resign');
    }
  };

  const handleAdminResetBoard = async () => {
    if (!confirm('Are you sure you want to reset the board? This will remove all appointed board members. Only the CEO will remain. This action cannot be undone.')) {
      return;
    }

    setResettingBoard(true);
    try {
      const result = await adminAPI.resetBoard(corporationId);
      alert(`Board reset successfully. ${result.removed_count} member(s) removed.`);
      await fetchBoardData();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to reset board');
    } finally {
      setResettingBoard(false);
    }
  };

  const resetForm = () => {
    setProposalType('ceo_nomination');
    setNomineeId('');
    setNewSector('');
    setNewState('');
    setNewBoardSize(3);
    setAppointeeId('');
    setNewSalary(boardData?.corporation.ceo_salary || 100000);
    setNewDividendPercentage(0);
    setSpecialDividendCapitalPercentage(0);
  };

  const formatTimeRemaining = (expiresAt: string) => {
    const now = new Date();
    const expires = new Date(expiresAt);
    const diff = expires.getTime() - now.getTime();

    if (diff <= 0) return 'Expired';

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 0) {
      return `${hours}h ${minutes}m remaining`;
    }
    return `${minutes}m remaining`;
  };

  const getProposalDescription = (proposal: BoardProposal) => {
    switch (proposal.proposal_type) {
      case 'ceo_nomination':
        return `Elect ${proposal.proposal_data.nominee_name || 'a shareholder'} as CEO`;
      case 'sector_change':
        return `Change sector to ${proposal.proposal_data.new_sector}`;
      case 'hq_change':
        return `Move HQ to ${US_STATES[proposal.proposal_data.new_state || ''] || proposal.proposal_data.new_state}`;
      case 'board_size':
        return `Change board size to ${proposal.proposal_data.new_size} members`;
      case 'appoint_member':
        return `Appoint ${proposal.proposal_data.appointee_name || 'a shareholder'} to the board`;
      case 'ceo_salary_change':
        return `Change CEO salary to $${(proposal.proposal_data.new_salary || 0).toLocaleString()}/96h`;
      case 'dividend_change':
        return `Change dividend percentage to ${((proposal.proposal_data as any).new_percentage || 0).toFixed(2)}%`;
      case 'special_dividend':
        return `Pay special dividend of ${((proposal.proposal_data as any).capital_percentage || 0).toFixed(2)}% of capital`;
      case 'stock_split':
        return `Execute 2:1 stock split (double shares, halve price)`;
      default:
        return 'Unknown proposal';
    }
  };

  const getProposalIcon = (type: string) => {
    switch (type) {
      case 'ceo_nomination': return <Crown className="w-4 h-4" />;
      case 'sector_change': return <Building2 className="w-4 h-4" />;
      case 'hq_change': return <MapPin className="w-4 h-4" />;
      case 'board_size': return <UsersRound className="w-4 h-4" />;
      case 'appoint_member': return <UserPlus className="w-4 h-4" />;
      case 'ceo_salary_change': return <DollarSign className="w-4 h-4" />;
      case 'dividend_change': return <Percent className="w-4 h-4" />;
      case 'special_dividend': return <Gift className="w-4 h-4" />;
      case 'stock_split': return <Split className="w-4 h-4" />;
      default: return <Users className="w-4 h-4" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-600 dark:text-gray-400">Loading board data...</div>
      </div>
    );
  }

  if (error || !boardData) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-red-600 dark:text-red-400">{error || 'Failed to load board data'}</div>
      </div>
    );
  }

  const activeProposals = proposals.filter(p => p.status === 'active');
  const historyProposals = proposals.filter(p => p.status !== 'active');

  return (
    <div className="space-y-6">
      {/* Board Members */}
      <div className="relative rounded-2xl border border-gray-200/50 dark:border-gray-700/50 bg-gradient-to-br from-white via-white to-gray-50/50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800/50 shadow-2xl overflow-hidden backdrop-blur-sm">
        <div className="absolute inset-0 bg-gradient-to-br from-corporate-blue/5 via-transparent to-corporate-blue-light/5 dark:from-corporate-blue/10 dark:via-transparent dark:to-corporate-blue-dark/10 pointer-events-none" />
        <div className="absolute inset-0 ring-1 ring-inset ring-white/20 dark:ring-gray-700/30 pointer-events-none" />
        <div className="relative p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-corporate-blue" />
              Board of Directors
            </h2>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {boardData.board_members.length} of {boardData.corporation.board_size} seats
            </span>
          </div>

          <div className="grid gap-4">
            {boardData.board_members.map((member, idx) => (
              <div
                key={member.user_id}
                className={`flex items-center justify-between p-4 rounded-xl border transition-all ${
                  member.is_ceo || member.is_acting_ceo
                    ? 'border-corporate-blue/30 bg-corporate-blue/5 dark:bg-corporate-blue/10'
                    : 'border-gray-200/60 dark:border-gray-700/50 bg-white/50 dark:bg-gray-800/50'
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <img
                      src={member.profile_image_url || '/defaultpfp.jpg'}
                      alt={member.username}
                      className="w-12 h-12 rounded-full object-cover ring-2 ring-gray-200/50 dark:ring-gray-700/50"
                      onError={(e) => { e.currentTarget.src = '/defaultpfp.jpg'; }}
                    />
                    {(member.is_ceo || member.is_acting_ceo) && (
                      <div className="absolute -top-1 -right-1 w-5 h-5 bg-corporate-blue rounded-full flex items-center justify-center">
                        <Crown className="w-3 h-3 text-white" />
                      </div>
                    )}
                  </div>
                  <div>
                    <Link
                      href={`/profile/${member.profile_id}`}
                      className="font-bold text-gray-900 dark:text-white hover:text-corporate-blue dark:hover:text-corporate-blue-light transition-colors"
                    >
                      {member.player_name || member.username}
                    </Link>
                    <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                      <span>{member.shares.toLocaleString()} shares</span>
                      {member.is_ceo && (
                        <span className="px-2 py-0.5 bg-corporate-blue text-white text-xs font-bold rounded">CEO</span>
                      )}
                      {member.is_acting_ceo && (
                        <span className="px-2 py-0.5 bg-amber-500 text-white text-xs font-bold rounded">Acting CEO</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="text-sm font-semibold text-gray-500 dark:text-gray-400">
                  Seat #{idx + 1}
                </div>
              </div>
            ))}
          </div>

          {/* CEO Resign Button */}
          {boardData.is_ceo && boardData.effective_ceo && !boardData.effective_ceo.isActing && (
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={handleResignCeo}
                className="px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
              >
                Resign as CEO
              </button>
            </div>
          )}

          {/* Admin Reset Board Button */}
          {isAdmin && (
            <div className="mt-4 pt-4 border-t-2 border-red-200 dark:border-red-800">
              <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-lg">
                <h4 className="text-xs font-bold uppercase tracking-wider text-red-700 dark:text-red-400 mb-2">Admin Controls</h4>
                <button
                  onClick={handleAdminResetBoard}
                  disabled={resettingBoard}
                  className="w-full px-4 py-2 text-sm bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 rounded-lg transition-colors font-semibold"
                >
                  {resettingBoard ? 'Resetting Board...' : 'Reset Board Members'}
                </button>
                <p className="text-xs text-red-600 dark:text-red-400 mt-2">
                  This will remove all appointed board members. Only the CEO will remain.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Active Proposals */}
      <div className="relative rounded-2xl border border-gray-200/50 dark:border-gray-700/50 bg-gradient-to-br from-white via-white to-gray-50/50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800/50 shadow-2xl overflow-hidden backdrop-blur-sm">
        <div className="absolute inset-0 bg-gradient-to-br from-corporate-blue/5 via-transparent to-corporate-blue-light/5 dark:from-corporate-blue/10 dark:via-transparent dark:to-corporate-blue-dark/10 pointer-events-none" />
        <div className="absolute inset-0 ring-1 ring-inset ring-white/20 dark:ring-gray-700/30 pointer-events-none" />
        <div className="relative p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Clock className="w-5 h-5 text-corporate-blue" />
              Active Proposals
            </h2>
            {boardData.is_on_board && (
              <button
                onClick={() => setShowCreateForm(!showCreateForm)}
                className="px-4 py-2 bg-corporate-blue text-white rounded-lg hover:bg-corporate-blue-dark transition-colors flex items-center gap-2 text-sm font-semibold"
              >
                <Plus className="w-4 h-4" />
                New Proposal
              </button>
            )}
          </div>

          {/* Create Proposal Form */}
          {showCreateForm && boardData.is_on_board && (
            <form onSubmit={handleCreateProposal} className="mb-6 p-4 rounded-xl border border-corporate-blue/30 bg-corporate-blue/5 dark:bg-corporate-blue/10">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Create New Proposal</h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Proposal Type
                  </label>
                  <select
                    value={proposalType}
                    onChange={(e) => setProposalType(e.target.value as CreateProposalData['proposal_type'])}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="ceo_nomination">Nominate CEO</option>
                    <option value="sector_change">Change Sector</option>
                    <option value="hq_change">Change HQ State</option>
                    <option value="board_size">Change Board Size</option>
                    <option value="appoint_member">Appoint Board Member</option>
                    <option value="ceo_salary_change">Change CEO Salary</option>
                    <option value="dividend_change">Change Dividend Percentage</option>
                    <option value="special_dividend">Pay Special Dividend</option>
                    <option value="stock_split">Stock Split (2:1)</option>
                  </select>
                </div>

                {proposalType === 'ceo_nomination' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      CEO Nominee (must be shareholder)
                    </label>
                    <select
                      value={nomineeId}
                      onChange={(e) => setNomineeId(e.target.value ? Number(e.target.value) : '')}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                      <option value="">Select nominee...</option>
                      {boardData.shareholders.map((sh) => (
                        <option key={sh.user_id} value={sh.user_id}>
                          {sh.player_name || sh.username} ({sh.shares.toLocaleString()} shares)
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {proposalType === 'sector_change' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      New Sector
                    </label>
                    <select
                      value={newSector}
                      onChange={(e) => setNewSector(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                      <option value="">Select sector...</option>
                      {boardData.sectors.map((sector) => (
                        <option key={sector} value={sector}>{sector}</option>
                      ))}
                    </select>
                  </div>
                )}

                {proposalType === 'hq_change' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      New HQ State
                    </label>
                    <select
                      value={newState}
                      onChange={(e) => setNewState(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                      <option value="">Select state...</option>
                      {boardData.us_states.map((code) => (
                        <option key={code} value={code}>{US_STATES[code] || code}</option>
                      ))}
                    </select>
                  </div>
                )}

                {proposalType === 'board_size' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      New Board Size (3-7)
                    </label>
                    <input
                      type="number"
                      min={3}
                      max={7}
                      value={newBoardSize}
                      onChange={(e) => setNewBoardSize(Number(e.target.value))}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                )}

                {proposalType === 'appoint_member' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Appointee (must be shareholder)
                    </label>
                    <select
                      value={appointeeId}
                      onChange={(e) => setAppointeeId(e.target.value ? Number(e.target.value) : '')}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                      <option value="">Select appointee...</option>
                      {boardData.shareholders
                        .filter(sh => !boardData.board_members.some(m => m.user_id === sh.user_id))
                        .map((sh) => (
                          <option key={sh.user_id} value={sh.user_id}>
                            {sh.player_name || sh.username} ({sh.shares.toLocaleString()} shares)
                          </option>
                        ))}
                    </select>
                  </div>
                )}

                {proposalType === 'ceo_salary_change' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      New CEO Salary (per 96 hours)
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400">$</span>
                      <input
                        type="number"
                        min={0}
                        max={10000000}
                        step={1000}
                        value={newSalary}
                        onChange={(e) => setNewSalary(Number(e.target.value))}
                        className="w-full pl-7 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Current salary: ${(boardData.corporation.ceo_salary || 100000).toLocaleString()}/96h 
                      (${((boardData.corporation.ceo_salary || 100000) / 96).toLocaleString(undefined, { maximumFractionDigits: 2 })}/hr)
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      New hourly rate: ${(newSalary / 96).toLocaleString(undefined, { maximumFractionDigits: 2 })}/hr
                    </p>
                    {newSalary === 0 && (
                      <p className="text-xs text-amber-600 dark:text-amber-400 mt-1 font-semibold">
                        ⚠️ Setting salary to $0 means CEO will not be paid
                      </p>
                    )}
                  </div>
                )}

                {proposalType === 'dividend_change' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      New Dividend Percentage (0-100%)
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min={0}
                        max={100}
                        step={0.1}
                        value={newDividendPercentage}
                        onChange={(e) => setNewDividendPercentage(Number(e.target.value))}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400">%</span>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Current: {((boardData.corporation.dividend_percentage || 0)).toFixed(2)}% of total profit
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      This percentage of total profit will be paid as dividends hourly to shareholders
                    </p>
                  </div>
                )}

                {proposalType === 'special_dividend' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Capital Percentage (0-100%)
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min={0}
                        max={100}
                        step={0.1}
                        value={specialDividendCapitalPercentage}
                        onChange={(e) => setSpecialDividendCapitalPercentage(Number(e.target.value))}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400">%</span>
                    </div>
                    {boardData.corporation.special_dividend_last_paid_at && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Last special dividend: ${(boardData.corporation.special_dividend_last_amount || 0).toLocaleString()} paid{' '}
                        {(() => {
                          const lastPaid = new Date(boardData.corporation.special_dividend_last_paid_at);
                          const now = new Date();
                          const hoursSince = (now.getTime() - lastPaid.getTime()) / (1000 * 60 * 60);
                          if (hoursSince < 96) {
                            const hoursRemaining = Math.ceil(96 - hoursSince);
                            return `${hoursRemaining} hours ago (${hoursRemaining}h cooldown remaining)`;
                          }
                          return `${Math.floor(hoursSince / 24)} days ago`;
                        })()}
                      </p>
                    )}
                    {boardData.corporation.special_dividend_last_paid_at && (() => {
                      const lastPaid = new Date(boardData.corporation.special_dividend_last_paid_at);
                      const now = new Date();
                      const hoursSince = (now.getTime() - lastPaid.getTime()) / (1000 * 60 * 60);
                      if (hoursSince < 96) {
                        return (
                          <p className="text-xs text-amber-600 dark:text-amber-400 mt-1 font-semibold">
                            ⚠️ Special dividend can only be paid once every 96 hours
                          </p>
                        );
                      }
                      return null;
                    })()}
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      This percentage of corporation capital will be paid as a one-time special dividend to all shareholders
                    </p>
                  </div>
                )}

                {proposalType === 'stock_split' && (
                  <div className="p-4 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                    <div className="flex items-center gap-2 mb-2">
                      <Split className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                      <span className="font-semibold text-amber-800 dark:text-amber-200">2:1 Stock Split</span>
                    </div>
                    <p className="text-sm text-amber-700 dark:text-amber-300">
                      This will double all outstanding shares and halve the share price. 
                      For example: 500,000 shares at $10 each becomes 1,000,000 shares at $5 each.
                    </p>
                    <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">
                      Total market capitalization remains unchanged.
                    </p>
                  </div>
                )}

                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-4 py-2 bg-corporate-blue text-white rounded-lg hover:bg-corporate-blue-dark disabled:opacity-50 transition-colors text-sm font-semibold"
                  >
                    {submitting ? 'Creating...' : 'Create Proposal'}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setShowCreateForm(false); resetForm(); }}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* Active Proposals List */}
          {activeProposals.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400 text-center py-8">
              No active proposals at this time.
            </p>
          ) : (
            <div className="space-y-4">
              {activeProposals.map((proposal) => {
                const needsUserVote = boardData.is_on_board && !proposal.user_vote;
                return (
                <div
                  key={proposal.id}
                  className={`p-4 rounded-xl border transition-all ${
                    needsUserVote
                      ? 'border-corporate-blue/60 bg-corporate-blue/5 dark:bg-corporate-blue/10 ring-2 ring-corporate-blue/20'
                      : 'border-gray-200/60 dark:border-gray-700/50 bg-white/50 dark:bg-gray-800/50'
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-corporate-blue/10 flex items-center justify-center text-corporate-blue">
                        {getProposalIcon(proposal.proposal_type)}
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900 dark:text-white">
                          {getProposalDescription(proposal)}
                        </h4>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Proposed by {proposal.proposer?.player_name || proposal.proposer?.username || 'Unknown'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatTimeRemaining(proposal.expires_at)}
                      </div>
                    </div>
                  </div>

                  {/* Vote Progress */}
                  <div className="mb-3">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                        Aye: {proposal.votes.aye}
                      </span>
                      <span className="text-red-600 dark:text-red-400 font-semibold">
                        Nay: {proposal.votes.nay}
                      </span>
                    </div>
                    <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      {proposal.votes.total > 0 && (
                        <div
                          className="h-full bg-emerald-500 transition-all"
                          style={{ width: `${(proposal.votes.aye / proposal.votes.total) * 100}%` }}
                        />
                      )}
                    </div>
                  </div>

                  {/* Voter Details */}
                  {proposal.voter_details && (
                    <div className="mb-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-200/50 dark:border-gray-700/50">
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        {/* Aye Voters */}
                        <div>
                          <div className="font-semibold text-emerald-600 dark:text-emerald-400 mb-1">
                            Aye ({proposal.voter_details.aye.length})
                          </div>
                          {proposal.voter_details.aye.length > 0 ? (
                            <ul className="space-y-1">
                              {proposal.voter_details.aye.map((voter) => (
                                <li key={voter.user_id} className="text-gray-700 dark:text-gray-300">
                                  <Link
                                    href={`/profile/${voter.profile_id}`}
                                    className="hover:text-corporate-blue dark:hover:text-corporate-blue-light transition-colors"
                                  >
                                    {voter.player_name || voter.username}
                                  </Link>
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p className="text-gray-400 dark:text-gray-500 italic">None</p>
                          )}
                        </div>

                        {/* Nay Voters */}
                        <div>
                          <div className="font-semibold text-red-600 dark:text-red-400 mb-1">
                            Nay ({proposal.voter_details.nay.length})
                          </div>
                          {proposal.voter_details.nay.length > 0 ? (
                            <ul className="space-y-1">
                              {proposal.voter_details.nay.map((voter) => (
                                <li key={voter.user_id} className="text-gray-700 dark:text-gray-300">
                                  <Link
                                    href={`/profile/${voter.profile_id}`}
                                    className="hover:text-corporate-blue dark:hover:text-corporate-blue-light transition-colors"
                                  >
                                    {voter.player_name || voter.username}
                                  </Link>
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p className="text-gray-400 dark:text-gray-500 italic">None</p>
                          )}
                        </div>

                        {/* Abstained (Not Voted Yet) */}
                        <div>
                          <div className="font-semibold text-gray-500 dark:text-gray-400 mb-1">
                            Not Voted ({proposal.voter_details.abstained.length})
                          </div>
                          {proposal.voter_details.abstained.length > 0 ? (
                            <ul className="space-y-1">
                              {proposal.voter_details.abstained.map((voter) => (
                                <li key={voter.user_id} className="text-gray-700 dark:text-gray-300">
                                  <Link
                                    href={`/profile/${voter.profile_id}`}
                                    className="hover:text-corporate-blue dark:hover:text-corporate-blue-light transition-colors"
                                  >
                                    {voter.player_name || voter.username}
                                  </Link>
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p className="text-gray-400 dark:text-gray-500 italic">All voted</p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Vote Buttons */}
                  {boardData.is_on_board && (
                    <div className="flex gap-2">
                      {proposal.user_vote ? (
                        <div className={`w-full px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 ${
                          proposal.user_vote === 'aye'
                            ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300'
                            : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                        }`}>
                          {proposal.user_vote === 'aye' ? (
                            <ThumbsUp className="w-4 h-4" />
                          ) : (
                            <ThumbsDown className="w-4 h-4" />
                          )}
                          You voted: {proposal.user_vote.toUpperCase()}
                        </div>
                      ) : (
                        <>
                          <button
                            onClick={() => handleVote(proposal.id, 'aye')}
                            disabled={voting === proposal.id}
                            className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2 text-sm font-semibold"
                          >
                            <ThumbsUp className="w-4 h-4" />
                            Vote Aye
                          </button>
                          <button
                            onClick={() => handleVote(proposal.id, 'nay')}
                            disabled={voting === proposal.id}
                            className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2 text-sm font-semibold"
                          >
                            <ThumbsDown className="w-4 h-4" />
                            Vote Nay
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Vote History */}
      <div className="relative rounded-2xl border border-gray-200/50 dark:border-gray-700/50 bg-gradient-to-br from-white via-white to-gray-50/50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800/50 shadow-2xl overflow-hidden backdrop-blur-sm">
        <div className="absolute inset-0 bg-gradient-to-br from-corporate-blue/5 via-transparent to-corporate-blue-light/5 dark:from-corporate-blue/10 dark:via-transparent dark:to-corporate-blue-dark/10 pointer-events-none" />
        <div className="absolute inset-0 ring-1 ring-inset ring-white/20 dark:ring-gray-700/30 pointer-events-none" />
        <div className="relative p-6">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="w-full flex items-center justify-between text-xl font-bold text-gray-900 dark:text-white"
          >
            <span className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-corporate-blue" />
              Vote History
              <span className="text-sm font-normal text-gray-500 dark:text-gray-400">
                ({historyProposals.length})
              </span>
            </span>
            {showHistory ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </button>

          {showHistory && (
            <div className="mt-4 space-y-3">
              {historyProposals.length === 0 ? (
                <p className="text-gray-500 dark:text-gray-400 text-center py-4">
                  No past proposals.
                </p>
              ) : (
                historyProposals.map((proposal) => (
                  <div
                    key={proposal.id}
                    className={`p-3 rounded-lg border ${
                      proposal.status === 'passed'
                        ? 'border-emerald-200 dark:border-emerald-800/50 bg-emerald-50/50 dark:bg-emerald-900/20'
                        : 'border-red-200 dark:border-red-800/50 bg-red-50/50 dark:bg-red-900/20'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {proposal.status === 'passed' ? (
                          <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        ) : (
                          <XCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
                        )}
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {getProposalDescription(proposal)}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {proposal.votes.aye} - {proposal.votes.nay}
                      </div>
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {proposal.resolved_at
                        ? new Date(proposal.resolved_at).toLocaleDateString()
                        : new Date(proposal.created_at).toLocaleDateString()}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

