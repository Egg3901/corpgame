'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2, Shield, ShieldOff, Eye, EyeOff, AlertTriangle, Flag, CheckCircle2, X } from 'lucide-react';
import AppNavigation from '@/components/AppNavigation';
import { authAPI, adminAPI, AdminUser, ReportedChat, normalizeImageUrl } from '@/lib/api';
import Link from 'next/link';

export default function AdminPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [revealedUsers, setRevealedUsers] = useState<Set<number>>(new Set());
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

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

        const [allUsers, reportedChatsData] = await Promise.all([
          adminAPI.getAllUsers(),
          adminAPI.getReportedChats(false), // Only get unreviewed by default
        ]);
        setUsers(allUsers);
        setReportedChats(reportedChatsData);
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
                        <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                          <span>Reported: {formatDate(report.created_at)}</span>
                          {report.reviewed && report.reviewed_at && (
                            <span>Reviewed: {formatDate(report.reviewed_at)}</span>
                          )}
                          {report.reviewed_by_user && (
                            <span>By: {report.reviewed_by_user.player_name || report.reviewed_by_user.username}</span>
                          )}
                        </div>
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

          {/* Users Section */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700/50">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700/60">
              <h2 className="text-lg font-semibold">Users</h2>
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
