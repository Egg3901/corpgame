'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Menu,
  Settings,
  User as UserIcon,
  Building2,
  TrendingUp,
  DollarSign,
  PieChart,
  BarChart3,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  Briefcase,
  Shield
} from 'lucide-react';
import { authAPI } from '@/lib/api';

const placeholderHistory = [
  { ceo: 'C.E.O. SAMPLE CORP', dateRange: '12/01/25 - 12/15/25' },
  { ceo: 'Acting CEO Placeholder Inc.', dateRange: '11/10/25 - 11/30/25' },
];

const navSections = [
  { id: 'overview', label: 'Overview' },
  { id: 'corporations', label: 'Corporations' },
  { id: 'states', label: 'States' },
  { id: 'actions', label: 'Actions' },
];

export default function ProfileDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [navOpen, setNavOpen] = useState(false);
  const [expandedNav, setExpandedNav] = useState<string | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      if (!token) {
        router.push('/login');
        return;
      }

      try {
        const userData = await authAPI.getMe();
        setUser(userData);
      } catch (error) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        router.push('/login');
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-lg text-gray-600">Loading dashboard…</div>
      </div>
    );
  }

  const displayName = user?.player_name || user?.username || 'Executive';
  const displayState = user?.starting_state || 'N/A';

  const corpSummary = {
    name: user?.corporation?.name || 'Sample Corp',
    revenue: user?.corporation?.revenue || '$0',
    profit: user?.corporation?.profit || '$0',
    ownership: user?.corporation?.ownership_share || '0%',
    marketCap: user?.corporation?.market_cap || '$0',
  };

  const fillerPortfolio = user?.portfolio_value || '$0';
  const fillerTitle = user?.title || 'Executive';

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <button
              onClick={() => setNavOpen(true)}
              className="p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100"
              aria-label="Open navigation"
            >
              <Menu className="w-6 h-6" />
            </button>

            <div className="flex-1 text-center">
              <p className="text-xs uppercase text-gray-500 tracking-wide">Welcome</p>
              <p className="text-lg font-semibold text-gray-900">
                {displayName} &bull; {displayState}
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <button className="p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100" aria-label="Settings">
                <Settings className="w-5 h-5" />
              </button>
              <button className="p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100" aria-label="User panel">
                <UserIcon className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        <div className="bg-white rounded-lg shadow px-6 py-4 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm text-gray-500 uppercase tracking-wide">Direct profile link</p>
            <p className="text-gray-900 font-medium">
              {typeof window !== 'undefined'
                ? `${window.location.origin}/profile`
                : 'your-domain.com/profile'}
            </p>
          </div>
          <div className="text-sm text-gray-600">
            <span className="font-semibold text-gray-900">Status:</span>{' '}
            {user?.is_admin ? 'Administrator' : 'Player'}
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[220px_1fr_280px]">
          {/* Navigation Column */}
          <aside className="bg-white rounded-lg shadow p-4 space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-gray-900 uppercase">Navigation</p>
              <Settings className="w-4 h-4 text-gray-400" />
            </div>

            <div className="space-y-2">
              {navSections.map((item) => (
                <button
                  key={item.id}
                  className="w-full text-left px-3 py-2 rounded-md text-gray-700 hover:bg-gray-100 hover:text-corporate-blue transition-colors text-sm font-medium"
                >
                  {item.label}
                </button>
              ))}

              <div className="border-t border-gray-200 pt-3">
                <button
                  onClick={() => setExpandedNav(expandedNav === 'corp' ? null : 'corp')}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-md text-gray-700 hover:bg-gray-100 hover:text-corporate-blue transition-colors text-sm font-semibold"
                >
                  My Corporation
                  {expandedNav === 'corp' ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </button>
                {expandedNav === 'corp' && (
                  <div className="pl-4 mt-2 space-y-1">
                    <button className="w-full text-left px-3 py-2 rounded-md text-gray-600 hover:bg-gray-50 hover:text-corporate-blue text-sm">
                      Finances
                    </button>
                    <button className="w-full text-left px-3 py-2 rounded-md text-gray-600 hover:bg-gray-50 hover:text-corporate-blue text-sm">
                      Operations
                    </button>
                  </div>
                )}
              </div>
            </div>
          </aside>

          {/* Main Content */}
          <section className="space-y-6">
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-start gap-6">
                <div className="flex-shrink-0">
                  <div className="w-24 h-24 bg-gray-200 rounded-lg flex items-center justify-center text-gray-400 text-xs">
                    IMAGE
                  </div>
                </div>

                <div className="flex-1 grid md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-500 uppercase font-medium">Name</p>
                    <p className="text-xl font-semibold text-gray-900">{displayName}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase font-medium">Title</p>
                    <p className="text-gray-700">{fillerTitle}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase font-medium">State</p>
                    <p className="text-gray-700">{displayState}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase font-medium">Portfolio</p>
                    <p className="text-gray-700">{fillerPortfolio}</p>
                  </div>
                  <div className="md:col-span-2">
                    <p className="text-xs text-gray-500 uppercase font-medium">Primary Corporation</p>
                    <p className="text-gray-700">{corpSummary.name}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-start gap-6">
                <div className="flex-shrink-0">
                  <div className="w-16 h-16 bg-corporate-blue rounded-lg flex items-center justify-center">
                    <Building2 className="w-8 h-8 text-white" />
                  </div>
                </div>
                <div className="flex-1 grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs uppercase text-gray-500 font-medium">Corp Name</p>
                    <p className="text-lg font-semibold text-gray-900">{corpSummary.name}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase text-gray-500 font-medium">Revenue</p>
                    <p className="text-gray-700 flex items-center gap-1">
                      <DollarSign className="w-4 h-4" />
                      {corpSummary.revenue}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase text-gray-500 font-medium">Profit</p>
                    <p className="text-gray-700 flex items-center gap-1">
                      <TrendingUp className="w-4 h-4" />
                      {corpSummary.profit}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase text-gray-500 font-medium">Ownership Share</p>
                    <p className="text-gray-700 flex items-center gap-1">
                      <PieChart className="w-4 h-4" />
                      {corpSummary.ownership}
                    </p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-xs uppercase text-gray-500 font-medium">Market Cap</p>
                    <p className="text-gray-700 flex items-center gap-1">
                      <BarChart3 className="w-4 h-4" />
                      {corpSummary.marketCap}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold uppercase text-gray-900">Corporate History</h3>
                <ClipboardList className="w-5 h-5 text-gray-400" />
              </div>
              <div className="space-y-3">
                {placeholderHistory.map((history, idx) => (
                  <div
                    key={idx}
                    className="border border-gray-200 rounded-lg p-4 hover:border-corporate-blue/40 transition-colors"
                  >
                    <p className="text-sm font-semibold text-gray-900">{history.ceo}</p>
                    <p className="text-xs text-gray-500">{history.dateRange}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Right Panel */}
          <aside className="space-y-6">
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold uppercase text-gray-900">User Panel</h3>
                <UserIcon className="w-5 h-5 text-gray-400" />
              </div>
              <div className="space-y-3 text-sm text-gray-700">
                <div className="flex items-center justify-between">
                  <span>Status</span>
                  <span className="font-semibold text-corporate-blue">
                    {user?.is_admin ? 'Admin' : 'Player'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Notifications</span>
                  <span className="text-gray-500">Placeholder</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Next Action</span>
                  <span className="text-gray-500">Pending</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold uppercase text-gray-900">Settings Panel</h3>
                <Settings className="w-5 h-5 text-gray-400" />
              </div>
              <div className="space-y-4 text-sm text-gray-700">
                <div className="flex items-center justify-between">
                  <span>Alerts</span>
                  <Shield className="w-4 h-4 text-gray-400" />
                </div>
                <div className="flex items-center justify-between">
                  <span>Capital</span>
                  <Briefcase className="w-4 h-4 text-gray-400" />
                </div>
                <div className="flex items-center justify-between">
                  <span>Boards</span>
                  <ClipboardList className="w-4 h-4 text-gray-400" />
                </div>
                <p className="text-xs text-gray-500">
                  Placeholder controls for upcoming customization features.
                </p>
              </div>
            </div>
          </aside>
        </div>
      </div>

      {navOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50" onClick={() => setNavOpen(false)}>
          <div
            className="fixed left-0 top-0 bottom-0 w-80 bg-white shadow-xl overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 uppercase">User</p>
                <p className="text-lg font-semibold text-gray-900">{displayName}</p>
              </div>
              <button
                onClick={() => setNavOpen(false)}
                className="p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100"
              >
                <Settings className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-2">
              {navSections.map((item) => (
                <button
                  key={item.id}
                  className="w-full text-left px-4 py-3 rounded-md text-gray-700 hover:bg-gray-100 hover:text-corporate-blue transition-colors font-medium"
                >
                  {item.label}
                </button>
              ))}

              <div className="pt-2 border-t border-gray-200">
                <button
                  onClick={() => setExpandedNav(expandedNav === 'corp' ? null : 'corp')}
                  className="w-full text-left px-4 py-3 rounded-md text-gray-700 hover:bg-gray-100 hover:text-corporate-blue transition-colors font-medium flex items-center justify-between"
                >
                  My Corporation
                  {expandedNav === 'corp' ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </button>
                {expandedNav === 'corp' && (
                  <div className="pl-8 space-y-1 mt-1">
                    <button className="w-full text-left px-4 py-2 rounded-md text-gray-600 hover:bg-gray-50 hover:text-corporate-blue transition-colors">
                      Finances
                    </button>
                    <button className="w-full text-left px-4 py-2 rounded-md text-gray-600 hover:bg-gray-50 hover:text-corporate-blue transition-colors">
                      Operations
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="p-6 border-t border-gray-200">
              <div className="bg-gray-50 rounded-lg p-6 text-center text-gray-500 text-sm">
                <p className="font-medium text-gray-900 mb-2">Page Content Placeholder</p>
                <p>Use the navigation to explore corporate sections.</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
