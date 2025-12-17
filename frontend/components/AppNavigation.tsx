'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import {
  Menu,
  X,
  Shield,
  ChevronDown,
  ChevronRight,
  Sun,
  Moon,
  AlertCircle,
} from 'lucide-react';
import { authAPI, profileAPI, ProfileResponse, corporationAPI } from '@/lib/api';
import { useTheme } from './ThemeProvider';

interface AppNavigationProps {
  children: React.ReactNode;
}

const navSections = [
  { id: 'overview', label: 'Overview', path: '/overview' },
  { id: 'portfolio', label: 'Buy/Sell Investments', path: '/portfolio' },
  { id: 'corporate-actions', label: 'Corporate Actions', path: '#' },
  { id: 'corporations', label: 'Corporations', path: '/corporations' },
  { id: 'states', label: 'States', path: '#' },
];

export default function AppNavigation({ children }: AppNavigationProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();
  const [navOpen, setNavOpen] = useState(false);
  const [viewerProfileId, setViewerProfileId] = useState<number | null>(null);
  const [viewerProfile, setViewerProfile] = useState<ProfileResponse | null>(null);
  const [isCeo, setIsCeo] = useState<boolean>(false);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [myCorporationId, setMyCorporationId] = useState<number | null>(null);
  const [investmentsOpen, setInvestmentsOpen] = useState<boolean>(false);

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

  // Auto-expand investments dropdown if on stock-market or portfolio page
  useEffect(() => {
    if (pathname === '/stock-market' || pathname === '/portfolio') {
      setInvestmentsOpen(true);
    }
  }, [pathname]);

  const handleOpenAdmin = () => {
    setNavOpen(false);
    router.push('/admin');
  };

  const handleOpenProfile = () => {
    setNavOpen(false);
    if (viewerProfileId) {
      router.push(`/profile/${viewerProfileId}`);
    }
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
              {/* Theme Toggle Button */}
              <button
                type="button"
                onClick={toggleTheme}
                className="inline-flex items-center justify-center rounded-xl border border-gray-200 bg-white px-3 py-2 text-gray-700 shadow-sm transition hover:-translate-y-0.5 hover:border-corporate-blue hover:text-corporate-blue dark:border-gray-800 dark:bg-gray-800 dark:text-gray-200 dark:hover:border-corporate-blue-light dark:hover:text-corporate-blue-light"
                aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
              >
                {theme === 'light' ? (
                  <Moon className="w-5 h-5" />
                ) : (
                  <Sun className="w-5 h-5" />
                )}
              </button>
              {viewerProfileId && (
                <button
                  type="button"
                  onClick={handleOpenProfile}
                  className="group inline-flex items-center gap-3 rounded-2xl border border-white/70 bg-gradient-to-r from-white/90 to-white/60 px-3 py-2 text-left shadow-md transition hover:-translate-y-0.5 hover:shadow-lg dark:border-gray-800 dark:from-gray-800/90 dark:to-gray-900/80"
                >
                  <div className="relative flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl border border-white/60 bg-corporate-blue/10 dark:border-gray-700 dark:bg-gray-800">
                    <img
                      src={viewerProfile?.profile_image_url || "/defaultpfp.jpg"}
                      alt="Your profile avatar"
                      className="h-full w-full object-cover"
                      onError={(e) => {
                        e.currentTarget.src = "/defaultpfp.jpg";
                      }}
                    />
                  </div>
                  <div className="leading-tight">
                    <p className="text-[11px] uppercase tracking-wide text-gray-500 dark:text-gray-400">Profile</p>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">
                      {viewerProfile?.player_name || viewerProfile?.username || 'Your Profile'}
                    </p>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400">#{viewerProfileId}</p>
                  </div>
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="relative z-10">{children}</main>

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
              {/* Theme Toggle in Menu */}
              <button
                type="button"
                onClick={toggleTheme}
                className="w-full flex items-center justify-between rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-800 shadow-sm transition hover:-translate-y-0.5 hover:border-corporate-blue hover:text-corporate-blue dark:border-gray-800 dark:bg-gray-800 dark:text-gray-100 dark:hover:border-corporate-blue-light dark:hover:text-corporate-blue-light"
              >
                <div className="flex items-center gap-3">
                  {theme === 'light' ? (
                    <Moon className="w-5 h-5" />
                  ) : (
                    <Sun className="w-5 h-5" />
                  )}
                  <span>Switch to {theme === 'light' ? 'Dark' : 'Light'} Mode</span>
                </div>
              </button>

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
                      Stock Market
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
                      Portfolio
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
                Report Issue
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
