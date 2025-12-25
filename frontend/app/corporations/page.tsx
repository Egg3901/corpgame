"use client";

import Link from 'next/link';
import AppNavigation from '@/components/AppNavigation';
import { Building2, ChevronUp, ChevronDown, Search, Filter } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { corporationAPI } from '@/lib/api';

function CorporationsList() {
  const router = useRouter();
  const params = useSearchParams();
  const [items, setItems] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(parseInt(params.get('page') || '1', 10));
  const [limit, setLimit] = useState(parseInt(params.get('limit') || '25', 10));
  const [sort, setSort] = useState<(typeof sortKeys)[number]>(
    (params.get('sort') as any) || 'revenue'
  );
  const [dir, setDir] = useState<'asc' | 'desc'>((params.get('dir') as any) || 'desc');
  const [sector, setSector] = useState<string>(params.get('sector') || '');
  const [q, setQ] = useState(params.get('q') || '');
  const [ceo, setCeo] = useState(params.get('ceo') || '');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [availableSectors, setAvailableSectors] = useState<string[]>([]);
  const [debounceTimer, setDebounceTimer] = useState<any>(null);

  const sortKeys = ['revenue', 'profit', 'assets', 'market_cap', 'share_price', 'book_value', 'name'] as const;

  const applyUrl = () => {
    const usp = new URLSearchParams();
    usp.set('page', String(page));
    usp.set('limit', String(limit));
    usp.set('sort', sort);
    usp.set('dir', dir);
    if (sector) usp.set('sector', sector);
    if (q) usp.set('q', q);
    if (ceo) usp.set('ceo', ceo);
    router.push(`/corporations?${usp.toString()}`);
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const data = await corporationAPI.getList({ page, limit, sort, dir, sector, q, ceo });
      setItems(data.items);
      setTotal(data.total);
      setAvailableSectors(data.sectors);
      setError('');
    } catch (e: any) {
      setError('Failed to load corporations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    applyUrl();
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, limit, sort, dir, sector]);

  useEffect(() => {
    if (debounceTimer) clearTimeout(debounceTimer);
    const t = setTimeout(() => {
      setPage(1);
      applyUrl();
      fetchData();
    }, 300);
    setDebounceTimer(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, ceo]);

  const onSort = (key: (typeof sortKeys)[number]) => {
    if (sort === key) {
      setDir(dir === 'asc' ? 'desc' : 'asc');
    } else {
      setSort(key);
      setDir('desc');
    }
    setPage(1);
  };

  const formatCurrency = (value: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
  const formatNumber = (value: number) => new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(value);

  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <AppNavigation>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Building2 className="w-6 h-6 text-gray-500" />
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">Corporations</h1>
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <div className="flex-1 sm:flex-none relative">
              <Search className="w-4 h-4 absolute left-2 top-2.5 text-gray-400" />
              <input
                aria-label="Search corporation names"
                placeholder="Search corporation name"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="w-full sm:w-64 pl-8 pr-3 py-2 rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
              />
            </div>
            <div className="flex-1 sm:flex-none relative">
              <Search className="w-4 h-4 absolute left-2 top-2.5 text-gray-400" />
              <input
                aria-label="Search CEO names"
                placeholder="Search CEO name"
                value={ceo}
                onChange={(e) => setCeo(e.target.value)}
                className="w-full sm:w-48 pl-8 pr-3 py-2 rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
              />
            </div>
            <div className="relative">
              <Filter className="w-4 h-4 absolute left-2 top-2.5 text-gray-400" />
              <select
                aria-label="Filter by sector"
                value={sector}
                onChange={(e) => { setSector(e.target.value); setPage(1); }}
                className="pl-8 pr-6 py-2 rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
              >
                <option value="">All Sectors</option>
                {availableSectors.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <select
              aria-label="Items per page"
              value={limit}
              onChange={(e) => { setLimit(parseInt(e.target.value, 10)); setPage(1); }}
              className="pr-6 py-2 rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
            >
              {[10,25,50,100].map(n => <option key={n} value={n}>{n}/page</option>)}
            </select>
          </div>
        </div>

        <div role="region" aria-live="polite" className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left bg-gray-50 dark:bg-gray-900">
                  {[
                    { key: 'name', label: 'Name' },
                    { key: 'sector', label: 'Sector' },
                    { key: 'ceo', label: 'CEO' },
                    { key: 'market_cap', label: 'Market Cap' },
                    { key: 'revenue', label: 'Revenue (96h)' },
                    { key: 'profit', label: 'Profit (96h)' },
                    { key: 'assets', label: 'Assets' },
                    { key: 'share_price', label: 'Share Price' },
                  ].map((col) => (
                    <th key={col.key} className="px-3 py-2 font-medium text-gray-700 dark:text-gray-300">
                      <button
                        className="inline-flex items-center gap-1 hover:text-corporate-blue dark:hover:text-corporate-blue-light"
                        onClick={() => onSort(col.key as any)}
                        aria-live="polite"
                        aria-label={`Sort by ${col.label}`}
                      >
                        <span>{col.label}</span>
                        {sort === col.key ? (
                          dir === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                        ) : null}
                      </button>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={8} className="px-3 py-8 text-center text-gray-500 dark:text-gray-400">Loading corporations…</td></tr>
                ) : items.length === 0 ? (
                  <tr><td colSpan={8} className="px-3 py-8 text-center text-gray-500 dark:text-gray-400">No corporations found</td></tr>
                ) : (
                  items.map((it) => (
                    <tr key={it.id} className="hover:bg-gray-50 dark:hover:bg-gray-900">
                      <td className="px-3 py-2">
                        <Link href={`/corporation/${it.id}`} className="text-corporate-blue dark:text-corporate-blue-light hover:underline">{it.name}</Link>
                      </td>
                      <td className="px-3 py-2">{it.sector || '-'}</td>
                      <td className="px-3 py-2">{it.ceo?.player_name || it.ceo?.username || '-'}</td>
                      <td className="px-3 py-2 font-mono">{formatCurrency(it.market_cap)}</td>
                      <td className="px-3 py-2 font-mono">{formatCurrency(it.revenue_96h)}</td>
                      <td className="px-3 py-2 font-mono">{formatCurrency(it.profit_96h)}</td>
                      <td className="px-3 py-2 font-mono">{formatCurrency(it.assets)}</td>
                      <td className="px-3 py-2 font-mono">{formatNumber(it.share_price)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between mt-4">
          <div className="text-xs text-gray-500 dark:text-gray-400">Page {page} of {totalPages} • {total.toLocaleString()} total</div>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page <= 1}
              className="px-3 py-1 rounded border border-gray-300 dark:border-gray-700 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >Prev</button>
            <button
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page >= totalPages}
              className="px-3 py-1 rounded border border-gray-300 dark:border-gray-700 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >Next</button>
          </div>
        </div>
      </div>
    </AppNavigation>
  );
}

export default function CorporationsPage() {
  return (
    <Suspense fallback={<AppNavigation><div className="p-6 text-sm text-gray-500 dark:text-gray-400">Loading corporations…</div></AppNavigation>}>
      <CorporationsList />
    </Suspense>
  );
}


