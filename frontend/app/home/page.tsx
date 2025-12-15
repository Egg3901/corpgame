'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Menu, Settings, User as UserIcon, Building2, TrendingUp, DollarSign, PieChart, BarChart3 } from 'lucide-react';
import { authAPI } from '@/lib/api';

export default function HomePage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [navOpen, setNavOpen] = useState(false);
  const [expandedNav, setExpandedNav] = useState<string | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('token');
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
        <div className="text-lg text-gray-600">Loading...</div>
      </div>
    );
  }

  // Placeholder data - replace with actual data when available
  const isCEO = false; // TODO: Check if user is CEO
  const userTitle = null; // TODO: Get user title
  const portfolio = 'N/A'; // TODO: Get portfolio value
  const corporation = 'N/A'; // TODO: Get corporation name
  const corpName = 'Sample Corp'; // TODO: Get actual corp name
  const revenue = '$0'; // TODO: Get revenue
  const profit = '$0'; // TODO: Get profit
  const ownershipShare = '0%'; // TODO: Get ownership share
  const marketCap = '$0'; // TODO: Get market cap
  const corporateHistory = [
    { ceo: 'C.E.O. SAMPLE CORP', dateRange: '12/1/25 - 12/15/25' }
  ]; // TODO: Get actual history

  const displayName = user?.player_name || user?.username || 'User';
  const displayState = user?.starting_state || 'N/A';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header Bar */}
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Hamburger Menu */}
            <button
              onClick={() => setNavOpen(!navOpen)}
              className="p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100"
              aria-label="Toggle navigation"
            >
              <Menu className="w-6 h-6" />
            </button>

            {/* Center: User Game Name and State */}
            <div className="flex-1 text-center">
              <span className="text-gray-900 font-medium">
                {displayName}, {displayState}
              </span>
            </div>

            {/* Right: Settings and User Icon */}
            <div className="flex items-center space-x-2">
              <button
                className="p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                aria-label="Settings"
              >
                <Settings className="w-5 h-5" />
              </button>
              <button
                className="p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                aria-label="User Profile"
              >
                <UserIcon className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid lg:grid-cols-4 gap-6">
          {/* Main Content Area */}
          <div className="lg:col-span-3 space-y-6">
            {/* Card 1: User Profile Card */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-start gap-6">
                {/* Image Placeholder */}
                <div className="flex-shrink-0">
                  <div className="w-24 h-24 bg-gray-200 rounded-lg flex items-center justify-center text-gray-400 text-xs">
                    IMAGE
                  </div>
                </div>

                {/* User Info */}
                <div className="flex-1 space-y-2">
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase">Name</label>
                    <p className="text-lg font-semibold text-gray-900">{displayName}</p>
                  </div>
                  
                  {userTitle && (
                    <div>
                      <label className="text-xs font-medium text-gray-500 uppercase">Title</label>
                      <p className="text-gray-700">{userTitle}</p>
                    </div>
                  )}

                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase">State</label>
                    <p className="text-gray-700">{displayState}</p>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase">Portfolio</label>
                    <p className="text-gray-700">{portfolio}</p>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase">Corporation</label>
                    <p className="text-gray-700">{corporation}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Card 2: CEO Section (Conditional) */}
            {isCEO && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <div className="flex items-start gap-6">
                  {/* CORP Icon */}
                  <div className="flex-shrink-0">
                    <div className="w-16 h-16 bg-corporate-blue rounded-lg flex items-center justify-center">
                      <Building2 className="w-8 h-8 text-white" />
                    </div>
                  </div>

                  {/* Corporate Info */}
                  <div className="flex-1 grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-medium text-gray-500 uppercase">CORP NAME</label>
                      <p className="text-lg font-semibold text-gray-900">{corpName}</p>
                    </div>

                    <div>
                      <label className="text-xs font-medium text-gray-500 uppercase">Revenue</label>
                      <p className="text-gray-700 flex items-center gap-1">
                        <DollarSign className="w-4 h-4" />
                        {revenue}
                      </p>
                    </div>

                    <div>
                      <label className="text-xs font-medium text-gray-500 uppercase">Profit</label>
                      <p className="text-gray-700 flex items-center gap-1">
                        <TrendingUp className="w-4 h-4" />
                        {profit}
                      </p>
                    </div>

                    <div>
                      <label className="text-xs font-medium text-gray-500 uppercase">Ownership Share</label>
                      <p className="text-gray-700 flex items-center gap-1">
                        <PieChart className="w-4 h-4" />
                        {ownershipShare}
                      </p>
                    </div>

                    <div className="col-span-2">
                      <label className="text-xs font-medium text-gray-500 uppercase">Mkt. Cap</label>
                      <p className="text-gray-700 flex items-center gap-1">
                        <BarChart3 className="w-4 h-4" />
                        {marketCap}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Navigation Menu */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-md p-6 sticky top-24">
              <h3 className="text-sm font-semibold text-gray-900 mb-4 uppercase">Navigation</h3>
              
              <nav className="space-y-2">
                <button className="w-full text-left px-3 py-2 rounded-md text-gray-700 hover:bg-gray-100 hover:text-corporate-blue transition-colors">
                  Actions
                </button>
                <button className="w-full text-left px-3 py-2 rounded-md text-gray-700 hover:bg-gray-100 hover:text-corporate-blue transition-colors">
                  CAPITAL
                </button>
                <button className="w-full text-left px-3 py-2 rounded-md text-gray-700 hover:bg-gray-100 hover:text-corporate-blue transition-colors">
                  STOCKS
                </button>
                <button className="w-full text-left px-3 py-2 rounded-md text-gray-700 hover:bg-gray-100 hover:text-corporate-blue transition-colors">
                  BONDS
                </button>
              </nav>

              {/* Corporate History Section */}
              <div className="mt-6 pt-6 border-t border-gray-200">
                <h4 className="text-xs font-semibold text-gray-900 mb-3 uppercase">Corporate History</h4>
                <div className="space-y-3">
                  {corporateHistory.length > 0 ? (
                    corporateHistory.map((history, idx) => (
                      <div key={idx} className="text-xs">
                        <p className="font-medium text-gray-900">{history.ceo}</p>
                        <p className="text-gray-600">{history.dateRange}</p>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-gray-500">No history available</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Expanded Navigation Overlay */}
      {navOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50" onClick={() => setNavOpen(false)}>
          <div 
            className="fixed left-0 top-0 bottom-0 w-80 bg-white shadow-xl overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Expanded Nav Header */}
            <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <span className="text-lg font-semibold text-gray-900">{displayName}</span>
              <button
                onClick={() => setNavOpen(false)}
                className="p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100"
              >
                <Settings className="w-5 h-5" />
              </button>
            </div>

            {/* Expanded Nav Options */}
            <div className="p-6 space-y-1">
              <button className="w-full text-left px-4 py-3 rounded-md text-gray-700 hover:bg-gray-100 hover:text-corporate-blue transition-colors font-medium">
                CORPORATIONS
              </button>
              <button className="w-full text-left px-4 py-3 rounded-md text-gray-700 hover:bg-gray-100 hover:text-corporate-blue transition-colors font-medium">
                STATES
              </button>
              
              {/* Expandable MY CORPORATION Section */}
              <div>
                <button
                  onClick={() => setExpandedNav(expandedNav === 'corp' ? null : 'corp')}
                  className="w-full text-left px-4 py-3 rounded-md text-gray-700 hover:bg-gray-100 hover:text-corporate-blue transition-colors font-medium flex items-center justify-between"
                >
                  MY CORPORATION
                  <span className="text-gray-400">{expandedNav === 'corp' ? '−' : '+'}</span>
                </button>
                {expandedNav === 'corp' && (
                  <div className="pl-8 space-y-1 mt-1">
                    <button className="w-full text-left px-4 py-2 rounded-md text-gray-600 hover:bg-gray-50 hover:text-corporate-blue transition-colors">
                      FINANCES
                    </button>
                    <button className="w-full text-left px-4 py-2 rounded-md text-gray-600 hover:bg-gray-50 hover:text-corporate-blue transition-colors">
                      OPERATIONS
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Page Content Area Indicator */}
            <div className="p-6 border-t border-gray-200">
              <div className="bg-gray-50 rounded-lg p-8 text-center text-gray-500 text-sm">
                <p className="mb-2">↓</p>
                <p>PAGE CONTENT</p>
                <p className="mt-2">↑</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


