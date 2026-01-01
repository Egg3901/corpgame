'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Layout from '@/components/Layout';
import { 
  ArrowRight, 
  BarChart3, 
  Building2, 
  Clock, 
  Factory, 
  Globe, 
  Layers, 
  PieChart, 
  Sparkles, 
  Store, 
  TrendingUp, 
  Users, 
  Zap,
  Target,
  DollarSign,
  Gavel
} from 'lucide-react';
import { marketsAPI, CommoditiesResponse } from '@/lib/api';
import { getErrorMessage } from '@/lib/utils';

export default function Home() {
  const [marketData, setMarketData] = useState<CommoditiesResponse | null>(null);

  useEffect(() => {
    const fetchMarkets = async () => {
      try {
        const data = await marketsAPI.getCommodities();
        setMarketData(data);
      } catch (err: unknown) {
        console.error(`Failed to fetch market data for landing page: ${getErrorMessage(err)}`);
      }
    };
    fetchMarkets();
  }, []);

  return (
    <Layout>
      <div className="min-h-screen bg-surface-0 selection:bg-accent selection:text-white">
        {/* Live Market Ticker */}
        <div className="ticker-tape-container bg-gray-900 text-white overflow-hidden h-12 flex items-center border-b border-white/10 dark:bg-surface-2 dark:border-line-subtle">
          <div className="flex items-center whitespace-nowrap ticker-scroll px-4">
            {marketData?.commodities.map((c, i) => (
              <div key={i} className="flex items-center gap-4 px-8 border-r border-white/10 last:border-0 dark:border-line-subtle">
                <span className="text-xs font-bold tracking-widest text-gray-400 uppercase dark:text-content-tertiary">{c.resource}</span>
                <span className="font-mono-numeric font-bold text-sm">${c.currentPrice.toFixed(2)}</span>
                <span className={`text-xs font-bold ${c.priceChange >= 0 ? 'text-status-success' : 'text-status-error'}`}>
                  {c.priceChange >= 0 ? '▲' : '▼'} {Math.abs(c.priceChange).toFixed(1)}%
                </span>
              </div>
            ))}
            {/* Duplicate for seamless scroll */}
            {marketData?.commodities.map((c, i) => (
              <div key={`dup-${i}`} className="flex items-center gap-4 px-8 border-r border-white/10 last:border-0 dark:border-line-subtle">
                <span className="text-xs font-bold tracking-widest text-gray-400 uppercase dark:text-content-tertiary">{c.resource}</span>
                <span className="font-mono-numeric font-bold text-sm">${c.currentPrice.toFixed(2)}</span>
                <span className={`text-xs font-bold ${c.priceChange >= 0 ? 'text-status-success' : 'text-status-error'}`}>
                  {c.priceChange >= 0 ? '▲' : '▼'} {Math.abs(c.priceChange).toFixed(1)}%
                </span>
              </div>
            ))}
            {!marketData && (
              <div className="flex items-center gap-4 px-8">
                <span className="text-xs text-content-tertiary animate-pulse dark:text-content-tertiary">CONNECTING TO GLOBAL MARKET TERMINALS...</span>
              </div>
            )}
          </div>
        </div>

        {/* Hero Section */}
        <section className="relative pt-24 pb-32 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-accent/5 to-surface-0 -z-10" />
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="lg:grid lg:grid-cols-2 lg:gap-16 items-center">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-accent/10 text-accent rounded-full text-xs font-bold uppercase tracking-wider mb-6">
                  <Sparkles className="w-3 h-3" />
                  Season 1: Industrial Dawn
                </div>
                <h1 className="text-6xl md:text-7xl font-black text-content-primary leading-[1.1] tracking-tight mb-8">
                  Build your <span className="text-accent">Legacy</span> in the Boardroom.
                </h1>
                <p className="text-xl text-content-secondary leading-relaxed mb-10 max-w-xl">
                  A high-fidelity corporate warfare simulation where players manage extraction, 
                  supply chains, and stock governance in a persistent 24/7 global economy.
                </p>
                <div className="flex flex-wrap gap-4">
                  <Link
                    href="/register"
                    className="px-8 py-4 bg-accent text-white rounded-xl font-bold text-lg hover:bg-accent/90 transition-all shadow-xl shadow-accent/20 flex items-center gap-3 group"
                  >
                    Found Corporation
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </Link>
                  <Link
                    href="/login"
                    className="px-8 py-4 bg-surface-1 text-content-secondary border border-line-subtle rounded-xl font-bold text-lg hover:bg-surface-2 transition-all flex items-center gap-3"
                  >
                    Executive Login
                  </Link>
                </div>
              </div>

              <div className="mt-16 lg:mt-0 relative">
                <div className="bg-surface-1 rounded-2xl shadow-2xl border border-line-subtle p-8 transform rotate-2 hover:rotate-0 transition-transform duration-500">
                  <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-accent rounded-lg flex items-center justify-center text-white font-bold text-xl">
                        M
                      </div>
                      <div>
                        <h3 className="font-black text-content-primary uppercase tracking-tight">Metacorp Systems</h3>
                        <span className="text-xs text-content-tertiary font-bold uppercase tracking-widest">NYSE: META</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-mono-numeric font-bold text-status-success">$1,242.40</div>
                      <div className="text-xs font-bold text-status-success">+12.4% THIS TURN</div>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="h-2 w-full bg-surface-2 rounded-full overflow-hidden">
                      <div className="h-full bg-accent w-2/3" />
                    </div>
                    <div className="flex justify-between text-xs font-bold text-content-tertiary uppercase">
                      <span>Market Share</span>
                      <span>68%</span>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 mt-8">
                      <div className="p-4 bg-status-info-bg dark:bg-status-info-bg/20 rounded-xl">
                        <div className="text-xs text-accent font-bold uppercase mb-1">HQ Location</div>
                        <div className="font-bold text-content-primary">Texas, US</div>
                      </div>
                      <div className="p-4 bg-status-success-bg dark:bg-status-success-bg/20 rounded-xl">
                        <div className="text-xs text-status-success font-bold uppercase mb-1">CEO Salary</div>
                        <div className="font-bold text-content-primary">$250k / hr</div>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Decorative Elements */}
                <div className="absolute -top-4 -right-4 w-24 h-24 bg-status-warning rounded-full opacity-10 blur-2xl" />
                <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-status-info rounded-full opacity-10 blur-3xl" />
              </div>
            </div>
          </div>
        </section>

        {/* The Engine Section */}
        <section className="py-32 bg-surface-0">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-20">
              <h2 className="text-4xl font-black text-content-primary mb-6 uppercase tracking-tight">
                Core Mechanics
              </h2>
              <p className="text-lg text-content-secondary max-w-2xl mx-auto">
                Start with <span className="text-accent font-bold">$500,000</span> initial capital 
                and build your corporation through strategic production, market expansion, and shareholder governance.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 sm:gap-8">
              {/* Mechanic 1 */}
              <div className="bg-surface-1 p-6 sm:p-8 rounded-2xl border border-line-subtle hover:border-accent/30 transition-colors group">
                <div className="w-12 sm:w-14 h-12 sm:h-14 bg-accent/10 rounded-xl flex items-center justify-center mb-4 sm:mb-6 group-hover:scale-110 transition-transform">
                  <Layers className="w-7 h-7 text-accent" />
                </div>
                <h3 className="text-xl font-black text-content-primary mb-4 uppercase tracking-tight">Focus Strategies</h3>
                <p className="text-content-secondary leading-relaxed mb-6">
                  Choose from 5 operational focuses: <span className="font-bold text-content-primary">Extraction</span> for raw materials, 
                  <span className="font-bold text-content-primary">Production</span> for manufacturing, 
                  <span className="font-bold text-content-primary">Retail</span> for consumer sales, 
                  <span className="font-bold text-content-primary">Service</span> for high-margin operations, 
                  or go <span className="font-bold text-content-primary">Diversified</span> for total flexibility.
                </p>
              </div>

              {/* Mechanic 2 */}
              <div className="bg-surface-1 p-8 rounded-2xl border border-line-subtle hover:border-accent/30 transition-colors group">
                <div className="w-14 h-14 bg-status-warning-bg dark:bg-status-warning-bg/20 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <Factory className="w-7 h-7 text-status-warning" />
                </div>
                <h3 className="text-xl font-black text-content-primary mb-4 uppercase tracking-tight">Resource Markets</h3>
                <p className="text-content-secondary leading-relaxed mb-6">
                  Manage supply chains across 19 sectors. Secure <span className="font-bold text-content-primary">Rare Earth</span> for Tech, 
                  <span className="font-bold text-content-primary">Steel</span> for Manufacturing, or <span className="font-bold text-content-primary">Oil</span> for Energy. 
                  Market prices react to real player supply and demand.
                </p>
              </div>

              {/* Mechanic 3 */}
              <div className="bg-surface-1 p-8 rounded-2xl border border-line-subtle hover:border-accent/30 transition-colors group">
                <div className="w-14 h-14 bg-status-success-bg dark:bg-status-success-bg/20 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <Gavel className="w-7 h-7 text-status-success" />
                </div>
                <h3 className="text-xl font-black text-content-primary mb-4 uppercase tracking-tight">Board Governance</h3>
                <p className="text-content-secondary leading-relaxed mb-6">
                  Player corporations are democratic entities. Propose <span className="font-bold text-content-primary">Stock Splits</span>, 
                  nominate new <span className="font-bold text-content-primary">CEOs</span>, adjust <span className="font-bold text-content-primary">Dividend Yields</span>, 
                  or change company <span className="font-bold text-content-primary">Sectors</span> through shareholder voting.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Global Markets Section */}
        <section className="py-32 bg-surface-1 overflow-hidden">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="lg:grid lg:grid-cols-2 lg:gap-16 items-center">
              <div className="relative">
                <div className="grid grid-cols-2 gap-4">
                  {['NY', 'TX', 'CA', 'FL', 'IL', 'WA'].map((state) => (
                    <div key={state} className="p-6 bg-surface-0 rounded-2xl border border-line-subtle">
                      <div className="text-2xl font-black text-accent mb-1">{state}</div>
                      <div className="text-xs text-content-tertiary font-bold uppercase tracking-widest">Market Status</div>
                      <div className="mt-4 flex items-center gap-2">
                        <div className="w-2 h-2 bg-status-success rounded-full animate-pulse" />
                        <span className="text-sm font-bold text-content-secondary">ACTIVE TRADING</span>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="absolute -inset-4 bg-gradient-to-tr from-accent/5 to-transparent -z-10 rounded-3xl" />
              </div>

              <div className="mt-16 lg:mt-0">
                <h2 className="text-4xl font-black text-content-primary mb-8 uppercase tracking-tight leading-none">
                  Expand Across <br />
                  <span className="text-accent">50 US Markets</span>
                </h2>
                <p className="text-lg text-content-secondary leading-relaxed mb-8">
                  Every state has unique population multipliers and natural resource pools. 
                  Strategically enter markets that align with your industrial focus. 
                  Control the production of <span className="font-bold text-content-primary">Copper in Arizona</span> or 
                  dominate <span className="font-bold text-content-primary">Finance in New York</span>.
                </p>
                <div className="space-y-4">
                  {[
                    { icon: Globe, text: "Region-based market multipliers" },
                    { icon: Target, text: "Sector-specific state extraction" },
                    { icon: Clock, text: "Hourly turn-based revenue cycles" }
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-accent-subtle dark:bg-accent-subtle/20 rounded-lg flex items-center justify-center">
                        <item.icon className="w-5 h-5 text-accent" />
                      </div>
                      <span className="font-bold text-content-secondary uppercase tracking-tight text-sm">{item.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Real-time stats section */}
        <section className="bg-accent py-24">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8 md:gap-12 text-center">
              <div>
                <div className="text-3xl sm:text-4xl md:text-5xl font-black text-white mb-2 leading-none">19+</div>
                <div className="text-accent-subtle text-[10px] sm:text-xs font-bold uppercase tracking-widest">Business Sectors</div>
              </div>
              <div>
                <div className="text-3xl sm:text-4xl md:text-5xl font-black text-white mb-2 leading-none">24/7</div>
                <div className="text-accent-subtle text-[10px] sm:text-xs font-bold uppercase tracking-widest">Live Stock Market</div>
              </div>
              <div>
                <div className="text-3xl sm:text-4xl md:text-5xl font-black text-white mb-2 leading-none">1HR</div>
                <div className="text-accent-subtle text-[10px] sm:text-xs font-bold uppercase tracking-widest">Turn Cycle</div>
              </div>
              <div>
                <div className="text-3xl sm:text-4xl md:text-5xl font-black text-white mb-2 leading-none">100%</div>
                <div className="text-accent-subtle text-[10px] sm:text-xs font-bold uppercase tracking-widest">Player-Driven</div>
              </div>
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="py-32 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-surface-1 to-surface-0 -z-10" />
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-5xl font-black text-content-primary mb-8 uppercase tracking-tight leading-none">
              The Desk is <span className="text-accent">Open</span>.
            </h2>
            <p className="text-xl text-content-secondary mb-12">
              Join thousands of other executives in the most detailed corporate strategy game on the web. 
              Found your empire today.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/register"
                className="w-full sm:w-auto px-12 py-5 bg-accent text-white rounded-xl font-bold text-xl hover:bg-accent/90 transition-all shadow-2xl shadow-accent/20"
              >
                Start Your Empire
              </Link>
              <Link
                href="/login"
                className="w-full sm:w-auto px-12 py-5 bg-surface-1 text-content-secondary border border-line-subtle rounded-xl font-bold text-xl hover:bg-surface-2 transition-all"
              >
                Existing User
              </Link>
            </div>
          </div>
        </section>
      </div>
    </Layout>
  );
}
