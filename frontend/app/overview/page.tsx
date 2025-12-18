'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AppNavigation from '@/components/AppNavigation';
import { authAPI, portfolioAPI, corporationAPI, gameAPI, ServerTimeResponse } from '@/lib/api';
import {
  Clock,
  Building2,
  Factory,
  Store,
  Briefcase,
  TrendingUp,
  TrendingDown,
  Users,
  Target,
  Zap,
  BarChart3,
  ArrowRight,
  Sparkles,
  DollarSign,
  PieChart,
  Layers,
  Settings,
  Lightbulb,
  Globe,
  Award,
  AlertCircle,
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
        } catch (err) {
          // Portfolio might not exist yet
          console.log('Portfolio not available');
        }

        // Fetch corporation count
        try {
          const corporations = await corporationAPI.getAll();
          setCorporationCount(corporations.length);
        } catch (err) {
          console.log('Could not fetch corporations');
        }

        // Fetch game time to check if crons are running
        try {
          const time = await gameAPI.getTime();
          setGameTime(time);
        } catch (err) {
          console.log('Could not fetch game time');
        }
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
      <AppNavigation>
        <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-corporate-blue dark:border-corporate-blue-light"></div>
            <div className="text-lg text-gray-600 dark:text-gray-300 font-medium">Loading your dashboard...</div>
          </div>
        </div>
      </AppNavigation>
    );
  }

  return (
    <AppNavigation>
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {/* Hero Section */}
        <div className="mb-10">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div>
              <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 dark:text-white mb-2">
                Welcome back,{' '}
                <span className="text-corporate-blue dark:text-corporate-blue-light">
                  {user?.player_name || user?.username || 'Executive'}
                </span>
                !
              </h1>
              <p className="text-lg text-gray-600 dark:text-gray-400 mt-2">
                Your corporate command center
              </p>
            </div>
            {user?.starting_state && (
              <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-corporate-blue/10 to-blue-100 dark:from-corporate-blue/20 dark:to-blue-900/30 border border-corporate-blue/20 dark:border-corporate-blue/30">
                <Globe className="w-5 h-5 text-corporate-blue dark:text-corporate-blue-light" />
                <span className="text-sm font-semibold text-gray-900 dark:text-white">
                  {user.starting_state}
                </span>
              </div>
            )}
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <div className="bg-white dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-2">
                <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
                  <DollarSign className="w-5 h-5 text-green-600 dark:text-green-400" />
                </div>
                <DollarSign className="w-5 h-5 text-green-500" />
              </div>
              <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Cash</h3>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                ${(user?.cash ?? 0).toLocaleString()}
              </p>
            </div>

            <div className="bg-white dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-2">
                <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                  <PieChart className="w-5 h-5 text-corporate-blue dark:text-corporate-blue-light" />
                </div>
                <TrendingUp className="w-5 h-5 text-green-500" />
              </div>
              <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Portfolio Value</h3>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                ${portfolioValue !== null ? portfolioValue.toLocaleString() : '0'}
              </p>
            </div>

            <div className="bg-white dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-2">
                <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                  <Building2 className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                </div>
                <BarChart3 className="w-5 h-5 text-purple-500" />
              </div>
              <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Active Corporations</h3>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{corporationCount}</p>
            </div>

            <div className="bg-white dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-2">
                <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
                  <Clock className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                {gameTime ? (
                  <Zap className="w-5 h-5 text-emerald-500" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-amber-500" />
                )}
              </div>
              <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Game Status</h3>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {gameTime ? 'Turns Active' : 'Connecting...'}
              </p>
              {gameTime && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Next turn in {Math.floor(gameTime.seconds_until_action_update / 60)}m {gameTime.seconds_until_action_update % 60}s
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid lg:grid-cols-3 gap-6 mb-8">
          {/* Game Mechanics - Main Section */}
          <div className="lg:col-span-2 space-y-6">
            {/* Core Mechanics */}
            <div className="bg-white dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
              <div className="bg-gradient-to-r from-corporate-blue to-blue-600 dark:from-corporate-blue dark:to-blue-700 px-6 py-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-white/20 backdrop-blur-sm">
                    <Clock className="w-6 h-6 text-white" />
                  </div>
                  <h2 className="text-2xl font-bold text-white">Game Mechanics</h2>
                </div>
              </div>
              <div className="p-6 space-y-6">
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg p-5 border border-blue-100 dark:border-blue-800/50">
                  <div className="flex items-start gap-4">
                    <div className="p-2 rounded-lg bg-corporate-blue/10 dark:bg-corporate-blue/20 flex-shrink-0">
                      <Clock className="w-6 h-6 text-corporate-blue dark:text-corporate-blue-light" />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                        Hourly Turn-Based Gameplay
                      </h3>
                      <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                        The game operates on an hourly turn system. Each hour, you'll have the opportunity to make strategic decisions about your corporation. Plan your moves carefully as time progresses, and adapt to market conditions and competitor actions.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Unit Types */}
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <Layers className="w-5 h-5 text-corporate-blue dark:text-corporate-blue-light" />
                    Unit Types
                  </h3>
                  <div className="grid md:grid-cols-3 gap-4">
                    <div className="bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 rounded-lg border border-orange-200 dark:border-orange-800/50 p-5 hover:shadow-md transition-shadow">
                      <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-900/30 w-fit mb-3">
                        <Factory className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                      </div>
                      <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Production Units</h4>
                      <p className="text-sm text-gray-700 dark:text-gray-300">
                        Manufacture goods and materials. Essential for creating products to sell or use in your supply chain.
                      </p>
                    </div>
                    <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-lg border border-green-200 dark:border-green-800/50 p-5 hover:shadow-md transition-shadow">
                      <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30 w-fit mb-3">
                        <Store className="w-5 h-5 text-green-600 dark:text-green-400" />
                      </div>
                      <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Retail Units</h4>
                      <p className="text-sm text-gray-700 dark:text-gray-300">
                        Sell products directly to consumers. Maximize your market reach and revenue streams.
                      </p>
                    </div>
                    <div className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 rounded-lg border border-blue-200 dark:border-blue-800/50 p-5 hover:shadow-md transition-shadow">
                      <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30 w-fit mb-3">
                        <Briefcase className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      </div>
                      <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Service Units</h4>
                      <p className="text-sm text-gray-700 dark:text-gray-300">
                        Provide services to customers or other businesses. High-margin operations with different dynamics.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Integration Strategies */}
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-corporate-blue dark:text-corporate-blue-light" />
                    Integration Strategies
                  </h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-lg border border-purple-200 dark:border-purple-800/50 p-5 hover:shadow-md transition-shadow">
                      <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30 w-fit mb-3">
                        <ArrowRight className="w-5 h-5 text-purple-600 dark:text-purple-400 rotate-90" />
                      </div>
                      <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Vertical Integration</h4>
                      <p className="text-sm text-gray-700 dark:text-gray-300">
                        Control your entire supply chain from raw materials to final sale. Reduce costs and dependencies but requires more capital and management.
                      </p>
                    </div>
                    <div className="bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-indigo-900/20 dark:to-blue-900/20 rounded-lg border border-indigo-200 dark:border-indigo-800/50 p-5 hover:shadow-md transition-shadow">
                      <div className="p-2 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 w-fit mb-3">
                        <ArrowRight className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                      </div>
                      <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Horizontal Integration</h4>
                      <p className="text-sm text-gray-700 dark:text-gray-300">
                        Expand within the same level of the supply chain. Increase market share and economies of scale in your current operations.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Labor Policy */}
                <div className="bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-900/20 dark:to-yellow-900/20 rounded-lg border border-amber-200 dark:border-amber-800/50 p-5">
                  <div className="flex items-start gap-4">
                    <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex-shrink-0">
                      <Users className="w-6 h-6 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                        Labor Policy Focus
                      </h3>
                      <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                        Customize your labor policies to balance costs, productivity, and employee satisfaction. Different strategies will affect your operational efficiency, reputation, and long-term sustainability.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Sector Focus */}
                <div className="bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-900/20 dark:to-purple-900/20 rounded-lg border border-violet-200 dark:border-violet-800/50 p-5">
                  <div className="flex items-start gap-4">
                    <div className="p-2 rounded-lg bg-violet-100 dark:bg-violet-900/30 flex-shrink-0">
                      <Target className="w-6 h-6 text-violet-600 dark:text-violet-400" />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                        Sector Focus
                      </h3>
                      <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                        Choose to specialize in specific business sectors such as technology, manufacturing, retail, finance, or services. Each sector has unique characteristics, opportunities, and challenges that will shape your corporate strategy.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <div className="bg-white dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
              <div className="bg-gradient-to-r from-emerald-500 to-teal-600 dark:from-emerald-600 dark:to-teal-700 px-6 py-4">
                <div className="flex items-center gap-3">
                  <Zap className="w-5 h-5 text-white" />
                  <h2 className="text-xl font-bold text-white">Quick Actions</h2>
                </div>
              </div>
              <div className="p-4 space-y-2">
                <button
                  onClick={() => router.push('/portfolio')}
                  className="w-full flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-600 transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <PieChart className="w-5 h-5 text-corporate-blue dark:text-corporate-blue-light" />
                    <span className="font-medium text-gray-900 dark:text-white">View Portfolio</span>
                  </div>
                  <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-corporate-blue dark:group-hover:text-corporate-blue-light transition-colors" />
                </button>
                <button
                  onClick={() => router.push('/stock-market')}
                  className="w-full flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-600 transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <BarChart3 className="w-5 h-5 text-corporate-blue dark:text-corporate-blue-light" />
                    <span className="font-medium text-gray-900 dark:text-white">Stock Market</span>
                  </div>
                  <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-corporate-blue dark:group-hover:text-corporate-blue-light transition-colors" />
                </button>
                <button
                  onClick={() => router.push('/corporations')}
                  className="w-full flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-600 transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <Building2 className="w-5 h-5 text-corporate-blue dark:text-corporate-blue-light" />
                    <span className="font-medium text-gray-900 dark:text-white">Corporations</span>
                  </div>
                  <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-corporate-blue dark:group-hover:text-corporate-blue-light transition-colors" />
                </button>
              </div>
            </div>

            {/* Tips & Info */}
            <div className="bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-blue-900/20 dark:via-indigo-900/20 dark:to-purple-900/20 rounded-xl border border-blue-200 dark:border-blue-800/50 p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                  <Lightbulb className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Pro Tips</h3>
              </div>
              <ul className="space-y-3 text-sm text-gray-700 dark:text-gray-300">
                <li className="flex items-start gap-2">
                  <Sparkles className="w-4 h-4 text-blue-500 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                  <span>Diversify your investments across multiple corporations to reduce risk.</span>
                </li>
                <li className="flex items-start gap-2">
                  <Sparkles className="w-4 h-4 text-blue-500 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                  <span>Monitor market trends and competitor actions to stay ahead.</span>
                </li>
                <li className="flex items-start gap-2">
                  <Sparkles className="w-4 h-4 text-blue-500 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                  <span>Plan your moves strategically - timing is everything in this game.</span>
                </li>
              </ul>
            </div>

            {/* Coming Soon Notice */}
            <div className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 rounded-xl border border-amber-200 dark:border-amber-800/50 p-6 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex-shrink-0">
                  <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Coming Soon</h3>
                  <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                    The full game dashboard and advanced gameplay features are currently under development. Check back soon to start building your corporate empire!
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom CTA Section */}
        <div className="bg-gradient-to-r from-corporate-blue via-blue-600 to-indigo-700 dark:from-corporate-blue dark:via-blue-700 dark:to-indigo-800 rounded-xl p-8 shadow-lg">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-3">
                <Award className="w-8 h-8 text-white" />
                <h3 className="text-2xl font-bold text-white">Ready to Build Your Empire?</h3>
              </div>
              <p className="text-blue-100 dark:text-blue-200 text-lg">
                Start making strategic decisions and grow your corporate portfolio today.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => router.push('/stock-market')}
                className="px-6 py-3 bg-white text-corporate-blue rounded-lg font-semibold hover:bg-blue-50 transition-colors shadow-md hover:shadow-lg flex items-center gap-2"
              >
                Explore Market
                <ArrowRight className="w-5 h-5" />
              </button>
              <button
                onClick={() => router.push('/corporations')}
                className="px-6 py-3 bg-blue-500/20 backdrop-blur-sm text-white border-2 border-white/30 rounded-lg font-semibold hover:bg-blue-500/30 transition-colors flex items-center gap-2"
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
