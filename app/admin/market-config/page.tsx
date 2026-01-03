'use client';

import { useEffect, useState } from 'react';
import AppNavigation from '@/components/AppNavigation';
import { marketsAPI, authAPI } from '@/lib/api';
import { Button, Textarea } from '@heroui/react';

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
      } catch (e: unknown) {
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
    } catch (e: unknown) {
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
              <Textarea
                value={rulesText}
                onChange={(e) => setRulesText(e.target.value)}
                className="w-full font-mono text-xs"
                minRows={20}
                label="Configuration JSON"
                labelPlacement="outside"
                placeholder="Enter market configuration JSON..."
                classNames={{
                  input: "font-mono text-xs",
                  inputWrapper: "bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700"
                }}
              />
              <div className="mt-3 flex justify-end">
                <Button
                  onPress={handleSave}
                  isDisabled={!isAdmin || saving}
                  className="bg-corporate-blue text-white font-medium"
                  isLoading={saving}
                >
                  {saving ? 'Saving…' : 'Save Rules'}
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </AppNavigation>
  );
}

