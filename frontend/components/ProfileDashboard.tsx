'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import AppNavigation from '@/components/AppNavigation';
import {
  User as UserIcon,
  Building2,
  TrendingUp,
  DollarSign,
  PieChart,
  BarChart3,
  ClipboardList,
  Link2,
  Copy,
  CheckCircle2,
  Clock3,
  Activity,
  Settings,
  Trophy,
} from 'lucide-react';
import { authAPI, profileAPI, corporationAPI, portfolioAPI, ProfileResponse, CorporationResponse, PortfolioResponse } from '@/lib/api';
import SendCashModal from './SendCashModal';
import ComposeMessage from './ComposeMessage';

interface ProfileDashboardProps {
  profileId: string;
}

const corporateHistory = [
  { title: 'C.E.O. SAMPLE CORP', period: '12/01/25 - 12/15/25' },
  { title: 'Acting CEO Placeholder Inc.', period: '11/10/25 - 11/30/25' },
];

export default function ProfileDashboard({ profileId }: ProfileDashboardProps) {
  const router = useRouter();
  const [profile, setProfile] = useState<ProfileResponse | null>(null);
  const [viewerProfileId, setViewerProfileId] = useState<number | null>(null);
  const [viewerAdmin, setViewerAdmin] = useState<boolean>(false);
  const [viewerProfile, setViewerProfile] = useState<ProfileResponse | null>(null);
  const [primaryCorporation, setPrimaryCorporation] = useState<CorporationResponse | null>(null);
  const [portfolio, setPortfolio] = useState<PortfolioResponse | null>(null);
  const [userCash, setUserCash] = useState<number>(0);
  const [portfolioRank, setPortfolioRank] = useState<number | null>(null);
  const [cashRank, setCashRank] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [sendCashOpen, setSendCashOpen] = useState(false);
  const [sendMessageOpen, setSendMessageOpen] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true);
      setError('');
      try {
        const data = await profileAPI.getById(profileId);
        setProfile(data);
        
        // Set cash from profile data
        if (data.cash !== undefined) {
          setUserCash(data.cash);
        }
        
        // Fetch user's corporations (if they are CEO of any)
        // Note: This checks corporations for the profile being viewed, not the viewer
        // We'll need the user's id to properly check CEO status, but ProfileResponse doesn't include it
        // For now, we'll check by CEO profile_id if available
        try {
          const corporations = await corporationAPI.getAll();
          const userCorps = corporations.filter(corp => {
            // Match by CEO profile_id
            return corp.ceo?.profile_id === data.profile_id;
          });
          if (userCorps.length > 0) {
            // Use the first corporation as primary (already has CEO data from getAll)
            setPrimaryCorporation(userCorps[0]);
          }
        } catch (corpErr) {
          console.warn('Failed to fetch corporations:', corpErr);
          // Don't fail the whole page if corporation fetch fails
        }

        // Fetch portfolio data
        try {
          // Try to get user id - ProfileResponse.id might be user_id
          // If viewing own profile, get from authAPI.getMe
          const me = await authAPI.getMe().catch(() => null);
          let userId: number | null = null;
          
          if (me && me.profile_id === data.profile_id) {
            // Viewing own profile - use authenticated user id
            userId = me.id;
          } else {
            // Viewing another profile - try using ProfileResponse.id as user_id
            userId = data.id;
          }
          
          if (userId) {
            try {
              const portfolioData = await portfolioAPI.getByUserId(userId);
              setPortfolio(portfolioData);
            } catch (portfolioErr) {
              // Portfolio might not exist yet, that's okay
              console.warn('Portfolio not found for user:', portfolioErr);
            }
          }
        } catch (portfolioErr) {
          console.warn('Failed to fetch portfolio:', portfolioErr);
        }

        // Calculate ranks (placeholder - would need all users' data)
        // TODO: Implement ranking system
        setPortfolioRank(null);
        setCashRank(null);
      } catch (err) {
        console.error('Profile load error:', err);
        setError('Unable to load this profile.');
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [profileId]);

  useEffect(() => {
    const loadViewer = async () => {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      if (!token) return;

      try {
        const me = await authAPI.getMe();
        setViewerProfileId(me.profile_id);
        setViewerAdmin(!!me.is_admin);

        // Fetch viewer's full profile data
        if (me.profile_id) {
          const viewerData = await profileAPI.getById(me.profile_id.toString());
          setViewerProfile(viewerData);
        }
      } catch (err) {
        console.warn('Viewer not authenticated:', err);
      }
    };

    loadViewer();
  }, []);

  if (loading) {
    return (
      <AppNavigation>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-lg text-gray-600 dark:text-gray-200">Loading profile...</div>
        </div>
      </AppNavigation>
    );
  }

  if (error || !profile) {
    return (
      <AppNavigation>
        <div className="min-h-screen flex flex-col items-center justify-center space-y-4 text-center">
          <p className="text-xl text-gray-700 dark:text-gray-200">{error || 'Profile not found.'}</p>
          <button
            onClick={() => router.push('/')}
            className="px-4 py-2 bg-corporate-blue text-white rounded-md"
          >
            Return Home
          </button>
        </div>
      </AppNavigation>
    );
  }

  const displayName = profile.player_name || profile.username || 'Executive';
  const displayState = profile.starting_state || 'N/A';
  const isOwner = viewerProfileId === profile.profile_id;
  const canonicalProfileId = `${profile.profile_id}`;
  const profileLink = `/profile/${canonicalProfileId}`;
  const viewerProfileLink = viewerProfileId ? `/profile/${viewerProfileId}` : profileLink;
  const shareUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/profile/${canonicalProfileId}`
      : `/profile/${canonicalProfileId}`;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const corpSummary = primaryCorporation ? {
    name: primaryCorporation.name,
    revenue: '$0', // Placeholder until revenue system is implemented
    profit: '$0', // Placeholder until profit system is implemented
    ownership: primaryCorporation.ceo?.profile_id === profile?.profile_id ? '80%' : '0%',
    marketCap: formatCurrency(primaryCorporation.shares * primaryCorporation.share_price),
    id: primaryCorporation.id,
  } : {
    name: 'No Corporation',
    revenue: '$0',
    profit: '$0',
    ownership: '0%',
    marketCap: '$0',
    id: null,
  };

  const portfolioValue = portfolio?.total_value || 0;
  const fillerTitle = profile.is_admin ? 'Administrator' : 'Executive';
  const joinedLabel = profile.created_at
    ? new Date(profile.created_at).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : 'Date unavailable';


  const handleCopyLink = async () => {
    if (!shareUrl || typeof navigator === 'undefined') return;

    try {
      // Try modern clipboard API first
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(shareUrl);
      } else {
        // Fallback for older browsers or restricted environments
        const textArea = document.createElement('textarea');
        textArea.value = shareUrl;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();

        try {
          const successful = document.execCommand('copy');
          if (!successful) {
            throw new Error('Fallback copy method failed');
          }
        } finally {
          document.body.removeChild(textArea);
        }
      }

      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch (copyError) {
      console.error('Copy link failed:', copyError);
      // Could show a user-friendly message here
      alert('Unable to copy link. Please copy manually: ' + shareUrl);
    }
  };

  return (
    <AppNavigation>
      <div className="relative mx-auto max-w-[90rem] px-4 py-10 sm:px-6 lg:px-8 space-y-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
              {displayName}
            </h1>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleCopyLink}
              className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white/80 px-4 py-2 text-sm font-semibold text-gray-800 shadow-sm transition hover:-translate-y-0.5 hover:border-corporate-blue hover:shadow-md dark:border-gray-700 dark:bg-gray-900/80 dark:text-gray-100"
            >
              <Link2 className="w-4 h-4" />
              {copied ? 'Copied profile link' : 'Copy profile link'}
              {!copied && <Copy className="w-4 h-4 text-gray-400" />}
              {copied && <CheckCircle2 className="w-4 h-4 text-corporate-blue" />}
            </button>
            <button
              onClick={() => router.push('/settings')}
              className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-corporate-blue to-corporate-blue-light px-4 py-2 text-sm font-semibold text-white shadow-md transition hover:-translate-y-0.5 hover:shadow-lg dark:from-corporate-blue/90 dark:to-corporate-blue-light/90"
            >
              <Settings className="w-4 h-4" />
              Settings
            </button>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_0.85fr] xl:grid-cols-[1.1fr_0.9fr] 2xl:grid-cols-[1.2fr_1fr]">
          <section className="space-y-6 min-w-0">
            <div className="relative overflow-hidden rounded-2xl border border-white/60 bg-white/80 shadow-2xl backdrop-blur dark:border-gray-800/60 dark:bg-gray-900/70">
              <div className="absolute inset-0 bg-gradient-to-br from-corporate-blue/12 via-transparent to-corporate-blue-light/20 dark:from-corporate-blue/18 dark:via-transparent dark:to-corporate-blue-dark/30" />
              <div className="relative p-6 space-y-6">
                {/* Name above profile picture */}
                <div className="flex flex-col items-center text-center">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{displayName}</h2>
                  <div className="flex flex-wrap items-center justify-center gap-2 mb-4">
                    <span className="rounded-full bg-corporate-blue/10 px-3 py-1 text-xs font-semibold text-corporate-blue dark:bg-corporate-blue/20">
                      {fillerTitle}
                    </span>
                  </div>
                  <div className="relative">
                    <div className="absolute -inset-1 rounded-2xl bg-gradient-to-br from-corporate-blue/30 to-corporate-blue-light/40 blur-xl dark:from-corporate-blue/40 dark:to-corporate-blue-dark/40" />
                    <div className="relative flex h-32 w-32 items-center justify-center overflow-hidden rounded-2xl border border-white/60 bg-white/70 shadow-lg dark:border-gray-800/80 dark:bg-gray-800/70">
                      <img
                        src={profile.profile_image_url || "/defaultpfp.jpg"}
                        alt="Profile"
                        className="h-full w-full object-cover"
                        onError={(e) => {
                          e.currentTarget.src = "/defaultpfp.jpg";
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* Portfolio and Cash */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-xl border border-white/60 bg-white/70 p-4 shadow-sm dark:border-gray-800/70 dark:bg-gray-800/70">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.1em] text-gray-500 dark:text-gray-400">
                        <DollarSign className="h-4 w-4" />
                        Portfolio Value
                      </div>
                      {portfolioRank !== null && (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-corporate-blue dark:text-corporate-blue-light">
                          <Trophy className="h-3 w-3" />
                          #{portfolioRank}
                        </span>
                      )}
                    </div>
                    <p className="text-xl font-bold text-gray-900 dark:text-white">{formatCurrency(portfolioValue)}</p>
                  </div>
                  <div className="rounded-xl border border-white/60 bg-white/70 p-4 shadow-sm dark:border-gray-800/70 dark:bg-gray-800/70">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.1em] text-gray-500 dark:text-gray-400">
                        <DollarSign className="h-4 w-4" />
                        Cash
                      </div>
                      {cashRank !== null && (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-corporate-blue dark:text-corporate-blue-light">
                          <Trophy className="h-3 w-3" />
                          #{cashRank}
                        </span>
                      )}
                    </div>
                    <p className="text-xl font-bold text-gray-900 dark:text-white">{formatCurrency(userCash)}</p>
                  </div>
                </div>

                {/* User Info */}
                <div className="space-y-2">
                  <p className="text-sm text-gray-600 dark:text-gray-300 text-center">
                    Executive at{' '}
                    {corpSummary.id ? (
                      <Link
                        href={`/corporation/${corpSummary.id}`}
                        className="font-semibold text-gray-900 dark:text-white hover:text-corporate-blue transition-colors"
                      >
                        {corpSummary.name}
                      </Link>
                    ) : (
                      <span className="font-semibold text-gray-900 dark:text-white">{corpSummary.name}</span>
                    )}
                  </p>
                  <div className="flex items-center justify-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                    <Clock3 className="h-3 w-3" />
                    <span>Joined {joinedLabel}</span>
                  </div>
                </div>
              </div>
              {profile.bio && (
                <div className="mt-4 rounded-xl border border-white/60 bg-white/70 p-4 shadow-sm dark:border-gray-800/70 dark:bg-gray-800/70">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase text-gray-500 dark:text-gray-400 mb-2">
                    <UserIcon className="h-4 w-4" />
                    Bio
                  </div>
                  <p className="text-sm text-gray-700 dark:text-gray-300">{profile.bio}</p>
                </div>
              )}
              <div className="relative border-t border-gray-200/70 px-6 py-4 dark:border-gray-800">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="inline-flex items-center gap-2 rounded-full bg-corporate-blue/10 px-3 py-1 text-xs font-semibold text-corporate-blue dark:bg-corporate-blue/20">
                    <Link2 className="h-4 w-4" />
                    Profile ID #{canonicalProfileId}
                  </span>
                </div>
              </div>
            </div>


            <div className="rounded-2xl border border-white/60 bg-white/80 p-6 shadow-xl backdrop-blur dark:border-gray-800/60 dark:bg-gray-900/70">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    Corporate history
                  </p>
                  <p className="text-lg font-semibold text-gray-900 dark:text-white">Timeline</p>
                </div>
                <ClipboardList className="h-5 w-5 text-corporate-blue" />
              </div>
              <div className="space-y-4">
                <div className="flex gap-3">
                  <div className="relative">
                    <div className="absolute inset-x-1/2 top-5 h-full w-px -translate-x-1/2 bg-gray-200 dark:bg-gray-800" />
                    <div className="relative flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-corporate-blue to-corporate-blue-light text-white shadow-lg text-sm font-bold">
                      <Clock3 className="h-4 w-4" />
                    </div>
                  </div>
                  <div className="flex-1 rounded-xl border border-white/60 bg-white/70 p-4 shadow-sm dark:border-gray-800/70 dark:bg-gray-800/60">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">Profile created</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{joinedLabel}</p>
                  </div>
                </div>
                {corporateHistory.map((history, idx) => (
                  <div key={history.title + idx} className="flex gap-3">
                    <div className="relative">
                      {idx < corporateHistory.length - 1 && (
                        <div className="absolute inset-x-1/2 top-5 h-full w-px -translate-x-1/2 bg-gray-200 dark:bg-gray-800" />
                      )}
                      <div className="relative flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-gray-700 shadow-sm dark:bg-gray-800 dark:text-gray-200">
                        <Building2 className="h-4 w-4" />
                      </div>
                    </div>
                    <div className="flex-1 rounded-xl border border-white/60 bg-white/70 p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-gray-800/70 dark:bg-gray-800/60">
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">{history.title}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{history.period}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <aside className="space-y-6 min-w-0">
            {/* Quick Actions - moved below user info */}
            <div className="rounded-2xl border border-white/60 bg-white/80 p-6 shadow-xl backdrop-blur dark:border-gray-800/60 dark:bg-gray-900/70">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    Quick Actions
                  </p>
                  <p className="text-lg font-semibold text-gray-900 dark:text-white">
                    {isOwner ? 'Corporate Management' : 'User Actions'}
                  </p>
                </div>
                <Settings className="h-5 w-5 text-corporate-blue" />
              </div>
              {isOwner ? (
                <div className="space-y-4 text-sm text-gray-700 dark:text-gray-300">
                  <div className="flex items-center justify-between rounded-xl border border-white/60 bg-white/70 p-3 shadow-sm dark:border-gray-800/70 dark:bg-gray-800/60">
                    <span>Buy/Sell Investments</span>
                    <button className="px-3 py-1 text-xs font-medium rounded-md border border-gray-200 text-gray-700 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800">
                      Manage
                    </button>
                  </div>
                  <div className="flex items-center justify-between rounded-xl border border-white/60 bg-white/70 p-3 shadow-sm dark:border-gray-800/70 dark:bg-gray-800/60">
                    <span>Build Production Units</span>
                    <button className="px-3 py-1 text-xs font-medium rounded-md border border-gray-200 text-gray-700 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800">
                      Build
                    </button>
                  </div>
                  <div className="flex items-center justify-between rounded-xl border border-white/60 bg-white/70 p-3 shadow-sm dark:border-gray-800/70 dark:bg-gray-800/60">
                    <span>Set Corporate Policy</span>
                    <button className="px-3 py-1 text-xs font-medium rounded-md border border-gray-200 text-gray-700 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800">
                      Configure
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4 text-sm text-gray-700 dark:text-gray-300">
                  <button
                    onClick={() => setSendCashOpen(true)}
                    className="w-full flex items-center justify-between rounded-xl border border-white/60 bg-white/70 p-3 shadow-sm hover:bg-gray-50 dark:border-gray-800/70 dark:bg-gray-800/60 dark:hover:bg-gray-700 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-corporate-blue" />
                      <span>Send Cash</span>
                    </div>
                    <span className="text-xs text-gray-500 dark:text-gray-400">Transfer money</span>
                  </button>
                  <button
                    onClick={() => setSendMessageOpen(true)}
                    className="w-full flex items-center justify-between rounded-xl border border-white/60 bg-white/70 p-3 shadow-sm hover:bg-gray-50 dark:border-gray-800/70 dark:bg-gray-800/60 dark:hover:bg-gray-700 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <UserIcon className="h-4 w-4 text-corporate-blue" />
                      <span>Send Message</span>
                    </div>
                    <span className="text-xs text-gray-500 dark:text-gray-400">Start conversation</span>
                  </button>
                </div>
              )}
            </div>

            {/* Corporation Tab - moved below quick actions */}
            <div className="rounded-2xl border border-white/60 bg-white/80 p-6 shadow-xl backdrop-blur dark:border-gray-800/60 dark:bg-gray-900/70">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                      Primary corporation
                    </p>
                    {corpSummary.id ? (
                      <Link
                        href={`/corporation/${corpSummary.id}`}
                        className="text-lg font-semibold text-gray-900 dark:text-white hover:text-corporate-blue transition-colors"
                      >
                        {corpSummary.name}
                      </Link>
                    ) : (
                      <p className="text-lg font-semibold text-gray-900 dark:text-white">{corpSummary.name}</p>
                    )}
                  </div>
                  <span className="rounded-full bg-corporate-blue/10 px-3 py-1 text-xs font-semibold text-corporate-blue dark:bg-corporate-blue/20">
                    Stable
                  </span>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-4">
                  <div className="rounded-xl border border-white/60 bg-white/70 p-4 shadow-sm dark:border-gray-800/70 dark:bg-gray-800/60">
                    <div className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-200">
                      <DollarSign className="h-4 w-4 text-corporate-blue" />
                      Revenue
                    </div>
                    <p className="mt-2 text-gray-600 dark:text-gray-300">{corpSummary.revenue}</p>
                  </div>
                  <div className="rounded-xl border border-white/60 bg-white/70 p-4 shadow-sm dark:border-gray-800/70 dark:bg-gray-800/60">
                    <div className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-200">
                      <TrendingUp className="h-4 w-4 text-corporate-blue" />
                      Profit
                    </div>
                    <p className="mt-2 text-gray-600 dark:text-gray-300">{corpSummary.profit}</p>
                  </div>
                  <div className="rounded-xl border border-white/60 bg-white/70 p-4 shadow-sm dark:border-gray-800/70 dark:bg-gray-800/60">
                    <div className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-200">
                      <PieChart className="h-4 w-4 text-corporate-blue" />
                      Ownership
                    </div>
                    <p className="mt-2 text-gray-600 dark:text-gray-300">{corpSummary.ownership}</p>
                  </div>
                  <div className="rounded-xl border border-white/60 bg-white/70 p-4 shadow-sm dark:border-gray-800/70 dark:bg-gray-800/60">
                    <div className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-200">
                      <BarChart3 className="h-4 w-4 text-corporate-blue" />
                      Market cap
                    </div>
                    <p className="mt-2 text-gray-600 dark:text-gray-300">{corpSummary.marketCap}</p>
                  </div>
                </div>
                <div className="mt-5 rounded-xl border border-dashed border-corporate-blue/30 bg-corporate-blue/5 p-4 text-sm text-corporate-blue dark:border-corporate-blue/30 dark:bg-corporate-blue/10">
                  <div className="flex items-center gap-2">
                    <Activity className="h-4 w-4" />
                    Operations baseline is placeholder until live data is wired.
                  </div>
                </div>
            </div>
          </aside>
        </div>

        {/* Modals */}
        {profile && !isOwner && (
          <>
            <SendCashModal
              isOpen={sendCashOpen}
              onClose={() => setSendCashOpen(false)}
              recipientId={profile.id}
              recipientName={displayName}
              onSuccess={() => {
                // Refresh user cash if needed
                setSendCashOpen(false);
              }}
            />
            <ComposeMessage
              isOpen={sendMessageOpen}
              onClose={() => setSendMessageOpen(false)}
              recipientId={profile.id}
              recipientName={displayName}
            />
          </>
        )}
      </div>
    </AppNavigation>
  );
}
