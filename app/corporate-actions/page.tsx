'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import AppNavigation from '@/components/AppNavigation';
import { authAPI, corporationAPI, corporateActionsAPI, CorporateAction, CorporationResponse } from '@/lib/api';
import { trackEvent } from '@/lib/analytics';
import { formatCash, getErrorMessage } from '@/lib/utils';
import { AlertCircle, Building2 } from 'lucide-react';

export default function CorporateActionsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [corporation, setCorporation] = useState<CorporationResponse | null>(null);
  const [activeActions, setActiveActions] = useState<CorporateAction[]>([]);
  const [activating, setActivating] = useState<'supply_rush' | 'marketing_campaign' | null>(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError('');
      
      trackEvent('view_corporate_actions');

      try {
        const me = await authAPI.getMe();
        const corporations = await corporationAPI.getAll();
        const myCorp = corporations.find(
          (corp) => corp.ceo?.profile_id === me.profile_id || corp.ceo_id === me.id
        );

        if (!myCorp) {
          // User is not a CEO - redirect to create corporation page
          window.location.href = '/corporation/create';
          return;
        }

        const corpData = await corporationAPI.getById(myCorp.id);
        setCorporation(corpData);

        const actions = await corporateActionsAPI.getActiveActions(myCorp.id).catch((_err: unknown) =>
          corporateActionsAPI.getAllActions(myCorp.id).catch((_err2: unknown) => [])
        );
        setActiveActions(actions);
      } catch (err: unknown) {
        setError('Please log in to view corporate actions.');
        setCorporation(null);
        setActiveActions([]);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const marketCap = useMemo(() => {
    if (!corporation) return 0;
    const totalHeldByPlayers =
      corporation.shareholders?.reduce((sum: number, sh) => sum + (sh.shares || 0), 0) || 0;
    const actualTotalShares = totalHeldByPlayers + (corporation.public_shares || 0);
    const effectiveTotalShares = actualTotalShares > 0 ? actualTotalShares : corporation.shares || 0;
    return effectiveTotalShares * (corporation.share_price || 0);
  }, [corporation]);

  const actionCostValue = useMemo(() => 500_000 + marketCap * 0.01, [marketCap]);

  const getRemainingTime = (expiresAt: string) => {
    const diffMs = new Date(expiresAt).getTime() - now;
    if (!Number.isFinite(diffMs) || diffMs <= 0) return 'Expired';
    const totalMinutes = Math.floor(diffMs / 60_000);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    if (hours <= 0) return `${minutes}m`;
    return `${hours}h ${minutes}m`;
  };

  const refreshActions = async (corpId: number) => {
    const actions = await corporateActionsAPI.getActiveActions(corpId).catch(() =>
      corporateActionsAPI.getAllActions(corpId).catch(() => [])
    );
    setActiveActions(actions);
  };

  const handleActivateSupplyRush = async () => {
    if (!corporation) return;
    setActivating('supply_rush');
    try {
      await corporateActionsAPI.activateSupplyRush(corporation.id);
      await refreshActions(corporation.id);
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Failed to activate Supply Rush.'));
    } finally {
      setActivating(null);
    }
  };

  const handleActivateMarketingCampaign = async () => {
    if (!corporation) return;
    setActivating('marketing_campaign');
    try {
      await corporateActionsAPI.activateMarketingCampaign(corporation.id);
      await refreshActions(corporation.id);
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Failed to activate Marketing Campaign.'));
    } finally {
      setActivating(null);
    }
  };

  if (loading) {
    return (
      <AppNavigation>
        <div className="relative mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-10 space-y-6">
          {/* Header Skeleton */}
          <div className="relative rounded-2xl border border-line-subtle bg-surface-1 shadow-xl overflow-hidden">
            <div className="relative p-6">
              <div className="h-8 w-64 bg-surface-3 rounded-lg animate-pulse mb-4" />
              <div className="h-5 w-48 bg-surface-2 rounded-lg animate-pulse" />
            </div>
          </div>

          {/* Actions Grid Skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[1, 2].map((i) => (
              <div key={i} className="relative rounded-xl border border-line-subtle bg-surface-1 p-6 shadow-lg">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 rounded-lg bg-surface-3 animate-pulse" />
                  <div className="space-y-2">
                    <div className="h-6 w-32 bg-surface-3 rounded animate-pulse" />
                    <div className="h-4 w-24 bg-surface-2 rounded animate-pulse" />
                  </div>
                </div>
                <div className="space-y-3 mb-6">
                  <div className="h-4 w-full bg-surface-2 rounded animate-pulse" />
                  <div className="h-4 w-3/4 bg-surface-2 rounded animate-pulse" />
                </div>
                <div className="h-10 w-full bg-surface-3 rounded-lg animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      </AppNavigation>
    );
  }

  if (error && !corporation) {
    return (
      <AppNavigation>
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-gray-100 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 flex items-center justify-center">
          <div className="text-center max-w-lg px-6">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <p className="text-xl text-red-600 dark:text-red-400 mb-6">{error}</p>
            <div className="flex justify-center gap-3">
              <Link
                href="/login"
                className="px-6 py-2 bg-corporate-blue text-white rounded-lg font-semibold hover:bg-corporate-blue-dark transition-colors"
              >
                Log In
              </Link>
              <Link
                href="/corporations"
                className="px-6 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-semibold"
              >
                View Corporations
              </Link>
            </div>
          </div>
        </div>
      </AppNavigation>
    );
  }

  if (!corporation) {
    return (
      <AppNavigation>
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-gray-100 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 flex items-center justify-center">
          <div className="text-center max-w-lg px-6">
            <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-xl text-gray-700 dark:text-gray-200 mb-6">No corporation found.</p>
            <Link
              href="/corporations"
              className="px-6 py-2 bg-corporate-blue text-white rounded-lg font-semibold hover:bg-corporate-blue-dark transition-colors"
            >
              View Corporations
            </Link>
          </div>
        </div>
      </AppNavigation>
    );
  }

  return (
    <AppNavigation>
      <div className="relative mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-10 space-y-6">
        <div className="relative rounded-2xl border border-gray-200/50 dark:border-gray-700/50 bg-gradient-to-br from-white via-white to-gray-50/50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800/50 shadow-2xl overflow-hidden backdrop-blur-sm">
          <div className="absolute inset-0 bg-gradient-to-br from-corporate-blue/5 via-transparent to-corporate-blue-light/5 dark:from-corporate-blue/10 dark:via-transparent dark:to-corporate-blue-dark/10 pointer-events-none" />
          <div className="absolute inset-0 ring-1 ring-inset ring-white/20 dark:ring-gray-700/30 pointer-events-none" />
          <div className="relative p-6">
            <div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Corporate Actions</h1>
                <Link
                  href={`/corporation/${corporation.id}`}
                  className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-corporate-blue dark:hover:text-corporate-blue-light transition-colors font-semibold"
                >
                  <Building2 className="w-4 h-4" />
                  {corporation.name}
                </Link>
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-4 text-red-700 dark:text-red-200">
            {error}
          </div>
        )}

        <div className="relative rounded-2xl border border-gray-200/50 dark:border-gray-700/50 bg-gradient-to-br from-white via-white to-gray-50/50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800/50 shadow-2xl overflow-hidden backdrop-blur-sm">
          <div className="absolute inset-0 bg-gradient-to-br from-corporate-blue/5 via-transparent to-corporate-blue-light/5 dark:from-corporate-blue/10 dark:via-transparent dark:to-corporate-blue-dark/10 pointer-events-none" />
          <div className="absolute inset-0 ring-1 ring-inset ring-white/20 dark:ring-gray-700/30 pointer-events-none" />
          <div className="relative p-6">
            {activeActions.length > 0 && (
              <div className="mb-8">
                <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Active Actions</h2>
                <div className="space-y-3">
                  {activeActions.map((action) => (
                    <div
                      key={action.id}
                      className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-bold text-gray-900 dark:text-white">
                            {action.action_type === 'supply_rush' ? 'Supply Rush' : 'Marketing Campaign'}
                          </p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">+10% production and extraction output</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-green-600 dark:text-green-400">Active</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {getRemainingTime(action.expires_at)} remaining
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Available Actions</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="relative rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 shadow-lg">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">Supply Rush</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  Accelerate all production and extraction operations by 10% for 4 hours.
                </p>
                <div className="space-y-2 mb-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Cost:</span>
                    <span className="font-bold text-gray-900 dark:text-white">{formatCash(actionCostValue)}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Duration:</span>
                    <span className="font-bold text-gray-900 dark:text-white">4 hours</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Boost:</span>
                    <span className="font-bold text-green-600 dark:text-green-400">+10%</span>
                  </div>
                </div>
                <button
                  onClick={handleActivateSupplyRush}
                  disabled={activating !== null || activeActions.some((a) => a.action_type === 'supply_rush')}
                  className="w-full px-4 py-3 bg-corporate-blue text-white rounded-lg hover:bg-corporate-blue-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-semibold"
                >
                  {activeActions.some((a) => a.action_type === 'supply_rush')
                    ? 'Already Active'
                    : activating === 'supply_rush'
                      ? 'Activating...'
                      : 'Activate Supply Rush'}
                </button>
              </div>

              <div className="relative rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 shadow-lg">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">Marketing Campaign</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  Launch a marketing campaign to boost all production and extraction by 10% for 4 hours.
                </p>
                <div className="space-y-2 mb-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Cost:</span>
                    <span className="font-bold text-gray-900 dark:text-white">{formatCash(actionCostValue)}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Duration:</span>
                    <span className="font-bold text-gray-900 dark:text-white">4 hours</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Boost:</span>
                    <span className="font-bold text-green-600 dark:text-green-400">+10%</span>
                  </div>
                </div>
                <button
                  onClick={handleActivateMarketingCampaign}
                  disabled={activating !== null || activeActions.some((a) => a.action_type === 'marketing_campaign')}
                  className="w-full px-4 py-3 bg-corporate-blue text-white rounded-lg hover:bg-corporate-blue-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-semibold"
                >
                  {activeActions.some((a) => a.action_type === 'marketing_campaign')
                    ? 'Already Active'
                    : activating === 'marketing_campaign'
                      ? 'Activating...'
                      : 'Activate Marketing Campaign'}
                </button>
              </div>
            </div>

            <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
              <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-2">Cost Calculation</h3>
              <div className="space-y-1 text-xs text-gray-600 dark:text-gray-400">
                <div className="flex items-center justify-between">
                  <span>Base Cost:</span>
                  <span className="font-mono">{formatCash(500000)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>1% of Market Cap ({formatCash(marketCap)}):</span>
                  <span className="font-mono">{formatCash(marketCap * 0.01)}</span>
                </div>
                <div className="border-t border-gray-300 dark:border-gray-600 mt-2 pt-2 flex items-center justify-between font-bold text-gray-900 dark:text-white">
                  <span>Total Cost:</span>
                  <span className="font-mono">{formatCash(actionCostValue)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppNavigation>
  );
}
