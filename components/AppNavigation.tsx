'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import {
  Navbar, 
  NavbarBrand, 
  NavbarContent, 
  NavbarItem, 
  NavbarMenu,
  NavbarMenuItem,
  Button,
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
  Avatar,
  Badge,
  Link as HeroLink
} from "@heroui/react";
import Link from 'next/link'; // Keep next/link for client-side navigation
import {
  Menu,
  X,
  Shield,
  ChevronDown,
  AlertCircle,
  MessageSquare,
  User,
  LogOut,
  Zap,
  DollarSign,
  Settings,
  Activity,
  Briefcase,
  TrendingUp,
  Building2,
  Map,
  FileText
} from 'lucide-react';
import { authAPI, profileAPI, ProfileResponse, corporationAPI, messagesAPI, CorporationResponse } from '@/lib/api';
import ServerTimeFooter from './ServerTimeFooter';
import { trackEvent } from '@/lib/analytics';
import { formatCash, getErrorMessage } from '@/lib/utils';

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
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [viewerProfileId, setViewerProfileId] = useState<number | null>(null);
  const [viewerProfile, setViewerProfile] = useState<ProfileResponse | null>(null);
  const [isCeo, setIsCeo] = useState<boolean>(false);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [myCorporationId, setMyCorporationId] = useState<number | null>(null);
  const [investmentsOpen, setInvestmentsOpen] = useState<boolean>(false);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [userActions, setUserActions] = useState<number>(0);
  const [userCash, setUserCash] = useState<number>(0);
  const [corpCash, setCorpCash] = useState<number | null>(null);

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
        } catch (err: unknown) {
          console.warn('Failed to fetch unread count:', getErrorMessage(err));
        }

        // Check if user is CEO of any corporation
        try {
          const corporations = await corporationAPI.getAll();
          const userCorp = corporations.find(
            (corp: CorporationResponse) => corp.ceo?.profile_id === me.profile_id || corp.ceo_id === me.id
          );
          if (userCorp) {
            setIsCeo(true);
            setMyCorporationId(userCorp.id);
            // Fetch corporation cash
            try {
              const corpData = await corporationAPI.getById(userCorp.id);
              setCorpCash(corpData.capital || 0);
            } catch (err: unknown) {
              console.warn('Failed to fetch corporation cash:', getErrorMessage(err));
            }
          }
        } catch (err: unknown) {
          console.warn('Failed to check CEO status:', getErrorMessage(err));
        }
      } catch (err: unknown) {
        console.warn('Viewer not authenticated:', getErrorMessage(err));
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
        setUserCash(typeof me.cash === 'number' && !Number.isNaN(me.cash) ? me.cash : 0);

        // Refresh corporation cash if CEO
        if (isCeo && myCorporationId) {
          try {
            const corpData = await corporationAPI.getById(myCorporationId);
            setCorpCash(corpData.capital || 0);
          } catch (err: unknown) {
            // Silent fail
          }
        }
      } catch (err: unknown) {
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

  const handleOpenAdmin = () => {
    setIsMenuOpen(false);
    router.push('/admin');
  };

  const handleOpenProfile = () => {
    setIsMenuOpen(false);
    if (viewerProfileId) {
      router.push(`/profile/${viewerProfileId}`);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/login');
  };

  const handleViewMessages = () => {
    router.push('/messages');
  };

  const handleSettings = () => {
    router.push('/settings');
  };

  const handleNavClick = (path: string) => {
    if (path === '#') return; // Placeholder links
    setIsMenuOpen(false);
    router.push(path);
  };

  return (
    <div className="relative min-h-screen text-foreground bg-background">
      {/* Skip link for keyboard navigation */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-white focus:rounded-lg focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
      >
        Skip to main content
      </a>
      <div className="pointer-events-none fixed inset-0 opacity-80 dark:opacity-0 bloomberg:opacity-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(59,130,246,0.12),transparent_35%),radial-gradient(circle_at_80%_0%,rgba(30,64,175,0.1),transparent_30%),radial-gradient(circle_at_50%_80%,rgba(15,23,42,0.06),transparent_40%)]" />
      </div>

      <Navbar 
        onMenuOpenChange={setIsMenuOpen} 
        isMenuOpen={isMenuOpen}
        maxWidth="xl" 
        position="sticky" 
        className="bg-background/70 backdrop-blur-md border-b border-divider relative"
        shouldHideOnScroll={false}
      >
        <NavbarContent className="gap-2">
          <NavbarBrand className="gap-2">
            {/* Single menu toggle (matches original blue hamburger styling) */}
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsMenuOpen((prev) => !prev);
              }}
              className="p-2 bg-primary/10 rounded-lg transition-colors hover:bg-primary/15"
              style={{ pointerEvents: 'auto' }}
              aria-label={isMenuOpen ? 'Close menu' : 'Open menu'}
              type="button"
            >
              {isMenuOpen ? (
                <X className="w-5 h-5 text-primary" />
              ) : (
                <Menu className="w-5 h-5 text-primary" />
              )}
            </button>
            <div className="leading-tight">
              <p className="text-[10px] uppercase tracking-[0.2em] text-default-500 hidden sm:block">Navigation</p>
              <p className="text-sm font-bold text-foreground truncate">Corporate Warfare</p>
            </div>
          </NavbarBrand>
        </NavbarContent>

        <NavbarContent justify="end" className="gap-2 sm:gap-4">
          {viewerProfileId && (
            <>
              {/* Actions Display */}
              <NavbarItem className="hidden sm:flex">
                <div className="group relative" onMouseEnter={() => trackEvent('view_action_points_tooltip')}>
                   <div className="inline-flex items-center gap-1 sm:gap-2 rounded-xl border px-2 sm:px-3 py-1.5 shadow-sm flex-shrink-0 border-warning/30 bg-warning/10 text-warning cursor-help">
                    <Zap className="w-4 h-4" />
                    <span className="text-sm font-semibold">{userActions}</span>
                    <span className="text-xs text-warning/80">Actions</span>
                  </div>
                  {/* Tooltip */}
                  <div className="absolute top-full right-0 mt-2 w-64 p-3 rounded-lg shadow-xl bg-content1 border border-default-200 z-50 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none translate-y-2 group-hover:translate-y-0 duration-200">
                    <h4 className="font-semibold text-foreground mb-1 text-sm flex items-center gap-2">
                      <Zap className="w-3 h-3 text-warning" />
                      Action Points
                    </h4>
                    <p className="text-xs text-default-500 leading-relaxed">
                      Action points are required to perform special operations like corporate espionage or rapid expansion. They regenerate over time or can be purchased.
                    </p>
                  </div>
                </div>
              </NavbarItem>

              {/* Cash Display */}
              <NavbarItem>
                <div className="inline-flex items-center gap-1 sm:gap-2 rounded-xl border px-2 sm:px-3 py-1.5 shadow-sm flex-shrink-0 border-success/30 bg-success/10 text-success">
                  <DollarSign className="w-4 h-4" />
                  <span className="text-sm font-semibold">{formatCash(userCash)}</span>
                  {corpCash !== null && (
                    <>
                      <span className="text-xs text-success/80">/</span>
                      <span className="text-xs text-success/80">{formatCash(corpCash)}</span>
                    </>
                  )}
                </div>
              </NavbarItem>

              <Dropdown placement="bottom-end">
                <DropdownTrigger>
                  <div className="flex items-center gap-2 cursor-pointer">
                    <Badge content={unreadCount > 0 ? (unreadCount > 9 ? '9+' : unreadCount) : null} color="danger" shape="circle" isInvisible={unreadCount === 0}>
                      <Avatar
                        isBordered
                        as="button"
                        className="transition-transform"
                        src={viewerProfile?.profile_image_url || "/defaultpfp.jpg"}
                        size="sm"
                      />
                    </Badge>
                    <div className="hidden sm:flex flex-col items-start">
                      <p className="text-sm font-semibold">{viewerProfile?.player_name || viewerProfile?.username || 'Profile'}</p>
                      <p className="text-[10px] text-default-500">#{viewerProfileId}</p>
                    </div>
                    <ChevronDown className="w-4 h-4 text-default-400 hidden sm:block" />
                  </div>
                </DropdownTrigger>
                <DropdownMenu aria-label="Profile Actions" variant="flat">
                  <DropdownItem key="profile" startContent={<User className="w-4 h-4" />} onPress={handleOpenProfile}>
                    View Profile
                  </DropdownItem>
                  <DropdownItem key="messages" startContent={<MessageSquare className="w-4 h-4" />} onPress={handleViewMessages}>
                    Messages
                    {unreadCount > 0 && (
                      <span className="ml-2 text-tiny bg-danger text-danger-foreground px-1.5 py-0.5 rounded-full">
                        {unreadCount}
                      </span>
                    )}
                  </DropdownItem>
                  <DropdownItem key="settings" startContent={<Settings className="w-4 h-4" />} onPress={handleSettings}>
                    Settings
                  </DropdownItem>
                  <DropdownItem key="logout" color="danger" startContent={<LogOut className="w-4 h-4" />} onPress={handleLogout}>
                    Logout
                  </DropdownItem>
                </DropdownMenu>
              </Dropdown>
            </>
          )}
        </NavbarContent>

        <NavbarMenu>
          <div className="flex flex-col gap-2 mt-4">
            <div className="px-2 mb-4">
              <p className="text-xs uppercase tracking-wide text-default-500 mb-2">Menu</p>
              <div className="flex items-center gap-3 p-2 rounded-lg bg-default-100">
                <Avatar src={viewerProfile?.profile_image_url || "/defaultpfp.jpg"} size="md" />
                <div>
                  <p className="font-semibold text-foreground">{viewerProfile?.player_name || viewerProfile?.username || 'Your Profile'}</p>
                  {viewerProfileId && <p className="text-xs text-default-500">Profile #{viewerProfileId}</p>}
                </div>
              </div>
            </div>

            {navSections.slice(0, 1).map((item) => (
              <NavbarMenuItem key={item.id}>
                <Link
                  className={`w-full flex items-center py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
                    pathname === item.path
                      ? "bg-primary/10 text-primary"
                      : "text-foreground hover:bg-default-100"
                  }`}
                  href={item.path}
                  onClick={() => setIsMenuOpen(false)}
                >
                  {item.label}
                </Link>
              </NavbarMenuItem>
            ))}

            <NavbarMenuItem>
              <div className="flex flex-col gap-1">
                <button
                  className="w-full flex items-center justify-between py-2 px-4 rounded-lg text-sm font-medium text-foreground hover:bg-default-100 transition-colors"
                  onClick={() => setInvestmentsOpen(!investmentsOpen)}
                >
                  <span>Buy/Sell Investments</span>
                  <ChevronDown className={`w-4 h-4 transition-transform ${investmentsOpen ? 'rotate-180' : ''}`} />
                </button>
                {investmentsOpen && (
                  <div className="pl-4 flex flex-col gap-1 border-l-2 border-default-200 ml-4 my-1">
                     <Link href="/portfolio" onClick={() => setIsMenuOpen(false)} className={`py-2 px-4 rounded-lg text-sm ${pathname === '/portfolio' ? 'text-primary font-semibold' : 'text-default-500 hover:text-foreground'}`}>
                        My Portfolio
                     </Link>
                     <Link href="/stock-market" onClick={() => setIsMenuOpen(false)} className={`py-2 px-4 rounded-lg text-sm ${pathname === '/stock-market' ? 'text-primary font-semibold' : 'text-default-500 hover:text-foreground'}`}>
                        Stock Market
                     </Link>
                     <Link href="/bonds" onClick={() => setIsMenuOpen(false)} className={`py-2 px-4 rounded-lg text-sm ${pathname === '/bonds' ? 'text-primary font-semibold' : 'text-default-500 hover:text-foreground'}`}>
                        Bond Market
                     </Link>
                  </div>
                )}
              </div>
            </NavbarMenuItem>

            {navSections.slice(2).map((item) => (
              <NavbarMenuItem key={item.id}>
                <Link
                  className={`w-full flex items-center py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
                    pathname === item.path
                      ? "bg-primary/10 text-primary"
                      : "text-foreground hover:bg-default-100"
                  }`}
                  href={item.path}
                  onClick={() => setIsMenuOpen(false)}
                >
                  {item.label}
                </Link>
              </NavbarMenuItem>
            ))}

            {isCeo && myCorporationId && (
              <NavbarMenuItem>
                <Link
                  className={`w-full flex items-center py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
                    pathname === `/corporation/${myCorporationId}`
                      ? "bg-primary/10 text-primary"
                      : "text-foreground hover:bg-default-100"
                  }`}
                  href={`/corporation/${myCorporationId}`}
                  onClick={() => setIsMenuOpen(false)}
                >
                  <Building2 className="w-4 h-4 mr-2" />
                  My Corporation
                </Link>
              </NavbarMenuItem>
            )}

            {isAdmin && (
              <NavbarMenuItem>
                <Link
                  className={`w-full flex items-center py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
                    pathname === '/admin'
                      ? "bg-danger/10 text-danger"
                      : "text-danger hover:bg-danger/5"
                  }`}
                  href="/admin"
                  onClick={() => setIsMenuOpen(false)}
                >
                  <Shield className="w-4 h-4 mr-2" />
                  Admin Panel
                </Link>
              </NavbarMenuItem>
            )}
          </div>
        </NavbarMenu>
      </Navbar>

      <main className="relative z-10 pb-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto pt-4">{children}</main>

      {/* Server Time Footer */}
      <ServerTimeFooter />
    </div>
  );
}

