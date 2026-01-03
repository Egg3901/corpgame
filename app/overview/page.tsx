'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AppNavigation from '@/components/AppNavigation';
import { authAPI, portfolioAPI, corporationAPI, gameAPI, profileAPI, marketsAPI, ServerTimeResponse, CorporationResponse } from '@/lib/api';
import { formatCash, getErrorMessage } from '@/lib/utils';
import {
  Clock,
  Building2,
  DollarSign,
  PieChart,
  Zap,
  AlertCircle,
  ArrowRight,
  TrendingUp,
  Globe,
  BookOpen,
  Target,
  Briefcase,
  BarChart3,
  Users,
  ShoppingCart,
  Layers,
  CheckCircle2,
  PlayCircle,
  Wallet,
  MapPin,
} from 'lucide-react';

interface User {
  id: number;
  profile_id: number;
  username: string;
  player_name?: string;
  email?: string;
  starting_state?: string;
  cash?: number;
}

export default function OverviewPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [portfolioValue, setPortfolioValue] = useState<number | null>(null);
  const [corporationCount, setCorporationCount] = useState<number>(0);
  const [gameTime, setGameTime] = useState<ServerTimeResponse | null>(null);
  const [actionPoints, setActionPoints] = useState<number>(0);
  const [marketCount, setMarketCount] = useState<number>(0);
  const [myCorporation, setMyCorporation] = useState<CorporationResponse | null>(null);

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

        // Fetch portfolio data if available
        try {
          const portfolio = await portfolioAPI.getByUserId(userData.id);
          setPortfolioValue(portfolio.total_value);
        } catch (err: unknown) {
          console.log('Portfolio not available:', getErrorMessage(err));
        }

        // Fetch corporation count
        try {
          const corporations = await corporationAPI.getAll();
          setCorporationCount(corporations.length);
        } catch (err: unknown) {
          console.log('Could not fetch corporations:', getErrorMessage(err));
        }

        // Fetch game time
        try {
          const time = await gameAPI.getTime();
          setGameTime(time);
        } catch (err: unknown) {
          console.log('Could not fetch game time:', getErrorMessage(err));
        }

        // Fetch action points from profile
        try {
          const profile = await profileAPI.getById(userData.profile_id.toString());
          setActionPoints(profile.actions || 0);
        } catch (err: unknown) {
          console.log('Could not fetch profile:', getErrorMessage(err));
        }

        // Check if user is CEO and fetch market count
        try {
          const corporations = await corporationAPI.getAll();
          const userCorp = corporations.find(
            (corp: CorporationResponse) => corp.ceo?.profile_id === userData.profile_id || corp.ceo_id === userData.id
          );
          if (userCorp) {
            setMyCorporation(userCorp);
            // Fetch market entries for the corporation
            try {
              const entries = await marketsAPI.getCorporationEntries(userCorp.id);
              // Count unique states from market entries
              const uniqueStates = new Set(entries.map((entry) => entry.state_code));
              setMarketCount(uniqueStates.size);
            } catch (err: unknown) {
              console.log('Could not fetch market entries:', getErrorMessage(err));
            }
          }
        } catch (err: unknown) {
          console.log('Could not check CEO status:', getErrorMessage(err));
        }
      } catch (error: unknown) {
        console.error('Auth check failed:', getErrorMessage(error));
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
      <AppNavigation>
        <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-corporate-blue dark:border-corporate-blue-light bloomberg:border-bloomberg-green"></div>
            <div className="text-lg text-gray-600 dark:text-gray-300 bloomberg:text-bloomberg-green font-medium">Loading your dashboard...</div>
          </div>
        </div>
      </AppNavigation>
    );
  }

  return (
    <AppNavigation>
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 dark:text-white bloomberg:text-bloomberg-green-bright mb-2">
                Welcome back,{' '}
                <span className="text-corporate-blue dark:text-corporate-blue-light bloomberg:text-bloomberg-green">
                  {user?.player_name || user?.username || 'Executive'}
                </span>
                !
              </h1>
              <p className="text-lg text-gray-600 dark:text-gray-400 bloomberg:text-bloomberg-green-dim mt-2">
                Your corporate command center
              </p>
            </div>
            {user?.starting_state && (
              <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-corporate-blue/10 to-blue-100 dark:from-corporate-blue/20 dark:to-blue-900/30 bloomberg:from-bloomberg-green/10 bloomberg:to-bloomberg-green/20 border border-corporate-blue/20 dark:border-corporate-blue/30 bloomberg:border-bloomberg-green">
                <Globe className="w-5 h-5 text-corporate-blue dark:text-corporate-blue-light bloomberg:text-bloomberg-green" />
                <span className="text-sm font-semibold text-gray-900 dark:text-white bloomberg:text-bloomberg-green-bright">
                  {user.starting_state}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Stats Cards - Keep at Top */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
          <div className="bg-white dark:bg-gray-800/50 bloomberg:bg-black bloomberg:border-bloomberg-green rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-2">
              <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30 bloomberg:bg-bloomberg-green/10">
                <DollarSign className="w-5 h-5 text-green-600 dark:text-green-400 bloomberg:text-bloomberg-green" />
              </div>
            </div>
            <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 bloomberg:text-bloomberg-green-dim mb-1">Cash</h3>
            <p className="text-2xl font-bold text-gray-900 dark:text-white bloomberg:text-bloomberg-green-bright">
              {formatCash(user?.cash ?? 0)}
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800/50 bloomberg:bg-black bloomberg:border-bloomberg-green rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-2">
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30 bloomberg:bg-bloomberg-green/10">
                <PieChart className="w-5 h-5 text-corporate-blue dark:text-corporate-blue-light bloomberg:text-bloomberg-green" />
              </div>
            </div>
            <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 bloomberg:text-bloomberg-green-dim mb-1">Portfolio Value</h3>
            <p className="text-2xl font-bold text-gray-900 dark:text-white bloomberg:text-bloomberg-green-bright">
              {formatCash(portfolioValue ?? 0)}
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800/50 bloomberg:bg-black bloomberg:border-bloomberg-green rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-2">
              <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30 bloomberg:bg-bloomberg-green/10">
                <Building2 className="w-5 h-5 text-purple-600 dark:text-purple-400 bloomberg:text-bloomberg-green" />
              </div>
            </div>
            <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 bloomberg:text-bloomberg-green-dim mb-1">Active Corporations</h3>
            <p className="text-2xl font-bold text-gray-900 dark:text-white bloomberg:text-bloomberg-green-bright">{corporationCount}</p>
          </div>

          <div className="bg-white dark:bg-gray-800/50 bloomberg:bg-black bloomberg:border-bloomberg-green rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-2">
              <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 bloomberg:bg-bloomberg-green/10">
                <Clock className="w-5 h-5 text-emerald-600 dark:text-emerald-400 bloomberg:text-bloomberg-green" />
              </div>
            </div>
            <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 bloomberg:text-bloomberg-green-dim mb-1">Game Status</h3>
            <p className="text-2xl font-bold text-gray-900 dark:text-white bloomberg:text-bloomberg-green-bright">
              {gameTime ? 'Active' : 'Connecting...'}
            </p>
            {gameTime && (
              <p className="text-xs text-gray-500 dark:text-gray-400 bloomberg:text-bloomberg-green-dim mt-1">
                Next turn: {Math.floor(gameTime.seconds_until_action_update / 60)}m {gameTime.seconds_until_action_update % 60}s
              </p>
            )}
          </div>

          {/* Action Points Card */}
          <div className="bg-white dark:bg-gray-800/50 bloomberg:bg-black bloomberg:border-bloomberg-green rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-2">
              <div className="p-2 rounded-lg bg-yellow-100 dark:bg-yellow-900/30 bloomberg:bg-bloomberg-green/10">
                <Zap className="w-5 h-5 text-yellow-600 dark:text-yellow-400 bloomberg:text-bloomberg-green" />
              </div>
            </div>
            <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 bloomberg:text-bloomberg-green-dim mb-1">Action Points</h3>
            <p className="text-2xl font-bold text-gray-900 dark:text-white bloomberg:text-bloomberg-green-bright">
              {actionPoints}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 bloomberg:text-bloomberg-green-dim mt-1">
              Available to spend
            </p>
          </div>

          {/* Net Worth Card */}
          <div className="bg-white dark:bg-gray-800/50 bloomberg:bg-black bloomberg:border-bloomberg-green rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-2">
              <div className="p-2 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 bloomberg:bg-bloomberg-green/10">
                <Wallet className="w-5 h-5 text-indigo-600 dark:text-indigo-400 bloomberg:text-bloomberg-green" />
              </div>
            </div>
            <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 bloomberg:text-bloomberg-green-dim mb-1">Net Worth</h3>
            <p className="text-2xl font-bold text-gray-900 dark:text-white bloomberg:text-bloomberg-green-bright">
              {formatCash((user?.cash ?? 0) + (portfolioValue ?? 0))}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 bloomberg:text-bloomberg-green-dim mt-1">
              Cash + Investments
            </p>
          </div>

          {/* Market Presence Card */}
          <div className="bg-white dark:bg-gray-800/50 bloomberg:bg-black bloomberg:border-bloomberg-green rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-2">
              <div className="p-2 rounded-lg bg-rose-100 dark:bg-rose-900/30 bloomberg:bg-bloomberg-green/10">
                <MapPin className="w-5 h-5 text-rose-600 dark:text-rose-400 bloomberg:text-bloomberg-green" />
              </div>
            </div>
            <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 bloomberg:text-bloomberg-green-dim mb-1">Market Presence</h3>
            <p className="text-2xl font-bold text-gray-900 dark:text-white bloomberg:text-bloomberg-green-bright">
              {myCorporation ? marketCount : '—'}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 bloomberg:text-bloomberg-green-dim mt-1">
              {myCorporation ? 'States with operations' : 'Become CEO to expand'}
            </p>
          </div>
        </div>

        {/* Getting Started Guide */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 rounded-xl bg-gradient-to-br from-corporate-blue to-blue-600 dark:from-corporate-blue dark:to-blue-700 bloomberg:from-bloomberg-green bloomberg:to-bloomberg-green-dim">
              <BookOpen className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white bloomberg:text-bloomberg-green-bright">Getting Started Guide</h2>
              <p className="text-gray-600 dark:text-gray-400 bloomberg:text-bloomberg-green-dim">Learn the fundamentals of Corporate Warfare</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            {/* Step 1: Understanding the Game */}
            <div className="bg-white dark:bg-gray-800/50 bloomberg:bg-black rounded-xl border border-gray-200 dark:border-gray-700 bloomberg:border-bloomberg-green shadow-sm overflow-hidden group hover:shadow-lg transition-shadow">
              <div className="bg-gradient-to-br from-blue-500 to-indigo-600 dark:from-blue-600 dark:to-indigo-700 bloomberg:from-bloomberg-green bloomberg:to-bloomberg-green-dim px-6 py-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center font-bold text-white">
                    1
                  </div>
                  <h3 className="text-xl font-bold text-white">Understand the Game</h3>
                </div>
              </div>
              <div className="p-6 space-y-4">
                <div className="flex items-start gap-3">
                  <Clock className="w-5 h-5 text-blue-500 dark:text-blue-400 bloomberg:text-bloomberg-green mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold text-gray-900 dark:text-white bloomberg:text-bloomberg-green-bright mb-1">Hourly Turns</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400 bloomberg:text-bloomberg-green-dim">
                      The game operates on an hourly turn system. Make strategic decisions each hour to grow your empire.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Target className="w-5 h-5 text-blue-500 dark:text-blue-400 bloomberg:text-bloomberg-green mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold text-gray-900 dark:text-white bloomberg:text-bloomberg-green-bright mb-1">Your Goal</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400 bloomberg:text-bloomberg-green-dim">
                      Build a profitable business empire through investments, corporations, and strategic planning.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <TrendingUp className="w-5 h-5 text-blue-500 dark:text-blue-400 bloomberg:text-bloomberg-green mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold text-gray-900 dark:text-white bloomberg:text-bloomberg-green-bright mb-1">Strategy Matters</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400 bloomberg:text-bloomberg-green-dim">
                      Success requires careful planning, market analysis, and adapting to competition.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Step 2: Explore Opportunities */}
            <div className="bg-white dark:bg-gray-800/50 bloomberg:bg-black rounded-xl border border-gray-200 dark:border-gray-700 bloomberg:border-bloomberg-green shadow-sm overflow-hidden group hover:shadow-lg transition-shadow">
              <div className="bg-gradient-to-br from-emerald-500 to-teal-600 dark:from-emerald-600 dark:to-teal-700 bloomberg:from-bloomberg-green bloomberg:to-bloomberg-green-dim px-6 py-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center font-bold text-white">
                    2
                  </div>
                  <h3 className="text-xl font-bold text-white">Explore Opportunities</h3>
                </div>
              </div>
              <div className="p-6 space-y-4">
                <button
                  onClick={() => router.push('/stock-market')}
                  className="w-full flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50 bloomberg:bg-black bloomberg:border bloomberg:border-bloomberg-green-dim hover:bg-gray-100 dark:hover:bg-gray-700 bloomberg:hover:border-bloomberg-green transition-colors group/btn"
                >
                  <div className="flex items-center gap-3">
                    <BarChart3 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 bloomberg:text-bloomberg-green" />
                    <div className="text-left">
                      <div className="font-semibold text-gray-900 dark:text-white bloomberg:text-bloomberg-green-bright">Stock Market</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 bloomberg:text-bloomberg-green-dim">Buy and sell investments</div>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-gray-400 group-hover/btn:text-emerald-600 dark:group-hover/btn:text-emerald-400 bloomberg:group-hover/btn:text-bloomberg-green transition-colors" />
                </button>
                <button
                  onClick={() => router.push('/corporations')}
                  className="w-full flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50 bloomberg:bg-black bloomberg:border bloomberg:border-bloomberg-green-dim hover:bg-gray-100 dark:hover:bg-gray-700 bloomberg:hover:border-bloomberg-green transition-colors group/btn"
                >
                  <div className="flex items-center gap-3">
                    <Building2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 bloomberg:text-bloomberg-green" />
                    <div className="text-left">
                      <div className="font-semibold text-gray-900 dark:text-white bloomberg:text-bloomberg-green-bright">Corporations</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 bloomberg:text-bloomberg-green-dim">Browse all companies</div>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-gray-400 group-hover/btn:text-emerald-600 dark:group-hover/btn:text-emerald-400 bloomberg:group-hover/btn:text-bloomberg-green transition-colors" />
                </button>
                <button
                  onClick={() => router.push('/states')}
                  className="w-full flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50 bloomberg:bg-black bloomberg:border bloomberg:border-bloomberg-green-dim hover:bg-gray-100 dark:hover:bg-gray-700 bloomberg:hover:border-bloomberg-green transition-colors group/btn"
                >
                  <div className="flex items-center gap-3">
                    <Globe className="w-5 h-5 text-emerald-600 dark:text-emerald-400 bloomberg:text-bloomberg-green" />
                    <div className="text-left">
                      <div className="font-semibold text-gray-900 dark:text-white bloomberg:text-bloomberg-green-bright">States & Markets</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 bloomberg:text-bloomberg-green-dim">Regional economies</div>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-gray-400 group-hover/btn:text-emerald-600 dark:group-hover/btn:text-emerald-400 bloomberg:group-hover/btn:text-bloomberg-green transition-colors" />
                </button>
              </div>
            </div>

            {/* Step 3: Make Your Move */}
            <div className="bg-white dark:bg-gray-800/50 bloomberg:bg-black rounded-xl border border-gray-200 dark:border-gray-700 bloomberg:border-bloomberg-green shadow-sm overflow-hidden group hover:shadow-lg transition-shadow">
              <div className="bg-gradient-to-br from-purple-500 to-pink-600 dark:from-purple-600 dark:to-pink-700 bloomberg:from-bloomberg-green bloomberg:to-bloomberg-green-dim px-6 py-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center font-bold text-white">
                    3
                  </div>
                  <h3 className="text-xl font-bold text-white">Make Your Move</h3>
                </div>
              </div>
              <div className="p-6 space-y-4">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-purple-500 dark:text-purple-400 bloomberg:text-bloomberg-green mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold text-gray-900 dark:text-white bloomberg:text-bloomberg-green-bright mb-1">Invest Wisely</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400 bloomberg:text-bloomberg-green-dim">
                      Start by purchasing stocks or bonds in promising corporations.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-purple-500 dark:text-purple-400 bloomberg:text-bloomberg-green mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold text-gray-900 dark:text-white bloomberg:text-bloomberg-green-bright mb-1">Track Performance</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400 bloomberg:text-bloomberg-green-dim">
                      Monitor your portfolio and adjust your strategy based on market changes.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-purple-500 dark:text-purple-400 bloomberg:text-bloomberg-green mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold text-gray-900 dark:text-white bloomberg:text-bloomberg-green-bright mb-1">Grow & Expand</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400 bloomberg:text-bloomberg-green-dim">
                      Diversify your holdings and scale up your corporate empire.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => router.push('/portfolio')}
                  className="w-full mt-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-600 dark:from-purple-600 dark:to-pink-700 bloomberg:from-bloomberg-green bloomberg:to-bloomberg-green-dim text-white rounded-lg font-semibold hover:shadow-lg transition-all flex items-center justify-center gap-2"
                >
                  <PlayCircle className="w-5 h-5" />
                  View My Portfolio
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Core Concepts */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white bloomberg:text-bloomberg-green-bright mb-6">Core Concepts</h2>
          <div className="grid md:grid-cols-2 gap-6">
            {/* Business Sectors */}
            <div className="bg-white dark:bg-gray-800/50 bloomberg:bg-black rounded-xl border border-gray-200 dark:border-gray-700 bloomberg:border-bloomberg-green p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30 bloomberg:bg-bloomberg-green/10">
                  <Layers className="w-5 h-5 text-corporate-blue dark:text-corporate-blue-light bloomberg:text-bloomberg-green" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white bloomberg:text-bloomberg-green-bright">Business Sectors</h3>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 bloomberg:text-bloomberg-green-dim mb-4">
                Corporations operate across different sectors, each with unique characteristics:
              </p>
              <div className="space-y-3">
                <div className="flex items-start gap-2">
                  <Briefcase className="w-4 h-4 text-blue-500 dark:text-blue-400 bloomberg:text-bloomberg-green mt-0.5" />
                  <div>
                    <span className="font-medium text-gray-900 dark:text-white bloomberg:text-bloomberg-green-bright">Production:</span>
                    <span className="text-sm text-gray-600 dark:text-gray-400 bloomberg:text-bloomberg-green-dim ml-1">Manufacturing and raw materials</span>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <ShoppingCart className="w-4 h-4 text-blue-500 dark:text-blue-400 bloomberg:text-bloomberg-green mt-0.5" />
                  <div>
                    <span className="font-medium text-gray-900 dark:text-white bloomberg:text-bloomberg-green-bright">Retail:</span>
                    <span className="text-sm text-gray-600 dark:text-gray-400 bloomberg:text-bloomberg-green-dim ml-1">Direct consumer sales</span>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Users className="w-4 h-4 text-blue-500 dark:text-blue-400 bloomberg:text-bloomberg-green mt-0.5" />
                  <div>
                    <span className="font-medium text-gray-900 dark:text-white bloomberg:text-bloomberg-green-bright">Services:</span>
                    <span className="text-sm text-gray-600 dark:text-gray-400 bloomberg:text-bloomberg-green-dim ml-1">Professional and business services</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Investment Types */}
            <div className="bg-white dark:bg-gray-800/50 bloomberg:bg-black rounded-xl border border-gray-200 dark:border-gray-700 bloomberg:border-bloomberg-green p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30 bloomberg:bg-bloomberg-green/10">
                  <PieChart className="w-5 h-5 text-green-600 dark:text-green-400 bloomberg:text-bloomberg-green" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white bloomberg:text-bloomberg-green-bright">Investment Types</h3>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 bloomberg:text-bloomberg-green-dim mb-4">
                Different ways to grow your wealth in the game:
              </p>
              <div className="space-y-3">
                <div className="flex items-start gap-2">
                  <TrendingUp className="w-4 h-4 text-green-500 dark:text-green-400 bloomberg:text-bloomberg-green mt-0.5" />
                  <div>
                    <span className="font-medium text-gray-900 dark:text-white bloomberg:text-bloomberg-green-bright">Stocks:</span>
                    <span className="text-sm text-gray-600 dark:text-gray-400 bloomberg:text-bloomberg-green-dim ml-1">Equity ownership with higher risk/reward</span>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <BarChart3 className="w-4 h-4 text-green-500 dark:text-green-400 bloomberg:text-bloomberg-green mt-0.5" />
                  <div>
                    <span className="font-medium text-gray-900 dark:text-white bloomberg:text-bloomberg-green-bright">Bonds:</span>
                    <span className="text-sm text-gray-600 dark:text-gray-400 bloomberg:text-bloomberg-green-dim ml-1">Fixed income with lower risk</span>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <DollarSign className="w-4 h-4 text-green-500 dark:text-green-400 bloomberg:text-bloomberg-green mt-0.5" />
                  <div>
                    <span className="font-medium text-gray-900 dark:text-white bloomberg:text-bloomberg-green-bright">Resources:</span>
                    <span className="text-sm text-gray-600 dark:text-gray-400 bloomberg:text-bloomberg-green-dim ml-1">Commodities and raw materials</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Start CTA */}
        <div className="bg-gradient-to-r from-corporate-blue via-blue-600 to-indigo-700 dark:from-corporate-blue dark:via-blue-700 dark:to-indigo-800 bloomberg:from-black bloomberg:via-bloomberg-green/20 bloomberg:to-black bloomberg:border-2 bloomberg:border-bloomberg-green rounded-xl p-8 shadow-lg">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-3">
                <Zap className="w-8 h-8 text-white bloomberg:text-bloomberg-green-bright" />
                <h3 className="text-2xl font-bold text-white bloomberg:text-bloomberg-green-bright">Ready to Start?</h3>
              </div>
              <p className="text-blue-100 dark:text-blue-200 bloomberg:text-bloomberg-green-dim text-lg">
                Begin building your corporate empire and competing for market dominance.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => router.push('/stock-market')}
                className="px-6 py-3 bg-white text-corporate-blue bloomberg:bg-bloomberg-green bloomberg:text-black rounded-lg font-semibold hover:bg-blue-50 bloomberg:hover:bg-bloomberg-green-bright transition-colors shadow-md hover:shadow-lg flex items-center gap-2"
              >
                Explore Market
                <ArrowRight className="w-5 h-5" />
              </button>
              <button
                onClick={() => router.push('/corporations')}
                className="px-6 py-3 bg-blue-500/20 backdrop-blur-sm bloomberg:bg-black text-white bloomberg:text-bloomberg-green border-2 border-white/30 bloomberg:border-bloomberg-green rounded-lg font-semibold hover:bg-blue-500/30 bloomberg:hover:border-bloomberg-green-bright transition-colors flex items-center gap-2"
              >
                View Corporations
                <Building2 className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </AppNavigation>
  );
}
