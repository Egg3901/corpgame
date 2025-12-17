'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ChevronDown,
  ChevronRight,
  Menu,
  X,
  Settings,
  User as UserIcon,
  Building2,
  TrendingUp,
  DollarSign,
  PieChart,
  BarChart3,
  ClipboardList,
  Briefcase,
  Shield,
  Link2,
  Copy,
  CheckCircle2,
  Clock3,
  Activity,
  MapPin,
} from 'lucide-react';
import { authAPI, profileAPI, ProfileResponse } from '@/lib/api';

interface ProfileDashboardProps {
  profileId: string;
}

const navSections = [
  { id: 'overview', label: 'Overview' },
  { id: 'corporations', label: 'Corporations' },
  { id: 'states', label: 'States' },
  { id: 'actions', label: 'Actions' },
];

const corporateHistory = [
  { title: 'C.E.O. SAMPLE CORP', period: '12/01/25 - 12/15/25' },
  { title: 'Acting CEO Placeholder Inc.', period: '11/10/25 - 11/30/25' },
];

export default function ProfileDashboard({ profileId }: ProfileDashboardProps) {
  const router = useRouter();
  const [profile, setProfile] = useState<ProfileResponse | null>(null);
  const [viewerProfileId, setViewerProfileId] = useState<number | null>(null);
  const [viewerAdmin, setViewerAdmin] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [navOpen, setNavOpen] = useState(false);
  const [expandedNav, setExpandedNav] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true);
      setError('');
      try {
        const data = await profileAPI.getById(profileId);
        setProfile(data);
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
      } catch (err) {
        console.warn('Viewer not authenticated:', err);
      }
    };

    loadViewer();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center dark:bg-gray-900 dark:text-gray-100">
        <div className="text-lg text-gray-600 dark:text-gray-200">Loading profile...</div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center space-y-4 text-center dark:bg-gray-900 dark:text-gray-100">
        <p className="text-xl text-gray-700 dark:text-gray-200">{error || 'Profile not found.'}</p>
        <button
          onClick={() => router.push('/')}
          className="px-4 py-2 bg-corporate-blue text-white rounded-md"
        >
          Return Home
        </button>
      </div>
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

  const corpSummary = {
    name: 'Sample Corp',
    revenue: '$0',
    profit: '$0',
    ownership: '0%',
    marketCap: '$0',
  };

  const fillerPortfolio = '$0';
  const fillerTitle = profile.is_admin ? 'Administrator' : 'Executive';
  const joinedLabel = profile.created_at
    ? new Date(profile.created_at).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : 'Date unavailable';

  const handleOpenSettings = () => {
    setNavOpen(false);
    router.push('/settings');
  };

  const handleOpenProfile = () => {
    setNavOpen(false);
    router.push(viewerProfileLink);
  };

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
    <div className="relative min-h-screen bg-gradient-to-b from-gray-50 via-white to-gray-100 text-gray-900 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 dark:text-gray-100">
      <div className="pointer-events-none absolute inset-0 opacity-80">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(59,130,246,0.12),transparent_35%),radial-gradient(circle_at_80%_0%,rgba(30,64,175,0.1),transparent_30%),radial-gradient(circle_at_50%_80%,rgba(15,23,42,0.06),transparent_40%)] dark:bg-[radial-gradient(circle_at_20%_20%,rgba(59,130,246,0.08),transparent_45%),radial-gradient(circle_at_80%_0%,rgba(30,64,175,0.12),transparent_42%),radial-gradient(circle_at_50%_80%,rgba(148,163,184,0.05),transparent_45%)]" />
      </div>

      <header className="relative z-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-6">
          <div className="flex items-center justify-between rounded-2xl border border-white/60 bg-white/80 px-4 py-3 shadow-xl backdrop-blur dark:border-gray-800/60 dark:bg-gray-900/80">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setNavOpen(true)}
                className="inline-flex items-center justify-center rounded-xl border border-gray-200 bg-white px-3 py-2 text-gray-700 shadow-sm transition hover:-translate-y-0.5 hover:border-corporate-blue hover:text-corporate-blue dark:border-gray-800 dark:bg-gray-800 dark:text-gray-200"
                aria-label="Open navigation"
              >
                <Menu className="w-5 h-5" />
              </button>
              <div className="leading-tight">
                <p className="text-[11px] uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400">Navigation</p>
                <p className="text-sm font-semibold text-gray-900 dark:text-white">Corporate Sim</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleOpenSettings}
                className="hidden sm:inline-flex items-center gap-2 rounded-xl border border-white/60 bg-white/80 px-3 py-2 text-sm font-semibold text-gray-800 shadow-sm transition hover:-translate-y-0.5 hover:border-corporate-blue hover:text-corporate-blue dark:border-gray-800 dark:bg-gray-800 dark:text-gray-100"
              >
                <Settings className="w-4 h-4" />
                Settings
              </button>
              <button
                type="button"
                onClick={handleOpenProfile}
                className="group inline-flex items-center gap-3 rounded-2xl border border-white/70 bg-gradient-to-r from-white/90 to-white/60 px-3 py-2 text-left shadow-md transition hover:-translate-y-0.5 hover:shadow-lg dark:border-gray-800 dark:from-gray-800/90 dark:to-gray-900/80"
              >
                <div className="relative flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl border border-white/60 bg-corporate-blue/10 dark:border-gray-700 dark:bg-gray-800">
                  {profile.profile_image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={profile.profile_image_url} alt="Profile avatar" className="h-full w-full object-cover" />
                  ) : (
                    <UserIcon className="h-5 w-5 text-corporate-blue" />
                  )}
                </div>
                <div className="leading-tight">
                  <p className="text-[11px] uppercase tracking-wide text-gray-500 dark:text-gray-400">Profile</p>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">
                    {isOwner ? 'Your profile' : displayName}
                  </p>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400">#{viewerProfileId ?? canonicalProfileId}</p>
                </div>
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="relative mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 space-y-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-gray-500 dark:text-gray-400">Profile</p>
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
              {displayName} &middot; {displayState}
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
              onClick={handleOpenSettings}
              className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-corporate-blue to-corporate-blue-light px-4 py-2 text-sm font-semibold text-white shadow-md transition hover:-translate-y-0.5 hover:shadow-lg dark:from-corporate-blue/90 dark:to-corporate-blue-light/90"
            >
              <Settings className="w-4 h-4" />
              Settings
            </button>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <section className="space-y-6">
            <div className="relative overflow-hidden rounded-2xl border border-white/60 bg-white/80 shadow-2xl backdrop-blur dark:border-gray-800/60 dark:bg-gray-900/70">
              <div className="absolute inset-0 bg-gradient-to-br from-corporate-blue/12 via-transparent to-corporate-blue-light/20 dark:from-corporate-blue/18 dark:via-transparent dark:to-corporate-blue-dark/30" />
              <div className="relative flex flex-col gap-6 p-6 md:flex-row md:items-center">
                <div className="flex-shrink-0">
                  <div className="relative">
                    <div className="absolute -inset-1 rounded-2xl bg-gradient-to-br from-corporate-blue/30 to-corporate-blue-light/40 blur-xl dark:from-corporate-blue/40 dark:to-corporate-blue-dark/40" />
                    <div className="relative flex h-28 w-28 items-center justify-center overflow-hidden rounded-2xl border border-white/60 bg-white/70 shadow-lg dark:border-gray-800/80 dark:bg-gray-800/70">
                      {profile.profile_image_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={profile.profile_image_url} alt="Profile" className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex flex-col items-center justify-center text-xs text-gray-500 dark:text-gray-400">
                          <UserIcon className="h-8 w-8 text-gray-400" />
                          <span>No image</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex-1 space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-corporate-blue/10 px-3 py-1 text-xs font-semibold text-corporate-blue dark:bg-corporate-blue/20">
                      {fillerTitle}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    Executive summary placeholder for <span className="font-semibold text-gray-900 dark:text-white">{corpSummary.name}</span>.
                    This profile uses a stable numeric ID for sharing; usernames stay private.
                  </p>
                  <div className="grid gap-4 sm:grid-cols-3">
                    <div className="rounded-xl border border-white/60 bg-white/70 p-3 shadow-sm dark:border-gray-800/70 dark:bg-gray-800/70">
                      <div className="flex items-center gap-2 text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">
                        <MapPin className="h-4 w-4" />
                        State
                      </div>
                      <p className="mt-2 text-lg font-semibold text-gray-900 dark:text-white">{displayState}</p>
                    </div>
                    <div className="rounded-xl border border-white/60 bg-white/70 p-3 shadow-sm dark:border-gray-800/70 dark:bg-gray-800/70">
                      <div className="flex items-center gap-2 text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">
                        <DollarSign className="h-4 w-4" />
                        Portfolio
                      </div>
                      <p className="mt-2 text-lg font-semibold text-gray-900 dark:text-white">{fillerPortfolio}</p>
                    </div>
                    <div className="rounded-xl border border-white/60 bg-white/70 p-3 shadow-sm dark:border-gray-800/70 dark:bg-gray-800/70">
                      <div className="flex items-center gap-2 text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">
                        <Clock3 className="h-4 w-4" />
                        Joined
                      </div>
                      <p className="mt-2 text-lg font-semibold text-gray-900 dark:text-white">{joinedLabel}</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="relative border-t border-gray-200/70 px-6 py-4 dark:border-gray-800">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="inline-flex items-center gap-2 rounded-full bg-corporate-blue/10 px-3 py-1 text-xs font-semibold text-corporate-blue dark:bg-corporate-blue/20">
                    <Link2 className="h-4 w-4" />
                    Profile ID #{canonicalProfileId}
                  </span>
                  <span className="text-xs text-gray-600 dark:text-gray-400">
                    Shareable link uses the profile ID so the route stays stable.
                  </span>
                </div>
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <div className="rounded-2xl border border-white/60 bg-white/80 p-6 shadow-xl backdrop-blur dark:border-gray-800/60 dark:bg-gray-900/70">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                      Primary corporation
                    </p>
                    <p className="text-lg font-semibold text-gray-900 dark:text-white">{corpSummary.name}</p>
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

          <aside className="space-y-6">
            <div className="rounded-2xl border border-white/60 bg-white/80 p-6 shadow-xl backdrop-blur dark:border-gray-800/60 dark:bg-gray-900/70">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    User panel
                  </p>
                  <p className="text-lg font-semibold text-gray-900 dark:text-white">Signals</p>
                </div>
                <UserIcon className="h-5 w-5 text-corporate-blue" />
              </div>
              <div className="space-y-3 text-sm text-gray-700 dark:text-gray-300">
                <div className="flex items-center justify-between rounded-xl border border-white/60 bg-white/70 p-3 shadow-sm dark:border-gray-800/70 dark:bg-gray-800/60">
                  <span>Status</span>
                  <span className="font-semibold text-corporate-blue">
                    {profile.is_admin ? 'Admin' : 'Player'}
                  </span>
                </div>
                <div className="flex items-center justify-between rounded-xl border border-white/60 bg-white/70 p-3 shadow-sm dark:border-gray-800/70 dark:bg-gray-800/60">
                  <span>Viewer</span>
                  <span className="text-gray-500 dark:text-gray-300">
                    {isOwner ? 'You' : viewerProfileId ? 'Authenticated' : 'Guest'}
                  </span>
                </div>
                <div className="flex items-center justify-between rounded-xl border border-white/60 bg-white/70 p-3 shadow-sm dark:border-gray-800/70 dark:bg-gray-800/60">
                  <span>Viewer admin</span>
                  <span className="text-gray-500 dark:text-gray-300">{viewerAdmin ? 'Yes' : 'No'}</span>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-white/60 bg-white/80 p-6 shadow-xl backdrop-blur dark:border-gray-800/60 dark:bg-gray-900/70">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    Settings panel
                  </p>
                  <p className="text-lg font-semibold text-gray-900 dark:text-white">Quick actions</p>
                </div>
                <Settings className="h-5 w-5 text-corporate-blue" />
              </div>
              <div className="space-y-4 text-sm text-gray-700 dark:text-gray-300">
                <div className="flex items-center justify-between rounded-xl border border-white/60 bg-white/70 p-3 shadow-sm dark:border-gray-800/70 dark:bg-gray-800/60">
                  <span>Alerts</span>
                  <Shield className="h-4 w-4 text-gray-400" />
                </div>
                <div className="flex items-center justify-between rounded-xl border border-white/60 bg-white/70 p-3 shadow-sm dark:border-gray-800/70 dark:bg-gray-800/60">
                  <span>Capital</span>
                  <Briefcase className="h-4 w-4 text-gray-400" />
                </div>
                <div className="flex items-center justify-between rounded-xl border border-white/60 bg-white/70 p-3 shadow-sm dark:border-gray-800/70 dark:bg-gray-800/60">
                  <span>Boards</span>
                  <ClipboardList className="h-4 w-4 text-gray-400" />
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Updated layout removes the side navigation while keeping the top-level controls within reach.
                </p>
              </div>
            </div>
          </aside>
        </div>
      </div>

      {navOpen && (
        <div className="fixed inset-0 z-40 bg-black/55 backdrop-blur-sm" onClick={() => setNavOpen(false)}>
          <div
            className="fixed left-0 top-0 bottom-0 w-80 sm:w-96 overflow-y-auto bg-white text-gray-900 shadow-2xl ring-1 ring-black/5 dark:bg-gray-900 dark:text-gray-100 dark:ring-white/10"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-gray-800">
              <div className="space-y-1">
                <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Menu</p>
                <button type="button" onClick={handleOpenProfile} className="text-left">
                  <p className="text-lg font-semibold text-gray-900 dark:text-white">{displayName}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Profile #{viewerProfileId ?? canonicalProfileId}</p>
                </button>
              </div>
              <button
                type="button"
                onClick={() => setNavOpen(false)}
                className="rounded-md p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-800 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200"
                aria-label="Close navigation"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-3">
              {navSections.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className="w-full text-left rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-800 shadow-sm transition hover:-translate-y-0.5 hover:border-corporate-blue hover:text-corporate-blue dark:border-gray-800 dark:bg-gray-800 dark:text-gray-100"
                >
                  {item.label}
                  <span className="ml-2 text-xs font-normal text-gray-500 dark:text-gray-400">(placeholder)</span>
                </button>
              ))}
              <button
                type="button"
                onClick={handleOpenSettings}
                className="inline-flex w-full items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-800 shadow-sm transition hover:-translate-y-0.5 hover:border-corporate-blue hover:text-corporate-blue dark:border-gray-800 dark:bg-gray-800 dark:text-gray-100"
              >
                <Settings className="h-4 w-4" />
                Settings
              </button>

              <div className="border-t border-gray-200 pt-3 dark:border-gray-800">
                <button
                  type="button"
                  onClick={() => setExpandedNav(expandedNav === 'corp' ? null : 'corp')}
                  className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-100 dark:text-gray-100 dark:hover:bg-gray-800"
                >
                  My Corporation
                  {expandedNav === 'corp' ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </button>
                {expandedNav === 'corp' && (
                  <div className="mt-2 space-y-1 pl-4">
                    <button
                      type="button"
                      className="w-full rounded-md px-3 py-2 text-left text-sm text-gray-600 transition hover:bg-gray-50 hover:text-corporate-blue dark:text-gray-300 dark:hover:bg-gray-800"
                    >
                      Finances
                    </button>
                    <button
                      type="button"
                      className="w-full rounded-md px-3 py-2 text-left text-sm text-gray-600 transition hover:bg-gray-50 hover:text-corporate-blue dark:text-gray-300 dark:hover:bg-gray-800"
                    >
                      Operations
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="px-6 pb-6">
              <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 p-4 text-sm text-gray-700 shadow-sm dark:border-gray-800 dark:bg-gray-800/60 dark:text-gray-200">
                <p className="font-semibold text-gray-900 dark:text-white">Page content placeholder</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Use this hamburger menu to explore upcoming corporate areas while we wire live data.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
