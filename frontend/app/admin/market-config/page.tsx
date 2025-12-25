'use client';

import { useEffect, useState } from 'react';
import AppNavigation from '@/components/AppNavigation';
import { marketsAPI, authAPI } from '@/lib/api';

export default function MarketConfigPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [rulesText, setRulesText] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const me = await authAPI.getMe();
        setIsAdmin(Boolean(me?.is_admin));
        const data = await marketsAPI.getSectorRules();
        setRulesText(JSON.stringify(data, null, 2));
      } catch (e: any) {
        setError('Failed to load config');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleSave = async () => {
    try {
      setSaving(true);
      const parsed = JSON.parse(rulesText);
      await marketsAPI.updateSectorRules(parsed);
    } catch (e: any) {
      alert('Invalid JSON or save failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppNavigation>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-gray-100 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
        <div className="max-w-4xl mx-auto p-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Market Sector Rules</h1>
          {loading ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">Loading…</p>
          ) : error ? (
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          ) : (
            <>
              {!isAdmin && (
                <div className="rounded-lg border border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-900/20 p-3 mb-4">
                  <p className="text-sm text-amber-800 dark:text-amber-200">View only. Admin required to modify.</p>
                </div>
              )}
              <textarea
                value={rulesText}
                onChange={(e) => setRulesText(e.target.value)}
                className="w-full h-[480px] rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white p-4 font-mono text-xs"
              />
              <div className="mt-3 flex justify-end">
                <button
                  onClick={handleSave}
                  disabled={!isAdmin || saving}
                  className="px-4 py-2 bg-corporate-blue text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? 'Saving…' : 'Save Rules'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </AppNavigation>
  );
}

