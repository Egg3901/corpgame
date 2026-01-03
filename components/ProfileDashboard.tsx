'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import AppNavigation from '@/components/AppNavigation';
import { Card, CardBody, CardHeader, CardFooter, Button, Chip, Avatar, Tooltip, Divider, Spinner } from "@heroui/react";
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
  Circle,
  Zap,
} from 'lucide-react';
import { authAPI, profileAPI, corporationAPI, portfolioAPI, marketsAPI, ProfileResponse, CorporationResponse, PortfolioResponse, CorporateHistoryItem, CorporationFinances } from '@/lib/api';
import SendCashModal from './SendCashModal';
import ComposeMessage from './ComposeMessage';
import { formatCash, getErrorMessage } from '@/lib/utils';

interface ProfileDashboardProps {
  profileId: string;
}

export default function ProfileDashboard({ profileId }: ProfileDashboardProps) {
  const router = useRouter();
  const [profile, setProfile] = useState<ProfileResponse | null>(null);
  const [viewerProfileId, setViewerProfileId] = useState<number | null>(null);
  const [viewerAdmin, setViewerAdmin] = useState<boolean>(false);
  const [viewerProfile, setViewerProfile] = useState<ProfileResponse | null>(null);
  const [primaryCorporation, setPrimaryCorporation] = useState<CorporationResponse | null>(null);
  const [portfolio, setPortfolio] = useState<PortfolioResponse | null>(null);
  const [userCash, setUserCash] = useState<number>(0);
  const [userActions, setUserActions] = useState<number>(0);
  const [portfolioRank, setPortfolioRank] = useState<number | null>(null);
  const [cashRank, setCashRank] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [sendCashOpen, setSendCashOpen] = useState(false);
  const [sendMessageOpen, setSendMessageOpen] = useState(false);
  const [corporateHistory, setCorporateHistory] = useState<CorporateHistoryItem[]>([]);
  const [corpFinances, setCorpFinances] = useState<CorporationFinances | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true);
      setError('');
      try {
        const data = await profileAPI.getById(profileId);
        setProfile(data);
        
        // Set cash and actions from profile data
        if (data.cash !== undefined) {
          setUserCash(typeof data.cash === 'number' && !Number.isNaN(data.cash) ? data.cash : 0);
        }
        if (data.actions !== undefined) {
          setUserActions(typeof data.actions === 'number' && !Number.isNaN(data.actions) ? data.actions : 0);
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
            
            // Fetch corporation finances
            try {
              const financesData = await marketsAPI.getCorporationFinances(userCorps[0].id);
              setCorpFinances(financesData.finances);
            } catch (finErr: unknown) {
              console.warn('Failed to fetch corporation finances:', getErrorMessage(finErr));
            }
          }
        } catch (corpErr: unknown) {
          console.warn('Failed to fetch corporations:', getErrorMessage(corpErr));
          // Don't fail the whole page if corporation fetch fails
        }

        // Fetch portfolio data and history
        try {
          // Try to get user id - ProfileResponse.id might be user_id
          // If viewing own profile, get from authAPI.getMe
          const me = await authAPI.getMe().catch((_err: unknown) => null);
          let userId: number | null = null;
          
          if (me && me.profile_id === data.profile_id) {
            // Viewing own profile - use authenticated user id
            userId = me.id;
          } else {
            // Viewing another profile - try using ProfileResponse.id as user_id
            userId = data.id;
          }
          
          if (userId) {
            // Fetch portfolio
            try {
              const portfolioData = await portfolioAPI.getByUserId(userId);
              setPortfolio(portfolioData);
            } catch (portfolioErr: unknown) {
              // Portfolio might not exist yet, that's okay
              console.warn('Portfolio not found for user:', getErrorMessage(portfolioErr));
            }

            // Fetch corporate history
            try {
              const historyData = await profileAPI.getHistory(userId);
              setCorporateHistory(historyData.history);
            } catch (historyErr: unknown) {
              console.warn('Failed to fetch corporate history:', getErrorMessage(historyErr));
            }
          }
        } catch (portfolioErr: unknown) {
          console.warn('Failed to fetch portfolio:', getErrorMessage(portfolioErr));
        }

        // Calculate ranks (placeholder - would need all users' data)
        setPortfolioRank(null);
        setCashRank(null);
      } catch (err: unknown) {
        console.error('Profile load error:', err);
        const msg = getErrorMessage(err, 'Unable to load this profile.');
        setError(msg);
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
      } catch (err: unknown) {
        console.warn('Viewer not authenticated:', getErrorMessage(err));
      }
    };

    loadViewer();
  }, []);

  if (loading) {
    return (
      <AppNavigation>
        <div className="min-h-screen flex items-center justify-center bg-surface-0">
          <Spinner size="lg" label="Loading profile..." color="primary" />
        </div>
      </AppNavigation>
    );
  }

  if (error || !profile) {
    return (
      <AppNavigation>
        <div className="min-h-screen flex flex-col items-center justify-center space-y-4 text-center bg-surface-0">
          <p className="text-xl text-content-secondary">{error || 'Profile not found.'}</p>
          <Button
            color="primary"
            onPress={() => router.push('/')}
          >
            Return Home
          </Button>
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
    if (Number.isNaN(value)) return '$0.00';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const formatLastSeen = (lastSeenAt?: string, isOnline?: boolean): string => {
    if (isOnline) {
      return 'Online now';
    }
    if (!lastSeenAt) {
      return 'Never seen';
    }
    
    const lastSeen = new Date(lastSeenAt);
    const now = new Date();
    const diffMs = now.getTime() - lastSeen.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    const diffWeeks = Math.floor(diffDays / 7);
    const diffMonths = Math.floor(diffDays / 30);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    if (diffWeeks < 4) return `${diffWeeks}w ago`;
    if (diffMonths < 12) return `${diffMonths}mo ago`;
    
    return lastSeen.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: lastSeen.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    });
  };

  const corpSummary = primaryCorporation ? {
    name: primaryCorporation.name,
    revenue: corpFinances ? formatCurrency(corpFinances.display_revenue) : '$0',
    profit: corpFinances ? formatCurrency(corpFinances.display_profit) : '$0',
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
    } catch (copyError: unknown) {
      console.error('Copy link failed:', copyError);
      // Could show a user-friendly message here
      alert('Unable to copy link. Please copy manually: ' + shareUrl);
    }
  };

  return (
    <AppNavigation>
      <div className="relative mx-auto max-w-[90rem] px-4 py-10 sm:px-6 lg:px-8 space-y-8 bg-surface-0 min-h-screen">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-content-primary">
              {displayName}
            </h1>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button
              onPress={handleCopyLink}
              radius="full"
              variant="bordered"
              className="bg-content1/80 border-default-200 text-foreground font-semibold shadow-sm hover:-translate-y-0.5 hover:border-primary hover:shadow-md"
            >
              <Link2 className="w-4 h-4" />
              {copied ? 'Copied profile link' : 'Copy profile link'}
              {!copied && <Copy className="w-4 h-4 text-default-500" />}
              {copied && <CheckCircle2 className="w-4 h-4 text-primary" />}
            </Button>
            <Button
              onPress={() => router.push('/settings')}
              radius="full"
              className="bg-gradient-to-r from-primary to-primary-400 text-white font-semibold shadow-md hover:-translate-y-0.5 hover:shadow-lg"
            >
              <Settings className="w-4 h-4" />
              Settings
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_0.85fr] xl:grid-cols-[1.1fr_0.9fr] 2xl:grid-cols-[1.2fr_1fr]">
          <section className="space-y-6 min-w-0">
            <Card className="w-full bg-surface-1/80 border-default-200 overflow-hidden" shadow="lg">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-primary-200/20 pointer-events-none" />
              <CardBody className="p-6 space-y-6 overflow-visible">
                {/* Name above profile picture */}
                <div className="flex flex-col items-center text-center">
                  <h2 className="text-2xl font-bold text-content-primary mb-2">{displayName}</h2>
                  <div className="flex flex-wrap items-center justify-center gap-2 mb-4">
                    <Chip color="primary" variant="flat" size="sm" className="bg-primary/10 text-primary">
                      {fillerTitle}
                    </Chip>
                  </div>
                  <div className="relative">
                    <div className="absolute -inset-1 rounded-2xl bg-gradient-to-br from-primary/30 to-primary-200/40 blur-xl" />
                    <Avatar 
                      src={profile.profile_image_url || "/defaultpfp.jpg"}
                      alt={`${displayName}'s profile picture`}
                      className="w-32 h-32 text-large"
                      isBordered
                      color="primary"
                      radius="lg"
                    />
                  </div>
                </div>

                {/* Portfolio, Cash, and Actions */}
                <div className="grid gap-4 sm:grid-cols-3">
                  <Card shadow="sm" className="bg-surface-1/70 border-default-200">
                    <CardBody className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.1em] text-default-500">
                          <DollarSign className="h-4 w-4" />
                          Portfolio Value
                        </div>
                        {portfolioRank !== null && (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-primary">
                            <Trophy className="h-3 w-3" />
                            #{portfolioRank}
                          </span>
                        )}
                      </div>
                      <p className="text-xl font-bold text-foreground">{formatCash(portfolioValue)}</p>
                    </CardBody>
                  </Card>
                  <Card shadow="sm" className="bg-surface-1/70 border-default-200 group relative">
                    <CardBody className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.1em] text-default-500">
                          <DollarSign className="h-4 w-4" />
                          Cash
                        </div>
                        {cashRank !== null && (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-primary">
                            <Trophy className="h-3 w-3" />
                            #{cashRank}
                          </span>
                        )}
                      </div>
                      <p className="text-xl font-bold text-foreground">{formatCash(userCash)}</p>
                      {/* CEO Income Tooltip */}
                      {primaryCorporation && (primaryCorporation.ceo_salary ?? 100000) > 0 && (
                        <div className="mt-2 flex items-center gap-1">
                          <Chip size="sm" color="success" variant="flat" className="h-5 text-xs px-1">
                            +${((primaryCorporation.ceo_salary ?? 100000) / 96).toLocaleString(undefined, { maximumFractionDigits: 2 })}/hr
                          </Chip>
                          <span className="text-xs text-default-500">CEO</span>
                        </div>
                      )}
                    </CardBody>
                  </Card>
                  <Card shadow="sm" className="bg-warning-50/70 border-warning-200 dark:bg-warning-900/20 dark:border-warning-800">
                    <CardBody className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.1em] text-warning">
                          <Zap className="h-4 w-4" />
                          Actions
                        </div>
                      </div>
                      <p className="text-xl font-bold text-warning">{userActions}</p>
                    </CardBody>
                  </Card>
                </div>

                {/* User Info */}
                <div className="space-y-2">
                  <p className="text-sm text-content-secondary text-center">
                    Executive at{' '}
                    {corpSummary.id ? (
                      <Link
                        href={`/corporation/${corpSummary.id}`}
                        className="font-semibold text-content-primary hover:text-accent transition-colors"
                      >
                        {corpSummary.name}
                      </Link>
                    ) : (
                      <span className="font-semibold text-content-primary">{corpSummary.name}</span>
                    )}
                  </p>
                  <div className="flex items-center justify-center gap-2 text-xs text-content-tertiary">
                    <Clock3 className="h-3 w-3" />
                    <span>Joined {joinedLabel}</span>
                  </div>
                  {profile.last_seen_at !== undefined && (
                    <div className={`flex items-center justify-center gap-2 text-xs ${
                      profile.is_online 
                        ? 'text-status-success' 
                        : 'text-content-tertiary'
                    }`}>
                      <Circle 
                        className={`h-2 w-2 ${profile.is_online ? 'fill-status-success' : 'fill-content-tertiary'}`} 
                      />
                      <span>{formatLastSeen(profile.last_seen_at, profile.is_online)}</span>
                    </div>
                  )}
                </div>
              </CardBody>
              {profile.bio && (
                <div className="px-6 pb-6">
                  <Card shadow="sm" className="bg-surface-1/70 border-default-200">
                    <CardBody className="p-4">
                      <div className="flex items-center gap-2 text-xs font-semibold uppercase text-default-500 mb-2">
                        <UserIcon className="h-4 w-4" />
                        Bio
                      </div>
                      <p className="text-sm text-default-600">{profile.bio}</p>
                    </CardBody>
                  </Card>
                </div>
              )}
              <CardFooter className="relative border-t border-default-200 px-6 py-4 bg-transparent">
                <div className="flex flex-wrap items-center gap-3">
                  <Chip startContent={<Link2 className="h-3 w-3" />} variant="flat" color="primary" size="sm" className="bg-primary/10 text-primary">
                    Profile ID #{canonicalProfileId}
                  </Chip>
                </div>
              </CardFooter>
            </Card>


            <Card className="bg-surface-1/80 border-default-200 backdrop-blur-md" shadow="lg">
              <CardHeader className="flex items-center justify-between pb-2 px-6 pt-6">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-default-500">
                    Corporate history
                  </p>
                  <p className="text-lg font-semibold text-foreground">Timeline</p>
                </div>
                <ClipboardList className="h-5 w-5 text-primary" />
              </CardHeader>
              <CardBody className="space-y-4 px-6 pb-6">
                {/* Corporate history events (sorted by date, most recent first) */}
                {corporateHistory.map((historyItem, idx) => {
                  const eventDate = new Date(historyItem.date);
                  const dateLabel = eventDate.toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  });

                  // Determine icon and styling based on event type
                  const getEventStyle = () => {
                    switch (historyItem.type) {
                      case 'founded':
                        return {
                          bgClass: 'bg-gradient-to-br from-status-success to-status-success/80 text-white',
                          icon: <Building2 className="h-4 w-4" />,
                          label: `Founded ${historyItem.corporation_name}`,
                        };
                      case 'elected_ceo':
                        return {
                          bgClass: 'bg-gradient-to-br from-accent to-accent-subtle text-white',
                          icon: <Trophy className="h-4 w-4" />,
                          label: `Elected CEO of ${historyItem.corporation_name}`,
                        };
                      case 'lost_ceo':
                        return {
                          bgClass: 'bg-surface-2 text-content-secondary',
                          icon: <Building2 className="h-4 w-4" />,
                          label: `Left CEO position at ${historyItem.corporation_name}`,
                        };
                      case 'ceo_resigned':
                        return {
                          bgClass: 'bg-status-warning-bg text-status-warning dark:bg-status-warning-bg/50',
                          icon: <Clock3 className="h-4 w-4" />,
                          label: `Resigned as CEO of ${historyItem.corporation_name}`,
                        };
                      default:
                        return {
                          bgClass: 'bg-surface-2 text-content-secondary',
                          icon: <Building2 className="h-4 w-4" />,
                          label: historyItem.details || 'Corporate event',
                        };
                    }
                  };

                  const style = getEventStyle();
                  const isLast = idx === corporateHistory.length - 1;

                  return (
                    <div key={`${historyItem.type}-${historyItem.corporation_id}-${historyItem.date}`} className="flex gap-3">
                      <div className="relative">
                        {!isLast && (
                          <div className="absolute inset-x-1/2 top-8 h-full w-px -translate-x-1/2 bg-line-subtle" />
                        )}
                        <div className={`relative flex h-8 w-8 items-center justify-center rounded-full shadow-sm ${style.bgClass}`}>
                          {style.icon}
                        </div>
                      </div>
                      <Link
                        href={`/corporation/${historyItem.corporation_id}`}
                        className="flex-1 rounded-xl border border-line-subtle bg-surface-1/70 p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md hover:border-accent/30"
                      >
                        <p className="text-sm font-semibold text-content-primary">{style.label}</p>
                        <p className="text-xs text-content-tertiary">{dateLabel}</p>
                        {historyItem.details && historyItem.type !== 'founded' && (
                          <p className="text-xs text-content-tertiary mt-1">{historyItem.details}</p>
                        )}
                      </Link>
                    </div>
                  );
                })}

                {/* Profile created (always shown at the bottom) */}
                <div className="flex gap-3">
                  <div className="relative">
                    <div className="relative flex h-8 w-8 items-center justify-center rounded-full bg-surface-2 text-content-tertiary shadow-sm">
                      <UserIcon className="h-4 w-4" />
                    </div>
                  </div>
                  <div className="flex-1 rounded-xl border border-line-subtle bg-surface-1/70 p-4 shadow-sm">
                    <p className="text-sm font-semibold text-content-primary">Profile created</p>
                    <p className="text-xs text-content-tertiary">{joinedLabel}</p>
                  </div>
                </div>

                {/* Empty state if no corporate history */}
                {corporateHistory.length === 0 && (
                  <div className="text-center py-4">
                    <p className="text-sm text-content-tertiary">No corporate positions yet</p>
                  </div>
                )}
              </CardBody>
            </Card>
          </section>

          <aside className="space-y-6 min-w-0">
            {/* Quick Actions - moved below user info */}
            <Card className="bg-surface-1/80 border-default-200 backdrop-blur-md" shadow="lg">
              <CardHeader className="flex items-center justify-between pb-2 px-6 pt-6">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-default-500">
                    Quick Actions
                  </p>
                  <p className="text-lg font-semibold text-foreground">
                    {isOwner ? 'Corporate Management' : 'User Actions'}
                  </p>
                </div>
                <Settings className="h-5 w-5 text-primary" />
              </CardHeader>
              <CardBody className="space-y-4 px-6 pb-6">
              {isOwner ? (
                <div className="space-y-4 text-sm text-default-600">
                  <div className="flex items-center justify-between rounded-xl border border-default-200 bg-surface-1/70 p-3 shadow-sm">
                    <span>Buy/Sell Investments</span>
                    <Button 
                      size="sm" 
                      variant="bordered" 
                      className="border-default-200 text-default-600"
                      onPress={() => router.push('/portfolio')}
                    >
                      Manage
                    </Button>
                  </div>
                  <div className="flex items-center justify-between rounded-xl border border-default-200 bg-surface-1/70 p-3 shadow-sm">
                    <span>Build Production Units</span>
                    <Button 
                      size="sm" 
                      variant="bordered" 
                      className="border-default-200 text-default-600"
                      onPress={() => {
                        if (!primaryCorporation) {
                          router.push('/corporation/create');
                        } else {
                          router.push('/corporate-actions');
                        }
                      }}
                    >
                      Build
                    </Button>
                  </div>
                  <div className="flex items-center justify-between rounded-xl border border-default-200 bg-surface-1/70 p-3 shadow-sm">
                    <span>Set Corporate Policy</span>
                    <Button 
                      size="sm" 
                      variant="bordered" 
                      className="border-default-200 text-default-600"
                      onPress={() => {
                        if (!primaryCorporation) {
                          router.push('/corporation/create');
                        } else {
                          router.push('/corporate-actions');
                        }
                      }}
                    >
                      Configure
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4 text-sm text-default-600">
                  <Button
                    onPress={() => setSendCashOpen(true)}
                    className="w-full justify-between h-auto py-3 px-4 bg-surface-1/70 border-default-200"
                    variant="bordered"
                  >
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-primary" />
                      <span className="text-foreground">Send Cash</span>
                    </div>
                    <span className="text-xs text-default-500">Transfer money</span>
                  </Button>
                  <Button
                    onPress={() => setSendMessageOpen(true)}
                    className="w-full justify-between h-auto py-3 px-4 bg-surface-1/70 border-default-200"
                    variant="bordered"
                  >
                    <div className="flex items-center gap-2">
                      <UserIcon className="h-4 w-4 text-primary" />
                      <span className="text-foreground">Send Message</span>
                    </div>
                    <span className="text-xs text-default-500">Start conversation</span>
                  </Button>
                </div>
              )}
              </CardBody>
            </Card>

            {/* Corporation Tab - moved below quick actions */}
            <Card className="bg-surface-1/80 border-default-200 backdrop-blur-md" shadow="lg">
              <CardHeader className="flex items-start justify-between gap-3 px-6 pt-6 pb-2">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-default-500">
                      Primary corporation
                    </p>
                    {corpSummary.id ? (
                      <Link
                        href={`/corporation/${corpSummary.id}`}
                        className="text-lg font-semibold text-foreground hover:text-primary transition-colors"
                      >
                        {corpSummary.name}
                      </Link>
                    ) : (
                      <p className="text-lg font-semibold text-foreground">{corpSummary.name}</p>
                    )}
                  </div>
                  <Chip size="sm" color="primary" variant="flat" className="bg-primary/10 text-primary">
                    Stable
                  </Chip>
              </CardHeader>
              <CardBody className="px-6 pb-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <Card shadow="sm" className="bg-surface-1/70 border-default-200">
                    <CardBody className="p-4">
                      <div className="flex items-center gap-2 text-sm font-semibold text-default-500">
                        <DollarSign className="h-4 w-4 text-primary" />
                        Revenue
                      </div>
                      <p className="mt-2 text-foreground">{corpSummary.revenue}</p>
                    </CardBody>
                  </Card>
                  <Card shadow="sm" className="bg-surface-1/70 border-default-200">
                    <CardBody className="p-4">
                      <div className="flex items-center gap-2 text-sm font-semibold text-default-500">
                        <TrendingUp className="h-4 w-4 text-primary" />
                        Profit
                      </div>
                      <p className="mt-2 text-foreground">{corpSummary.profit}</p>
                    </CardBody>
                  </Card>
                  <Card shadow="sm" className="bg-surface-1/70 border-default-200">
                    <CardBody className="p-4">
                      <div className="flex items-center gap-2 text-sm font-semibold text-default-500">
                        <PieChart className="h-4 w-4 text-primary" />
                        Ownership
                      </div>
                      <p className="mt-2 text-foreground">{corpSummary.ownership}</p>
                    </CardBody>
                  </Card>
                  <Card shadow="sm" className="bg-surface-1/70 border-default-200">
                    <CardBody className="p-4">
                      <div className="flex items-center gap-2 text-sm font-semibold text-default-500">
                        <BarChart3 className="h-4 w-4 text-primary" />
                        Market cap
                      </div>
                      <p className="mt-2 text-foreground">{corpSummary.marketCap}</p>
                    </CardBody>
                  </Card>
                </div>
                {corpFinances && corpFinances.markets_count > 0 ? (
                  <Card className="mt-5 border-emerald-200/50 bg-emerald-50/50 dark:border-emerald-800/50 dark:bg-emerald-900/20 shadow-none">
                    <CardBody className="p-4 text-sm text-emerald-700 dark:text-emerald-300">
                      <div className="flex items-center gap-2">
                        <Activity className="h-4 w-4" />
                        Active in {corpFinances.markets_count} market{corpFinances.markets_count !== 1 ? 's' : ''} with {corpFinances.total_retail_units + corpFinances.total_production_units + corpFinances.total_service_units} total units. Revenue figures are 96-hour projections.
                      </div>
                    </CardBody>
                  </Card>
                ) : (
                  <Card className="mt-5 border-dashed border-primary/30 bg-primary/5 shadow-none">
                    <CardBody className="p-4 text-sm text-primary">
                      <div className="flex items-center gap-2">
                        <Activity className="h-4 w-4" />
                        No market operations yet. Enter markets via the States page to generate revenue.
                      </div>
                    </CardBody>
                  </Card>
                )}
              </CardBody>
            </Card>
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
              onSuccess={(newBalance) => {
                // Update cash balance
                setUserCash(newBalance);
                
                // If viewing own profile, also update the profile data
                if (isOwner && viewerProfile) {
                  setViewerProfile({ ...viewerProfile, cash: newBalance });
                }
                
                // Refresh profile data to get updated cash
                const refreshProfile = async () => {
                  try {
                    const updatedProfile = await profileAPI.getById(profileId);
                    setProfile(updatedProfile);
                    if (updatedProfile.cash !== undefined) {
                      setUserCash(updatedProfile.cash);
                    }
                  } catch (err: unknown) {
                    console.warn('Failed to refresh profile after cash transfer:', err);
                  }
                };
                refreshProfile();
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
