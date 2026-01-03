'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AppNavigation from '@/components/AppNavigation';
import GuideSection from '@/components/guide/GuideSection';
import { authAPI } from '@/lib/api';
import { getErrorMessage } from '@/lib/utils';
import {
  BookOpen,
  Building2,
  Briefcase,
  Globe,
  Pickaxe,
  Factory,
  GitBranch,
  Zap,
  Users,
  DollarSign,
  Target,
  ArrowRight,
  Store,
  Hammer,
  HeadphonesIcon,
  Mountain,
  TrendingUp,
  Vote,
  Megaphone,
  Rocket,
} from 'lucide-react';

export default function GuidePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        router.push('/login');
        return;
      }

      try {
        await authAPI.getMe();
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
            <div className="text-lg text-gray-600 dark:text-gray-300 bloomberg:text-bloomberg-green font-medium">Loading guide...</div>
          </div>
        </div>
      </AppNavigation>
    );
  }

  return (
    <AppNavigation>
      <div className="relative mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-4 rounded-2xl bg-gradient-to-br from-corporate-blue to-blue-600 dark:from-corporate-blue dark:to-blue-700 bloomberg:from-bloomberg-green bloomberg:to-bloomberg-green-dim">
              <BookOpen className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 dark:text-white bloomberg:text-bloomberg-green-bright">
                Game Guide
              </h1>
              <p className="text-lg text-gray-600 dark:text-gray-400 bloomberg:text-bloomberg-green-dim mt-1">
                Master the art of corporate warfare
              </p>
            </div>
          </div>
          <p className="text-gray-600 dark:text-gray-400 bloomberg:text-bloomberg-green-dim">
            This guide covers all the essential mechanics you need to build a successful corporate empire.
            Click on any section to expand and learn more.
          </p>
        </div>

        {/* Quick Navigation */}
        <div className="mb-8 p-4 bg-gray-50 dark:bg-gray-800/30 bloomberg:bg-black bloomberg:border bloomberg:border-bloomberg-green rounded-xl">
          <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 bloomberg:text-bloomberg-green-dim mb-3 uppercase tracking-wide">
            Jump to Section
          </h2>
          <div className="flex flex-wrap gap-2">
            {[
              { id: 'introduction', label: 'Introduction' },
              { id: 'corporations', label: 'Corporations' },
              { id: 'units', label: 'Units' },
              { id: 'markets', label: 'Markets' },
              { id: 'resources', label: 'Resources' },
              { id: 'products', label: 'Products' },
              { id: 'production', label: 'Production' },
              { id: 'actions', label: 'Action Points' },
              { id: 'governance', label: 'Governance' },
              { id: 'financials', label: 'Financials' },
              { id: 'corporate-actions', label: 'Corporate Actions' },
            ].map((section) => (
              <a
                key={section.id}
                href={`#${section.id}`}
                className="px-3 py-1.5 text-sm font-medium rounded-lg bg-white dark:bg-gray-700 bloomberg:bg-black border border-gray-200 dark:border-gray-600 bloomberg:border-bloomberg-green text-gray-700 dark:text-gray-300 bloomberg:text-bloomberg-green hover:border-corporate-blue dark:hover:border-corporate-blue-light bloomberg:hover:border-bloomberg-green-bright transition-colors"
              >
                {section.label}
              </a>
            ))}
          </div>
        </div>

        {/* Guide Sections */}
        <div className="space-y-4">
          {/* Introduction */}
          <GuideSection
            id="introduction"
            title="Introduction"
            icon={<BookOpen className="w-6 h-6 text-white" />}
            defaultOpen={true}
          >
            <div className="space-y-4 text-gray-600 dark:text-gray-300 bloomberg:text-bloomberg-green-dim">
              <p className="text-lg font-medium text-gray-900 dark:text-white bloomberg:text-bloomberg-green-bright">
                Welcome to Corporate Warfare
              </p>
              <p>
                You are an aspiring business magnate in a dynamic economic simulation. Your goal is to
                build a profitable corporate empire through strategic investments, market expansion,
                and smart resource management.
              </p>

              <div className="grid sm:grid-cols-2 gap-4 mt-6">
                <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 bloomberg:bg-bloomberg-green/10 border border-blue-100 dark:border-blue-800 bloomberg:border-bloomberg-green/30">
                  <h4 className="font-semibold text-gray-900 dark:text-white bloomberg:text-bloomberg-green-bright mb-2">
                    Hourly Turns
                  </h4>
                  <p className="text-sm">
                    The economy updates every hour. Your corporations generate revenue, consume resources,
                    and compete for market share continuously. Plan ahead and check in regularly.
                  </p>
                </div>
                <div className="p-4 rounded-lg bg-green-50 dark:bg-green-900/20 bloomberg:bg-bloomberg-green/10 border border-green-100 dark:border-green-800 bloomberg:border-bloomberg-green/30">
                  <h4 className="font-semibold text-gray-900 dark:text-white bloomberg:text-bloomberg-green-bright mb-2">
                    Paths to Victory
                  </h4>
                  <p className="text-sm">
                    Grow your net worth through dividends, stock appreciation, and smart trading.
                    Become a passive investor or take the helm as CEO of your own corporation.
                  </p>
                </div>
              </div>
            </div>
          </GuideSection>

          {/* Corporations */}
          <GuideSection
            id="corporations"
            title="Corporations"
            icon={<Building2 className="w-6 h-6 text-white" />}
          >
            <div className="space-y-4 text-gray-600 dark:text-gray-300 bloomberg:text-bloomberg-green-dim">
              <p>
                Corporations are the engines of the economy. Each corporation operates in a specific
                industry sector and can expand across multiple states.
              </p>

              <div className="space-y-3">
                <h4 className="font-semibold text-gray-900 dark:text-white bloomberg:text-bloomberg-green-bright">
                  Key Concepts
                </h4>

                <div className="space-y-2">
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-corporate-blue dark:bg-corporate-blue-light bloomberg:bg-bloomberg-green mt-2"></div>
                    <div>
                      <span className="font-medium text-gray-900 dark:text-white bloomberg:text-bloomberg-green-bright">CEO: </span>
                      The player who controls the corporation. CEOs set strategy, approve expansions,
                      and manage dividends. They receive a salary and bonus action points.
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-corporate-blue dark:bg-corporate-blue-light bloomberg:bg-bloomberg-green mt-2"></div>
                    <div>
                      <span className="font-medium text-gray-900 dark:text-white bloomberg:text-bloomberg-green-bright">Sector: </span>
                      Your industry determines what you can produce and extract. There are 21 sectors
                      ranging from Technology to Agriculture to Mining.
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-corporate-blue dark:bg-corporate-blue-light bloomberg:bg-bloomberg-green mt-2"></div>
                    <div>
                      <span className="font-medium text-gray-900 dark:text-white bloomberg:text-bloomberg-green-bright">Focus: </span>
                      Corporations can specialize in extraction, production, retail, services, or be
                      diversified. Your focus affects which unit types you can build.
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-corporate-blue dark:bg-corporate-blue-light bloomberg:bg-bloomberg-green mt-2"></div>
                    <div>
                      <span className="font-medium text-gray-900 dark:text-white bloomberg:text-bloomberg-green-bright">Headquarters: </span>
                      Every corporation is headquartered in a US state. This is primarily for identity
                      and can be changed through a board vote.
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-lg bg-amber-50 dark:bg-amber-900/20 bloomberg:bg-bloomberg-green/10 border border-amber-200 dark:border-amber-800 bloomberg:border-bloomberg-green/30 mt-4">
                <p className="text-sm">
                  <span className="font-semibold">Strategy Tip: </span>
                  When founding a corporation, consider both the sector and the focus. A Mining company
                  with an extraction focus will excel at raw material production but will need to sell
                  to production-focused companies.
                </p>
              </div>
            </div>
          </GuideSection>

          {/* Business Units */}
          <GuideSection
            id="units"
            title="Business Units"
            icon={<Briefcase className="w-6 h-6 text-white" />}
          >
            <div className="space-y-4 text-gray-600 dark:text-gray-300 bloomberg:text-bloomberg-green-dim">
              <p>
                Business units are the operational heart of your corporation. Each market entry allows
                you to build different types of units depending on your sector and focus.
              </p>

              <div className="grid sm:grid-cols-2 gap-4 mt-4">
                <div className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 bloomberg:border-bloomberg-green">
                  <div className="flex items-center gap-2 mb-2">
                    <Store className="w-5 h-5 text-blue-500 dark:text-blue-400 bloomberg:text-bloomberg-green" />
                    <h4 className="font-semibold text-gray-900 dark:text-white bloomberg:text-bloomberg-green-bright">Retail Units</h4>
                  </div>
                  <p className="text-sm">
                    Sell products directly to consumers. Retail units consume products from the market
                    and generate revenue based on local demand and competition.
                  </p>
                </div>

                <div className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 bloomberg:border-bloomberg-green">
                  <div className="flex items-center gap-2 mb-2">
                    <Hammer className="w-5 h-5 text-orange-500 dark:text-orange-400 bloomberg:text-bloomberg-green" />
                    <h4 className="font-semibold text-gray-900 dark:text-white bloomberg:text-bloomberg-green-bright">Production Units</h4>
                  </div>
                  <p className="text-sm">
                    Transform raw resources into finished products. These units require input materials
                    and produce goods that can be sold on the market.
                  </p>
                </div>

                <div className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 bloomberg:border-bloomberg-green">
                  <div className="flex items-center gap-2 mb-2">
                    <HeadphonesIcon className="w-5 h-5 text-purple-500 dark:text-purple-400 bloomberg:text-bloomberg-green" />
                    <h4 className="font-semibold text-gray-900 dark:text-white bloomberg:text-bloomberg-green-bright">Service Units</h4>
                  </div>
                  <p className="text-sm">
                    Provide professional services to businesses and consumers. Service units consume
                    some products but generate steady revenue with lower volatility.
                  </p>
                </div>

                <div className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 bloomberg:border-bloomberg-green">
                  <div className="flex items-center gap-2 mb-2">
                    <Mountain className="w-5 h-5 text-emerald-500 dark:text-emerald-400 bloomberg:text-bloomberg-green" />
                    <h4 className="font-semibold text-gray-900 dark:text-white bloomberg:text-bloomberg-green-bright">Extraction Units</h4>
                  </div>
                  <p className="text-sm">
                    Extract raw resources from the ground. Only certain sectors can operate extraction
                    units, and only in states with those natural resources.
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-lg bg-amber-50 dark:bg-amber-900/20 bloomberg:bg-bloomberg-green/10 border border-amber-200 dark:border-amber-800 bloomberg:border-bloomberg-green/30">
                <p className="text-sm">
                  <span className="font-semibold">Strategy Tip: </span>
                  Building units costs action points. Plan your expansion carefully - overextending
                  leaves you unable to respond to market opportunities or threats.
                </p>
              </div>
            </div>
          </GuideSection>

          {/* Market Entry */}
          <GuideSection
            id="markets"
            title="Market Entry"
            icon={<Globe className="w-6 h-6 text-white" />}
          >
            <div className="space-y-4 text-gray-600 dark:text-gray-300 bloomberg:text-bloomberg-green-dim">
              <p>
                The United States is divided into 50 state markets, each with its own characteristics
                and opportunities. Expanding into new markets requires capital and action points.
              </p>

              <div className="space-y-3">
                <h4 className="font-semibold text-gray-900 dark:text-white bloomberg:text-bloomberg-green-bright">
                  State Characteristics
                </h4>
                <div className="space-y-2">
                  <div className="flex items-start gap-3">
                    <TrendingUp className="w-5 h-5 text-green-500 dark:text-green-400 bloomberg:text-bloomberg-green mt-0.5" />
                    <div>
                      <span className="font-medium text-gray-900 dark:text-white bloomberg:text-bloomberg-green-bright">Capacity: </span>
                      Larger states support more business units. California and Texas have high capacity,
                      while smaller states are more limited.
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Pickaxe className="w-5 h-5 text-amber-500 dark:text-amber-400 bloomberg:text-bloomberg-green mt-0.5" />
                    <div>
                      <span className="font-medium text-gray-900 dark:text-white bloomberg:text-bloomberg-green-bright">Resources: </span>
                      States have different natural resources. Texas has oil, Pennsylvania has coal,
                      and agricultural states have fertile land.
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-lg bg-amber-50 dark:bg-amber-900/20 bloomberg:bg-bloomberg-green/10 border border-amber-200 dark:border-amber-800 bloomberg:border-bloomberg-green/30">
                <p className="text-sm">
                  <span className="font-semibold">Strategy Tip: </span>
                  Don&apos;t spread too thin. It&apos;s often better to dominate a few key markets than to have
                  a weak presence everywhere. Consider which states have the resources your sector needs.
                </p>
              </div>
            </div>
          </GuideSection>

          {/* Resources */}
          <GuideSection
            id="resources"
            title="Resources (Commodities)"
            icon={<Pickaxe className="w-6 h-6 text-white" />}
          >
            <div className="space-y-4 text-gray-600 dark:text-gray-300 bloomberg:text-bloomberg-green-dim">
              <p>
                Raw resources are the foundation of the economy. They&apos;re extracted from the ground
                and used by production facilities to create finished goods.
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
                {[
                  { name: 'Oil', desc: 'Energy sector' },
                  { name: 'Iron Ore', desc: 'Heavy industry' },
                  { name: 'Rare Earth', desc: 'Technology' },
                  { name: 'Copper', desc: 'Electronics' },
                  { name: 'Fertile Land', desc: 'Agriculture' },
                  { name: 'Lumber', desc: 'Construction' },
                  { name: 'Chemical Compounds', desc: 'Pharma' },
                  { name: 'Coal', desc: 'Energy/Steel' },
                ].map((resource) => (
                  <div
                    key={resource.name}
                    className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800 bloomberg:bg-black border border-gray-200 dark:border-gray-700 bloomberg:border-bloomberg-green/50"
                  >
                    <div className="font-medium text-gray-900 dark:text-white bloomberg:text-bloomberg-green-bright text-sm">
                      {resource.name}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 bloomberg:text-bloomberg-green-dim">
                      {resource.desc}
                    </div>
                  </div>
                ))}
              </div>

              <p className="mt-4">
                Resource prices fluctuate based on supply and demand. When many extraction companies
                produce a resource, prices fall. When production companies need more than is available,
                prices rise.
              </p>

              <div className="p-4 rounded-lg bg-amber-50 dark:bg-amber-900/20 bloomberg:bg-bloomberg-green/10 border border-amber-200 dark:border-amber-800 bloomberg:border-bloomberg-green/30">
                <p className="text-sm">
                  <span className="font-semibold">Strategy Tip: </span>
                  Watch the commodity markets. If a resource is in short supply and prices are high,
                  extraction companies in that sector become very profitable.
                </p>
              </div>
            </div>
          </GuideSection>

          {/* Products */}
          <GuideSection
            id="products"
            title="Products"
            icon={<Factory className="w-6 h-6 text-white" />}
          >
            <div className="space-y-4 text-gray-600 dark:text-gray-300 bloomberg:text-bloomberg-green-dim">
              <p>
                Products are manufactured goods created by production facilities. They&apos;re consumed
                by retail and service businesses, and some products are inputs for other products.
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-4">
                {[
                  { name: 'Technology Products', desc: 'Consumer electronics' },
                  { name: 'Manufactured Goods', desc: 'General products' },
                  { name: 'Electricity', desc: 'Powers everything' },
                  { name: 'Food Products', desc: 'Consumer goods' },
                  { name: 'Construction Capacity', desc: 'Building materials' },
                  { name: 'Pharmaceutical Products', desc: 'Healthcare' },
                  { name: 'Defense Equipment', desc: 'Military contracts' },
                  { name: 'Logistics Capacity', desc: 'Transportation' },
                  { name: 'Steel', desc: 'Industrial input' },
                ].map((product) => (
                  <div
                    key={product.name}
                    className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800 bloomberg:bg-black border border-gray-200 dark:border-gray-700 bloomberg:border-bloomberg-green/50"
                  >
                    <div className="font-medium text-gray-900 dark:text-white bloomberg:text-bloomberg-green-bright text-sm">
                      {product.name}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 bloomberg:text-bloomberg-green-dim">
                      {product.desc}
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-4 rounded-lg bg-amber-50 dark:bg-amber-900/20 bloomberg:bg-bloomberg-green/10 border border-amber-200 dark:border-amber-800 bloomberg:border-bloomberg-green/30">
                <p className="text-sm">
                  <span className="font-semibold">Strategy Tip: </span>
                  Some products like Steel and Electricity are inputs for other production processes.
                  Companies that produce these foundational goods have stable demand.
                </p>
              </div>
            </div>
          </GuideSection>

          {/* Production Chains */}
          <GuideSection
            id="production"
            title="Production Chains"
            icon={<GitBranch className="w-6 h-6 text-white" />}
          >
            <div className="space-y-4 text-gray-600 dark:text-gray-300 bloomberg:text-bloomberg-green-dim">
              <p>
                The economy is interconnected through production chains. Resources flow from extraction
                to production to retail, with each step adding value.
              </p>

              <div className="space-y-4 mt-4">
                <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-800 bloomberg:bg-black border border-gray-200 dark:border-gray-700 bloomberg:border-bloomberg-green">
                  <h4 className="font-semibold text-gray-900 dark:text-white bloomberg:text-bloomberg-green-bright mb-2">
                    Example: Steel Production
                  </h4>
                  <div className="flex items-center gap-2 text-sm flex-wrap">
                    <span className="px-2 py-1 rounded bg-amber-100 dark:bg-amber-900/30 bloomberg:bg-bloomberg-green/20">Iron Ore</span>
                    <ArrowRight className="w-4 h-4" />
                    <span className="px-2 py-1 rounded bg-amber-100 dark:bg-amber-900/30 bloomberg:bg-bloomberg-green/20">Coal</span>
                    <ArrowRight className="w-4 h-4" />
                    <span className="px-2 py-1 rounded bg-blue-100 dark:bg-blue-900/30 bloomberg:bg-bloomberg-green/20">Heavy Industry</span>
                    <ArrowRight className="w-4 h-4" />
                    <span className="px-2 py-1 rounded bg-green-100 dark:bg-green-900/30 bloomberg:bg-bloomberg-green/20">Steel</span>
                  </div>
                </div>

                <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-800 bloomberg:bg-black border border-gray-200 dark:border-gray-700 bloomberg:border-bloomberg-green">
                  <h4 className="font-semibold text-gray-900 dark:text-white bloomberg:text-bloomberg-green-bright mb-2">
                    Example: Construction
                  </h4>
                  <div className="flex items-center gap-2 text-sm flex-wrap">
                    <span className="px-2 py-1 rounded bg-amber-100 dark:bg-amber-900/30 bloomberg:bg-bloomberg-green/20">Lumber</span>
                    <ArrowRight className="w-4 h-4" />
                    <span className="px-2 py-1 rounded bg-green-100 dark:bg-green-900/30 bloomberg:bg-bloomberg-green/20">Steel</span>
                    <ArrowRight className="w-4 h-4" />
                    <span className="px-2 py-1 rounded bg-blue-100 dark:bg-blue-900/30 bloomberg:bg-bloomberg-green/20">Construction</span>
                    <ArrowRight className="w-4 h-4" />
                    <span className="px-2 py-1 rounded bg-purple-100 dark:bg-purple-900/30 bloomberg:bg-bloomberg-green/20">Construction Capacity</span>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-lg bg-amber-50 dark:bg-amber-900/20 bloomberg:bg-bloomberg-green/10 border border-amber-200 dark:border-amber-800 bloomberg:border-bloomberg-green/30">
                <p className="text-sm">
                  <span className="font-semibold">Strategy Tip: </span>
                  Vertical integration (owning multiple stages of a production chain) can be powerful.
                  If you produce steel and manufacture goods from it, you&apos;re insulated from price
                  swings in the steel market.
                </p>
              </div>
            </div>
          </GuideSection>

          {/* Action Points */}
          <GuideSection
            id="actions"
            title="Action Points"
            icon={<Zap className="w-6 h-6 text-white" />}
          >
            <div className="space-y-4 text-gray-600 dark:text-gray-300 bloomberg:text-bloomberg-green-dim">
              <p>
                Action Points (AP) are your most precious resource. They regenerate slowly over time
                and are spent on expansion and special operations.
              </p>

              <div className="space-y-3">
                <h4 className="font-semibold text-gray-900 dark:text-white bloomberg:text-bloomberg-green-bright">
                  Key Points
                </h4>
                <div className="space-y-2">
                  <div className="flex items-start gap-3">
                    <Zap className="w-5 h-5 text-yellow-500 dark:text-yellow-400 bloomberg:text-bloomberg-green mt-0.5" />
                    <div>
                      Action points regenerate automatically every hour. There&apos;s a maximum cap, so
                      don&apos;t let them sit unused for too long.
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Building2 className="w-5 h-5 text-blue-500 dark:text-blue-400 bloomberg:text-bloomberg-green mt-0.5" />
                    <div>
                      CEOs receive bonus action points, reflecting the time and energy required to
                      run a corporation.
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-4 p-4 rounded-lg bg-gray-50 dark:bg-gray-800 bloomberg:bg-black border border-gray-200 dark:border-gray-700 bloomberg:border-bloomberg-green">
                <h4 className="font-semibold text-gray-900 dark:text-white bloomberg:text-bloomberg-green-bright mb-2">
                  Common Uses
                </h4>
                <ul className="space-y-1 text-sm">
                  <li>Entering new markets (moderate cost)</li>
                  <li>Building business units (low cost)</li>
                  <li>Abandoning markets (high cost - a strategic penalty)</li>
                  <li>Special corporate actions</li>
                </ul>
              </div>

              <div className="p-4 rounded-lg bg-amber-50 dark:bg-amber-900/20 bloomberg:bg-bloomberg-green/10 border border-amber-200 dark:border-amber-800 bloomberg:border-bloomberg-green/30">
                <p className="text-sm">
                  <span className="font-semibold">Strategy Tip: </span>
                  Don&apos;t spend all your action points at once. Keep a reserve for unexpected opportunities
                  or to respond to market changes. A player with no AP is vulnerable.
                </p>
              </div>
            </div>
          </GuideSection>

          {/* Corporate Governance */}
          <GuideSection
            id="governance"
            title="Corporate Governance"
            icon={<Users className="w-6 h-6 text-white" />}
          >
            <div className="space-y-4 text-gray-600 dark:text-gray-300 bloomberg:text-bloomberg-green-dim">
              <p>
                Corporations are governed by their board of directors, with major decisions requiring
                votes. Shareholders have voting power proportional to their ownership.
              </p>

              <div className="space-y-3">
                <h4 className="font-semibold text-gray-900 dark:text-white bloomberg:text-bloomberg-green-bright">
                  Board Proposals
                </h4>
                <div className="grid sm:grid-cols-2 gap-2">
                  {[
                    { icon: <Users className="w-4 h-4" />, name: 'CEO Nomination', desc: 'Elect new leadership' },
                    { icon: <Building2 className="w-4 h-4" />, name: 'Sector Change', desc: 'Pivot the business' },
                    { icon: <Globe className="w-4 h-4" />, name: 'HQ Relocation', desc: 'Move headquarters' },
                    { icon: <Users className="w-4 h-4" />, name: 'Board Size', desc: 'Expand or shrink board' },
                    { icon: <DollarSign className="w-4 h-4" />, name: 'CEO Salary', desc: 'Adjust compensation' },
                    { icon: <TrendingUp className="w-4 h-4" />, name: 'Dividends', desc: 'Set payout rate' },
                    { icon: <DollarSign className="w-4 h-4" />, name: 'Special Dividend', desc: 'One-time payout' },
                    { icon: <Vote className="w-4 h-4" />, name: 'Stock Split', desc: 'Divide shares' },
                  ].map((proposal) => (
                    <div
                      key={proposal.name}
                      className="flex items-center gap-2 p-2 rounded bg-gray-50 dark:bg-gray-800 bloomberg:bg-black border border-gray-200 dark:border-gray-700 bloomberg:border-bloomberg-green/50"
                    >
                      <span className="text-corporate-blue dark:text-corporate-blue-light bloomberg:text-bloomberg-green">
                        {proposal.icon}
                      </span>
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-white bloomberg:text-bloomberg-green-bright">
                          {proposal.name}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 bloomberg:text-bloomberg-green-dim">
                          {proposal.desc}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-4 rounded-lg bg-amber-50 dark:bg-amber-900/20 bloomberg:bg-bloomberg-green/10 border border-amber-200 dark:border-amber-800 bloomberg:border-bloomberg-green/30">
                <p className="text-sm">
                  <span className="font-semibold">Strategy Tip: </span>
                  If you own a significant stake in a company, your vote matters. Coordinate with other
                  shareholders to push through beneficial changes or block harmful ones.
                </p>
              </div>
            </div>
          </GuideSection>

          {/* Financial System */}
          <GuideSection
            id="financials"
            title="Financial System"
            icon={<DollarSign className="w-6 h-6 text-white" />}
          >
            <div className="space-y-4 text-gray-600 dark:text-gray-300 bloomberg:text-bloomberg-green-dim">
              <p>
                Understanding corporate finances is key to evaluating investments and running a
                successful business.
              </p>

              <div className="space-y-3">
                <div className="p-4 rounded-lg bg-green-50 dark:bg-green-900/20 bloomberg:bg-bloomberg-green/10 border border-green-200 dark:border-green-800 bloomberg:border-bloomberg-green/30">
                  <h4 className="font-semibold text-gray-900 dark:text-white bloomberg:text-bloomberg-green-bright mb-2">
                    Revenue
                  </h4>
                  <p className="text-sm">
                    Corporations earn revenue from retail sales, production output, and extraction.
                    Revenue depends on unit count, market conditions, and resource availability.
                  </p>
                </div>

                <div className="p-4 rounded-lg bg-red-50 dark:bg-red-900/20 bloomberg:bg-bloomberg-green/10 border border-red-200 dark:border-red-800 bloomberg:border-bloomberg-green/30">
                  <h4 className="font-semibold text-gray-900 dark:text-white bloomberg:text-bloomberg-green-bright mb-2">
                    Costs
                  </h4>
                  <p className="text-sm">
                    Operating costs include labor, input materials (resources and products), and
                    CEO salary. Efficient operations keep costs low relative to revenue.
                  </p>
                </div>

                <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 bloomberg:bg-bloomberg-green/10 border border-blue-200 dark:border-blue-800 bloomberg:border-bloomberg-green/30">
                  <h4 className="font-semibold text-gray-900 dark:text-white bloomberg:text-bloomberg-green-bright mb-2">
                    Dividends
                  </h4>
                  <p className="text-sm">
                    Profitable corporations can pay dividends to shareholders. Regular dividends
                    are a percentage of profits, while special dividends are one-time payouts.
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-lg bg-amber-50 dark:bg-amber-900/20 bloomberg:bg-bloomberg-green/10 border border-amber-200 dark:border-amber-800 bloomberg:border-bloomberg-green/30">
                <p className="text-sm">
                  <span className="font-semibold">Strategy Tip: </span>
                  Stock prices reflect expected future earnings. A company with low profits today
                  but strong growth potential might be a better investment than a stable dividend payer.
                </p>
              </div>
            </div>
          </GuideSection>

          {/* Corporate Actions */}
          <GuideSection
            id="corporate-actions"
            title="Corporate Actions"
            icon={<Target className="w-6 h-6 text-white" />}
          >
            <div className="space-y-4 text-gray-600 dark:text-gray-300 bloomberg:text-bloomberg-green-dim">
              <p>
                CEOs can launch special corporate actions to boost performance temporarily. These
                cost money but can provide significant advantages.
              </p>

              <div className="grid sm:grid-cols-2 gap-4 mt-4">
                <div className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 bloomberg:border-bloomberg-green">
                  <div className="flex items-center gap-2 mb-2">
                    <Megaphone className="w-5 h-5 text-pink-500 dark:text-pink-400 bloomberg:text-bloomberg-green" />
                    <h4 className="font-semibold text-gray-900 dark:text-white bloomberg:text-bloomberg-green-bright">
                      Marketing Campaign
                    </h4>
                  </div>
                  <p className="text-sm">
                    Boost retail unit revenue temporarily. Great for when you need a quick revenue
                    injection or want to capitalize on favorable market conditions.
                  </p>
                </div>

                <div className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 bloomberg:border-bloomberg-green">
                  <div className="flex items-center gap-2 mb-2">
                    <Rocket className="w-5 h-5 text-orange-500 dark:text-orange-400 bloomberg:text-bloomberg-green" />
                    <h4 className="font-semibold text-gray-900 dark:text-white bloomberg:text-bloomberg-green-bright">
                      Supply Rush
                    </h4>
                  </div>
                  <p className="text-sm">
                    Increase production unit output temporarily. Useful when product prices are
                    high or you need to fulfill increased demand quickly.
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-lg bg-amber-50 dark:bg-amber-900/20 bloomberg:bg-bloomberg-green/10 border border-amber-200 dark:border-amber-800 bloomberg:border-bloomberg-green/30">
                <p className="text-sm">
                  <span className="font-semibold">Strategy Tip: </span>
                  Corporate actions have cooldowns. Time them strategically - don&apos;t waste a marketing
                  campaign when demand is already low, and don&apos;t rush production when prices are
                  at their floor.
                </p>
              </div>
            </div>
          </GuideSection>
        </div>

        {/* Footer CTA */}
        <div className="mt-12 p-6 rounded-xl bg-gradient-to-r from-corporate-blue via-blue-600 to-indigo-700 dark:from-corporate-blue dark:via-blue-700 dark:to-indigo-800 bloomberg:from-black bloomberg:via-bloomberg-green/20 bloomberg:to-black bloomberg:border-2 bloomberg:border-bloomberg-green">
          <div className="text-center">
            <h3 className="text-2xl font-bold text-white bloomberg:text-bloomberg-green-bright mb-2">
              Ready to Build Your Empire?
            </h3>
            <p className="text-blue-100 dark:text-blue-200 bloomberg:text-bloomberg-green-dim mb-4">
              Put your knowledge into practice. Start investing or found your own corporation.
            </p>
            <div className="flex justify-center gap-4">
              <button
                onClick={() => router.push('/stock-market')}
                className="px-6 py-3 bg-white text-corporate-blue bloomberg:bg-bloomberg-green bloomberg:text-black rounded-lg font-semibold hover:bg-blue-50 bloomberg:hover:bg-bloomberg-green-bright transition-colors"
              >
                Browse Investments
              </button>
              <button
                onClick={() => router.push('/corporation/create')}
                className="px-6 py-3 bg-white/20 backdrop-blur-sm text-white bloomberg:bg-black bloomberg:text-bloomberg-green border-2 border-white/30 bloomberg:border-bloomberg-green rounded-lg font-semibold hover:bg-white/30 bloomberg:hover:border-bloomberg-green-bright transition-colors"
              >
                Start a Corporation
              </button>
            </div>
          </div>
        </div>
      </div>
    </AppNavigation>
  );
}
