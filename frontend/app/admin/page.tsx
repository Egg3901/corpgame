'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2, Shield, ShieldOff, Eye, EyeOff, AlertTriangle, Flag, CheckCircle2, X, ChevronDown, ChevronUp, MessageSquare, Play, RefreshCw, DollarSign, Clock, Receipt, Search, ArrowUpRight, ArrowDownLeft, Scissors, CalendarClock, Database, ArrowRight, RotateCcw } from 'lucide-react';
import AppNavigation from '@/components/AppNavigation';
import SectorConfigPanel from '@/components/admin/SectorConfigPanel';
import { authAPI, adminAPI, AdminUser, ReportedChat, Transaction, TransactionType, normalizeImageUrl, gameAPI, AdminGameTimeResetResponse } from '@/lib/api';
import Link from 'next/link';
import { calculateGameTime, GameTime } from '@/lib/gameTime';

type AdminTabType = 'game-control' | 'finance' | 'moderation' | 'configuration';

export default function AdminPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [revealedUsers, setRevealedUsers] = useState<Set<number>>(new Set());
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const [resetConfirm, setResetConfirm] = useState<number | null>(null);
  const [resettingUser, setResettingUser] = useState(false);
  const [resetResult, setResetResult] = useState<{ username: string; corporations_deleted: number; corporation_names: string[]; shareholder_positions_cleared: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reportedChats, setReportedChats] = useState<ReportedChat[]>([]);
  const [showReviewed, setShowReviewed] = useState(false);
  const [clearingReport, setClearingReport] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<AdminTabType>('game-control');
  const [runningTurn, setRunningTurn] = useState(false);
  const [recalculatingPrices, setRecalculatingPrices] = useState(false);
  const [turnResult, setTurnResult] = useState<{
    actions: { users_updated: number; ceo_count: number };
    market_revenue: { corporations_processed: number; total_profit: number };
    ceo_salaries?: { ceos_paid: number; total_paid: number; salaries_zeroed: number };
  } | null>(null);
  const [priceResult, setPriceResult] = useState<{
    corporations_updated: number;
    changes: Array<{ corporation_id: number; name: string; old_price: number; new_price: number }>;
  } | null>(null);
  // Game time state
  const [gameYear, setGameYear] = useState('');
  const [gameQuarter, setGameQuarter] = useState('1');
  const [resettingGameTime, setResettingGameTime] = useState(false);
  const [gameTimeInfo, setGameTimeInfo] = useState<{
    current: GameTime;
    startDate: string;
    serverTime: string;
  } | null>(null);
  const [gameTimeResult, setGameTimeResult] = useState<AdminGameTimeResetResponse | null>(null);
  // Stock split state
  const [stockSplitCorpId, setStockSplitCorpId] = useState('');
  const [runningSplit, setRunningSplit] = useState(false);
  const [splitResult, setSplitResult] = useState<{
    corporation_name: string;
    split_ratio: string;
    before: { total_shares: number; public_shares: number; share_price: number };
    after: { total_shares: number; public_shares: number; share_price: number };
    shareholders_updated: number;
  } | null>(null);
  // Force end vote state
  const [forceEndCorpSearch, setForceEndCorpSearch] = useState('');
  const [forceEndCorpResults, setForceEndCorpResults] = useState<Array<{ id: number; name: string; sector: string; logo: string | null }>>([]);
  const [forceEndSelectedCorp, setForceEndSelectedCorp] = useState<{ id: number; name: string } | null>(null);
  const [forceEndProposalId, setForceEndProposalId] = useState('');
  const [endingVote, setEndingVote] = useState(false);
  const [forceEndResult, setForceEndResult] = useState<{
    message: string;
    corporation_name: string;
    votes: { aye: number; nay: number; total: number };
  } | null>(null);
  // Transactions state
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [transactionsLoading, setTransactionsLoading] = useState(false);
  const [transactionsTotal, setTransactionsTotal] = useState(0);
  const [transactionSearch, setTransactionSearch] = useState('');
  const [transactionTypeFilter, setTransactionTypeFilter] = useState<TransactionType | ''>('');
  const [transactionPage, setTransactionPage] = useState(0);
  const TRANSACTIONS_PER_PAGE = 20;
  // Cash Management state
  const [cashAmount, setCashAmount] = useState('');
  const [addingCashToAll, setAddingCashToAll] = useState(false);
  const [cashAllResult, setCashAllResult] = useState<{ users_updated: number; amount: number } | null>(null);
  const [userCashSearch, setUserCashSearch] = useState('');
  const [userCashResults, setUserCashResults] = useState<Array<{ id: number; username: string; player_name: string | null; profile_image_url: string | null }>>([]);
  const [selectedUserForCash, setSelectedUserForCash] = useState<{ id: number; username: string; player_name: string | null } | null>(null);
  const [userCashAmount, setUserCashAmount] = useState('');
  const [addingCashToUser, setAddingCashToUser] = useState(false);
  const [userCashResult, setUserCashResult] = useState<{ username: string; player_name: string | null; old_cash: number; new_cash: number; amount: number } | null>(null);
  // Capital Management state
  const [capitalAmount, setCapitalAmount] = useState('');
  const [addingCapitalToAll, setAddingCapitalToAll] = useState(false);
  const [capitalAllResult, setCapitalAllResult] = useState<{ corporations_updated: number; amount: number } | null>(null);
  const [corpCapitalSearch, setCorpCapitalSearch] = useState('');
  const [corpCapitalResults, setCorpCapitalResults] = useState<Array<{ id: number; name: string; sector: string; logo: string | null }>>([]);
  const [selectedCorpForCapital, setSelectedCorpForCapital] = useState<{ id: number; name: string } | null>(null);
  const [corpCapitalAmount, setCorpCapitalAmount] = useState('');
  const [addingCapitalToCorp, setAddingCapitalToCorp] = useState(false);
  const [corpCapitalResult, setCorpCapitalResult] = useState<{ corporation_name: string; old_capital: number; new_capital: number; new_share_price: number; amount: number } | null>(null);
  // Migration state
  const [migratingManufacturing, setMigratingManufacturing] = useState(false);
  const [migrationResult, setMigrationResult] = useState<{ corporations_updated: number; market_entries_updated: number; message: string } | null>(null);

  useEffect(() => {
    const loadData = async () => {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      if (!token) {
        router.push('/login');
        return;
      }

      try {
        const me = await authAPI.getMe();
        setCurrentUser(me);

        if (!me.is_admin) {
          router.push('/overview');
          return;
        }

        const [allUsers, reportedChatsData, serverTimeData] = await Promise.all([
          adminAPI.getAllUsers(),
          adminAPI.getReportedChats(false), // Only get unreviewed by default
          gameAPI.getTime().catch(() => null),
        ]);
        setUsers(allUsers);
        setReportedChats(reportedChatsData);

        if (serverTimeData) {
          const currentGameTime = calculateGameTime(serverTimeData.game_start_date, serverTimeData.server_time);
          setGameTimeInfo({
            current: currentGameTime,
            startDate: serverTimeData.game_start_date,
            serverTime: serverTimeData.server_time,
          });
          setGameYear(currentGameTime.year.toString());
          setGameQuarter(currentGameTime.quarter.toString());
        }
      } catch (err: any) {
        console.error('Admin panel error:', err);
        if (err?.response?.status === 403) {
          router.push('/overview');
        } else {
          setError('Failed to load admin panel');
        }
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [router]);

  // Load active tab from localStorage on mount
  useEffect(() => {
    const savedTab = localStorage.getItem('admin-panel-active-tab');
    if (savedTab && ['game-control', 'finance', 'moderation', 'configuration'].includes(savedTab)) {
      setActiveTab(savedTab as AdminTabType);
    }
  }, []);

  // Load transactions when Finance tab is first activated (will be set up after loadTransactions is defined)

  const handleTabChange = (tab: AdminTabType) => {
    setActiveTab(tab);
    localStorage.setItem('admin-panel-active-tab', tab);
  };

  const toggleReveal = (userId: number) => {
    setRevealedUsers((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(userId)) {
        newSet.delete(userId);
      } else {
        newSet.add(userId);
      }
      return newSet;
    });
  };

  const handleToggleAdmin = async (userId: number) => {
    try {
      const updatedUser = await adminAPI.toggleAdminStatus(userId);
      setUsers((prev) =>
        prev.map((user) => (user.id === userId ? updatedUser : user))
      );
    } catch (err: any) {
      console.error('Toggle admin error:', err);
      alert(err?.response?.data?.error || 'Failed to toggle admin status');
    }
  };

  const handleDeleteUser = async (userId: number) => {
    try {
      await adminAPI.deleteUser(userId);
      setUsers((prev) => prev.filter((user) => user.id !== userId));
      setDeleteConfirm(null);
    } catch (err: any) {
      console.error('Delete user error:', err);
      alert(err?.response?.data?.error || 'Failed to delete user');
      setDeleteConfirm(null);
    }
  };

  const handleResetUser = async (userId: number) => {
    const user = users.find(u => u.id === userId);
    if (!user) return;

    try {
      setResettingUser(true);
      const result = await adminAPI.resetUser(userId);
      setResetResult({
        username: user.username,
        corporations_deleted: result.corporations_deleted,
        corporation_names: result.corporation_names,
        shareholder_positions_cleared: result.shareholder_positions_cleared,
      });
      // Update user in list to clear their player_name (showing they need profile setup)
      setUsers((prev) => prev.map((u) =>
        u.id === userId ? { ...u, player_name: undefined } : u
      ));
      setResetConfirm(null);
    } catch (err: any) {
      console.error('Reset user error:', err);
      alert(err?.response?.data?.error || 'Failed to reset user');
    } finally {
      setResettingUser(false);
    }
  };

  const loadReportedChats = useCallback(async () => {
    try {
      const data = await adminAPI.getReportedChats(showReviewed);
      setReportedChats(data);
    } catch (err: any) {
      console.error('Load reported chats error:', err);
      alert(err?.response?.data?.error || 'Failed to load reported chats');
    }
  }, [showReviewed]);

  useEffect(() => {
    if (currentUser?.is_admin) {
      loadReportedChats();
    }
  }, [loadReportedChats, currentUser?.is_admin]);

  const handleClearReport = async (reportId: number) => {
    try {
      setClearingReport(reportId);
      await adminAPI.clearReportedChat(reportId);
      await loadReportedChats(); // Reload the list
    } catch (err: any) {
      console.error('Clear report error:', err);
      alert(err?.response?.data?.error || 'Failed to clear report');
    } finally {
      setClearingReport(null);
    }
  };

  const handleRunTurn = async () => {
    try {
      setRunningTurn(true);
      setTurnResult(null);
      const result = await adminAPI.runTurn();
      setTurnResult({
        actions: result.actions,
        market_revenue: result.market_revenue,
        ceo_salaries: result.ceo_salaries,
      });
    } catch (err: any) {
      console.error('Run turn error:', err);
      alert(err?.response?.data?.error || 'Failed to run turn');
    } finally {
      setRunningTurn(false);
    }
  };

  const handleRecalculatePrices = async () => {
    try {
      setRecalculatingPrices(true);
      setPriceResult(null);
      const result = await adminAPI.recalculatePrices();
      setPriceResult({
        corporations_updated: result.corporations_updated,
        changes: result.changes,
      });
    } catch (err: any) {
      console.error('Recalculate prices error:', err);
      alert(err?.response?.data?.error || 'Failed to recalculate prices');
    } finally {
      setRecalculatingPrices(false);
    }
  };

  const refreshGameTime = async () => {
    try {
      const serverTimeData = await gameAPI.getTime();
      const currentGameTime = calculateGameTime(serverTimeData.game_start_date, serverTimeData.server_time);
      setGameTimeInfo({
        current: currentGameTime,
        startDate: serverTimeData.game_start_date,
        serverTime: serverTimeData.server_time,
      });
      setGameYear(currentGameTime.year.toString());
      setGameQuarter(currentGameTime.quarter.toString());
    } catch (err) {
      console.error('Refresh game time error:', err);
    }
  };

  const handleResetGameTime = async () => {
    const parsedYear = parseInt(gameYear, 10);
    const parsedQuarter = parseInt(gameQuarter, 10);

    if (isNaN(parsedYear) || parsedYear < 1900) {
      alert('Please enter a valid year (>= 1900)');
      return;
    }

    if (isNaN(parsedQuarter) || parsedQuarter < 1 || parsedQuarter > 4) {
      alert('Quarter must be between 1 and 4');
      return;
    }

    try {
      setResettingGameTime(true);
      setGameTimeResult(null);
      const result = await adminAPI.setGameTime(parsedYear, parsedQuarter);
      setGameTimeResult(result);
      await refreshGameTime();
    } catch (err: any) {
      console.error('Set game time error:', err);
      alert(err?.response?.data?.error || 'Failed to reset game time');
    } finally {
      setResettingGameTime(false);
    }
  };

  const handleForceStockSplit = async () => {
    const corpId = parseInt(stockSplitCorpId, 10);
    if (isNaN(corpId) || corpId <= 0) {
      alert('Please enter a valid corporation ID');
      return;
    }

    if (!confirm(`Are you sure you want to execute a 2:1 stock split on corporation #${corpId}? This will double all shares and halve the price.`)) {
      return;
    }

    try {
      setRunningSplit(true);
      setSplitResult(null);
      const result = await adminAPI.forceStockSplit(corpId);
      setSplitResult({
        corporation_name: result.corporation_name,
        split_ratio: result.split_ratio,
        before: result.before,
        after: result.after,
        shareholders_updated: result.shareholders_updated,
      });
      setStockSplitCorpId('');
    } catch (err: any) {
      console.error('Force stock split error:', err);
      alert(err?.response?.data?.error || 'Failed to execute stock split');
    } finally {
      setRunningSplit(false);
    }
  };

  const handleForceEndCorpSearch = async (value: string) => {
    setForceEndCorpSearch(value);
    if (value.trim().length < 2) {
      setForceEndCorpResults([]);
      return;
    }

    try {
      const results = await adminAPI.searchCorporations(value);
      setForceEndCorpResults(results);
    } catch (err: any) {
      console.error('Search corporations error:', err);
    }
  };

  const handleForceEndVote = async () => {
    if (!forceEndSelectedCorp) {
      alert('Please select a corporation');
      return;
    }

    const proposalId = parseInt(forceEndProposalId, 10);
    if (isNaN(proposalId) || proposalId <= 0) {
      alert('Please enter a valid proposal ID');
      return;
    }

    if (!confirm(`Are you sure you want to force end proposal #${proposalId} for ${forceEndSelectedCorp.name}? This will immediately expire the vote and it will be resolved in the next cron check.`)) {
      return;
    }

    try {
      setEndingVote(true);
      setForceEndResult(null);
      const result = await adminAPI.forceEndVote(forceEndSelectedCorp.id, proposalId);
      setForceEndResult({
        message: result.message,
        corporation_name: result.corporation_name,
        votes: result.votes,
      });
      setForceEndProposalId('');
    } catch (err: any) {
      console.error('Force end vote error:', err);
      alert(err?.response?.data?.error || 'Failed to force end vote');
    } finally {
      setEndingVote(false);
    }
  };

  const loadTransactions = useCallback(async (page: number = 0) => {
    try {
      setTransactionsLoading(true);
      const result = await adminAPI.getTransactions({
        search: transactionSearch || undefined,
        type: transactionTypeFilter || undefined,
        limit: TRANSACTIONS_PER_PAGE,
        offset: page * TRANSACTIONS_PER_PAGE,
      });
      setTransactions(result.transactions);
      setTransactionsTotal(result.total);
      setTransactionPage(page);
    } catch (err: any) {
      console.error('Load transactions error:', err);
      alert(err?.response?.data?.error || 'Failed to load transactions');
    } finally {
      setTransactionsLoading(false);
    }
  }, [transactionSearch, transactionTypeFilter]);

  // Load transactions when Finance tab is first activated
  useEffect(() => {
    if (activeTab === 'finance' && transactions.length === 0 && !transactionsLoading) {
      loadTransactions(0);
    }
  }, [activeTab, transactions.length, transactionsLoading, loadTransactions]);

  // Cash Management Handlers
  const handleAddCashToAll = async () => {
    const amount = parseFloat(cashAmount);
    if (isNaN(amount) || amount === 0) {
      alert('Please enter a valid non-zero amount');
      return;
    }

    if (!confirm(`Are you sure you want to add $${amount.toLocaleString()} to ALL users?`)) {
      return;
    }

    try {
      setAddingCashToAll(true);
      setCashAllResult(null);
      const result = await adminAPI.addCashToAllUsers(amount);
      setCashAllResult({ users_updated: result.users_updated, amount: result.amount });
      setCashAmount('');
    } catch (err: any) {
      console.error('Add cash to all users error:', err);
      alert(err?.response?.data?.error || 'Failed to add cash to all users');
    } finally {
      setAddingCashToAll(false);
    }
  };

  const handleUserCashSearch = async (value: string) => {
    setUserCashSearch(value);
    if (value.trim().length < 2) {
      setUserCashResults([]);
      return;
    }

    try {
      const results = await adminAPI.searchUsers(value);
      setUserCashResults(results);
    } catch (err: any) {
      console.error('Search users error:', err);
    }
  };

  const handleAddCashToUser = async () => {
    if (!selectedUserForCash) {
      alert('Please select a user');
      return;
    }

    const amount = parseFloat(userCashAmount);
    if (isNaN(amount) || amount === 0) {
      alert('Please enter a valid non-zero amount');
      return;
    }

    try {
      setAddingCashToUser(true);
      setUserCashResult(null);
      const result = await adminAPI.addCashToUser(selectedUserForCash.id, amount);
      setUserCashResult({
        username: result.username,
        player_name: result.player_name,
        old_cash: result.old_cash,
        new_cash: result.new_cash,
        amount: result.amount,
      });
      setUserCashAmount('');
    } catch (err: any) {
      console.error('Add cash to user error:', err);
      alert(err?.response?.data?.error || 'Failed to add cash to user');
    } finally {
      setAddingCashToUser(false);
    }
  };

  // Capital Management Handlers
  const handleAddCapitalToAll = async () => {
    const amount = parseFloat(capitalAmount);
    if (isNaN(amount) || amount === 0) {
      alert('Please enter a valid non-zero amount');
      return;
    }

    if (!confirm(`Are you sure you want to add $${amount.toLocaleString()} capital to ALL corporations?`)) {
      return;
    }

    try {
      setAddingCapitalToAll(true);
      setCapitalAllResult(null);
      const result = await adminAPI.addCapitalToAllCorporations(amount);
      setCapitalAllResult({ corporations_updated: result.corporations_updated, amount: result.amount });
      setCapitalAmount('');
    } catch (err: any) {
      console.error('Add capital to all corporations error:', err);
      alert(err?.response?.data?.error || 'Failed to add capital to all corporations');
    } finally {
      setAddingCapitalToAll(false);
    }
  };

  const handleCorpCapitalSearch = async (value: string) => {
    setCorpCapitalSearch(value);
    if (value.trim().length < 2) {
      setCorpCapitalResults([]);
      return;
    }

    try {
      const results = await adminAPI.searchCorporations(value);
      setCorpCapitalResults(results);
    } catch (err: any) {
      console.error('Search corporations error:', err);
    }
  };

  const handleAddCapitalToCorp = async () => {
    if (!selectedCorpForCapital) {
      alert('Please select a corporation');
      return;
    }

    const amount = parseFloat(corpCapitalAmount);
    if (isNaN(amount) || amount === 0) {
      alert('Please enter a valid non-zero amount');
      return;
    }

    try {
      setAddingCapitalToCorp(true);
      setCorpCapitalResult(null);
      const result = await adminAPI.addCapitalToCorporation(selectedCorpForCapital.id, amount);
      setCorpCapitalResult({
        corporation_name: result.corporation_name,
        old_capital: result.old_capital,
        new_capital: result.new_capital,
        new_share_price: result.new_share_price,
        amount: result.amount,
      });
      setCorpCapitalAmount('');
    } catch (err: any) {
      console.error('Add capital to corporation error:', err);
      alert(err?.response?.data?.error || 'Failed to add capital to corporation');
    } finally {
      setAddingCapitalToCorp(false);
    }
  };

  const handleMigrateManufacturing = async () => {
    if (!confirm('Are you sure you want to migrate all Manufacturing corporations and market entries to Light Industry? This cannot be undone.')) {
      return;
    }

    try {
      setMigratingManufacturing(true);
      setMigrationResult(null);
      const result = await adminAPI.migrateManufacturingToLightIndustry();
      setMigrationResult({
        corporations_updated: result.corporations_updated,
        market_entries_updated: result.market_entries_updated,
        message: result.message,
      });
    } catch (err: any) {
      console.error('Migrate manufacturing error:', err);
      alert(err?.response?.data?.error || 'Failed to migrate manufacturing');
    } finally {
      setMigratingManufacturing(false);
    }
  };

  const getTransactionTypeLabel = (type: TransactionType): string => {
    const labels: Record<TransactionType, string> = {
      corp_revenue: 'Corp Revenue',
      ceo_salary: 'CEO Salary',
      user_transfer: 'Transfer',
      share_purchase: 'Share Purchase',
      share_sale: 'Share Sale',
      share_issue: 'Share Issue',
      market_entry: 'Market Entry',
      unit_build: 'Unit Build',
      corp_founding: 'Corp Founded',
    };
    return labels[type] || type;
  };

  const getTransactionTypeColor = (type: TransactionType): string => {
    const colors: Record<TransactionType, string> = {
      corp_revenue: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
      ceo_salary: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
      user_transfer: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
      share_purchase: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
      share_sale: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
      share_issue: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300',
      market_entry: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-300',
      unit_build: 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300',
      corp_founding: 'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300',
    };
    return colors[type] || 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Find users with matching IP addresses
  const getMatchingIpUsers = () => {
    const ipMap = new Map<string, AdminUser[]>();
    
    users.forEach(user => {
      const ips = [user.registration_ip, user.last_login_ip].filter(Boolean) as string[];
      ips.forEach(ip => {
        if (!ipMap.has(ip)) {
          ipMap.set(ip, []);
        }
        ipMap.get(ip)!.push(user);
      });
    });

    // Filter to only IPs with multiple users
    const matchingIps: { ip: string; users: AdminUser[] }[] = [];
    ipMap.forEach((userList, ip) => {
      if (userList.length > 1) {
        matchingIps.push({ ip, users: userList });
      }
    });

    return matchingIps;
  };

  const matchingIpGroups = getMatchingIpUsers();

  if (loading) {
    return (
      <AppNavigation>
        <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
          <div className="text-lg text-gray-600 dark:text-gray-300">Loading...</div>
        </div>
      </AppNavigation>
    );
  }

  if (error) {
    return (
      <AppNavigation>
        <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
          <div className="text-lg text-red-600 dark:text-red-400">{error}</div>
        </div>
      </AppNavigation>
    );
  }

  return (
    <AppNavigation>
      <div className="min-h-[calc(100vh-4rem)] bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 py-10 px-4">
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm uppercase tracking-wide text-gray-500 dark:text-gray-400">Administration</p>
              <h1 className="text-3xl font-semibold">Admin Panel</h1>
            </div>
            <button
              onClick={() => router.back()}
              className="px-4 py-2 text-sm font-medium rounded-md border border-gray-200 text-gray-700 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
            >
              Go Back
            </button>
          </div>

          {/* Sticky Critical Actions Section */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700/50">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700/60">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Clock className="w-5 h-5 text-corporate-blue" />
                Critical Game Actions
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Most frequently used admin actions
              </p>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex flex-wrap gap-4">
                <button
                  onClick={handleRunTurn}
                  disabled={runningTurn}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {runningTurn ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Play className="w-4 h-4" />
                  )}
                  Run Turn
                </button>
                <button
                  onClick={handleRecalculatePrices}
                  disabled={recalculatingPrices}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md bg-corporate-blue text-white hover:bg-corporate-blue-dark disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {recalculatingPrices ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <RefreshCw className="w-4 h-4" />
                  )}
                  Recalculate Stock Prices
                </button>
              </div>

              {/* Turn Result */}
              {turnResult && (
                <div className="p-4 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800">
                  <h3 className="text-sm font-semibold text-emerald-800 dark:text-emerald-200 mb-2">Turn Completed</h3>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-emerald-600 dark:text-emerald-400">Actions Updated</p>
                      <p className="font-semibold text-emerald-800 dark:text-emerald-200">
                        {turnResult.actions.users_updated} users ({turnResult.actions.ceo_count} CEOs)
                      </p>
                    </div>
                    <div>
                      <p className="text-emerald-600 dark:text-emerald-400">Market Revenue</p>
                      <p className="font-semibold text-emerald-800 dark:text-emerald-200">
                        {turnResult.market_revenue.corporations_processed} corps, ${turnResult.market_revenue.total_profit.toLocaleString()} profit
                      </p>
                    </div>
                    {turnResult.ceo_salaries && (
                      <div>
                        <p className="text-emerald-600 dark:text-emerald-400">CEO Salaries</p>
                        <p className="font-semibold text-emerald-800 dark:text-emerald-200">
                          {turnResult.ceo_salaries.ceos_paid} CEOs, ${turnResult.ceo_salaries.total_paid.toLocaleString()} paid
                          {turnResult.ceo_salaries.salaries_zeroed > 0 && (
                            <span className="text-amber-600 dark:text-amber-400 ml-2">
                              ({turnResult.ceo_salaries.salaries_zeroed} zeroed)
                            </span>
                          )}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Price Recalculation Result */}
              {priceResult && (
                <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                  <h3 className="text-sm font-semibold text-blue-800 dark:text-blue-200 mb-2">
                    Prices Recalculated ({priceResult.corporations_updated} corporations)
                  </h3>
                  <div className="max-h-48 overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="text-xs text-blue-600 dark:text-blue-400 uppercase">
                        <tr>
                          <th className="text-left pb-2">Corporation</th>
                          <th className="text-right pb-2">Old Price</th>
                          <th className="text-right pb-2">New Price</th>
                          <th className="text-right pb-2">Change</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-blue-200 dark:divide-blue-800">
                        {priceResult.changes.map((change) => {
                          const diff = change.new_price - change.old_price;
                          const pctChange = change.old_price > 0 ? ((diff / change.old_price) * 100) : 0;
                          return (
                            <tr key={change.corporation_id}>
                              <td className="py-1 text-blue-800 dark:text-blue-200">{change.name}</td>
                              <td className="py-1 text-right font-mono">${change.old_price.toFixed(2)}</td>
                              <td className="py-1 text-right font-mono">${change.new_price.toFixed(2)}</td>
                              <td className={`py-1 text-right font-mono ${diff >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                                {diff >= 0 ? '+' : ''}{diff.toFixed(2)} ({pctChange.toFixed(1)}%)
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700">
            <button
              onClick={() => handleTabChange('game-control')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'game-control'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              <Play className="w-4 h-4 inline-block mr-1" />
              Game Control
            </button>
            <button
              onClick={() => handleTabChange('finance')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'finance'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              <DollarSign className="w-4 h-4 inline-block mr-1" />
              Finance
            </button>
            <button
              onClick={() => handleTabChange('moderation')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'moderation'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              <Shield className="w-4 h-4 inline-block mr-1" />
              Moderation
            </button>
            <button
              onClick={() => handleTabChange('configuration')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'configuration'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              <Database className="w-4 h-4 inline-block mr-1" />
              Configuration
            </button>
          </div>

          {/* Game Control Tab */}
          {activeTab === 'game-control' && (
            <div className="space-y-6">
              {/* Game Time Reset */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700/50 p-6">
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                      <CalendarClock className="w-4 h-4 text-indigo-500" />
                      Game Time
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Set the in-game calendar to a specific year and quarter.
                    </p>
                  </div>
                  {gameTimeInfo && (
                    <div className="text-xs text-gray-600 dark:text-gray-400 text-right">
                      <p className="font-semibold text-gray-800 dark:text-gray-200">
                        Current: Q{gameTimeInfo.current.quarter} {gameTimeInfo.current.year}
                      </p>
                      <p>Start: {formatDate(gameTimeInfo.startDate)}</p>
                    </div>
                  )}
                </div>
                <div className="grid md:grid-cols-4 gap-3">
                  <div className="md:col-span-2">
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                      Year
                    </label>
                    <input
                      type="number"
                      value={gameYear}
                      onChange={(e) => setGameYear(e.target.value)}
                      placeholder="e.g. 1932"
                      className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-md bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                      Quarter
                    </label>
                    <select
                      value={gameQuarter}
                      onChange={(e) => setGameQuarter(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-md bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="1">Q1</option>
                      <option value="2">Q2</option>
                      <option value="3">Q3</option>
                      <option value="4">Q4</option>
                    </select>
                  </div>
                  <div className="flex items-end">
                    <button
                      onClick={handleResetGameTime}
                      disabled={resettingGameTime || !gameYear}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium rounded-md bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {resettingGameTime ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <CalendarClock className="w-4 h-4" />
                      )}
                      Set Game Time
                    </button>
                  </div>
                </div>
                {gameTimeResult && (
                  <div className="mt-3 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800">
                    <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                      Game time reset to Q{gameTimeResult.game_time.quarter} {gameTimeResult.game_time.year}
                    </p>
                    <p className="text-xs text-emerald-700 dark:text-emerald-300 mt-1">
                      New start date: {formatDate(gameTimeResult.game_start_date)}
                    </p>
                  </div>
                )}
              </div>

              {/* Stock Split Section */}
              <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-4">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Force Stock Split</h3>
                <div className="flex flex-wrap gap-4 items-end">
                  <div className="flex-1 min-w-[200px]">
                    <label htmlFor="stockSplitCorpId" className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                      Corporation ID
                    </label>
                    <input
                      type="number"
                      id="stockSplitCorpId"
                      value={stockSplitCorpId}
                      onChange={(e) => setStockSplitCorpId(e.target.value)}
                      placeholder="Enter corp ID"
                      className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-md bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
                      disabled={runningSplit}
                    />
                  </div>
                  <button
                    onClick={handleForceStockSplit}
                    disabled={runningSplit || !stockSplitCorpId}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {runningSplit ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Scissors className="w-4 h-4" />
                    )}
                    Execute 2:1 Split
                  </button>
                </div>
              </div>

              {/* Stock Split Result */}
              {splitResult && (
                <div className="p-4 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                  <h3 className="text-sm font-semibold text-amber-800 dark:text-amber-200 mb-2">
                    Stock Split Completed: {splitResult.corporation_name}
                  </h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-amber-600 dark:text-amber-400 font-medium mb-1">Before</p>
                      <p className="text-amber-800 dark:text-amber-200">
                        Shares: {splitResult.before.total_shares.toLocaleString()}
                      </p>
                      <p className="text-amber-800 dark:text-amber-200">
                        Price: ${splitResult.before.share_price.toFixed(2)}
                      </p>
                    </div>
                    <div>
                      <p className="text-amber-600 dark:text-amber-400 font-medium mb-1">After ({splitResult.split_ratio})</p>
                      <p className="text-amber-800 dark:text-amber-200">
                        Shares: {splitResult.after.total_shares.toLocaleString()}
                      </p>
                      <p className="text-amber-800 dark:text-amber-200">
                        Price: ${splitResult.after.share_price.toFixed(2)}
                      </p>
                    </div>
                  </div>
                  <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">
                    {splitResult.shareholders_updated} shareholder position{splitResult.shareholders_updated !== 1 ? 's' : ''} updated
                  </p>
                </div>
              )}

              {/* Force End Board Vote Section */}
              <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-4">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Force End Board Vote</h3>
                <div className="space-y-4">
                  {/* Corporation Autocomplete */}
                  <div className="relative">
                    <label htmlFor="forceEndCorpSearch" className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                      Corporation Name
                    </label>
                    <input
                      type="text"
                      id="forceEndCorpSearch"
                      value={forceEndCorpSearch}
                      onChange={(e) => handleForceEndCorpSearch(e.target.value)}
                      placeholder="Type to search corporations..."
                      className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-md bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500"
                      disabled={endingVote}
                    />
                    {forceEndCorpResults.length > 0 && !forceEndSelectedCorp && (
                      <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg max-h-60 overflow-y-auto">
                        {forceEndCorpResults.map((corp) => (
                          <button
                            key={corp.id}
                            onClick={() => {
                              setForceEndSelectedCorp({ id: corp.id, name: corp.name });
                              setForceEndCorpSearch(corp.name);
                              setForceEndCorpResults([]);
                            }}
                            className="w-full px-3 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-sm"
                          >
                            <div className="font-medium text-gray-900 dark:text-gray-100">{corp.name}</div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">ID: {corp.id} | Sector: {corp.sector}</div>
                          </button>
                        ))}
                      </div>
                    )}
                    {forceEndSelectedCorp && (
                      <div className="mt-2 flex items-center justify-between p-2 bg-purple-50 dark:bg-purple-900/20 rounded-md">
                        <span className="text-sm text-purple-800 dark:text-purple-200">
                          Selected: {forceEndSelectedCorp.name} (ID: {forceEndSelectedCorp.id})
                        </span>
                        <button
                          onClick={() => {
                            setForceEndSelectedCorp(null);
                            setForceEndCorpSearch('');
                          }}
                          className="text-xs text-purple-600 dark:text-purple-400 hover:text-purple-800 dark:hover:text-purple-200"
                        >
                          Clear
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Proposal ID Input */}
                  <div>
                    <label htmlFor="forceEndProposalId" className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                      Proposal ID
                    </label>
                    <input
                      type="number"
                      id="forceEndProposalId"
                      value={forceEndProposalId}
                      onChange={(e) => setForceEndProposalId(e.target.value)}
                      placeholder="Enter proposal ID"
                      className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-md bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500"
                      disabled={endingVote}
                    />
                  </div>

                  {/* Force End Button */}
                  <button
                    onClick={handleForceEndVote}
                    disabled={endingVote || !forceEndSelectedCorp || !forceEndProposalId}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium rounded-md bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {endingVote ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Clock className="w-4 h-4" />
                    )}
                    Force End Vote
                  </button>
                </div>
              </div>

              {/* Force End Vote Result */}
              {forceEndResult && (
                <div className="p-4 rounded-lg bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800">
                  <h3 className="text-sm font-semibold text-purple-800 dark:text-purple-200 mb-2">
                    Vote Force-Ended: {forceEndResult.corporation_name}
                  </h3>
                  <p className="text-sm text-purple-700 dark:text-purple-300 mb-2">
                    {forceEndResult.message}
                  </p>
                  <div className="text-sm text-purple-600 dark:text-purple-400">
                    Final Votes: {forceEndResult.votes.aye} Aye, {forceEndResult.votes.nay} Nay ({forceEndResult.votes.total} total)
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Finance Tab */}
          {activeTab === 'finance' && (
            <div className="space-y-6">
              {/* Cash & Capital Management Section */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700/50 mb-6">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700/60">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-emerald-500" />
                Cash & Capital Management
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Add or remove cash from users and capital from corporations
              </p>
            </div>
            <div className="p-6 space-y-6">
              {/* User Cash Section */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-blue-500" />
                  User Cash
                </h3>

                {/* Add Cash to All Users */}
                <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700">
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 uppercase">Add Cash to All Users</p>
                  <div className="flex flex-wrap gap-3 items-end">
                    <div className="flex-1 min-w-[150px]">
                      <label htmlFor="cashAmount" className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                        Amount ($)
                      </label>
                      <input
                        type="number"
                        id="cashAmount"
                        value={cashAmount}
                        onChange={(e) => setCashAmount(e.target.value)}
                        placeholder="e.g. 10000 or -5000"
                        className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-md bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        disabled={addingCashToAll}
                      />
                    </div>
                    <button
                      onClick={handleAddCashToAll}
                      disabled={addingCashToAll || !cashAmount}
                      className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {addingCashToAll ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <DollarSign className="w-4 h-4" />
                      )}
                      Add to All Users
                    </button>
                  </div>
                  {cashAllResult && (
                    <div className="mt-3 p-2 rounded bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800">
                      <p className="text-sm text-emerald-700 dark:text-emerald-300">
                        Added ${cashAllResult.amount.toLocaleString()} to {cashAllResult.users_updated} users
                      </p>
                    </div>
                  )}
                </div>

                {/* Add Cash to Individual User */}
                <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700">
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 uppercase">Add Cash to Individual User</p>
                  <div className="space-y-3">
                    {/* User Search */}
                    <div className="relative">
                      <label htmlFor="userCashSearch" className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                        Search User
                      </label>
                      <input
                        type="text"
                        id="userCashSearch"
                        value={userCashSearch}
                        onChange={(e) => handleUserCashSearch(e.target.value)}
                        placeholder="Type to search users..."
                        className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-md bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        disabled={addingCashToUser}
                      />
                      {userCashResults.length > 0 && !selectedUserForCash && (
                        <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg max-h-60 overflow-y-auto">
                          {userCashResults.map((user) => (
                            <button
                              key={user.id}
                              onClick={() => {
                                setSelectedUserForCash({ id: user.id, username: user.username, player_name: user.player_name });
                                setUserCashSearch(user.player_name || user.username);
                                setUserCashResults([]);
                              }}
                              className="w-full px-3 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-sm flex items-center gap-2"
                            >
                              <img
                                src={user.profile_image_url || '/defaultpfp.jpg'}
                                alt=""
                                className="w-6 h-6 rounded-full object-cover"
                                onError={(e) => { e.currentTarget.src = '/defaultpfp.jpg'; }}
                              />
                              <div>
                                <div className="font-medium text-gray-900 dark:text-gray-100">{user.player_name || user.username}</div>
                                <div className="text-xs text-gray-500 dark:text-gray-400">@{user.username}</div>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                      {selectedUserForCash && (
                        <div className="mt-2 flex items-center justify-between p-2 bg-blue-50 dark:bg-blue-900/20 rounded-md">
                          <span className="text-sm text-blue-800 dark:text-blue-200">
                            Selected: {selectedUserForCash.player_name || selectedUserForCash.username} (ID: {selectedUserForCash.id})
                          </span>
                          <button
                            onClick={() => {
                              setSelectedUserForCash(null);
                              setUserCashSearch('');
                              setUserCashResult(null);
                            }}
                            className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200"
                          >
                            Clear
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Amount & Button */}
                    <div className="flex flex-wrap gap-3 items-end">
                      <div className="flex-1 min-w-[150px]">
                        <label htmlFor="userCashAmount" className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                          Amount ($)
                        </label>
                        <input
                          type="number"
                          id="userCashAmount"
                          value={userCashAmount}
                          onChange={(e) => setUserCashAmount(e.target.value)}
                          placeholder="e.g. 10000 or -5000"
                          className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-md bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          disabled={addingCashToUser}
                        />
                      </div>
                      <button
                        onClick={handleAddCashToUser}
                        disabled={addingCashToUser || !selectedUserForCash || !userCashAmount}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {addingCashToUser ? (
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <DollarSign className="w-4 h-4" />
                        )}
                        Add Cash
                      </button>
                    </div>
                    {userCashResult && (
                      <div className="p-2 rounded bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800">
                        <p className="text-sm text-emerald-700 dark:text-emerald-300">
                          {userCashResult.player_name || userCashResult.username}: ${userCashResult.old_cash.toLocaleString()} → ${userCashResult.new_cash.toLocaleString()} ({userCashResult.amount >= 0 ? '+' : ''}{userCashResult.amount.toLocaleString()})
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Divider */}
              <div className="border-t border-gray-200 dark:border-gray-700"></div>

              {/* Corporation Capital Section */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-amber-500" />
                  Corporation Capital
                </h3>

                {/* Add Capital to All Corporations */}
                <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700">
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 uppercase">Add Capital to All Corporations</p>
                  <div className="flex flex-wrap gap-3 items-end">
                    <div className="flex-1 min-w-[150px]">
                      <label htmlFor="capitalAmount" className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                        Amount ($)
                      </label>
                      <input
                        type="number"
                        id="capitalAmount"
                        value={capitalAmount}
                        onChange={(e) => setCapitalAmount(e.target.value)}
                        placeholder="e.g. 100000 or -50000"
                        className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-md bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
                        disabled={addingCapitalToAll}
                      />
                    </div>
                    <button
                      onClick={handleAddCapitalToAll}
                      disabled={addingCapitalToAll || !capitalAmount}
                      className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {addingCapitalToAll ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <DollarSign className="w-4 h-4" />
                      )}
                      Add to All Corps
                    </button>
                  </div>
                  {capitalAllResult && (
                    <div className="mt-3 p-2 rounded bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800">
                      <p className="text-sm text-emerald-700 dark:text-emerald-300">
                        Added ${capitalAllResult.amount.toLocaleString()} capital to {capitalAllResult.corporations_updated} corporations
                      </p>
                    </div>
                  )}
                </div>

                {/* Add Capital to Individual Corporation */}
                <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700">
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 uppercase">Add Capital to Individual Corporation</p>
                  <div className="space-y-3">
                    {/* Corporation Search */}
                    <div className="relative">
                      <label htmlFor="corpCapitalSearch" className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                        Search Corporation
                      </label>
                      <input
                        type="text"
                        id="corpCapitalSearch"
                        value={corpCapitalSearch}
                        onChange={(e) => handleCorpCapitalSearch(e.target.value)}
                        placeholder="Type to search corporations..."
                        className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-md bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
                        disabled={addingCapitalToCorp}
                      />
                      {corpCapitalResults.length > 0 && !selectedCorpForCapital && (
                        <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg max-h-60 overflow-y-auto">
                          {corpCapitalResults.map((corp) => (
                            <button
                              key={corp.id}
                              onClick={() => {
                                setSelectedCorpForCapital({ id: corp.id, name: corp.name });
                                setCorpCapitalSearch(corp.name);
                                setCorpCapitalResults([]);
                              }}
                              className="w-full px-3 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-sm"
                            >
                              <div className="font-medium text-gray-900 dark:text-gray-100">{corp.name}</div>
                              <div className="text-xs text-gray-500 dark:text-gray-400">ID: {corp.id} | Sector: {corp.sector}</div>
                            </button>
                          ))}
                        </div>
                      )}
                      {selectedCorpForCapital && (
                        <div className="mt-2 flex items-center justify-between p-2 bg-amber-50 dark:bg-amber-900/20 rounded-md">
                          <span className="text-sm text-amber-800 dark:text-amber-200">
                            Selected: {selectedCorpForCapital.name} (ID: {selectedCorpForCapital.id})
                          </span>
                          <button
                            onClick={() => {
                              setSelectedCorpForCapital(null);
                              setCorpCapitalSearch('');
                              setCorpCapitalResult(null);
                            }}
                            className="text-xs text-amber-600 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-200"
                          >
                            Clear
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Amount & Button */}
                    <div className="flex flex-wrap gap-3 items-end">
                      <div className="flex-1 min-w-[150px]">
                        <label htmlFor="corpCapitalAmount" className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                          Amount ($)
                        </label>
                        <input
                          type="number"
                          id="corpCapitalAmount"
                          value={corpCapitalAmount}
                          onChange={(e) => setCorpCapitalAmount(e.target.value)}
                          placeholder="e.g. 100000 or -50000"
                          className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-md bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
                          disabled={addingCapitalToCorp}
                        />
                      </div>
                      <button
                        onClick={handleAddCapitalToCorp}
                        disabled={addingCapitalToCorp || !selectedCorpForCapital || !corpCapitalAmount}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {addingCapitalToCorp ? (
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <DollarSign className="w-4 h-4" />
                        )}
                        Add Capital
                      </button>
                    </div>
                    {corpCapitalResult && (
                      <div className="p-2 rounded bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800">
                        <p className="text-sm text-emerald-700 dark:text-emerald-300">
                          {corpCapitalResult.corporation_name}: ${corpCapitalResult.old_capital.toLocaleString()} → ${corpCapitalResult.new_capital.toLocaleString()} ({corpCapitalResult.amount >= 0 ? '+' : ''}{corpCapitalResult.amount.toLocaleString()})
                        </p>
                        <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">
                          New share price: ${corpCapitalResult.new_share_price.toFixed(2)}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <p className="text-xs text-gray-500 dark:text-gray-400">
                <strong>Note:</strong> Enter positive amounts to add cash/capital, or negative amounts to subtract. Cash/capital cannot go below $0.
              </p>
            </div>
          </div>

          {/* Transactions Section */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700/50">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700/60">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Receipt className="w-5 h-5 text-corporate-blue" />
                Transactions
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {transactionsTotal} total transactions
              </p>
            </div>
            <div className="p-6">
              {/* Filters */}
              <div className="flex flex-wrap gap-4 mb-4">
                <div className="flex-1 min-w-[200px]">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search by user, corporation, or description..."
                      value={transactionSearch}
                      onChange={(e) => setTransactionSearch(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-corporate-blue"
                    />
                  </div>
                </div>
                <select
                  value={transactionTypeFilter}
                  onChange={(e) => setTransactionTypeFilter(e.target.value as TransactionType | '')}
                  className="px-4 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-corporate-blue"
                >
                  <option value="">All Types</option>
                  <option value="corp_revenue">Corp Revenue</option>
                  <option value="ceo_salary">CEO Salary</option>
                  <option value="user_transfer">User Transfer</option>
                  <option value="share_purchase">Share Purchase</option>
                  <option value="share_sale">Share Sale</option>
                  <option value="share_issue">Share Issue</option>
                  <option value="market_entry">Market Entry</option>
                  <option value="unit_build">Unit Build</option>
                  <option value="corp_founding">Corp Founding</option>
                </select>
              </div>

              {/* Transactions Table */}
              {transactionsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="w-6 h-6 border-2 border-corporate-blue border-t-transparent rounded-full animate-spin" />
                </div>
              ) : transactions.length === 0 ? (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  <Receipt className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No transactions found</p>
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="text-xs text-gray-500 dark:text-gray-400 uppercase border-b border-gray-200 dark:border-gray-700">
                        <tr>
                          <th className="text-left py-3 px-2">Date</th>
                          <th className="text-left py-3 px-2">Type</th>
                          <th className="text-right py-3 px-2">Amount</th>
                          <th className="text-left py-3 px-2">From</th>
                          <th className="text-left py-3 px-2">To</th>
                          <th className="text-left py-3 px-2">Description</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60">
                        {transactions.map((tx) => (
                          <tr key={tx.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                            <td className="py-2 px-2 whitespace-nowrap text-gray-600 dark:text-gray-400">
                              {formatDate(tx.created_at)}
                            </td>
                            <td className="py-2 px-2">
                              <span className={`px-2 py-1 text-xs font-medium rounded ${getTransactionTypeColor(tx.transaction_type)}`}>
                                {getTransactionTypeLabel(tx.transaction_type)}
                              </span>
                            </td>
                            <td className={`py-2 px-2 text-right font-mono whitespace-nowrap ${
                              (tx.to_user_id && !tx.from_user_id) || tx.transaction_type === 'corp_revenue' ? 'text-emerald-600 dark:text-emerald-400' : tx.from_user_id && !tx.to_user_id ? 'text-red-600 dark:text-red-400' : 'text-gray-600 dark:text-gray-400'
                            }`}>
                              {(tx.to_user_id && !tx.from_user_id) || tx.transaction_type === 'corp_revenue' ? '+' : tx.from_user_id && !tx.to_user_id ? '-' : ''}
                              ${Math.abs(tx.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                            <td className="py-2 px-2">
                              {tx.from_user ? (
                                <div className="flex items-center gap-2">
                                  <img
                                    src={tx.from_user.profile_image_url || '/defaultpfp.jpg'}
                                    alt=""
                                    className="w-6 h-6 rounded-full object-cover"
                                    onError={(e) => { e.currentTarget.src = '/defaultpfp.jpg'; }}
                                  />
                                  <span className="text-gray-900 dark:text-gray-100">
                                    {tx.from_user.player_name || tx.from_user.username}
                                  </span>
                                </div>
                              ) : tx.corporation ? (
                                <span className="text-gray-600 dark:text-gray-400 italic">
                                  {tx.corporation.name}
                                </span>
                              ) : (
                                <span className="text-gray-400">—</span>
                              )}
                            </td>
                            <td className="py-2 px-2">
                              {tx.to_user ? (
                                <div className="flex items-center gap-2">
                                  <img
                                    src={tx.to_user.profile_image_url || '/defaultpfp.jpg'}
                                    alt=""
                                    className="w-6 h-6 rounded-full object-cover"
                                    onError={(e) => { e.currentTarget.src = '/defaultpfp.jpg'; }}
                                  />
                                  <span className="text-gray-900 dark:text-gray-100">
                                    {tx.to_user.player_name || tx.to_user.username}
                                  </span>
                                </div>
                              ) : tx.corporation && !tx.from_user ? (
                                <span className="text-gray-600 dark:text-gray-400 italic">
                                  {tx.corporation.name}
                                </span>
                              ) : (
                                <span className="text-gray-400">—</span>
                              )}
                            </td>
                            <td className="py-2 px-2 text-gray-600 dark:text-gray-400 max-w-xs truncate">
                              {tx.description || '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination */}
                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Showing {transactionPage * TRANSACTIONS_PER_PAGE + 1} - {Math.min((transactionPage + 1) * TRANSACTIONS_PER_PAGE, transactionsTotal)} of {transactionsTotal} transactions
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => loadTransactions(transactionPage - 1)}
                        disabled={transactionPage === 0}
                        className="px-3 py-1 text-sm font-medium rounded border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Previous
                      </button>
                      <button
                        onClick={() => loadTransactions(transactionPage + 1)}
                        disabled={(transactionPage + 1) * TRANSACTIONS_PER_PAGE >= transactionsTotal}
                        className="px-3 py-1 text-sm font-medium rounded border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
            </div>
          )}

          {/* Moderation Tab */}
          {activeTab === 'moderation' && (
            <div className="space-y-6">
          {/* Reported Chats Section */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700/50">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700/60 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <Flag className="w-5 h-5 text-red-600 dark:text-red-400" />
                  Reported Chats
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {reportedChats.filter(r => !r.reviewed).length} unreviewed report{reportedChats.filter(r => !r.reviewed).length !== 1 ? 's' : ''}
                </p>
              </div>
              <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showReviewed}
                  onChange={(e) => setShowReviewed(e.target.checked)}
                  className="rounded border-gray-300 dark:border-gray-600"
                />
                Show reviewed
              </label>
            </div>

            <div className="divide-y divide-gray-100 dark:divide-gray-700/60">
              {reportedChats.length === 0 ? (
                <div className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                  <Flag className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No reported chats{showReviewed ? '' : ' (unreviewed)'}</p>
                </div>
              ) : (
                reportedChats.map((report) => (
                  <div
                    key={report.id}
                    className={`px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors ${
                      !report.reviewed ? 'bg-red-50/50 dark:bg-red-900/10' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          {!report.reviewed && (
                            <span className="px-2 py-0.5 text-xs font-medium rounded bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300">
                              Unreviewed
                            </span>
                          )}
                          {report.reviewed && (
                            <span className="px-2 py-0.5 text-xs font-medium rounded bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
                              Reviewed
                            </span>
                          )}
                        </div>
                        <div className="grid md:grid-cols-2 gap-4 mb-3">
                          <div>
                            <p className="text-xs uppercase text-gray-500 dark:text-gray-400 font-semibold mb-1">
                              Reporter
                            </p>
                            <div className="flex items-center gap-2">
                              <img
                                src={normalizeImageUrl(report.reporter?.profile_image_url)}
                                alt={report.reporter?.username}
                                className="w-8 h-8 rounded-full object-cover"
                                onError={(e) => {
                                  e.currentTarget.src = '/defaultpfp.jpg';
                                }}
                              />
                              <div>
                                <Link
                                  href={`/profile/${report.reporter?.profile_id}`}
                                  className="font-medium text-gray-900 dark:text-white hover:text-corporate-blue"
                                >
                                  {report.reporter?.player_name || report.reporter?.username}
                                </Link>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                  @{report.reporter?.username}
                                </p>
                              </div>
                            </div>
                          </div>
                          <div>
                            <p className="text-xs uppercase text-gray-500 dark:text-gray-400 font-semibold mb-1">
                              Reported User
                            </p>
                            <div className="flex items-center gap-2">
                              <img
                                src={normalizeImageUrl(report.reported_user?.profile_image_url)}
                                alt={report.reported_user?.username}
                                className="w-8 h-8 rounded-full object-cover"
                                onError={(e) => {
                                  e.currentTarget.src = '/defaultpfp.jpg';
                                }}
                              />
                              <div>
                                <Link
                                  href={`/profile/${report.reported_user?.profile_id}`}
                                  className="font-medium text-gray-900 dark:text-white hover:text-corporate-blue"
                                >
                                  {report.reported_user?.player_name || report.reported_user?.username}
                                </Link>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                  @{report.reported_user?.username}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                        {report.reason && (
                          <div className="mb-3">
                            <p className="text-xs uppercase text-gray-500 dark:text-gray-400 font-semibold mb-1">
                              Reason
                            </p>
                            <p className="text-sm text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-900/50 p-2 rounded">
                              {report.reason}
                            </p>
                          </div>
                        )}
                        <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400 mb-2">
                          <span>Reported: {formatDate(report.created_at)}</span>
                          {report.reviewed && report.reviewed_at && (
                            <span>Reviewed: {formatDate(report.reviewed_at)}</span>
                          )}
                          {report.reviewed_by_user && (
                            <span>By: {report.reviewed_by_user.player_name || report.reviewed_by_user.username}</span>
                          )}
                        </div>
                        {report.reporter_id && report.reported_user_id && (
                          <div className="mt-2">
                            <Link
                              href={`/admin/conversation?userId1=${report.reporter_id}&userId2=${report.reported_user_id}`}
                              className="inline-flex items-center gap-2 text-sm text-corporate-blue hover:text-corporate-blue-dark font-medium"
                            >
                              <MessageSquare className="w-4 h-4" />
                              View Conversation
                            </Link>
                          </div>
                        )}
                      </div>
                      {!report.reviewed && (
                        <button
                          onClick={() => handleClearReport(report.id)}
                          disabled={clearingReport === report.id}
                          className="p-2 rounded-md text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors disabled:opacity-50"
                          title="Mark as reviewed"
                        >
                          {clearingReport === report.id ? (
                            <div className="w-5 h-5 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <CheckCircle2 className="w-5 h-5" />
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Matching IP Addresses Section */}
          {matchingIpGroups.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700/50">
              <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700/60">
                <h2 className="text-lg font-semibold">Matching IP Addresses</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {matchingIpGroups.length} IP{matchingIpGroups.length !== 1 ? 's' : ''} with multiple users
                </p>
              </div>
              <div className="divide-y divide-gray-100 dark:divide-gray-700/60">
                  {matchingIpGroups.map((group) => (
                    <div key={group.ip} className="p-6">
                      <div className="mb-4">
                        <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                          IP Address: <span className="font-mono text-corporate-blue">{group.ip}</span>
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {group.users.length} user{group.users.length !== 1 ? 's' : ''} with this IP
                        </p>
                      </div>
                      <div className="space-y-3">
                        {group.users.map((user) => {
                          const isRevealed = revealedUsers.has(user.id);
                          const isCurrentUser = currentUser?.id === user.id;

                          return (
                            <div
                              key={user.id}
                              className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-700"
                            >
                              <div className="flex items-start justify-between gap-4">
                                <div className="flex-1">
                                  <div className="flex items-center gap-3 mb-2">
                                    <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-100 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
                                      <img
                                        src={normalizeImageUrl(user.profile_image_url)}
                                        alt={user.username}
                                        className="w-full h-full object-cover"
                                        onError={(e) => {
                                          e.currentTarget.src = '/defaultpfp.jpg';
                                        }}
                                      />
                                    </div>
                                    <div>
                                      <div className="flex items-center gap-2">
                                        <h3 className="text-base font-semibold">{user.username}</h3>
                                        {isCurrentUser && (
                                          <span className="px-2 py-0.5 text-xs font-medium rounded bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                                            You
                                          </span>
                                        )}
                                      </div>
                                      {user.player_name && (
                                        <p className="text-sm text-gray-600 dark:text-gray-400">{user.player_name}</p>
                                      )}
                                    </div>
                                  </div>
                                  <div className="grid grid-cols-2 gap-2 text-xs">
                                    <div>
                                      <span className="text-gray-500 dark:text-gray-400">Reg IP: </span>
                                      <span className="font-mono">{user.registration_ip || 'N/A'}</span>
                                    </div>
                                    <div>
                                      <span className="text-gray-500 dark:text-gray-400">Last IP: </span>
                                      <span className="font-mono">{user.last_login_ip || 'N/A'}</span>
                                    </div>
                                  </div>
                                </div>
                                {!isCurrentUser && (
                                  <div className="flex flex-col gap-2">
                                    <button
                                      onClick={() => handleToggleAdmin(user.id)}
                                      className="p-1.5 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                                      title={user.is_admin ? 'Remove admin' : 'Make admin'}
                                    >
                                      {user.is_admin ? (
                                        <ShieldOff className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                                      ) : (
                                        <Shield className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                                      )}
                                    </button>
                                    <button
                                      onClick={() => setDeleteConfirm(user.id)}
                                      className="p-1.5 rounded-md text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                      title="Delete user"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
            </div>
          )}

          {/* All Users Section */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700/50">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700/60">
              <h2 className="text-lg font-semibold">All Users</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {users.length} total user{users.length !== 1 ? 's' : ''}
              </p>
            </div>
            <div className="divide-y divide-gray-100 dark:divide-gray-700/60">
              {users.map((user) => {
                const isRevealed = revealedUsers.has(user.id);
                const isCurrentUser = currentUser?.id === user.id;

                return (
                  <div
                    key={user.id}
                    className="px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-100 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
                            <img
                              src={normalizeImageUrl(user.profile_image_url)}
                              alt={user.username}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.currentTarget.src = '/defaultpfp.jpg';
                              }}
                            />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="text-lg font-semibold">{user.username}</h3>
                              {isCurrentUser && (
                                <span className="px-2 py-0.5 text-xs font-medium rounded bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                                  You
                                </span>
                              )}
                            </div>
                            {user.player_name && (
                              <p className="text-sm text-gray-600 dark:text-gray-400">{user.player_name}</p>
                            )}
                          </div>
                        </div>

                        <div className="grid md:grid-cols-2 gap-4 mt-4">
                          <div>
                            <p className="text-xs uppercase text-gray-500 dark:text-gray-400 font-semibold mb-1">
                              Status
                            </p>
                            <div className="flex items-center gap-2">
                              <span
                                className={`px-2 py-1 text-xs font-medium rounded ${
                                  user.is_admin
                                    ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300'
                                    : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                                }`}
                              >
                                {user.is_admin ? 'Admin' : 'Viewer'}
                              </span>
                            </div>
                          </div>

                          <div>
                            <p className="text-xs uppercase text-gray-500 dark:text-gray-400 font-semibold mb-1">
                              Viewer Admin
                            </p>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium">
                                {user.is_admin ? 'Yes' : 'No'}
                              </span>
                              {!isCurrentUser && (
                                <button
                                  onClick={() => handleToggleAdmin(user.id)}
                                  className="p-1.5 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                                  title={user.is_admin ? 'Remove admin' : 'Make admin'}
                                >
                                  {user.is_admin ? (
                                    <ShieldOff className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                                  ) : (
                                    <Shield className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                                  )}
                                </button>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="mt-4 relative">
                          <button
                            onClick={() => toggleReveal(user.id)}
                            className="w-full text-left"
                          >
                            <div className="flex items-center gap-2 mb-2">
                              <p className="text-xs uppercase text-gray-500 dark:text-gray-400 font-semibold">
                                Signals
                              </p>
                              {isRevealed ? (
                                <EyeOff className="w-3 h-3 text-gray-400" />
                              ) : (
                                <Eye className="w-3 h-3 text-gray-400" />
                              )}
                            </div>
                          </button>

                          <div className="relative">
                            {!isRevealed && (
                              <div 
                                onClick={() => toggleReveal(user.id)}
                                className="absolute inset-0 bg-white/90 dark:bg-gray-800/90 backdrop-blur-md rounded-lg z-10 flex items-center justify-center cursor-pointer border border-gray-200/50 dark:border-gray-700/50 shadow-sm"
                              >
                                <div className="flex items-center gap-2">
                                  <Eye className="w-4 h-4 text-gray-400" />
                                  <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Click to reveal</span>
                                </div>
                              </div>
                            )}
                            <div
                              className={`grid md:grid-cols-2 gap-4 p-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/50 transition-all ${
                                isRevealed ? 'opacity-100' : 'opacity-30 blur-sm'
                              }`}
                            >
                              <div>
                                <p className="text-xs uppercase text-gray-500 dark:text-gray-400 font-semibold mb-1">
                                  Registration IP
                                </p>
                                <p className="text-sm font-mono text-gray-900 dark:text-gray-100">
                                  {user.registration_ip || 'N/A'}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs uppercase text-gray-500 dark:text-gray-400 font-semibold mb-1">
                                  Last IP
                                </p>
                                <p className="text-sm font-mono text-gray-900 dark:text-gray-100">
                                  {user.last_login_ip || 'N/A'}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {!isCurrentUser && (
                        <div className="flex flex-col gap-2">
                          <button
                            onClick={() => setResetConfirm(user.id)}
                            className="p-2 rounded-md text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors"
                            title="Reset user and delete corporations"
                          >
                            <RotateCcw className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => setDeleteConfirm(user.id)}
                            className="p-2 rounded-md text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                            title="Delete user"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
            </div>
          )}

          {/* Configuration Tab */}
          {activeTab === 'configuration' && (
            <div className="space-y-6">
          {/* Sector Configuration Section */}
          <SectorConfigPanel />

          {/* Data Migrations Section */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700/50">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700/60">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Database className="w-5 h-5 text-purple-500" />
                Data Migrations
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                One-time data migrations for fixing legacy data
              </p>
            </div>
            <div className="p-6 space-y-4">
              <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 uppercase">Migrate Manufacturing to Light Industry</p>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                  Updates all corporations and market entries with sector &quot;Manufacturing&quot; to &quot;Light Industry&quot;
                </p>
                <button
                  onClick={handleMigrateManufacturing}
                  disabled={migratingManufacturing}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {migratingManufacturing ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <ArrowRight className="w-4 h-4" />
                  )}
                  Run Migration
                </button>
                {migrationResult && (
                  <div className="mt-3 p-2 rounded bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800">
                    <p className="text-sm text-emerald-700 dark:text-emerald-300">{migrationResult.message}</p>
                    <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">
                      Corporations updated: {migrationResult.corporations_updated} | Market entries updated: {migrationResult.market_entries_updated}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
            </div>
          )}
        </div>
      </div>

      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 p-6 max-w-md mx-4">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
              <h3 className="text-lg font-semibold">Confirm Deletion</h3>
            </div>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Are you sure you want to delete this user? This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 text-sm font-medium rounded-md border border-gray-200 text-gray-700 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteUser(deleteConfirm)}
                className="px-4 py-2 text-sm font-medium rounded-md bg-red-600 text-white hover:bg-red-700"
              >
                Delete User
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reset User Confirmation Modal */}
      {resetConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 p-6 max-w-lg mx-4">
            <div className="flex items-center gap-3 mb-4">
              <RotateCcw className="w-6 h-6 text-amber-600 dark:text-amber-400" />
              <h3 className="text-lg font-semibold">Reset User & Delete Corporations</h3>
            </div>
            <div className="space-y-3 mb-6">
              <p className="text-gray-600 dark:text-gray-400">
                This will reset the user&apos;s account while keeping their login credentials. The following will happen:
              </p>
              <ul className="text-sm text-gray-600 dark:text-gray-400 list-disc list-inside space-y-1">
                <li>All corporations they founded will be <strong className="text-red-600 dark:text-red-400">permanently deleted</strong></li>
                <li>All their shareholder positions in other companies will be removed</li>
                <li>Their profile will be cleared (name, bio, avatar)</li>
                <li>Their cash will be reset to $500,000</li>
                <li>They will be prompted to recreate their profile on next login</li>
              </ul>
              <p className="text-sm text-amber-600 dark:text-amber-400 font-medium">
                This action cannot be undone. The user will be notified via system message.
              </p>
            </div>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setResetConfirm(null)}
                disabled={resettingUser}
                className="px-4 py-2 text-sm font-medium rounded-md border border-gray-200 text-gray-700 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-700 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={() => handleResetUser(resetConfirm)}
                disabled={resettingUser}
                className="px-4 py-2 text-sm font-medium rounded-md bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-50 flex items-center gap-2"
              >
                {resettingUser && (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                )}
                Reset User
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reset Result Modal */}
      {resetResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 p-6 max-w-lg mx-4">
            <div className="flex items-center gap-3 mb-4">
              <CheckCircle2 className="w-6 h-6 text-green-600 dark:text-green-400" />
              <h3 className="text-lg font-semibold">User Reset Complete</h3>
            </div>
            <div className="space-y-3 mb-6">
              <p className="text-gray-600 dark:text-gray-400">
                <strong>{resetResult.username}</strong> has been reset successfully.
              </p>
              <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Corporations deleted:</span>
                  <span className="font-medium">{resetResult.corporations_deleted}</span>
                </div>
                {resetResult.corporation_names.length > 0 && (
                  <div className="text-gray-500 dark:text-gray-400">
                    <span className="block mb-1">Deleted corporations:</span>
                    <ul className="list-disc list-inside text-gray-600 dark:text-gray-300">
                      {resetResult.corporation_names.map((name, i) => (
                        <li key={i}>{name}</li>
                      ))}
                    </ul>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Shareholder positions cleared:</span>
                  <span className="font-medium">{resetResult.shareholder_positions_cleared}</span>
                </div>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                The user has been notified via system message and will be prompted to set up their profile again on their next login.
              </p>
            </div>
            <div className="flex justify-end">
              <button
                onClick={() => setResetResult(null)}
                className="px-4 py-2 text-sm font-medium rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </AppNavigation>
  );
}


