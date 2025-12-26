'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import {
  Menu,
  X,
  Shield,
  ChevronDown,
  ChevronRight,
  AlertCircle,
  MessageSquare,
  User,
  LogOut,
  Zap,
  DollarSign,
  Bell,
  Settings,
} from 'lucide-react';
import { authAPI, profileAPI, ProfileResponse, corporationAPI, messagesAPI } from '@/lib/api';
import ServerTimeFooter from './ServerTimeFooter';
import { formatCash } from '@/lib/utils';

interface AppNavigationProps {
  children: React.ReactNode;
}

const navSections = [
  { id: 'overview', label: 'Overview', path: '/overview' },
  { id: 'portfolio', label: 'Buy/Sell Investments', path: '/portfolio' },
  { id: 'corporate-actions', label: 'Corporate Actions', path: '/corporate-actions' },
  { id: 'corporations', label: 'Corporations', path: '/corporations' },
  { id: 'states', label: 'States & Markets', path: '/states' },
];

export default function AppNavigation({ children }: AppNavigationProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [navOpen, setNavOpen] = useState(false);
  const [viewerProfileId, setViewerProfileId] = useState<number | null>(null);
  const [viewerProfile, setViewerProfile] = useState<ProfileResponse | null>(null);
  const [isCeo, setIsCeo] = useState<boolean>(false);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [myCorporationId, setMyCorporationId] = useState<number | null>(null);
  const [investmentsOpen, setInvestmentsOpen] = useState<boolean>(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState<boolean>(false);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [userActions, setUserActions] = useState<number>(0);
  const [userCash, setUserCash] = useState<number>(0);
  const [corpCash, setCorpCash] = useState<number | null>(null);
  const profileDropdownRef = useRef<HTMLDivElement>(null);

  // Scroll animation state
  const [scrolled, setScrolled] = useState(false);
  const [scrollDirection, setScrollDirection] = useState<'up' | 'down' | null>(null);
  const lastScrollY = useRef(0);
  const ticking = useRef(false);

  // Scroll handler for navbar animation
  useEffect(() => {
    const handleScroll = () => {
      if (!ticking.current) {
        window.requestAnimationFrame(() => {
          const currentScrollY = window.scrollY;
          const threshold = 10;
          
          // Determine if scrolled past threshold
          setScrolled(currentScrollY > threshold);
          
          // Determine scroll direction with a small dead zone
          if (Math.abs(currentScrollY - lastScrollY.current) > 5) {
            setScrollDirection(currentScrollY > lastScrollY.current ? 'down' : 'up');
          }
          
          lastScrollY.current = currentScrollY;
          ticking.current = false;
        });
        ticking.current = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const loadViewer = async () => {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      if (!token) return;

      try {
        const me = await authAPI.getMe();
        setViewerProfileId(me.profile_id);
        setIsAdmin(me.is_admin || false);

        // Fetch viewer's full profile data for navigation
        if (me.profile_id) {
          const viewerData = await profileAPI.getById(me.profile_id.toString());
          setViewerProfile(viewerData);
          setUserActions(viewerData.actions || 0);
        }

        // Fetch user cash
        setUserCash(me.cash || 0);

        // Fetch unread message count
        try {
          const { count } = await messagesAPI.getUnreadCount();
          setUnreadCount(count);
        } catch (err) {
          console.warn('Failed to fetch unread count:', err);
        }

        // Check if user is CEO of any corporation
        try {
          const corporations = await corporationAPI.getAll();
          const userCorp = corporations.find(
            (corp: any) => corp.ceo?.profile_id === me.profile_id || corp.ceo_id === me.id
          );
          if (userCorp) {
            setIsCeo(true);
            setMyCorporationId(userCorp.id);
            // Fetch corporation cash
            try {
              const corpData = await corporationAPI.getById(userCorp.id);
              setCorpCash(corpData.capital || 0);
            } catch (err) {
              console.warn('Failed to fetch corporation cash:', err);
            }
          }
        } catch (err) {
          console.warn('Failed to check CEO status:', err);
        }
      } catch (err) {
        console.warn('Viewer not authenticated:', err);
      }
    };

    loadViewer();
  }, []);

  // Periodically refresh unread message count and cash
  useEffect(() => {
    if (!viewerProfileId) return;

    const fetchData = async () => {
      try {
        // Refresh unread count
        const { count } = await messagesAPI.getUnreadCount();
        setUnreadCount(count);

        // Refresh user cash
        const me = await authAPI.getMe();
        setUserCash(me.cash || 0);

        // Refresh corporation cash if CEO
        if (isCeo && myCorporationId) {
          try {
            const corpData = await corporationAPI.getById(myCorporationId);
            setCorpCash(corpData.capital || 0);
          } catch (err) {
            // Silent fail
          }
        }
      } catch (err) {
        // Silent fail for periodic updates
      }
    };

    // Refresh every 30 seconds
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [viewerProfileId, isCeo, myCorporationId]);

  // Auto-expand investments dropdown if on stock-market or portfolio page
  useEffect(() => {
    if (pathname === '/stock-market' || pathname === '/portfolio') {
      setInvestmentsOpen(true);
    }
  }, [pathname]);

  // Close profile dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(event.target as Node)) {
        setProfileDropdownOpen(false);
      }
    };

    if (profileDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [profileDropdownOpen]);

  const handleOpenAdmin = () => {
    setNavOpen(false);
    router.push('/admin');
  };

  const handleOpenProfile = () => {
    setNavOpen(false);
    setProfileDropdownOpen(false);
    if (viewerProfileId) {
      router.push(`/profile/${viewerProfileId}`);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setProfileDropdownOpen(false);
    router.push('/login');
  };

  const handleViewMessages = () => {
    setProfileDropdownOpen(false);
    router.push('/messages');
  };

  const handleSettings = () => {
    setProfileDropdownOpen(false);
    router.push('/settings');
  };

  const handleNavClick = (path: string) => {
    if (path === '#') return; // Placeholder links
    setNavOpen(false);
    router.push(path);
  };

  const handleCloseNav = () => {
    setNavOpen(false);
    setInvestmentsOpen(false);
  };

  return (
    <div
      className="relative min-h-screen text-[rgb(var(--foreground-rgb))] bloomberg:bg-black bloomberg:text-[#00ff41]"
      style={{
        background: `linear-gradient(to bottom, transparent, rgb(var(--background-end-rgb))) rgb(var(--background-start-rgb))`
      }}
    >
      <div className="pointer-events-none absolute inset-0 opacity-80 dark:opacity-0 bloomberg:opacity-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(59,130,246,0.12),transparent_35%),radial-gradient(circle_at_80%_0%,rgba(30,64,175,0.1),transparent_30%),radial-gradient(circle_at_50%_80%,rgba(15,23,42,0.06),transparent_40%)]" />
      </div>

      <header 
        className={`sticky top-0 z-50 transition-all duration-300 ease-out ${
          scrolled ? 'pb-1' : 'pb-2'
        }`}
      >
        <div 
          className={`mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 transition-all duration-300 ease-out ${
            scrolled ? 'pt-2' : 'pt-4'
          }`}
        >
          <div 
            className={`flex items-center justify-between rounded-2xl border px-2 sm:px-4 backdrop-blur-md transition-all duration-300 ease-out ${
              scrolled 
                ? 'py-2 border-white/80 bg-white/95 shadow-2xl shadow-gray-200/50 dark:border-gray-700/80 dark:bg-gray-900/95 dark:shadow-black/30 scale-[0.98] sm:scale-[0.99]' 
                : 'py-3 border-white/60 bg-white/90 shadow-xl dark:border-gray-800/60 dark:bg-gray-900/90'
            } ${
              scrollDirection === 'down' && scrolled 
                ? 'translate-y-0' 
                : scrollDirection === 'up' && scrolled 
                  ? '-translate-y-0.5' 
                  : ''
            }`}
            style={{
              transform: scrolled 
                ? `scale(${scrollDirection === 'down' ? 0.98 : 0.99}) translateY(${scrollDirection === 'up' ? '-2px' : '0'})` 
                : 'scale(1) translateY(0)',
            }}
          >
            <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-shrink">
              <button
                type="button"
                onClick={() => setNavOpen(true)}
                className="inline-flex items-center justify-center rounded-xl border border-gray-200 bg-white px-2 sm:px-3 py-2 text-gray-700 shadow-sm transition hover:-translate-y-0.5 hover:border-corporate-blue hover:text-corporate-blue dark:border-gray-800 dark:bg-gray-800 dark:text-gray-200 flex-shrink-0"
                aria-label="Open navigation"
              >
                <Menu className="w-5 h-5" />
              </button>
              <div className="leading-tight min-w-0">
                <p className="text-[11px] uppercase tracking-[0.2em] text-gray-500 dark:text-slate-400 hidden sm:block">Navigation</p>
                <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">Corporate Warfare</p>
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-shrink">
              {/* Actions Display */}
              {viewerProfileId && (
                <>
                  <div className="inline-flex items-center gap-1 sm:gap-2 rounded-xl border px-2 sm:px-3 py-2 shadow-sm flex-shrink-0 border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/50 dark:bg-amber-900/40 dark:text-amber-300">
                    <Zap className="w-4 h-4" />
                    <span className="text-sm font-semibold">{userActions}</span>
                    <span className="text-xs hidden sm:inline text-amber-600 dark:text-amber-400">Actions</span>
                  </div>
                  {/* Cash Display */}
                  <div className="inline-flex items-center gap-1 sm:gap-2 rounded-xl border px-2 sm:px-3 py-2 shadow-sm flex-shrink-0 border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/50 dark:bg-emerald-900/40 dark:text-emerald-300">
                    <DollarSign className="w-4 h-4" />
                    <span className="text-sm font-semibold">{formatCash(userCash)}</span>
                    {corpCash !== null && (
                      <>
                        <span className="text-xs hidden sm:inline text-emerald-600 dark:text-emerald-400">/</span>
                        <span className="text-xs hidden sm:inline text-emerald-600 dark:text-emerald-400">{formatCash(corpCash)}</span>
                      </>
                    )}
                  </div>
                </>
              )}
              {viewerProfileId && (
                <div className="relative flex-shrink-0" ref={profileDropdownRef}>
                  <button
                    type="button"
                    onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                    className="group relative inline-flex items-center gap-2 sm:gap-3 rounded-2xl border px-2 sm:px-3 py-2 text-left shadow-md transition hover:-translate-y-0.5 hover:shadow-lg border-white/70 bg-gradient-to-r from-white/90 to-white/60 dark:border-gray-600/70 dark:bg-gray-800 dark:from-transparent dark:to-transparent"
                  >
                    <div className="relative flex h-10 w-10 items-center justify-center overflow-visible rounded-xl border flex-shrink-0 border-white/60 bg-corporate-blue/10 dark:border-gray-600 dark:bg-gray-700">
                      <img
                        src={viewerProfile?.profile_image_url || "/defaultpfp.jpg"}
                        alt="Your profile avatar"
                        className="h-full w-full object-cover rounded-xl"
                        onError={(e) => {
                          e.currentTarget.src = "/defaultpfp.jpg";
                        }}
                      />
                      {/* Notification badge - always visible on profile picture */}
                      {unreadCount > 0 && (
                        <div className="absolute -top-1 -right-1 z-[100] flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-red-500 text-white text-xs font-bold shadow-lg animate-pulse border-2 border-white dark:border-gray-800">
                          {unreadCount > 9 ? '9+' : unreadCount}
                        </div>
                      )}
                    </div>
                    <div className="leading-tight hidden sm:block min-w-0">
                      <p className="text-[11px] uppercase tracking-wide text-gray-500 dark:text-gray-400">Profile</p>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white truncate max-w-[120px]">
                        {viewerProfile?.player_name || viewerProfile?.username || 'Your Profile'}
                      </p>
                      <p className="text-[11px] text-gray-500 dark:text-gray-400">#{viewerProfileId}</p>
                    </div>
                    <ChevronDown className={`w-4 h-4 text-gray-500 dark:text-gray-400 transition-transform flex-shrink-0 hidden sm:block ${profileDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {profileDropdownOpen && (
                    <div className="absolute right-0 mt-2 w-56 rounded-xl border border-gray-200/50 bg-white/95 shadow-2xl backdrop-blur dark:border-gray-700/50 dark:bg-gray-900/95 bloomberg:border-bloomberg-green bloomberg:bg-black/95 z-[9999] overflow-hidden">
                      <div className="py-1">
                        <button
                          onClick={handleViewMessages}
                          className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 bloomberg:text-bloomberg-green hover:bg-gray-100 dark:hover:bg-gray-800 bloomberg:hover:bg-bloomberg-green/10 transition-colors"
                        >
                          <MessageSquare className="w-4 h-4" />
                          <span>View Messages</span>
                          {unreadCount > 0 && (
                            <span className="ml-auto rounded-full bg-red-500 text-white text-xs font-bold px-2 py-0.5">
                              {unreadCount > 9 ? '9+' : unreadCount}
                            </span>
                          )}
                        </button>
                        <button
                          onClick={handleOpenProfile}
                          className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 bloomberg:text-bloomberg-green hover:bg-gray-100 dark:hover:bg-gray-800 bloomberg:hover:bg-bloomberg-green/10 transition-colors"
                        >
                          <User className="w-4 h-4" />
                          <span>View Profile</span>
                        </button>
                        <button
                          onClick={handleSettings}
                          className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 bloomberg:text-bloomberg-green hover:bg-gray-100 dark:hover:bg-gray-800 bloomberg:hover:bg-bloomberg-green/10 transition-colors"
                        >
                          <Settings className="w-4 h-4" />
                          <span>Settings</span>
                        </button>
                        <div className="my-1 border-t border-gray-200 dark:border-gray-700 bloomberg:border-bloomberg-green-dim" />
                        <button
                          onClick={handleLogout}
                          className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-600 dark:text-red-400 bloomberg:text-bloomberg-orange hover:bg-red-50 dark:hover:bg-red-900/20 bloomberg:hover:bg-bloomberg-orange/10 transition-colors"
                        >
                          <LogOut className="w-4 h-4" />
                          <span>Logout</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="relative z-10 pb-12">{children}</main>

      {/* Server Time Footer */}
      <ServerTimeFooter />

      {navOpen && (
        <div className="fixed inset-0 z-[60] bg-black/55 backdrop-blur-sm" onClick={() => setNavOpen(false)}>
          <div
            className="fixed left-0 top-0 bottom-0 w-80 sm:w-96 overflow-y-auto scrollbar-hide bg-white text-gray-900 shadow-2xl ring-1 ring-black/5 dark:bg-gray-900 dark:text-gray-100 dark:ring-white/10"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-gray-800">
              <div className="space-y-1">
                <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Menu</p>
                <button type="button" onClick={handleOpenProfile} className="text-left">
                  <p className="text-lg font-semibold text-gray-900 dark:text-white">
                    {viewerProfile?.player_name || viewerProfile?.username || 'Your Profile'}
                  </p>
                  {viewerProfileId && (
                    <p className="text-sm text-gray-500 dark:text-gray-400">Profile #{viewerProfileId}</p>
                  )}
                </button>
              </div>
              <button
                type="button"
                onClick={handleCloseNav}
                className="rounded-md p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-800 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200"
                aria-label="Close navigation"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-3">
              {/* Overview */}
              {navSections.slice(0, 1).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleNavClick(item.path)}
                  className={`w-full text-left rounded-lg border px-4 py-3 text-sm font-semibold shadow-sm transition hover:-translate-y-0.5 ${
                    pathname === item.path
                      ? 'border-corporate-blue bg-corporate-blue/10 text-corporate-blue dark:border-corporate-blue dark:bg-corporate-blue/20'
                      : 'border-gray-200 bg-white text-gray-800 hover:border-corporate-blue hover:text-corporate-blue dark:border-gray-800 dark:bg-gray-800 dark:text-gray-100'
                  }`}
                >
                  {item.label}
                  {item.path === '#' && (
                    <span className="ml-2 text-xs font-normal text-gray-500 dark:text-gray-400">(placeholder)</span>
                  )}
                </button>
              ))}

              {/* Buy/Sell Investments - Dropdown */}
              <div className="space-y-1">
                <button
                  type="button"
                  onClick={() => setInvestmentsOpen(!investmentsOpen)}
                  className={`w-full text-left rounded-lg border px-4 py-3 text-sm font-semibold shadow-sm transition hover:-translate-y-0.5 flex items-center justify-between ${
                    pathname === '/portfolio' || pathname === '/stock-market'
                      ? 'border-corporate-blue bg-corporate-blue/10 text-corporate-blue dark:border-corporate-blue dark:bg-corporate-blue/20'
                      : 'border-gray-200 bg-white text-gray-800 hover:border-corporate-blue hover:text-corporate-blue dark:border-gray-800 dark:bg-gray-800 dark:text-gray-100'
                  }`}
                >
                  <span>Buy/Sell Investments</span>
                  {investmentsOpen ? (
                    <ChevronDown className="w-4 h-4" />
                  ) : (
                    <ChevronRight className="w-4 h-4" />
                  )}
                </button>
                {investmentsOpen && (
                  <div className="ml-4 space-y-1 border-l-2 border-gray-200 dark:border-gray-700 pl-2">
                    <button
                      type="button"
                      onClick={() => handleNavClick('/stock-market')}
                      className={`w-full text-left rounded-lg border px-4 py-2 text-sm font-medium shadow-sm transition hover:-translate-y-0.5 ${
                        pathname === '/stock-market'
                          ? 'border-corporate-blue bg-corporate-blue/10 text-corporate-blue dark:border-corporate-blue dark:bg-corporate-blue/20'
                          : 'border-gray-200 bg-white text-gray-700 hover:border-corporate-blue hover:text-corporate-blue dark:border-gray-800 dark:bg-gray-800 dark:text-gray-200'
                      }`}
                    >
                      Stocks
                    </button>
                    <button
                      type="button"
                      onClick={() => handleNavClick('/stock-market?tab=products&subtab=resources')}
                      className={`w-full text-left rounded-lg border px-4 py-2 text-sm font-medium shadow-sm transition hover:-translate-y-0.5 ${
                        pathname?.startsWith('/commodity/')
                          ? 'border-corporate-blue bg-corporate-blue/10 text-corporate-blue dark:border-corporate-blue dark:bg-corporate-blue/20'
                          : 'border-gray-200 bg-white text-gray-700 hover:border-corporate-blue hover:text-corporate-blue dark:border-gray-800 dark:bg-gray-800 dark:text-gray-200'
                      }`}
                    >
                      Raw Resources
                    </button>
                    <button
                      type="button"
                      onClick={() => handleNavClick('/stock-market?tab=products&subtab=products')}
                      className={`w-full text-left rounded-lg border px-4 py-2 text-sm font-medium shadow-sm transition hover:-translate-y-0.5 ${
                        pathname?.startsWith('/product/')
                          ? 'border-corporate-blue bg-corporate-blue/10 text-corporate-blue dark:border-corporate-blue dark:bg-corporate-blue/20'
                          : 'border-gray-200 bg-white text-gray-700 hover:border-corporate-blue hover:text-corporate-blue dark:border-gray-800 dark:bg-gray-800 dark:text-gray-200'
                      }`}
                    >
                      Products
                    </button>
                    <button
                      type="button"
                      onClick={() => handleNavClick('/stock-market?tab=products&subtab=charts')}
                      className="w-full text-left rounded-lg border px-4 py-2 text-sm font-medium shadow-sm transition hover:-translate-y-0.5 border-gray-200 bg-white text-gray-700 hover:border-corporate-blue hover:text-corporate-blue dark:border-gray-800 dark:bg-gray-800 dark:text-gray-200"
                    >
                      Supply Chain
                    </button>
                    <button
                      type="button"
                      onClick={() => handleNavClick('/stock-market?tab=bonds')}
                      className={`w-full text-left rounded-lg border px-4 py-2 text-sm font-medium shadow-sm transition hover:-translate-y-0.5 ${
                        pathname === '/bonds'
                          ? 'border-corporate-blue bg-corporate-blue/10 text-corporate-blue dark:border-corporate-blue dark:bg-corporate-blue/20'
                          : 'border-gray-200 bg-white text-gray-700 hover:border-corporate-blue hover:text-corporate-blue dark:border-gray-800 dark:bg-gray-800 dark:text-gray-200'
                      }`}
                    >
                      Bonds
                    </button>
                    <button
                      type="button"
                      onClick={() => handleNavClick('/portfolio')}
                      className={`w-full text-left rounded-lg border px-4 py-2 text-sm font-medium shadow-sm transition hover:-translate-y-0.5 ${
                        pathname === '/portfolio'
                          ? 'border-corporate-blue bg-corporate-blue/10 text-corporate-blue dark:border-corporate-blue dark:bg-corporate-blue/20'
                          : 'border-gray-200 bg-white text-gray-700 hover:border-corporate-blue hover:text-corporate-blue dark:border-gray-800 dark:bg-gray-800 dark:text-gray-200'
                      }`}
                    >
                      My Portfolio
                    </button>
                  </div>
                )}
              </div>

              {/* Corporate Actions */}
              {navSections.slice(2, 3).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleNavClick(item.path)}
                  className={`w-full text-left rounded-lg border px-4 py-3 text-sm font-semibold shadow-sm transition hover:-translate-y-0.5 ${
                    pathname === item.path
                      ? 'border-corporate-blue bg-corporate-blue/10 text-corporate-blue dark:border-corporate-blue dark:bg-corporate-blue/20'
                      : 'border-gray-200 bg-white text-gray-800 hover:border-corporate-blue hover:text-corporate-blue dark:border-gray-800 dark:bg-gray-800 dark:text-gray-100'
                  }`}
                >
                  {item.label}
                  {item.path === '#' && (
                    <span className="ml-2 text-xs font-normal text-gray-500 dark:text-gray-400">(placeholder)</span>
                  )}
                </button>
              ))}

              {/* My Corporation */}
              {isCeo && myCorporationId && (
                <button
                  type="button"
                  onClick={() => handleNavClick(`/corporation/${myCorporationId}`)}
                  className={`w-full text-left rounded-lg border px-4 py-3 text-sm font-semibold shadow-sm transition hover:-translate-y-0.5 ${
                    pathname === `/corporation/${myCorporationId}`
                      ? 'border-corporate-blue bg-corporate-blue/10 text-corporate-blue dark:border-corporate-blue dark:bg-corporate-blue/20'
                      : 'border-gray-200 bg-white text-gray-800 hover:border-corporate-blue hover:text-corporate-blue dark:border-gray-800 dark:bg-gray-800 dark:text-gray-100'
                  }`}
                >
                  My Corporation
                </button>
              )}

              {/* Rest of navigation items */}
              {navSections.slice(3).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleNavClick(item.path)}
                  className={`w-full text-left rounded-lg border px-4 py-3 text-sm font-semibold shadow-sm transition hover:-translate-y-0.5 ${
                    pathname === item.path
                      ? 'border-corporate-blue bg-corporate-blue/10 text-corporate-blue dark:border-corporate-blue dark:bg-corporate-blue/20'
                      : 'border-gray-200 bg-white text-gray-800 hover:border-corporate-blue hover:text-corporate-blue dark:border-gray-800 dark:bg-gray-800 dark:text-gray-100'
                  }`}
                >
                  {item.label}
                  {item.path === '#' && (
                    <span className="ml-2 text-xs font-normal text-gray-500 dark:text-gray-400">(placeholder)</span>
                  )}
                </button>
              ))}

              {isAdmin && (
                <button
                  type="button"
                  onClick={handleOpenAdmin}
                  className="inline-flex w-full items-center gap-2 rounded-lg border border-purple-200 bg-purple-50 px-4 py-3 text-sm font-semibold text-purple-800 shadow-sm transition hover:-translate-y-0.5 hover:border-purple-400 hover:text-purple-900 dark:border-purple-800 dark:bg-purple-900/20 dark:text-purple-300"
                >
                  <Shield className="h-4 w-4" />
                  Admin Panel
                </button>
              )}
            </div>

            <div className="px-6 pb-6 space-y-3">
              <button
                type="button"
                onClick={() => {
                  handleNavClick('/report-issue');
                  setNavOpen(false);
                }}
                className="w-full flex items-center gap-2 rounded-lg border border-orange-200 bg-orange-50 px-4 py-3 text-sm font-semibold text-orange-800 shadow-sm transition hover:-translate-y-0.5 hover:border-orange-400 hover:text-orange-900 dark:border-orange-800 dark:bg-orange-900/20 dark:text-orange-300"
              >
                <AlertCircle className="h-4 w-4" />
                Feedback & Issues
              </button>
              <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 p-4 text-sm text-gray-700 shadow-sm dark:border-gray-800 dark:bg-gray-800/60 dark:text-gray-200">
                <p className="font-semibold text-gray-900 dark:text-white">Command Center</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Navigate your corporate empire—manage investments, execute strategic actions, and monitor your business operations from this central hub.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

