'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { boardAPI, BoardResponse, BoardProposal, CreateProposalData, adminAPI, CorpFocus } from '@/lib/api';
import { getErrorMessage } from '@/lib/utils';
import {
  Users, Crown, Clock, CheckCircle, XCircle,
  ThumbsUp, ThumbsDown, Plus, ChevronDown, ChevronUp,
  Building2, MapPin, UsersRound, UserPlus, DollarSign, Percent, Gift, Split, Target
} from 'lucide-react';
import {
  Card,
  CardBody,
  CardHeader,
  CardFooter,
  Button,
  Select,
  SelectItem,
  Input,
  Avatar,
  Chip,
  Spinner,
  Accordion,
  AccordionItem,
  Divider,
  Progress,
  Tooltip,
  User
} from "@heroui/react";

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
  const [newFocus, setNewFocus] = useState<CorpFocus>('diversified');

  const fetchBoardData = useCallback(async () => {
    try {
      const [board, allProposals] = await Promise.all([
        boardAPI.getBoard(corporationId),
        boardAPI.getProposals(corporationId),
      ]);
      setBoardData(board);
      setProposals(allProposals);
    } catch (err: unknown) {
      console.error('Failed to fetch board data:', err);
      setError(getErrorMessage(err, 'Failed to load board data'));
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
        case 'focus_change':
          if (!newFocus) {
            alert('Please select a focus');
            setSubmitting(false);
            return;
          }
          data = { proposal_type: 'focus_change', proposal_data: { new_focus: newFocus } };
          break;
        default:
          return;
      }

      await boardAPI.createProposal(corporationId, data);
      setShowCreateForm(false);
      resetForm();
      await fetchBoardData();
    } catch (err: unknown) {
      alert(getErrorMessage(err, 'Failed to create proposal'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleVote = async (proposalId: number, vote: 'aye' | 'nay') => {
    setVoting(proposalId);
    try {
      await boardAPI.castVote(corporationId, proposalId, vote);
      await fetchBoardData();
    } catch (err: unknown) {
      alert(getErrorMessage(err, 'Failed to cast vote'));
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
    } catch (err: unknown) {
      alert(getErrorMessage(err, 'Failed to resign'));
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
    } catch (err: unknown) {
      alert(getErrorMessage(err, 'Failed to reset board'));
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
    setNewFocus(boardData?.corporation.focus || 'diversified');
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
        if ('new_percentage' in proposal.proposal_data) {
          return `Change dividend percentage to ${(proposal.proposal_data.new_percentage || 0).toFixed(2)}%`;
        }
        return 'Change dividend percentage';
      case 'special_dividend':
        if ('capital_percentage' in proposal.proposal_data) {
          return `Pay special dividend of ${(proposal.proposal_data.capital_percentage || 0).toFixed(2)}% of capital`;
        }
        return 'Pay special dividend';
      case 'stock_split':
        return `Execute 2:1 stock split (double shares, halve price)`;
      case 'focus_change':
        const focusLabels: Record<string, string> = {
          extraction: 'Extraction',
          production: 'Production',
          retail: 'Retail',
          service: 'Service',
          diversified: 'Diversified',
        };
        return `Change corporate focus to ${focusLabels[proposal.proposal_data.new_focus || ''] || proposal.proposal_data.new_focus}`;
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
      case 'focus_change': return <Target className="w-4 h-4" />;
      default: return <Users className="w-4 h-4" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner size="lg" label="Loading board data..." color="primary" />
      </div>
    );
  }

  if (error || !boardData) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-danger">{error || 'Failed to load board data'}</div>
      </div>
    );
  }

  const activeProposals = proposals.filter(p => p.status === 'active');
  const historyProposals = proposals.filter(p => p.status !== 'active');

  return (
    <div className="space-y-6">
      {/* Board Members */}
      <Card className="bg-surface-1/80 border-default-200 backdrop-blur-md" shadow="lg" role="region" aria-label="Board of Directors">
        <CardHeader className="flex items-center justify-between pb-2 px-6 pt-6">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              <h2 className="text-xl font-bold text-foreground">
                Board of Directors
              </h2>
            </div>
            <Chip size="sm" variant="flat" color="default">
              {boardData.board_members.length} of {boardData.corporation.board_size} seats
            </Chip>
        </CardHeader>
        <CardBody className="px-6 pb-6 space-y-4">
          <div className="grid gap-4">
            {boardData.board_members.map((member, idx) => (
              <Card
                key={member.user_id}
                shadow="sm"
                className={`border transition-all ${
                  member.is_ceo || member.is_acting_ceo
                    ? 'border-primary/30 bg-primary/5'
                    : 'border-default-200 bg-surface-1/50'
                }`}
              >
                <CardBody className="flex flex-row items-center justify-between p-4">
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <Avatar
                        src={member.profile_image_url || '/defaultpfp.jpg'}
                        className="w-12 h-12"
                        isBordered
                        color={member.is_ceo || member.is_acting_ceo ? "primary" : "default"}
                      />
                      {(member.is_ceo || member.is_acting_ceo) && (
                        <div className="absolute -top-1 -right-1 w-5 h-5 bg-primary rounded-full flex items-center justify-center z-10 ring-2 ring-background">
                          <Crown className="w-3 h-3 text-white" />
                        </div>
                      )}
                    </div>
                    <div>
                      <Link
                        href={`/profile/${member.profile_id}`}
                        className="font-bold text-foreground hover:text-primary transition-colors"
                      >
                        {member.player_name || member.username}
                      </Link>
                      <div className="flex items-center gap-2 text-sm text-default-500">
                        <span>{member.shares.toLocaleString()} shares</span>
                        {member.is_ceo && (
                          <Chip size="sm" color="primary" variant="solid" className="h-5 text-[10px] px-1">CEO</Chip>
                        )}
                        {member.is_acting_ceo && (
                          <Chip size="sm" color="warning" variant="solid" className="h-5 text-[10px] px-1 text-white">Acting CEO</Chip>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-sm font-semibold text-default-500">
                    Seat #{idx + 1}
                  </div>
                </CardBody>
              </Card>
            ))}
          </div>

          {/* CEO Resign Button */}
          {boardData.is_ceo && boardData.effective_ceo && !boardData.effective_ceo.isActing && (
            <div className="mt-4 pt-4 border-t border-default-200">
              <Button
                onPress={handleResignCeo}
                color="danger"
                variant="light"
                size="sm"
              >
                Resign as CEO
              </Button>
            </div>
          )}

          {/* Admin Reset Board Button */}
          {isAdmin && (
            <div className="mt-4 pt-4 border-t-2 border-danger/30">
              <div className="bg-danger/10 p-3 rounded-lg">
                <h4 className="text-xs font-bold uppercase tracking-wider text-danger mb-2">Admin Controls</h4>
                <Button
                  onPress={handleAdminResetBoard}
                  isLoading={resettingBoard}
                  color="danger"
                  className="w-full font-semibold"
                >
                  {resettingBoard ? 'Resetting Board...' : 'Reset Board Members'}
                </Button>
                <p className="text-xs text-danger mt-2">
                  This will remove all appointed board members. Only the CEO will remain.
                </p>
              </div>
            </div>
          )}
        </CardBody>
      </Card>

      {/* Active Proposals */}
      <Card className="bg-surface-1/80 border-default-200 backdrop-blur-md" shadow="lg" role="region" aria-label="Active Proposals">
        <CardHeader className="flex items-center justify-between pb-2 px-6 pt-6">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-primary" />
              <h2 className="text-xl font-bold text-foreground">
                Active Proposals
              </h2>
            </div>
            {boardData.is_on_board && (
              <Button
                onPress={() => setShowCreateForm(!showCreateForm)}
                color="primary"
                startContent={<Plus className="w-4 h-4" />}
                size="sm"
              >
                New Proposal
              </Button>
            )}
        </CardHeader>
        <CardBody className="px-6 pb-6 space-y-4">

          {/* Create Proposal Form */}
          {showCreateForm && boardData.is_on_board && (
            <Card className="mb-6 border border-primary/30 bg-primary/5">
              <CardBody className="p-4">
                <form onSubmit={handleCreateProposal}>
                  <h3 className="font-semibold text-foreground mb-4">Create New Proposal</h3>
                  <div className="space-y-4">
                    <Select
                label="Proposal Type"
                labelPlacement="outside"
                selectedKeys={[proposalType]}
                onChange={(e) => setProposalType(e.target.value as CreateProposalData['proposal_type'])}
              >
                      <SelectItem key="ceo_nomination">Nominate CEO</SelectItem>
                      <SelectItem key="sector_change">Change Sector</SelectItem>
                      <SelectItem key="hq_change">Change HQ State</SelectItem>
                      <SelectItem key="board_size">Change Board Size</SelectItem>
                      <SelectItem key="appoint_member">Appoint Board Member</SelectItem>
                      <SelectItem key="ceo_salary_change">Change CEO Salary</SelectItem>
                      <SelectItem key="dividend_change">Change Dividend Percentage</SelectItem>
                      <SelectItem key="special_dividend">Pay Special Dividend</SelectItem>
                      <SelectItem key="stock_split">Stock Split (2:1)</SelectItem>
                      <SelectItem key="focus_change">Change Corporate Focus</SelectItem>
                    </Select>

                    {proposalType === 'ceo_nomination' && (
                      <Select
                        label="CEO Nominee (must be shareholder)"
                        labelPlacement="outside"
                        selectedKeys={nomineeId ? [String(nomineeId)] : []}
                        onChange={(e) => setNomineeId(e.target.value ? Number(e.target.value) : '')}
                      >
                        {boardData.shareholders.map((sh) => (
                          <SelectItem key={String(sh.user_id)} textValue={`${sh.player_name || sh.username} (${sh.shares.toLocaleString()} shares)`}>
                            {sh.player_name || sh.username} ({sh.shares.toLocaleString()} shares)
                          </SelectItem>
                        ))}
                      </Select>
                    )}

                    {proposalType === 'sector_change' && (
                      <Select
                        label="New Sector"
                        labelPlacement="outside"
                        selectedKeys={[newSector]}
                        onChange={(e) => setNewSector(e.target.value)}
                      >
                        {boardData.sectors.map((sector) => (
                          <SelectItem key={sector}>{sector}</SelectItem>
                        ))}
                      </Select>
                    )}

                    {proposalType === 'hq_change' && (
                      <Select
                        label="New HQ State"
                        labelPlacement="outside"
                        selectedKeys={[newState]}
                        onChange={(e) => setNewState(e.target.value)}
                      >
                        {boardData.us_states.map((code) => (
                          <SelectItem key={code}>{US_STATES[code] || code}</SelectItem>
                        ))}
                      </Select>
                    )}

                    {proposalType === 'board_size' && (
                      <Input
                  label="New Board Size (3-7)"
                  labelPlacement="outside"
                  type="number"
                  min={3}
                  max={7}
                  value={String(newBoardSize)}
                  onValueChange={(val) => setNewBoardSize(Number(val))}
                />
                    )}

                    {proposalType === 'appoint_member' && (
                      <Select
                        label="Appointee (must be shareholder)"
                        labelPlacement="outside"
                        selectedKeys={appointeeId ? [String(appointeeId)] : []}
                        onChange={(e) => setAppointeeId(e.target.value ? Number(e.target.value) : '')}
                      >
                        {boardData.shareholders
                          .filter(sh => !boardData.board_members.some(m => m.user_id === sh.user_id))
                          .map((sh) => (
                            <SelectItem key={String(sh.user_id)} textValue={`${sh.player_name || sh.username} (${sh.shares.toLocaleString()} shares)`}>
                              {sh.player_name || sh.username} ({sh.shares.toLocaleString()} shares)
                            </SelectItem>
                          ))}
                      </Select>
                    )}

                    {proposalType === 'ceo_salary_change' && (
                      <div>
                        <Input
                          type="number"
                          label="New CEO Salary (per 96 hours)"
                          labelPlacement="outside"
                          startContent={<span className="text-default-400 text-small">$</span>}
                          min={0}
                          max={10000000}
                          step={1000}
                          value={String(newSalary)}
                          onValueChange={(val) => setNewSalary(Number(val))}
                        />
                        <div className="mt-2 text-xs text-default-500">
                          <p>Current salary: ${(boardData.corporation.ceo_salary || 100000).toLocaleString()}/96h 
                          (${((boardData.corporation.ceo_salary || 100000) / 96).toLocaleString(undefined, { maximumFractionDigits: 2 })}/hr)</p>
                          <p>New hourly rate: ${(newSalary / 96).toLocaleString(undefined, { maximumFractionDigits: 2 })}/hr</p>
                          {newSalary === 0 && (
                            <p className="text-warning font-semibold mt-1">
                              ⚠️ Setting salary to $0 means CEO will not be paid
                            </p>
                          )}
                        </div>
                      </div>
                    )}

                    {proposalType === 'dividend_change' && (
                      <div>
                        <Input
                          type="number"
                          label="New Dividend Percentage (0-100%)"
                          labelPlacement="outside"
                          endContent={<span className="text-default-400 text-small">%</span>}
                          min={0}
                          max={100}
                          step={0.1}
                          value={String(newDividendPercentage)}
                          onValueChange={(val) => setNewDividendPercentage(Number(val))}
                        />
                        <div className="mt-2 text-xs text-default-500">
                          <p>Current: {((boardData.corporation.dividend_percentage || 0)).toFixed(2)}% of total profit</p>
                          <p>This percentage of total profit will be paid as dividends hourly to shareholders</p>
                        </div>
                      </div>
                    )}

                    {proposalType === 'special_dividend' && (
                      <div>
                        <Input
                          type="number"
                          label="Capital Percentage (0-100%)"
                          endContent={<span className="text-default-400 text-small">%</span>}
                          min={0}
                          max={100}
                          step={0.1}
                          value={String(specialDividendCapitalPercentage)}
                          onValueChange={(val) => setSpecialDividendCapitalPercentage(Number(val))}
                        />
                        {boardData.corporation.special_dividend_last_paid_at && (
                          <div className="mt-2 text-xs text-default-500">
                            <p>Last special dividend: ${(boardData.corporation.special_dividend_last_amount || 0).toLocaleString()} paid{' '}
                            {(() => {
                              const lastPaid = new Date(boardData.corporation.special_dividend_last_paid_at);
                              const now = new Date();
                              const hoursSince = (now.getTime() - lastPaid.getTime()) / (1000 * 60 * 60);
                              if (hoursSince < 96) {
                                const hoursRemaining = Math.ceil(96 - hoursSince);
                                return `${hoursRemaining} hours ago (${hoursRemaining}h cooldown remaining)`;
                              }
                              return `${Math.floor(hoursSince / 24)} days ago`;
                            })()}</p>
                          </div>
                        )}
                        {boardData.corporation.special_dividend_last_paid_at && (() => {
                          const lastPaid = new Date(boardData.corporation.special_dividend_last_paid_at);
                          const now = new Date();
                          const hoursSince = (now.getTime() - lastPaid.getTime()) / (1000 * 60 * 60);
                          if (hoursSince < 96) {
                            return (
                              <p className="text-xs text-warning mt-1 font-semibold">
                                ⚠️ Special dividend can only be paid once every 96 hours
                              </p>
                            );
                          }
                          return null;
                        })()}
                        <p className="text-xs text-default-500 mt-1">
                          This percentage of corporation capital will be paid as a one-time special dividend to all shareholders
                        </p>
                      </div>
                    )}

                    {proposalType === 'stock_split' && (
                      <Card className="bg-warning/10 border-warning/20">
                        <CardBody>
                          <div className="flex items-center gap-2 mb-2">
                            <Split className="w-5 h-5 text-warning" />
                            <span className="font-semibold text-warning">2:1 Stock Split</span>
                          </div>
                          <p className="text-sm text-warning">
                            This will double all outstanding shares and halve the share price.
                            For example: 500,000 shares at $10 each becomes 1,000,000 shares at $5 each.
                          </p>
                          <p className="text-xs text-warning mt-2">
                            Total market capitalization remains unchanged.
                          </p>
                        </CardBody>
                      </Card>
                    )}

                    {proposalType === 'focus_change' && (
                      <div>
                        <Select
                          label="New Corporate Focus"
                          selectedKeys={[newFocus]}
                          onChange={(e) => setNewFocus(e.target.value as CorpFocus)}
                        >
                          <SelectItem key="diversified">Diversified (All unit types)</SelectItem>
                          <SelectItem key="production">Production (Production + Extraction)</SelectItem>
                          <SelectItem key="retail">Retail (Retail only)</SelectItem>
                          <SelectItem key="service">Service (Service only)</SelectItem>
                          <SelectItem key="extraction">Extraction (Extraction only)</SelectItem>
                        </Select>
                        <Card className="mt-3 bg-primary/10 border-primary/20">
                          <CardBody>
                            <p className="text-sm text-primary mb-2">
                              <strong>Focus determines what units the corporation can build:</strong>
                            </p>
                            <ul className="text-xs text-primary/80 space-y-1 ml-4 list-disc">
                              <li><strong>Diversified:</strong> Retail, Production, Service, Extraction</li>
                              <li><strong>Production:</strong> Production, Extraction</li>
                              <li><strong>Retail:</strong> Retail only</li>
                              <li><strong>Service:</strong> Service only</li>
                              <li><strong>Extraction:</strong> Extraction only</li>
                            </ul>
                          </CardBody>
                        </Card>
                        {boardData?.corporation.focus && (
                          <p className="text-xs text-default-500 mt-2">
                            Current focus: <span className="font-semibold capitalize">{boardData.corporation.focus}</span>
                          </p>
                        )}
                      </div>
                    )}

                    <div className="flex gap-2">
                      <Button
                        type="submit"
                        isLoading={submitting}
                        color="primary"
                        className="font-semibold"
                      >
                        {submitting ? 'Creating...' : 'Create Proposal'}
                      </Button>
                      <Button
                        onPress={() => { setShowCreateForm(false); resetForm(); }}
                        variant="bordered"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                </form>
              </CardBody>
            </Card>
          )}

          {/* Active Proposals List */}
          {activeProposals.length === 0 ? (
            <p className="text-content-tertiary text-center py-8">
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
                      ? 'border-accent/60 bg-accent/5 ring-2 ring-accent/20'
                      : 'border-line-subtle bg-surface-1/50'
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center text-accent">
                        {getProposalIcon(proposal.proposal_type)}
                      </div>
                      <div>
                        <h4 className="font-semibold text-content-primary">
                          {getProposalDescription(proposal)}
                        </h4>
                        <p className="text-xs text-content-tertiary">
                          Proposed by {proposal.proposer?.player_name || proposal.proposer?.username || 'Unknown'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-semibold text-status-warning flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatTimeRemaining(proposal.expires_at)}
                      </div>
                    </div>
                  </div>

                  {/* Vote Progress */}
                  <div className="mb-3">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-status-success font-semibold">
                        Aye: {proposal.votes.aye}
                      </span>
                      <span className="text-status-error font-semibold">
                        Nay: {proposal.votes.nay}
                      </span>
                    </div>
                    <div className="h-2 bg-surface-3 rounded-full overflow-hidden">
                      {proposal.votes.total > 0 && (
                        <div
                          className="h-full bg-status-success transition-all"
                          style={{ width: `${(proposal.votes.aye / proposal.votes.total) * 100}%` }}
                        />
                      )}
                    </div>
                  </div>

                  {/* Voter Details */}
                  {proposal.voter_details && (
                    <div className="mb-3 p-3 rounded-lg bg-surface-2/50 border border-line-subtle">
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        {/* Aye Voters */}
                        <div>
                          <div className="font-semibold text-status-success mb-1">
                            Aye ({proposal.voter_details.aye.length})
                          </div>
                          {proposal.voter_details.aye.length > 0 ? (
                            <ul className="space-y-1">
                              {proposal.voter_details.aye.map((voter) => (
                                <li key={voter.user_id} className="text-content-secondary">
                                  <Link
                                    href={`/profile/${voter.profile_id}`}
                                    className="hover:text-accent transition-colors"
                                  >
                                    {voter.player_name || voter.username}
                                  </Link>
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p className="text-content-tertiary italic">None</p>
                          )}
                        </div>

                        {/* Nay Voters */}
                        <div>
                          <div className="font-semibold text-status-error mb-1">
                            Nay ({proposal.voter_details.nay.length})
                          </div>
                          {proposal.voter_details.nay.length > 0 ? (
                            <ul className="space-y-1">
                              {proposal.voter_details.nay.map((voter) => (
                                <li key={voter.user_id} className="text-content-secondary">
                                  <Link
                                    href={`/profile/${voter.profile_id}`}
                                    className="hover:text-accent transition-colors"
                                  >
                                    {voter.player_name || voter.username}
                                  </Link>
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p className="text-content-tertiary italic">None</p>
                          )}
                        </div>

                        {/* Abstained (Not Voted Yet) */}
                        <div>
                          <div className="font-semibold text-content-tertiary mb-1">
                            Not Voted ({proposal.voter_details.abstained.length})
                          </div>
                          {proposal.voter_details.abstained.length > 0 ? (
                            <ul className="space-y-1">
                              {proposal.voter_details.abstained.map((voter) => (
                                <li key={voter.user_id} className="text-content-secondary">
                                  <Link
                                    href={`/profile/${voter.profile_id}`}
                                    className="hover:text-accent transition-colors"
                                  >
                                    {voter.player_name || voter.username}
                                  </Link>
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p className="text-content-tertiary italic">All voted</p>
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
                            ? 'bg-status-success-bg text-status-success'
                            : 'bg-status-error-bg text-status-error'
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
                            className="flex-1 px-4 py-2 bg-status-success text-content-inverse rounded-lg hover:bg-status-success/90 disabled:opacity-50 transition-colors flex items-center justify-center gap-2 text-sm font-semibold"
                          >
                            <ThumbsUp className="w-4 h-4" />
                            Vote Aye
                          </button>
                          <button
                            onClick={() => handleVote(proposal.id, 'nay')}
                            disabled={voting === proposal.id}
                            className="flex-1 px-4 py-2 bg-status-error text-content-inverse rounded-lg hover:bg-status-error/90 disabled:opacity-50 transition-colors flex items-center justify-center gap-2 text-sm font-semibold"
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
        </CardBody>
      </Card>

      {/* Vote History */}
      <Card className="border border-default-200 bg-background shadow-2xl" role="region" aria-label="Vote History">
        <Accordion variant="splitted" className="px-0">
          <AccordionItem
            key="history"
            aria-label="Vote History"
            title={
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-primary" />
                <span className="text-xl font-bold">Vote History</span>
                <span className="text-small text-default-500">({historyProposals.length})</span>
              </div>
            }
          >
            <div className="space-y-3 pb-2">
              {historyProposals.length === 0 ? (
                <p className="text-default-500 text-center py-4">
                  No past proposals.
                </p>
              ) : (
                historyProposals.map((proposal) => (
                  <Card
                    key={proposal.id}
                    className={`border ${
                      proposal.status === 'passed'
                        ? 'border-success/30 bg-success-50 dark:bg-success-900/20'
                        : 'border-danger/30 bg-danger-50 dark:bg-danger-900/20'
                    }`}
                    shadow="sm"
                  >
                    <CardBody className="p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {proposal.status === 'passed' ? (
                            <CheckCircle className="w-4 h-4 text-success" />
                          ) : (
                            <XCircle className="w-4 h-4 text-danger" />
                          )}
                          <span className="text-small font-medium text-foreground">
                            {getProposalDescription(proposal)}
                          </span>
                        </div>
                        <div className="text-tiny text-default-500">
                          {proposal.votes.aye} - {proposal.votes.nay}
                        </div>
                      </div>
                      <div className="text-tiny text-default-400 mt-1">
                        {proposal.resolved_at
                          ? new Date(proposal.resolved_at).toLocaleDateString()
                          : new Date(proposal.created_at).toLocaleDateString()}
                      </div>
                    </CardBody>
                  </Card>
                ))
              )}
            </div>
          </AccordionItem>
        </Accordion>
      </Card>
    </div>
  );
}

