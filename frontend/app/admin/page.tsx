'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2, Shield, ShieldOff, Eye, EyeOff, AlertTriangle, Flag, CheckCircle2, X, ChevronDown, ChevronUp, MessageSquare, Play, RefreshCw, DollarSign, Clock, Receipt, Search, ArrowUpRight, ArrowDownLeft, Scissors, CalendarClock } from 'lucide-react';
import AppNavigation from '@/components/AppNavigation';
import { authAPI, adminAPI, AdminUser, ReportedChat, Transaction, TransactionType, normalizeImageUrl, gameAPI, AdminGameTimeResetResponse } from '@/lib/api';
import Link from 'next/link';
import { calculateGameTime, GameTime } from '@/lib/gameTime';

export default function AdminPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [revealedUsers, setRevealedUsers] = useState<Set<number>>(new Set());
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reportedChats, setReportedChats] = useState<ReportedChat[]>([]);
  const [showReviewed, setShowReviewed] = useState(false);
  const [clearingReport, setClearingReport] = useState<number | null>(null);
  const [matchingIpUsersExpanded, setMatchingIpUsersExpanded] = useState(false);
  const [allUsersExpanded, setAllUsersExpanded] = useState(false);
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
  // Transactions state
  const [transactionsExpanded, setTransactionsExpanded] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [transactionsLoading, setTransactionsLoading] = useState(false);
  const [transactionsTotal, setTransactionsTotal] = useState(0);
  const [transactionSearch, setTransactionSearch] = useState('');
  const [transactionTypeFilter, setTransactionTypeFilter] = useState<TransactionType | ''>('');
  const [transactionPage, setTransactionPage] = useState(0);
  const TRANSACTIONS_PER_PAGE = 20;

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

  const loadReportedChats = async () => {
    try {
      const data = await adminAPI.getReportedChats(showReviewed);
      setReportedChats(data);
    } catch (err: any) {
      console.error('Load reported chats error:', err);
      alert(err?.response?.data?.error || 'Failed to load reported chats');
    }
  };

  useEffect(() => {
    if (currentUser?.is_admin) {
      loadReportedChats();
    }
  }, [showReviewed, currentUser?.is_admin]);

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

  const loadTransactions = async (page: number = 0) => {
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
  };

  // Load transactions when expanded or filters change
  useEffect(() => {
    if (transactionsExpanded && currentUser?.is_admin) {
      loadTransactions(0);
    }
  }, [transactionsExpanded, transactionSearch, transactionTypeFilter, currentUser?.is_admin]);

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
              <h1 className="text-3xl font-semibold">User Panel</h1>
            </div>
            <button
              onClick={() => router.back()}
              className="px-4 py-2 text-sm font-medium rounded-md border border-gray-200 text-gray-700 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
            >
              Go Back
            </button>
          </div>

          {/* Game Actions Section */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700/50 mb-6">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700/60">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Clock className="w-5 h-5 text-corporate-blue" />
                Game Actions
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Manually trigger game events and recalculations
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

              {/* Game Time Reset */}
              <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-4">
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

              <p className="text-xs text-gray-500 dark:text-gray-400">
                <strong>Run Turn:</strong> Triggers hourly actions (+2 for all, +1 extra for CEOs), processes market revenue, and pays CEO salaries. Stock prices update automatically.
                <br />
                <strong>Recalculate Prices:</strong> Forces recalculation of all stock prices based on current book value (80%) and trade history (20%).
                <br />
                <strong>Set Game Time:</strong> Resets the in-game calendar to the chosen year and quarter (1 real day = 1 quarter).
                <br />
                <strong>Force Stock Split:</strong> Executes a 2:1 stock split on a corporation (doubles shares, halves price). Use with caution.
              </p>
            </div>
          </div>

          {/* Transactions Section */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700/50 mb-6">
            <button
              onClick={() => setTransactionsExpanded(!transactionsExpanded)}
              className="w-full px-6 py-4 border-b border-gray-100 dark:border-gray-700/60 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors"
            >
              <div>
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <Receipt className="w-5 h-5 text-corporate-blue" />
                  Transactions
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  View all money movements in the system
                </p>
              </div>
              {transactionsExpanded ? (
                <ChevronUp className="w-5 h-5 text-gray-400" />
              ) : (
                <ChevronDown className="w-5 h-5 text-gray-400" />
              )}
            </button>

            {transactionsExpanded && (
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
            )}
          </div>

          {/* Reported Chats Section */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700/50 mb-6">
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
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700/50 mb-6">
              <button
                onClick={() => setMatchingIpUsersExpanded(!matchingIpUsersExpanded)}
                className="w-full px-6 py-4 border-b border-gray-100 dark:border-gray-700/60 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors"
              >
                <div>
                  <h2 className="text-lg font-semibold">Matching IP Addresses</h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {matchingIpGroups.length} IP{matchingIpGroups.length !== 1 ? 's' : ''} with multiple users
                  </p>
                </div>
                {matchingIpUsersExpanded ? (
                  <ChevronUp className="w-5 h-5 text-gray-400" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-gray-400" />
                )}
              </button>

              {matchingIpUsersExpanded && (
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
              )}
            </div>
          )}

          {/* All Users Section */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700/50">
            <button
              onClick={() => setAllUsersExpanded(!allUsersExpanded)}
              className="w-full px-6 py-4 border-b border-gray-100 dark:border-gray-700/60 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors"
            >
              <div>
                <h2 className="text-lg font-semibold">All Users</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {users.length} total user{users.length !== 1 ? 's' : ''}
                </p>
              </div>
              {allUsersExpanded ? (
                <ChevronUp className="w-5 h-5 text-gray-400" />
              ) : (
                <ChevronDown className="w-5 h-5 text-gray-400" />
              )}
            </button>

            {allUsersExpanded && (
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
            )}
          </div>
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
    </AppNavigation>
  );
}


