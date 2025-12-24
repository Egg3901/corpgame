'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import AppNavigation from '@/components/AppNavigation';
import { corporationAPI, CorporationResponse, authAPI, sharesAPI, marketsAPI, CorporationFinances, MarketEntryWithUnits, BalanceSheet } from '@/lib/api';
import { Building2, Edit, Trash2, TrendingUp, DollarSign, Users, User, Calendar, ArrowUp, ArrowDown, TrendingDown, Plus, BarChart3, MapPin, Store, Factory, Briefcase, Layers, Droplets, Package, Cpu, Zap, Wheat, Trees, FlaskConical, Box } from 'lucide-react';
import BoardTab from '@/components/BoardTab';
import StockPriceChart from '@/components/StockPriceChart';

// Sector to Resource mapping (must match backend)
const SECTOR_RESOURCES: Record<string, string | null> = {
  'Technology': 'Rare Earth',
  'Finance': null,
  'Healthcare': null,
  'Manufacturing': 'Steel',
  'Energy': 'Oil',
  'Retail': null,
  'Real Estate': null,
  'Transportation': 'Steel',
  'Media': null,
  'Telecommunications': 'Copper',
  'Agriculture': 'Fertile Land',
  'Defense': 'Steel',
  'Hospitality': null,
  'Construction': 'Lumber',
  'Pharmaceuticals': 'Chemical Compounds',
};

// Resource icon mapping
const RESOURCE_ICONS: Record<string, React.ReactNode> = {
  'Oil': <Droplets className="w-4 h-4" />,
  'Steel': <Package className="w-4 h-4" />,
  'Rare Earth': <Cpu className="w-4 h-4" />,
  'Copper': <Zap className="w-4 h-4" />,
  'Fertile Land': <Wheat className="w-4 h-4" />,
  'Lumber': <Trees className="w-4 h-4" />,
  'Chemical Compounds': <FlaskConical className="w-4 h-4" />,
};

// Resource color classes
const RESOURCE_COLORS: Record<string, string> = {
  'Oil': 'text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800',
  'Steel': 'text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800',
  'Rare Earth': 'text-violet-700 dark:text-violet-300 bg-violet-100 dark:bg-violet-800',
  'Copper': 'text-orange-700 dark:text-orange-300 bg-orange-100 dark:bg-orange-800',
  'Fertile Land': 'text-lime-700 dark:text-lime-300 bg-lime-100 dark:bg-lime-800',
  'Lumber': 'text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-800',
  'Chemical Compounds': 'text-cyan-700 dark:text-cyan-300 bg-cyan-100 dark:bg-cyan-800',
};

// Unit economics for revenue calculation (must match backend)
const UNIT_ECONOMICS = {
  retail: { baseRevenue: 500, baseCost: 300 },
  production: { baseRevenue: 800, baseCost: 600 },
  service: { baseRevenue: 400, baseCost: 200 },
};
const DISPLAY_PERIOD_HOURS = 96;

// US States for display
const US_STATES: Record<string, string> = {
  'AL': 'Alabama', 'AK': 'Alaska', 'AZ': 'Arizona', 'AR': 'Arkansas',
  'CA': 'California', 'CO': 'Colorado', 'CT': 'Connecticut', 'DE': 'Delaware',
  'FL': 'Florida', 'GA': 'Georgia', 'HI': 'Hawaii', 'ID': 'Idaho',
  'IL': 'Illinois', 'IN': 'Indiana', 'IA': 'Iowa', 'KS': 'Kansas',
  'KY': 'Kentucky', 'LA': 'Louisiana', 'ME': 'Maine', 'MD': 'Maryland',
  'MA': 'Massachusetts', 'MI': 'Michigan', 'MN': 'Minnesota', 'MS': 'Mississippi',
  'MO': 'Missouri', 'MT': 'Montana', 'NE': 'Nebraska', 'NV': 'Nevada',
  'NH': 'New Hampshire', 'NJ': 'New Jersey', 'NM': 'New Mexico', 'NY': 'New York',
  'NC': 'North Carolina', 'ND': 'North Dakota', 'OH': 'Ohio', 'OK': 'Oklahoma',
  'OR': 'Oregon', 'PA': 'Pennsylvania', 'RI': 'Rhode Island', 'SC': 'South Carolina',
  'SD': 'South Dakota', 'TN': 'Tennessee', 'TX': 'Texas', 'UT': 'Utah',
  'VT': 'Vermont', 'VA': 'Virginia', 'WA': 'Washington', 'WV': 'West Virginia',
  'WI': 'Wisconsin', 'WY': 'Wyoming'
};

export default function CorporationDetailPage() {
  const router = useRouter();
  const params = useParams();
  const corpId = parseInt(params.id as string, 10);
  
  const [corporation, setCorporation] = useState<CorporationResponse | null>(null);
  const [viewerUserId, setViewerUserId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [buyShares, setBuyShares] = useState('');
  const [sellShares, setSellShares] = useState('');
  const [issueShares, setIssueShares] = useState('');
  const [trading, setTrading] = useState(false);
  const [userOwnedShares, setUserOwnedShares] = useState(0);
  const [activeTab, setActiveTab] = useState<'overview' | 'sectors' | 'finance' | 'board'>('overview');
  const [corpFinances, setCorpFinances] = useState<CorporationFinances | null>(null);
  const [balanceSheet, setBalanceSheet] = useState<BalanceSheet | null>(null);
  const [marketEntries, setMarketEntries] = useState<MarketEntryWithUnits[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [corpData, userData, financesData] = await Promise.all([
          corporationAPI.getById(corpId),
          authAPI.getMe().catch(() => null),
          marketsAPI.getCorporationFinances(corpId).catch(() => null),
        ]);
        setCorporation(corpData);
        if (userData) {
          setViewerUserId(userData.id);
          // Find user's shares in this corporation
          const userShareholder = corpData.shareholders?.find(sh => sh.user_id === userData.id);
          setUserOwnedShares(userShareholder?.shares || 0);
        }
        if (financesData) {
          setCorpFinances(financesData.finances);
          setBalanceSheet(financesData.balance_sheet || null);
          setMarketEntries(financesData.market_entries || []);
        }
      } catch (err: any) {
        console.error('Failed to fetch corporation:', err);
        setError(err.response?.status === 404 ? 'Corporation not found' : 'Failed to load corporation');
      } finally {
        setLoading(false);
      }
    };

    if (!isNaN(corpId)) {
      fetchData();
    } else {
      setError('Invalid corporation ID');
      setLoading(false);
    }
  }, [corpId]);

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this corporation? This action cannot be undone.')) {
      return;
    }

    setDeleting(true);
    try {
      await corporationAPI.delete(corpId);
      router.push('/stock-market');
    } catch (err: any) {
      console.error('Failed to delete corporation:', err);
      alert(err.response?.data?.error || 'Failed to delete corporation');
      setDeleting(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const handleBuyShares = async () => {
    if (!corporation || !buyShares) return;
    
    const shares = parseInt(buyShares, 10);
    if (isNaN(shares) || shares <= 0) {
      alert('Please enter a valid number of shares');
      return;
    }

    if (shares > corporation.public_shares) {
      alert(`Only ${corporation.public_shares.toLocaleString()} public shares available`);
      return;
    }

    setTrading(true);
    try {
      const result = await sharesAPI.buy(corporation.id, shares);
      alert(`Successfully purchased ${shares.toLocaleString()} shares at ${formatCurrency(result.price_per_share)} each. Total: ${formatCurrency(result.total_cost!)}`);
      
      // Refresh corporation data
      const updatedCorp = await corporationAPI.getById(corporation.id);
      setCorporation(updatedCorp);
      
      // Update user's owned shares
      const userShareholder = updatedCorp.shareholders?.find(sh => sh.user_id === viewerUserId);
      setUserOwnedShares(userShareholder?.shares || 0);
      
      setBuyShares('');
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to buy shares');
    } finally {
      setTrading(false);
    }
  };

  const handleSellShares = async () => {
    if (!corporation || !sellShares) return;
    
    const shares = parseInt(sellShares, 10);
    if (isNaN(shares) || shares <= 0) {
      alert('Please enter a valid number of shares');
      return;
    }

    if (shares > userOwnedShares) {
      alert(`You only own ${userOwnedShares.toLocaleString()} shares`);
      return;
    }

    setTrading(true);
    try {
      const result = await sharesAPI.sell(corporation.id, shares);
      alert(`Successfully sold ${shares.toLocaleString()} shares at ${formatCurrency(result.price_per_share)} each. Total: ${formatCurrency(result.total_revenue!)}`);
      
      // Refresh corporation data
      const updatedCorp = await corporationAPI.getById(corporation.id);
      setCorporation(updatedCorp);
      
      // Update user's owned shares
      const userShareholder = updatedCorp.shareholders?.find(sh => sh.user_id === viewerUserId);
      setUserOwnedShares(userShareholder?.shares || 0);
      
      setSellShares('');
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to sell shares');
    } finally {
      setTrading(false);
    }
  };

  const handleIssueShares = async () => {
    if (!corporation || !issueShares) return;
    
    const shares = parseInt(issueShares, 10);
    if (isNaN(shares) || shares <= 0) {
      alert('Please enter a valid number of shares');
      return;
    }

    const maxIssueable = Math.floor(corporation.shares * 0.1);
    if (shares > maxIssueable) {
      alert(`Cannot issue more than ${maxIssueable.toLocaleString()} shares (10% of ${corporation.shares.toLocaleString()} outstanding)`);
      return;
    }

    setTrading(true);
    try {
      const result = await sharesAPI.issue(corporation.id, shares);
      alert(`Successfully issued ${shares.toLocaleString()} shares at ${formatCurrency(result.price_per_share)} each. Capital raised: ${formatCurrency(result.total_capital_raised)}`);
      
      // Refresh corporation data
      const updatedCorp = await corporationAPI.getById(corporation.id);
      setCorporation(updatedCorp);
      
      setIssueShares('');
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to issue shares');
    } finally {
      setTrading(false);
    }
  };

  if (loading) {
    return (
      <AppNavigation>
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-gray-100 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 flex items-center justify-center">
          <div className="text-lg text-gray-600 dark:text-gray-200">Loading corporation...</div>
        </div>
      </AppNavigation>
    );
  }

  if (error || !corporation) {
    return (
      <AppNavigation>
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-gray-100 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 flex items-center justify-center">
          <div className="text-center">
            <p className="text-xl text-red-600 dark:text-red-400 mb-4">{error || 'Corporation not found'}</p>
            <Link
              href="/stock-market"
              className="text-corporate-blue hover:underline"
            >
              Return to Stock Market
            </Link>
          </div>
        </div>
      </AppNavigation>
    );
  }

  const isCeo = viewerUserId === corporation.ceo_id;
  const marketCap = corporation.shares * corporation.share_price;
  const publicSharesPercentage = (corporation.public_shares / corporation.shares) * 100;

  return (
    <AppNavigation>
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 space-y-6">
        {/* Header */}
        <div className="relative rounded-2xl border border-gray-200/50 dark:border-gray-700/50 bg-gradient-to-br from-white via-white to-gray-50/50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800/50 shadow-2xl overflow-hidden backdrop-blur-sm">
          <div className="absolute inset-0 bg-gradient-to-br from-corporate-blue/5 via-transparent to-corporate-blue-light/5 dark:from-corporate-blue/10 dark:via-transparent dark:to-corporate-blue-dark/10 pointer-events-none" />
          <div className="absolute inset-0 ring-1 ring-inset ring-white/20 dark:ring-gray-700/30 pointer-events-none" />
          <div className="relative p-6">
            <div className="flex items-start gap-6">
              <div className="flex-shrink-0 relative">
                <div className="absolute -inset-1 bg-gradient-to-br from-corporate-blue/30 to-corporate-blue-light/40 rounded-xl blur-xl opacity-50" />
                {corporation.logo ? (
                  <>
                    <div className="absolute inset-0 bg-gradient-to-br from-corporate-blue/20 to-corporate-blue-light/30 rounded-xl blur-sm opacity-0 hover:opacity-100 transition-opacity" />
                    <img
                      src={corporation.logo}
                      alt={corporation.name}
                      className="relative w-24 h-24 rounded-xl object-cover ring-2 ring-gray-200/50 dark:ring-gray-700/50 shadow-lg"
                      onError={(e) => {
                        e.currentTarget.src = '/defaultpfp.jpg';
                      }}
                    />
                  </>
                ) : (
                  <div className="relative w-24 h-24 rounded-xl bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-800 flex items-center justify-center ring-2 ring-gray-200/50 dark:ring-gray-700/50 shadow-lg">
                    <Building2 className="w-12 h-12 text-gray-400 dark:text-gray-500" />
                  </div>
                )}
              </div>
              <div className="flex-1">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
                      <Link href={`/corporation/${corporation.id}`} className="hover:text-corporate-blue dark:hover:text-corporate-blue-light transition-colors">
                        {corporation.name}
                      </Link>
                    </h1>
                    {corporation.type && (
                      <span className="inline-block px-3 py-1 text-xs font-bold uppercase tracking-[0.1em] bg-corporate-blue/10 dark:bg-corporate-blue/20 text-corporate-blue dark:text-corporate-blue-light rounded-lg mb-2">
                        {corporation.type}
                      </span>
                    )}
                  </div>
                  {isCeo && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => router.push(`/corporation/${corporation.id}/edit`)}
                        className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center gap-2 shadow-sm hover:shadow-md"
                      >
                        <Edit className="w-4 h-4" />
                        Edit
                      </button>
                      <button
                        onClick={handleDelete}
                        disabled={deleting}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors flex items-center gap-2 shadow-sm hover:shadow-md"
                      >
                        <Trash2 className="w-4 h-4" />
                        {deleting ? 'Deleting...' : 'Delete'}
                      </button>
                    </div>
                  )}
                </div>
                {corporation.ceo && (
                  <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 mb-2 flex-wrap">
                    <User className="w-4 h-4" />
                    <span className="text-xs font-bold uppercase tracking-[0.1em]">CEO:</span>
                    <Link
                      href={`/profile/${corporation.ceo.profile_id}`}
                      className="font-semibold hover:text-corporate-blue dark:hover:text-corporate-blue-light transition-colors"
                    >
                      {corporation.ceo.player_name || corporation.ceo.username}
                    </Link>
                    {(corporation.ceo_salary !== undefined && corporation.ceo_salary > 0) ? (
                      <span 
                        className="px-2 py-0.5 text-xs font-semibold bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-full" 
                        title={`$${((corporation.ceo_salary || 100000) / 96).toLocaleString(undefined, { maximumFractionDigits: 2 })} per hour`}
                      >
                        Salary: ${(corporation.ceo_salary || 100000).toLocaleString()}/96h
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 text-xs font-semibold bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-full">
                        No Salary
                      </span>
                    )}
                  </div>
                )}
                <div className="flex items-center gap-4 flex-wrap text-sm text-gray-500 dark:text-gray-500">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    <span className="text-xs font-bold uppercase tracking-[0.1em]">Founded {formatDate(corporation.created_at)}</span>
                  </div>
                  {corporation.hq_state && (
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4" />
                      <span className="text-xs font-bold uppercase tracking-[0.1em]">
                        HQ: {US_STATES[corporation.hq_state] || corporation.hq_state}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="relative rounded-2xl border border-gray-200/50 dark:border-gray-700/50 bg-gradient-to-br from-white via-white to-gray-50/50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800/50 shadow-2xl overflow-hidden backdrop-blur-sm">
          <div className="absolute inset-0 bg-gradient-to-br from-corporate-blue/5 via-transparent to-corporate-blue-light/5 dark:from-corporate-blue/10 dark:via-transparent dark:to-corporate-blue-dark/10 pointer-events-none" />
          <div className="absolute inset-0 ring-1 ring-inset ring-white/20 dark:ring-gray-700/30 pointer-events-none" />
          <div className="relative border-b border-gray-200 dark:border-gray-700">
            <div className="flex">
              <button
                onClick={() => setActiveTab('overview')}
                className={`flex-1 px-6 py-4 text-sm font-semibold transition-colors ${
                  activeTab === 'overview'
                    ? 'text-corporate-blue dark:text-corporate-blue-light border-b-2 border-corporate-blue dark:border-corporate-blue-light bg-corporate-blue/5 dark:bg-corporate-blue/10'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                Overview
              </button>
              <button
                onClick={() => setActiveTab('sectors')}
                className={`flex-1 px-6 py-4 text-sm font-semibold transition-colors ${
                  activeTab === 'sectors'
                    ? 'text-corporate-blue dark:text-corporate-blue-light border-b-2 border-corporate-blue dark:border-corporate-blue-light bg-corporate-blue/5 dark:bg-corporate-blue/10'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                Sectors
              </button>
              <button
                onClick={() => setActiveTab('board')}
                className={`flex-1 px-6 py-4 text-sm font-semibold transition-colors ${
                  activeTab === 'board'
                    ? 'text-corporate-blue dark:text-corporate-blue-light border-b-2 border-corporate-blue dark:border-corporate-blue-light bg-corporate-blue/5 dark:bg-corporate-blue/10'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                Board
              </button>
              <button
                onClick={() => setActiveTab('finance')}
                className={`flex-1 px-6 py-4 text-sm font-semibold transition-colors ${
                  activeTab === 'finance'
                    ? 'text-corporate-blue dark:text-corporate-blue-light border-b-2 border-corporate-blue dark:border-corporate-blue-light bg-corporate-blue/5 dark:bg-corporate-blue/10'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                Finance
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Info */}
          <div className="lg:col-span-2 space-y-6">
            {activeTab === 'overview' && (
              <>
            {/* Financial Overview */}
            <div className="relative rounded-2xl border border-gray-200/50 dark:border-gray-700/50 bg-gradient-to-br from-white via-white to-gray-50/50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800/50 shadow-2xl overflow-hidden backdrop-blur-sm">
              <div className="absolute inset-0 bg-gradient-to-br from-corporate-blue/5 via-transparent to-corporate-blue-light/5 dark:from-corporate-blue/10 dark:via-transparent dark:to-corporate-blue-dark/10 pointer-events-none" />
              <div className="absolute inset-0 ring-1 ring-inset ring-white/20 dark:ring-gray-700/30 pointer-events-none" />
              <div className="relative p-6">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Financial Overview</h2>
                <div className="grid grid-cols-2 gap-4">
                  <div className="relative rounded-xl border border-white/60 bg-white/70 dark:border-gray-800/70 dark:bg-gray-800/60 p-5 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.1em] text-gray-600 dark:text-gray-400 mb-2">
                      <DollarSign className="w-4 h-4" />
                      Share Price
                    </div>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white font-mono">
                      {formatCurrency(corporation.share_price)}
                    </p>
                  </div>
                  <div className="relative rounded-xl border border-white/60 bg-white/70 dark:border-gray-800/70 dark:bg-gray-800/60 p-5 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.1em] text-gray-600 dark:text-gray-400 mb-2">
                      <Users className="w-4 h-4" />
                      Total Shares
                    </div>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white font-mono">
                      {corporation.shares.toLocaleString()}
                    </p>
                  </div>
                  <div className="relative rounded-xl border border-white/60 bg-white/70 dark:border-gray-800/70 dark:bg-gray-800/60 p-5 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.1em] text-gray-600 dark:text-gray-400 mb-2">
                      <TrendingUp className="w-4 h-4" />
                      Market Cap
                    </div>
                    <p className="text-3xl font-bold text-corporate-blue dark:text-corporate-blue-light font-mono">
                      {formatCurrency(marketCap)}
                    </p>
                  </div>
                  <div className="relative rounded-xl border border-white/60 bg-white/70 dark:border-gray-800/70 dark:bg-gray-800/60 p-5 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.1em] text-gray-600 dark:text-gray-400 mb-2">
                      <Users className="w-4 h-4" />
                      Public Shares
                    </div>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white font-mono">
                      {corporation.public_shares.toLocaleString()}
                    </p>
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mt-1">
                      ({publicSharesPercentage.toFixed(1)}%)
                    </p>
                  </div>
                  <div className="relative rounded-xl border border-white/60 bg-white/70 dark:border-gray-800/70 dark:bg-gray-800/60 p-5 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.1em] text-gray-600 dark:text-gray-400 mb-2">
                      <DollarSign className="w-4 h-4" />
                      Corporate Capital
                    </div>
                    <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                      {formatCurrency(corporation.capital || 500000)}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Stock Price Chart */}
            <StockPriceChart 
              corporationId={corporation.id} 
              currentPrice={corporation.share_price} 
            />

            {/* Shareholders */}
            <div className="relative rounded-2xl border border-gray-200/50 dark:border-gray-700/50 bg-gradient-to-br from-white via-white to-gray-50/50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800/50 shadow-2xl overflow-hidden backdrop-blur-sm">
              <div className="absolute inset-0 bg-gradient-to-br from-corporate-blue/5 via-transparent to-corporate-blue-light/5 dark:from-corporate-blue/10 dark:via-transparent dark:to-corporate-blue-dark/10 pointer-events-none" />
              <div className="absolute inset-0 ring-1 ring-inset ring-white/20 dark:ring-gray-700/30 pointer-events-none" />
              <div className="relative p-6">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Shareholders</h2>
                {corporation.shareholders && corporation.shareholders.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="border-b-2 border-gray-200/80 dark:border-gray-700/80 bg-gradient-to-b from-gray-50/80 to-gray-100/60 dark:from-gray-800/60 dark:to-gray-800/40 backdrop-blur-sm">
                          <th className="text-left py-4 px-4 text-xs font-bold uppercase tracking-[0.15em] text-gray-600 dark:text-gray-400">Shareholder</th>
                          <th className="text-right py-4 px-4 text-xs font-bold uppercase tracking-[0.15em] text-gray-600 dark:text-gray-400">Shares</th>
                          <th className="text-right py-4 px-4 text-xs font-bold uppercase tracking-[0.15em] text-gray-600 dark:text-gray-400">Ownership</th>
                          <th className="text-right py-4 px-4 text-xs font-bold uppercase tracking-[0.15em] text-gray-600 dark:text-gray-400">Value</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200/60 dark:divide-gray-700/50">
                        {corporation.shareholders
                          .sort((a, b) => b.shares - a.shares)
                          .map((sh, idx) => {
                            const ownershipPercentage = (sh.shares / corporation.shares) * 100;
                            const value = sh.shares * corporation.share_price;
                            const isShareholderCeo = sh.user_id === corporation.ceo_id;
                            return (
                              <tr
                                key={sh.id}
                                className={`
                                  transition-all duration-200 ease-out
                                  ${idx % 2 === 0 
                                    ? 'bg-white/40 dark:bg-gray-900/30' 
                                    : 'bg-gray-50/30 dark:bg-gray-800/20'
                                  }
                                  ${isShareholderCeo ? 'bg-corporate-blue/10 dark:bg-corporate-blue/20 border-l-4 border-corporate-blue' : ''}
                                `}
                              >
                                <td className="py-4 px-4">
                                  {sh.user ? (
                                    <Link
                                      href={`/profile/${sh.user.profile_id}`}
                                      className="flex items-center gap-3 hover:text-corporate-blue dark:hover:text-corporate-blue-light transition-colors group"
                                    >
                                      {sh.user.profile_image_url && (
                                        <img
                                          src={sh.user.profile_image_url}
                                          alt={sh.user.username}
                                          className="w-10 h-10 rounded-full object-cover ring-2 ring-gray-200/50 dark:ring-gray-700/50 group-hover:ring-corporate-blue/50 transition-all shadow-sm"
                                          onError={(e) => {
                                            e.currentTarget.src = '/defaultpfp.jpg';
                                          }}
                                        />
                                      )}
                                      <div>
                                        <div className="font-bold text-gray-900 dark:text-white">
                                          {sh.user.player_name || sh.user.username}
                                          {isShareholderCeo && (
                                            <span className="ml-2 text-xs font-bold uppercase tracking-[0.05em] bg-corporate-blue text-white px-2 py-0.5 rounded">CEO</span>
                                          )}
                                        </div>
                                      </div>
                                    </Link>
                                  ) : (
                                    <span className="text-gray-500 dark:text-gray-400">Unknown User</span>
                                  )}
                                </td>
                                <td className="text-right py-4 px-4 font-bold text-gray-900 dark:text-white font-mono">
                                  {sh.shares.toLocaleString()}
                                </td>
                                <td className="text-right py-4 px-4 text-gray-700 dark:text-gray-300 font-semibold">
                                  {ownershipPercentage.toFixed(2)}%
                                </td>
                                <td className="text-right py-4 px-4 font-bold text-gray-900 dark:text-white font-mono">
                                  {formatCurrency(value)}
                                </td>
                              </tr>
                            );
                          })}
                        {/* Public shares row */}
                        <tr className="bg-gray-50/50 dark:bg-gray-700/30 border-t-2 border-gray-200/80 dark:border-gray-700/80">
                          <td className="py-4 px-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-300 to-gray-400 dark:from-gray-600 dark:to-gray-700 flex items-center justify-center ring-2 ring-gray-200/50 dark:ring-gray-700/50 shadow-sm">
                                <Users className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                              </div>
                              <div>
                                <div className="font-bold text-gray-900 dark:text-white">Public Market</div>
                                <div className="text-xs text-gray-500 dark:text-gray-400">Available for purchase</div>
                              </div>
                            </div>
                          </td>
                          <td className="text-right py-4 px-4 font-bold text-gray-900 dark:text-white font-mono">
                            {corporation.public_shares.toLocaleString()}
                          </td>
                          <td className="text-right py-4 px-4 text-gray-700 dark:text-gray-300 font-semibold">
                            {publicSharesPercentage.toFixed(2)}%
                          </td>
                          <td className="text-right py-4 px-4 font-bold text-gray-900 dark:text-white font-mono">
                            {formatCurrency(corporation.public_shares * corporation.share_price)}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-gray-500 dark:text-gray-400">No shareholders yet.</p>
                )}
              </div>
            </div>
              </>
            )}

            {activeTab === 'sectors' && (
              <div className="relative rounded-2xl border border-gray-200/50 dark:border-gray-700/50 bg-gradient-to-br from-white via-white to-gray-50/50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800/50 shadow-2xl overflow-hidden backdrop-blur-sm">
                <div className="absolute inset-0 bg-gradient-to-br from-corporate-blue/5 via-transparent to-corporate-blue-light/5 dark:from-corporate-blue/10 dark:via-transparent dark:to-corporate-blue-dark/10 pointer-events-none" />
                <div className="absolute inset-0 ring-1 ring-inset ring-white/20 dark:ring-gray-700/30 pointer-events-none" />
                <div className="relative p-6">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                    <Layers className="w-5 h-5 text-corporate-blue" />
                    Sector Operations
                  </h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                    All sectors the corporation operates in, organized by state
                  </p>

                  {marketEntries.length === 0 ? (
                    <div className="text-center py-12">
                      <Layers className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                      <p className="text-lg font-medium text-gray-900 dark:text-white mb-1">No Sector Operations</p>
                      <p className="text-gray-500 dark:text-gray-400 mb-6 text-sm">
                        This corporation hasn't entered any markets yet.
                      </p>
                      <Link
                        href="/states"
                        className="inline-flex items-center gap-2 bg-corporate-blue text-white px-5 py-2.5 rounded-lg font-semibold hover:bg-corporate-blue-dark transition-colors text-sm"
                      >
                        <MapPin className="w-4 h-4" />
                        Browse States
                      </Link>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {/* Summary Stats */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                        <div className="rounded-xl border border-white/60 bg-white/70 dark:border-gray-800/70 dark:bg-gray-800/60 p-4 shadow-sm">
                          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">States</p>
                          <p className="text-2xl font-bold text-gray-900 dark:text-white">
                            {new Set(marketEntries.map(e => e.state_code)).size}
                          </p>
                        </div>
                        <div className="rounded-xl border border-white/60 bg-white/70 dark:border-gray-800/70 dark:bg-gray-800/60 p-4 shadow-sm">
                          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Sectors</p>
                          <p className="text-2xl font-bold text-gray-900 dark:text-white">
                            {new Set(marketEntries.map(e => e.sector_type)).size}
                          </p>
                        </div>
                        <div className="rounded-xl border border-white/60 bg-white/70 dark:border-gray-800/70 dark:bg-gray-800/60 p-4 shadow-sm">
                          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Total Units</p>
                          <p className="text-2xl font-bold text-gray-900 dark:text-white">
                            {marketEntries.reduce((sum, e) => sum + e.retail_count + e.production_count + e.service_count, 0)}
                          </p>
                        </div>
                        <div className="rounded-xl border border-white/60 bg-white/70 dark:border-gray-800/70 dark:bg-gray-800/60 p-4 shadow-sm">
                          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Production Units</p>
                          <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                            {marketEntries.reduce((sum, e) => sum + e.production_count, 0)}
                          </p>
                        </div>
                      </div>

                      {/* Group by State */}
                      {(() => {
                        // Group entries by state
                        const entriesByState: Record<string, MarketEntryWithUnits[]> = {};
                        marketEntries.forEach(entry => {
                          const stateKey = entry.state_code;
                          if (!entriesByState[stateKey]) {
                            entriesByState[stateKey] = [];
                          }
                          entriesByState[stateKey].push(entry);
                        });

                        return Object.entries(entriesByState).map(([stateCode, entries]) => {
                          const stateName = entries[0]?.state_name || US_STATES[stateCode] || stateCode;
                          const stateMultiplier = entries[0]?.state_multiplier || 1;
                          
                          // Calculate state totals
                          const stateRetail = entries.reduce((s, e) => s + e.retail_count, 0);
                          const stateProduction = entries.reduce((s, e) => s + e.production_count, 0);
                          const stateService = entries.reduce((s, e) => s + e.service_count, 0);
                          
                          const stateRevenue = (
                            stateRetail * UNIT_ECONOMICS.retail.baseRevenue * stateMultiplier +
                            stateProduction * UNIT_ECONOMICS.production.baseRevenue * stateMultiplier +
                            stateService * UNIT_ECONOMICS.service.baseRevenue * stateMultiplier
                          ) * DISPLAY_PERIOD_HOURS;

                          return (
                            <div key={stateCode} className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                              {/* State Header */}
                              <div className="bg-gray-50 dark:bg-gray-800/50 px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                                <div className="flex items-center justify-between">
                                  <Link 
                                    href={`/states/${stateCode}`}
                                    className="flex items-center gap-2 hover:text-corporate-blue dark:hover:text-corporate-blue-light transition-colors"
                                  >
                                    <MapPin className="w-4 h-4 text-corporate-blue" />
                                    <span className="font-semibold text-gray-900 dark:text-white">{stateName}</span>
                                    <span className="text-xs text-gray-500 dark:text-gray-400">({stateCode})</span>
                                    <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-corporate-blue/10 text-corporate-blue dark:text-corporate-blue-light">
                                      {stateMultiplier.toFixed(1)}x
                                    </span>
                                  </Link>
                                  <div className="text-right">
                                    <p className="text-xs text-gray-500 dark:text-gray-400">Revenue (96hr)</p>
                                    <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                                      {formatCurrency(stateRevenue)}
                                    </p>
                                  </div>
                                </div>
                              </div>

                              {/* Sectors in State */}
                              <div className="divide-y divide-gray-100 dark:divide-gray-700/50">
                                {entries.map((entry) => {
                                  const requiredResource = SECTOR_RESOURCES[entry.sector_type];
                                  const totalUnits = entry.retail_count + entry.production_count + entry.service_count;
                                  const entryRevenue = (
                                    entry.retail_count * UNIT_ECONOMICS.retail.baseRevenue * stateMultiplier +
                                    entry.production_count * UNIT_ECONOMICS.production.baseRevenue * stateMultiplier +
                                    entry.service_count * UNIT_ECONOMICS.service.baseRevenue * stateMultiplier
                                  ) * DISPLAY_PERIOD_HOURS;

                                  return (
                                    <div key={entry.id} className="p-4 hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors">
                                      <div className="flex items-start justify-between mb-3">
                                        <div>
                                          <h4 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                                            {entry.sector_type}
                                          </h4>
                                          <p className="text-xs text-gray-500 dark:text-gray-400">
                                            Entered {new Date(entry.created_at).toLocaleDateString()}
                                          </p>
                                        </div>
                                        <div className="text-right">
                                          <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                                            {formatCurrency(entryRevenue)}
                                          </p>
                                          <p className="text-xs text-gray-500 dark:text-gray-400">per 96hr</p>
                                        </div>
                                      </div>

                                      {/* Units Breakdown */}
                                      <div className="grid grid-cols-3 gap-3 mb-3">
                                        <div className="flex items-center gap-2 text-sm">
                                          <Store className="w-4 h-4 text-pink-500" />
                                          <span className="text-gray-600 dark:text-gray-400">Retail:</span>
                                          <span className="font-semibold text-gray-900 dark:text-white">{entry.retail_count}</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-sm">
                                          <Factory className="w-4 h-4 text-orange-500" />
                                          <span className="text-gray-600 dark:text-gray-400">Production:</span>
                                          <span className="font-semibold text-gray-900 dark:text-white">{entry.production_count}</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-sm">
                                          <Briefcase className="w-4 h-4 text-blue-500" />
                                          <span className="text-gray-600 dark:text-gray-400">Service:</span>
                                          <span className="font-semibold text-gray-900 dark:text-white">{entry.service_count}</span>
                                        </div>
                                      </div>

                                      {/* Resource Demand & Production Output */}
                                      <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-gray-700/50">
                                        <div className="flex items-center gap-3">
                                          {/* Resource Demand */}
                                          <div className="flex items-center gap-2">
                                            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Resource:</span>
                                            {requiredResource ? (
                                              <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${RESOURCE_COLORS[requiredResource] || 'bg-gray-100 text-gray-700'}`}>
                                                {RESOURCE_ICONS[requiredResource]}
                                                {requiredResource}
                                                {entry.production_count > 0 && (
                                                  <span className="text-xs opacity-75">
                                                    ({entry.production_count} units)
                                                  </span>
                                                )}
                                              </span>
                                            ) : (
                                              <span className="text-xs text-gray-400 dark:text-gray-500 italic">None</span>
                                            )}
                                          </div>
                                        </div>

                                        {/* Production Output (Placeholder) */}
                                        <div className="flex items-center gap-2">
                                          <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Output:</span>
                                          <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300">
                                            <Box className="w-3 h-3" />
                                            {entry.production_count > 0 ? (
                                              <>{entry.sector_type} Products</>
                                            ) : (
                                              <span className="italic opacity-75">No production</span>
                                            )}
                                          </span>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        });
                      })()}

                      {/* Resource Demand Summary */}
                      <div className="rounded-xl border border-white/60 bg-white/70 dark:border-gray-800/70 dark:bg-gray-800/60 p-6 shadow-sm mt-6">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                          <Package className="w-5 h-5 text-corporate-blue" />
                          Total Resource Demand
                        </h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          {(() => {
                            // Calculate total resource demand across all market entries
                            const resourceDemand: Record<string, number> = {};
                            marketEntries.forEach(entry => {
                              const resource = SECTOR_RESOURCES[entry.sector_type];
                              if (resource && entry.production_count > 0) {
                                resourceDemand[resource] = (resourceDemand[resource] || 0) + entry.production_count;
                              }
                            });

                            if (Object.keys(resourceDemand).length === 0) {
                              return (
                                <div className="col-span-full text-center py-4">
                                  <p className="text-sm text-gray-500 dark:text-gray-400">
                                    No production units requiring resources
                                  </p>
                                </div>
                              );
                            }

                            return Object.entries(resourceDemand).map(([resource, demand]) => (
                              <div 
                                key={resource} 
                                className={`rounded-lg p-4 ${RESOURCE_COLORS[resource] || 'bg-gray-100 dark:bg-gray-800'}`}
                              >
                                <div className="flex items-center gap-2 mb-2">
                                  {RESOURCE_ICONS[resource]}
                                  <span className="font-medium text-sm">{resource}</span>
                                </div>
                                <p className="text-2xl font-bold">{demand}</p>
                                <p className="text-xs opacity-75">units required</p>
                              </div>
                            ));
                          })()}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'finance' && (
              <>
              <div className="relative rounded-2xl border border-gray-200/50 dark:border-gray-700/50 bg-gradient-to-br from-white via-white to-gray-50/50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800/50 shadow-2xl overflow-hidden backdrop-blur-sm">
                <div className="absolute inset-0 bg-gradient-to-br from-corporate-blue/5 via-transparent to-corporate-blue-light/5 dark:from-corporate-blue/10 dark:via-transparent dark:to-corporate-blue-dark/10 pointer-events-none" />
                <div className="absolute inset-0 ring-1 ring-inset ring-white/20 dark:ring-gray-700/30 pointer-events-none" />
                <div className="relative p-6">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Finance & Capital</h2>
                  
                  {isCeo ? (
                    <div className="space-y-6">
                      {/* Issue Shares Section */}
                      <div className="rounded-xl border border-white/60 bg-white/70 dark:border-gray-800/70 dark:bg-gray-800/60 p-6 shadow-sm">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                          <Plus className="w-5 h-5 text-corporate-blue" />
                          Issue New Shares
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                          Issue new shares at market price to raise capital. You can issue up to 10% of current outstanding shares.
                        </p>
                        
                        <div className="space-y-4">
                          <div>
                            <label htmlFor="issueShares" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                              Number of Shares to Issue
                            </label>
                            <div className="flex gap-2">
                              <input
                                type="number"
                                id="issueShares"
                                min="1"
                                max={Math.floor(corporation.shares * 0.1)}
                                value={issueShares}
                                onChange={(e) => setIssueShares(e.target.value)}
                                placeholder="Shares"
                                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-corporate-blue focus:border-transparent"
                                disabled={trading}
                              />
                              <button
                                onClick={handleIssueShares}
                                disabled={trading || !issueShares || !corporation}
                                className="px-6 py-2 bg-corporate-blue text-white rounded-lg hover:bg-corporate-blue-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2 text-sm font-semibold"
                              >
                                <Plus className="w-4 h-4" />
                                Issue
                              </button>
                            </div>
                            {issueShares && !isNaN(parseInt(issueShares, 10)) && corporation && (
                              <div className="mt-2 space-y-1 text-sm">
                                <p className="text-gray-600 dark:text-gray-400">
                                  Issue Price: <span className="font-semibold">{formatCurrency(corporation.share_price)}</span>
                                </p>
                                <p className="text-gray-600 dark:text-gray-400">
                                  Capital Raised: <span className="font-semibold">{formatCurrency(parseInt(issueShares, 10) * corporation.share_price)}</span>
                                </p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                  Max issueable: {Math.floor(corporation.shares * 0.1).toLocaleString()} shares (10% of {corporation.shares.toLocaleString()})
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Current Capital Info */}
                      <div className="rounded-xl border border-white/60 bg-white/70 dark:border-gray-800/70 dark:bg-gray-800/60 p-6 shadow-sm">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                          <DollarSign className="w-5 h-5 text-corporate-blue" />
                          Corporate Capital
                        </h3>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Current Capital</p>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white font-mono">
                              {formatCurrency(corporation.capital || 500000)}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Market Cap</p>
                            <p className="text-2xl font-bold text-corporate-blue dark:text-corporate-blue-light font-mono">
                              {formatCurrency(marketCap)}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-xl border border-white/60 bg-white/70 dark:border-gray-800/70 dark:bg-gray-800/60 p-6 shadow-sm text-center">
                      <p className="text-gray-600 dark:text-gray-400">
                        Only the CEO can manage corporate finance and issue shares.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Balance Sheet Section */}
              <div className="relative rounded-2xl border border-gray-200/50 dark:border-gray-700/50 bg-gradient-to-br from-white via-white to-gray-50/50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800/50 shadow-2xl overflow-hidden backdrop-blur-sm mt-6">
                <div className="absolute inset-0 bg-gradient-to-br from-corporate-blue/5 via-transparent to-corporate-blue-light/5 dark:from-corporate-blue/10 dark:via-transparent dark:to-corporate-blue-dark/10 pointer-events-none" />
                <div className="absolute inset-0 ring-1 ring-inset ring-white/20 dark:ring-gray-700/30 pointer-events-none" />
                <div className="relative p-6">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-corporate-blue" />
                    Balance Sheet
                  </h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-6">Asset values based on capitalized earnings (10x annual profit)</p>
                  
                  <div className="grid md:grid-cols-2 gap-6">
                    {/* Assets */}
                    <div className="rounded-xl border border-white/60 bg-white/70 dark:border-gray-800/70 dark:bg-gray-800/60 p-6 shadow-sm">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Assets</h3>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-700">
                          <span className="text-sm text-gray-600 dark:text-gray-400">Cash (Corporate Capital)</span>
                          <span className="text-sm font-semibold text-gray-900 dark:text-white font-mono">
                            {formatCurrency(balanceSheet?.cash || corporation.capital || 0)}
                          </span>
                        </div>
                        <div className="py-2 border-b border-gray-200 dark:border-gray-700">
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-600 dark:text-gray-400">Business Unit Assets</span>
                            <span className="text-sm font-semibold text-gray-900 dark:text-white font-mono">
                              {formatCurrency(balanceSheet?.businessUnitAssets || 0)}
                            </span>
                          </div>
                          {balanceSheet && balanceSheet.businessUnitAssets > 0 && (
                            <div className="ml-4 mt-2 space-y-1">
                              {balanceSheet.retailAssetValue > 0 && (
                                <div className="flex justify-between items-center text-xs">
                                  <span className="text-gray-500 dark:text-gray-500 flex items-center gap-1">
                                    <Store className="w-3 h-3" />
                                    Retail ({balanceSheet.totalRetailUnits} units)
                                  </span>
                                  <span className="text-gray-600 dark:text-gray-400 font-mono">
                                    {formatCurrency(balanceSheet.retailAssetValue)}
                                  </span>
                                </div>
                              )}
                              {balanceSheet.productionAssetValue > 0 && (
                                <div className="flex justify-between items-center text-xs">
                                  <span className="text-gray-500 dark:text-gray-500 flex items-center gap-1">
                                    <Factory className="w-3 h-3" />
                                    Production ({balanceSheet.totalProductionUnits} units)
                                  </span>
                                  <span className="text-gray-600 dark:text-gray-400 font-mono">
                                    {formatCurrency(balanceSheet.productionAssetValue)}
                                  </span>
                                </div>
                              )}
                              {balanceSheet.serviceAssetValue > 0 && (
                                <div className="flex justify-between items-center text-xs">
                                  <span className="text-gray-500 dark:text-gray-500 flex items-center gap-1">
                                    <Briefcase className="w-3 h-3" />
                                    Service ({balanceSheet.totalServiceUnits} units)
                                  </span>
                                  <span className="text-gray-600 dark:text-gray-400 font-mono">
                                    {formatCurrency(balanceSheet.serviceAssetValue)}
                                  </span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                        <div className="flex justify-between items-center pt-3 border-t-2 border-gray-300 dark:border-gray-600">
                          <span className="text-base font-bold text-gray-900 dark:text-white">Total Assets</span>
                          <span className="text-base font-bold text-corporate-blue dark:text-corporate-blue-light font-mono">
                            {formatCurrency(balanceSheet?.totalAssets || corporation.capital || 0)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Liabilities & Equity */}
                    <div className="rounded-xl border border-white/60 bg-white/70 dark:border-gray-800/70 dark:bg-gray-800/60 p-6 shadow-sm">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Liabilities & Equity</h3>
                      <div className="space-y-3">
                        <div className="mb-4">
                          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Liabilities</h4>
                          <div className="space-y-2 ml-4">
                            <div className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-700">
                              <span className="text-sm text-gray-600 dark:text-gray-400">Total Liabilities</span>
                              <span className="text-sm font-semibold text-gray-900 dark:text-white font-mono">
                                {formatCurrency(balanceSheet?.totalLiabilities || 0)}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div>
                          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Shareholders' Equity</h4>
                          <div className="space-y-2 ml-4">
                            <div className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-700">
                              <span className="text-sm text-gray-600 dark:text-gray-400">Total Equity</span>
                              <span className="text-sm font-semibold text-gray-900 dark:text-white font-mono">
                                {formatCurrency(balanceSheet?.shareholdersEquity || corporation.capital || 0)}
                              </span>
                            </div>
                            <div className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-700">
                              <span className="text-sm text-gray-600 dark:text-gray-400">Book Value per Share</span>
                              <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 font-mono">
                                {formatCurrency(balanceSheet?.bookValuePerShare || 0)}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex justify-between items-center pt-3 border-t-2 border-gray-300 dark:border-gray-600 mt-4">
                          <span className="text-base font-bold text-gray-900 dark:text-white">Total Liabilities & Equity</span>
                          <span className="text-base font-bold text-corporate-blue dark:text-corporate-blue-light font-mono">
                            {formatCurrency(balanceSheet?.totalAssets || corporation.capital || 0)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Stock Valuation Info */}
                  <div className="mt-6 p-4 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700">
                    <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Stock Price Valuation</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500 dark:text-gray-500 block">Current Price</span>
                        <span className="font-mono font-semibold text-gray-900 dark:text-white">
                          {formatCurrency(corporation.share_price || 0)}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500 dark:text-gray-500 block">Book Value/Share</span>
                        <span className="font-mono font-semibold text-gray-900 dark:text-white">
                          {formatCurrency(balanceSheet?.bookValuePerShare || 0)}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500 dark:text-gray-500 block">Total Shares</span>
                        <span className="font-mono font-semibold text-gray-900 dark:text-white">
                          {corporation.shares?.toLocaleString() || 0}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500 dark:text-gray-500 block">Markets Active</span>
                        <span className="font-mono font-semibold text-gray-900 dark:text-white">
                          {balanceSheet?.marketsCount || 0}
                        </span>
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
                      Stock price = 80% Book Value + 20% Trade-Weighted Average (min $0.01)
                    </p>
                  </div>
                </div>
              </div>

              {/* Income Statement Section */}
              <div className="relative rounded-2xl border border-gray-200/50 dark:border-gray-700/50 bg-gradient-to-br from-white via-white to-gray-50/50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800/50 shadow-2xl overflow-hidden backdrop-blur-sm mt-6">
                <div className="absolute inset-0 bg-gradient-to-br from-corporate-blue/5 via-transparent to-corporate-blue-light/5 dark:from-corporate-blue/10 dark:via-transparent dark:to-corporate-blue-dark/10 pointer-events-none" />
                <div className="absolute inset-0 ring-1 ring-inset ring-white/20 dark:ring-gray-700/30 pointer-events-none" />
                <div className="relative p-6">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-corporate-blue" />
                    Income Statement
                  </h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-6">96-hour projection based on market operations</p>
                  
                  <div className="rounded-xl border border-white/60 bg-white/70 dark:border-gray-800/70 dark:bg-gray-800/60 p-6 shadow-sm">
                    <div className="space-y-4">
                      <div className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-700">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Revenue (96hr)</span>
                        <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 font-mono">
                          {formatCurrency(corpFinances?.display_revenue || 0)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-700">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Operating Costs (96hr)</span>
                        <span className="text-sm font-semibold text-red-600 dark:text-red-400 font-mono">
                          {formatCurrency(corpFinances?.display_costs || 0)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-700">
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-600 dark:text-gray-400">CEO Salary (96hr)</span>
                          <span className="text-xs text-gray-400 dark:text-gray-500" title={`$${((corporation.ceo_salary || 100000) / 96).toLocaleString(undefined, { maximumFractionDigits: 2 })}/hr`}>
                            (${((corporation.ceo_salary || 100000) / 96).toLocaleString(undefined, { maximumFractionDigits: 2 })}/hr)
                          </span>
                        </div>
                        <span className={`text-sm font-semibold font-mono ${(corporation.ceo_salary || 100000) > 0 ? 'text-purple-600 dark:text-purple-400' : 'text-gray-400 dark:text-gray-500'}`}>
                          {formatCurrency(corporation.ceo_salary ?? 100000)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center pt-3 border-t-2 border-gray-300 dark:border-gray-600">
                        <span className="text-lg font-bold text-gray-900 dark:text-white">Net Income (96hr)</span>
                        <span className={`text-lg font-bold font-mono ${(corpFinances?.display_profit || 0) >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                          {formatCurrency(corpFinances?.display_profit || 0)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Dividends Section */}
                  <div className="mt-6 rounded-xl border border-white/60 bg-white/70 dark:border-gray-800/70 dark:bg-gray-800/60 p-6 shadow-sm">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Dividends</h3>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-700">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Current Dividend Rate</span>
                        <span className="text-sm font-semibold text-gray-900 dark:text-white">
                          {(corporation.dividend_percentage || 0).toFixed(2)}% of profit
                        </span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-700">
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-600 dark:text-gray-400">Dividend per Share (96hr)</span>
                          <span className="text-xs text-gray-400 dark:text-gray-500">
                            ({((corpFinances?.dividend_per_share_96h || 0) * 4).toLocaleString(undefined, { maximumFractionDigits: 4 })}/share annualized)
                          </span>
                        </div>
                        <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 font-mono">
                          {formatCurrency(corpFinances?.dividend_per_share_96h || 0)}
                        </span>
                      </div>
                      {corpFinances?.special_dividend_last_amount && (
                        <>
                          <div className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-700">
                            <span className="text-sm text-gray-600 dark:text-gray-400">Last Special Dividend</span>
                            <span className="text-sm font-semibold text-purple-600 dark:text-purple-400 font-mono">
                              {formatCurrency(corpFinances.special_dividend_last_amount)}
                            </span>
                          </div>
                          <div className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-700">
                            <span className="text-sm text-gray-600 dark:text-gray-400">Per Share</span>
                            <span className="text-sm font-semibold text-purple-600 dark:text-purple-400 font-mono">
                              {formatCurrency(corpFinances.special_dividend_per_share_last || 0)}
                            </span>
                          </div>
                          <div className="flex justify-between items-center py-2">
                            <span className="text-sm text-gray-600 dark:text-gray-400">Time Since Last</span>
                            <span className="text-sm font-semibold text-gray-900 dark:text-white">
                              {corpFinances.special_dividend_last_paid_at ? (() => {
                                const lastPaid = new Date(corpFinances.special_dividend_last_paid_at);
                                const now = new Date();
                                const hoursSince = (now.getTime() - lastPaid.getTime()) / (1000 * 60 * 60);
                                const daysSince = Math.floor(hoursSince / 24);
                                const hoursRemaining = Math.ceil(96 - (hoursSince % 96));
                                if (hoursSince < 96) {
                                  return `${hoursRemaining}h until next available`;
                                }
                                return `${daysSince}d ${Math.floor((hoursSince % 24))}h ago`;
                              })() : 'Never'}
                            </span>
                          </div>
                        </>
                      )}
                      {!corpFinances?.special_dividend_last_amount && (
                        <div className="text-sm text-gray-500 dark:text-gray-400 py-2">
                          No special dividend has been paid yet
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Unit Breakdown */}
                  {corpFinances && corpFinances.markets_count > 0 && (
                    <div className="mt-6 rounded-xl border border-white/60 bg-white/70 dark:border-gray-800/70 dark:bg-gray-800/60 p-6 shadow-sm">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Business Units</h3>
                      <div className="grid grid-cols-3 gap-4">
                        <div className="text-center p-3 rounded-lg bg-pink-50 dark:bg-pink-900/20">
                          <Store className="h-6 w-6 text-pink-500 mx-auto mb-2" />
                          <p className="text-2xl font-bold text-gray-900 dark:text-white">{corpFinances.total_retail_units}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">Retail</p>
                        </div>
                        <div className="text-center p-3 rounded-lg bg-orange-50 dark:bg-orange-900/20">
                          <Factory className="h-6 w-6 text-orange-500 mx-auto mb-2" />
                          <p className="text-2xl font-bold text-gray-900 dark:text-white">{corpFinances.total_production_units}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">Production</p>
                        </div>
                        <div className="text-center p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20">
                          <Briefcase className="h-6 w-6 text-blue-500 mx-auto mb-2" />
                          <p className="text-2xl font-bold text-gray-900 dark:text-white">{corpFinances.total_service_units}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">Service</p>
                        </div>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-4 text-center">
                        Operating in {corpFinances.markets_count} market{corpFinances.markets_count !== 1 ? 's' : ''}
                      </p>
                    </div>
                  )}

                  {/* Market Entries List */}
                  {marketEntries.length > 0 && (
                    <div className="mt-6 rounded-xl border border-white/60 bg-white/70 dark:border-gray-800/70 dark:bg-gray-800/60 p-6 shadow-sm">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Market Presence</h3>
                      <div className="space-y-3">
                        {marketEntries.map((entry) => (
                          <Link
                            key={entry.id}
                            href={`/states/${entry.state_code}`}
                            className="flex items-center justify-between p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-corporate-blue/30 dark:hover:border-corporate-blue/30 transition-colors"
                          >
                            <div>
                              <p className="font-medium text-gray-900 dark:text-white">{entry.state_name || entry.state_code}</p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">{entry.sector_type}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                {entry.retail_count + entry.production_count + entry.service_count} units
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                {entry.state_multiplier?.toFixed(1)}x multiplier
                              </p>
                            </div>
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}

                  {(!corpFinances || corpFinances.markets_count === 0) && (
                    <div className="mt-6 rounded-xl border border-dashed border-corporate-blue/30 bg-corporate-blue/5 dark:bg-corporate-blue/10 p-6 text-center">
                      <MapPin className="h-8 w-8 text-corporate-blue/50 mx-auto mb-2" />
                      <p className="text-sm text-corporate-blue dark:text-corporate-blue-light">
                        No market operations yet
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Enter markets via the States page to generate revenue
                      </p>
                      <Link
                        href="/states"
                        className="inline-block mt-3 px-4 py-2 bg-corporate-blue text-white text-sm rounded-lg hover:bg-corporate-blue-dark transition-colors"
                      >
                        View States
                      </Link>
                    </div>
                  )}
                </div>
              </div>
              </>
            )}

            {activeTab === 'board' && (
              <BoardTab
                corporationId={corpId}
                corporationName={corporation.name}
                viewerUserId={viewerUserId}
              />
            )}
          </div>

          {/* Sidebar - Only show on overview, sectors, and finance tabs */}
          {activeTab !== 'board' && (
          <div className="space-y-6">
            <div className="relative rounded-2xl border border-gray-200/50 dark:border-gray-700/50 bg-gradient-to-br from-white via-white to-gray-50/50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800/50 shadow-2xl overflow-hidden backdrop-blur-sm">
              <div className="absolute inset-0 bg-gradient-to-br from-corporate-blue/5 via-transparent to-corporate-blue-light/5 dark:from-corporate-blue/10 dark:via-transparent dark:to-corporate-blue-dark/10 pointer-events-none" />
              <div className="absolute inset-0 ring-1 ring-inset ring-white/20 dark:ring-gray-700/30 pointer-events-none" />
              <div className="relative p-6">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Quick Actions</h3>
                <div className="space-y-4">
                  {/* Buy/Sell Shares */}
                  <div className="space-y-3">
                    <div className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                      Trade Shares
                    </div>
                    
                    {/* Buy Shares */}
                    <div className="space-y-2">
                      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400">
                        Buy Shares (1.01x price)
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="number"
                          min="1"
                          max={corporation.public_shares}
                          value={buyShares}
                          onChange={(e) => setBuyShares(e.target.value)}
                          placeholder="Shares"
                          className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-corporate-blue focus:border-transparent"
                          disabled={trading || !viewerUserId}
                        />
                        <button
                          onClick={handleBuyShares}
                          disabled={trading || !buyShares || !viewerUserId}
                          className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1 text-sm font-semibold"
                        >
                          <ArrowUp className="w-4 h-4" />
                          Buy
                        </button>
                      </div>
                      {buyShares && !isNaN(parseInt(buyShares, 10)) && corporation && (
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Cost: {formatCurrency(parseInt(buyShares, 10) * corporation.share_price * 1.01)}
                        </p>
                      )}
                    </div>

                    {/* Sell Shares */}
                    {userOwnedShares > 0 && (
                      <div className="space-y-2">
                        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400">
                          Sell Shares (0.99x price) - You own {userOwnedShares.toLocaleString()}
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="number"
                            min="1"
                            max={userOwnedShares}
                            value={sellShares}
                            onChange={(e) => setSellShares(e.target.value)}
                            placeholder="Shares"
                            className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-corporate-blue focus:border-transparent"
                            disabled={trading || !viewerUserId}
                          />
                          <button
                            onClick={handleSellShares}
                            disabled={trading || !sellShares || !viewerUserId}
                            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1 text-sm font-semibold"
                          >
                            <ArrowDown className="w-4 h-4" />
                            Sell
                          </button>
                        </div>
                        {sellShares && !isNaN(parseInt(sellShares, 10)) && corporation && (
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            Revenue: {formatCurrency(parseInt(sellShares, 10) * corporation.share_price * 0.99)}
                          </p>
                        )}
                      </div>
                    )}
                    
                    {!viewerUserId && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 italic">
                        Please log in to trade shares
                      </p>
                    )}
                  </div>

                  <div className="border-t border-gray-200 dark:border-gray-700 pt-4 space-y-2">
                    <Link
                      href="/stock-market"
                      className="block w-full px-4 py-2 text-center border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-sm hover:shadow-md font-semibold"
                    >
                      View Stock Market
                    </Link>
                    {corporation.ceo && (
                      <Link
                        href={`/profile/${corporation.ceo.profile_id}`}
                        className="block w-full px-4 py-2 text-center border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-sm hover:shadow-md font-semibold"
                      >
                        View CEO Profile
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
          )}
        </div>
      </div>
    </AppNavigation>
  );
}
