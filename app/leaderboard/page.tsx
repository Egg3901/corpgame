"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import AppNavigation from '@/components/AppNavigation';
import { leaderboardAPI, LeaderboardResponse, LeaderboardEntry, normalizeImageUrl } from '@/lib/api';
import { getErrorMessage, formatCash } from '@/lib/utils';
import { Trophy, Medal, ChevronLeft, ChevronRight, User, Crown } from 'lucide-react';

export default function LeaderboardPage() {
  const router = useRouter();
  const [leaderboard, setLeaderboard] = useState<LeaderboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const limit = 25;

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          router.push('/login');
          return;
        }

        setLoading(true);
        const data = await leaderboardAPI.get({ page, limit });
        setLeaderboard(data);
      } catch (err: unknown) {
        console.error('Failed to fetch leaderboard:', err);

        if (typeof err === 'object' && err !== null && 'response' in err) {
          const errWithResponse = err as { response?: { status?: number } };
          if (errWithResponse.response?.status === 401) {
            router.push('/login');
            return;
          }
        }

        setError(getErrorMessage(err, 'Failed to load leaderboard'));
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboard();
  }, [router, page]);

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Crown className="w-6 h-6 text-yellow-500 dark:text-yellow-400 bloomberg:text-bloomberg-orange" />;
    if (rank === 2) return <Medal className="w-6 h-6 text-gray-500 dark:text-gray-300 bloomberg:text-bloomberg-green-dim" />;
    if (rank === 3) return <Medal className="w-6 h-6 text-amber-600 dark:text-amber-400 bloomberg:text-bloomberg-orange" />;
    return null;
  };

  const getRankStyle = (rank: number) => {
    if (rank === 1) return 'bg-gradient-to-r from-yellow-50 to-yellow-100/50 dark:from-yellow-900/20 dark:to-yellow-800/10 bloomberg:from-bloomberg-orange/10 bloomberg:to-bloomberg-orange/5 border-yellow-300 dark:border-yellow-700/50 bloomberg:border-bloomberg-orange/50';
    if (rank === 2) return 'bg-gradient-to-r from-gray-50 to-gray-100/50 dark:from-gray-800/30 dark:to-gray-700/20 bloomberg:from-bloomberg-green/10 bloomberg:to-bloomberg-green/5 border-gray-300 dark:border-gray-600/50 bloomberg:border-bloomberg-green/30';
    if (rank === 3) return 'bg-gradient-to-r from-amber-50 to-amber-100/50 dark:from-amber-900/20 dark:to-amber-800/10 bloomberg:from-bloomberg-orange/10 bloomberg:to-bloomberg-orange/5 border-amber-300 dark:border-amber-700/50 bloomberg:border-bloomberg-orange/30';
    return '';
  };

  const totalPages = leaderboard ? Math.ceil(leaderboard.total / limit) : 0;

  if (loading) {
    return (
      <AppNavigation>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-lg text-content-secondary">Loading leaderboard...</div>
        </div>
      </AppNavigation>
    );
  }

  if (error) {
    return (
      <AppNavigation>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-xl text-status-error">{error}</div>
        </div>
      </AppNavigation>
    );
  }

  if (!leaderboard) {
    return (
      <AppNavigation>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-lg text-content-secondary">No leaderboard data</div>
        </div>
      </AppNavigation>
    );
  }

  const renderEntry = (entry: LeaderboardEntry, isViewer: boolean = false) => (
    <Link
      key={entry.user_id}
      href={`/profile/${entry.profile_id}`}
      className={`group block relative transition-all duration-200 ease-out ${isViewer ? 'ring-2 ring-corporate-blue dark:ring-corporate-blue-light rounded-lg' : ''}`}
    >
      <div className={`
        relative px-6 py-4 transition-all duration-200 ease-out
        ${getRankStyle(entry.rank)}
        ${!getRankStyle(entry.rank) && (entry.rank % 2 === 0
          ? 'bg-white/40 dark:bg-gray-900/30 bloomberg:bg-transparent'
          : 'bg-gray-50/30 dark:bg-gray-800/20 bloomberg:bg-bloomberg-green/5'
        )}
        group-hover:bg-gradient-to-r group-hover:from-corporate-blue/10 group-hover:to-corporate-blue-light/5
        dark:group-hover:from-corporate-blue/15 dark:group-hover:to-corporate-blue-dark/10
        bloomberg:group-hover:from-bloomberg-green/15 bloomberg:group-hover:to-bloomberg-green/5
        group-hover:shadow-lg border-l-4 border-transparent group-hover:border-corporate-blue bloomberg:group-hover:border-bloomberg-green
      `}>
        <div className="relative flex items-center gap-4 sm:gap-6">
          {/* Rank */}
          <div className="flex-shrink-0 w-12 sm:w-16 flex items-center justify-center">
            {getRankIcon(entry.rank) || (
              <span className="text-2xl font-bold text-content-tertiary font-mono">
                {entry.rank}
              </span>
            )}
          </div>

          {/* Avatar */}
          <div className="flex-shrink-0">
            {entry.profile_image_url ? (
              <img
                src={normalizeImageUrl(entry.profile_image_url)}
                alt={entry.player_name || entry.username}
                className="w-12 h-12 rounded-full object-cover ring-2 ring-line-subtle group-hover:ring-corporate-blue/50 bloomberg:group-hover:ring-bloomberg-green/50 transition-all shadow-md"
                onError={(e) => {
                  e.currentTarget.src = '/defaultpfp.jpg';
                }}
              />
            ) : (
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-800 bloomberg:from-bloomberg-green/20 bloomberg:to-bloomberg-green/10 flex items-center justify-center ring-2 ring-line-subtle shadow-md">
                <User className="w-6 h-6 text-content-tertiary" />
              </div>
            )}
          </div>

          {/* Player Info */}
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-bold text-content-primary group-hover:text-corporate-blue dark:group-hover:text-corporate-blue-light bloomberg:group-hover:text-bloomberg-green transition-colors truncate">
              {entry.player_name || entry.username}
            </h3>
            {entry.player_name && (
              <p className="text-sm text-content-tertiary truncate">@{entry.username}</p>
            )}
          </div>

          {/* Net Worth */}
          <div className="flex-shrink-0 text-right">
            <p className="text-xs font-bold uppercase tracking-[0.1em] text-content-tertiary mb-1 hidden sm:block">Net Worth</p>
            <p className={`text-xl sm:text-2xl font-bold font-mono ${
              entry.rank === 1 ? 'text-yellow-600 dark:text-yellow-400 bloomberg:text-bloomberg-orange' :
              entry.rank === 2 ? 'text-gray-600 dark:text-gray-300 bloomberg:text-bloomberg-green' :
              entry.rank === 3 ? 'text-amber-600 dark:text-amber-400 bloomberg:text-bloomberg-orange' :
              'text-corporate-blue dark:text-corporate-blue-light bloomberg:text-bloomberg-green'
            }`}>
              {formatCash(entry.net_worth)}
            </p>
          </div>
        </div>
      </div>
    </Link>
  );

  return (
    <AppNavigation>
      <div className="relative mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-10 space-y-6">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-2">
            <Trophy className="w-10 h-10 text-yellow-500 dark:text-yellow-400 bloomberg:text-bloomberg-orange" />
            <h1 className="text-4xl font-bold text-content-primary">Leaderboard</h1>
          </div>
          <p className="text-content-secondary">Top players ranked by net worth</p>
        </div>

        {/* Viewer Card (if not in visible results) */}
        {leaderboard.viewer_entry && !leaderboard.entries.find(e => e.user_id === leaderboard.viewer_entry?.user_id) && (
          <div className="relative rounded-2xl border-2 border-corporate-blue/50 dark:border-corporate-blue-light/50 bloomberg:border-bloomberg-green/50 bg-gradient-to-br from-corporate-blue/5 via-white to-corporate-blue-light/5 dark:from-corporate-blue/10 dark:via-gray-900 dark:to-corporate-blue-dark/10 bloomberg:from-bloomberg-green/10 bloomberg:via-black bloomberg:to-bloomberg-green/5 shadow-xl overflow-hidden backdrop-blur-sm mb-6">
            <div className="px-4 py-2 bg-corporate-blue/10 dark:bg-corporate-blue/20 bloomberg:bg-bloomberg-green/10 border-b border-corporate-blue/20 bloomberg:border-bloomberg-green/20">
              <p className="text-sm font-semibold text-corporate-blue dark:text-corporate-blue-light bloomberg:text-bloomberg-green">Your Ranking</p>
            </div>
            {renderEntry(leaderboard.viewer_entry, true)}
          </div>
        )}

        {/* Leaderboard List */}
        {leaderboard.entries.length === 0 ? (
          <div className="rounded-xl border border-line-subtle bg-surface-1 backdrop-blur shadow-xl p-12 text-center">
            <Trophy className="w-16 h-16 text-content-tertiary mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-content-primary mb-2">No Players Yet</h2>
            <p className="text-content-secondary">
              Be the first to climb the leaderboard!
            </p>
          </div>
        ) : (
          <div className="relative rounded-2xl border border-line-subtle bg-gradient-to-br from-white via-white to-gray-50/50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800/50 bloomberg:from-black bloomberg:via-black bloomberg:to-bloomberg-green/5 shadow-2xl overflow-hidden backdrop-blur-sm">
            <div className="absolute inset-0 bg-gradient-to-br from-corporate-blue/5 via-transparent to-corporate-blue-light/5 dark:from-corporate-blue/10 dark:via-transparent dark:to-corporate-blue-dark/10 bloomberg:from-bloomberg-green/10 bloomberg:via-transparent bloomberg:to-bloomberg-green/5 pointer-events-none" />
            <div className="absolute inset-0 ring-1 ring-inset ring-white/20 dark:ring-gray-700/30 bloomberg:ring-bloomberg-green/20 pointer-events-none" />
            <div className="relative divide-y divide-line-subtle">
              {leaderboard.entries.map((entry) => renderEntry(entry, entry.user_id === leaderboard.viewer_entry?.user_id))}
            </div>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-4 pt-4">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="flex items-center gap-1 px-4 py-2 rounded-lg bg-surface-1 border border-line-subtle text-content-secondary font-medium hover:bg-surface-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
            >
              <ChevronLeft className="w-4 h-4" />
              Previous
            </button>
            <span className="text-content-secondary font-medium">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="flex items-center gap-1 px-4 py-2 rounded-lg bg-surface-1 border border-line-subtle text-content-secondary font-medium hover:bg-surface-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Total Count */}
        <div className="text-center text-sm text-content-tertiary">
          {leaderboard.total} player{leaderboard.total !== 1 ? 's' : ''} ranked
        </div>
      </div>
    </AppNavigation>
  );
}
