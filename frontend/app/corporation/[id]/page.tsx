"use client";

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import AppNavigation from '@/components/AppNavigation';
import { corporationAPI, CorporationResponse, authAPI } from '@/lib/api';
import { Building2, Edit, Trash2, TrendingUp, DollarSign, Users, User, Calendar } from 'lucide-react';

export default function CorporationDetailPage() {
  const router = useRouter();
  const params = useParams();
  const corpId = parseInt(params.id as string, 10);
  
  const [corporation, setCorporation] = useState<CorporationResponse | null>(null);
  const [viewerUserId, setViewerUserId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [corpData, userData] = await Promise.all([
          corporationAPI.getById(corpId),
          authAPI.getMe().catch(() => null),
        ]);
        setCorporation(corpData);
        if (userData) {
          setViewerUserId(userData.id);
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-gray-100 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 flex items-center justify-center">
        <div className="text-lg text-gray-600 dark:text-gray-200">Loading corporation...</div>
      </div>
    );
  }

  if (error || !corporation) {
    return (
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
    );
  }

  const isCeo = viewerUserId === corporation.ceo_id;
  const marketCap = corporation.shares * corporation.share_price;
  const publicSharesPercentage = (corporation.public_shares / corporation.shares) * 100;

  return (
    <AppNavigation>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-gray-100 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-lg mb-6">
          <div className="flex items-start gap-6">
            <div className="flex-shrink-0 w-24 h-24 rounded-lg bg-gray-100 dark:bg-gray-700 overflow-hidden border border-gray-200 dark:border-gray-600">
              {corporation.logo ? (
                <img
                  src={corporation.logo}
                  alt={corporation.name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.currentTarget.src = '/defaultpfp.jpg';
                  }}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Building2 className="w-12 h-12 text-gray-400" />
                </div>
              )}
            </div>
            <div className="flex-1">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                    <Link href={`/corporation/${corporation.id}`} className="hover:text-corporate-blue transition-colors">
                      {corporation.name}
                    </Link>
                  </h1>
                  {corporation.type && (
                    <span className="inline-block px-3 py-1 text-sm font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg mb-2">
                      {corporation.type}
                    </span>
                  )}
                </div>
                {isCeo && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => router.push(`/corporation/${corporation.id}/edit`)}
                      className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center gap-2"
                    >
                      <Edit className="w-4 h-4" />
                      Edit
                    </button>
                    <button
                      onClick={handleDelete}
                      disabled={deleting}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors flex items-center gap-2"
                    >
                      <Trash2 className="w-4 h-4" />
                      {deleting ? 'Deleting...' : 'Delete'}
                    </button>
                  </div>
                )}
              </div>
              {corporation.ceo && (
                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                  <User className="w-4 h-4" />
                  <span>CEO: </span>
                  <Link
                    href={`/profile/${corporation.ceo.profile_id}`}
                    className="font-semibold hover:text-corporate-blue transition-colors"
                  >
                    {corporation.ceo.player_name || corporation.ceo.username}
                  </Link>
                </div>
              )}
              <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-500 mt-2">
                <Calendar className="w-4 h-4" />
                <span>Founded {formatDate(corporation.created_at)}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Financial Overview */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-lg">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Financial Overview</h2>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-1">
                    <DollarSign className="w-4 h-4" />
                    Share Price
                  </div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {formatCurrency(corporation.share_price)}
                  </p>
                </div>
                <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-1">
                    <Users className="w-4 h-4" />
                    Total Shares
                  </div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {corporation.shares.toLocaleString()}
                  </p>
                </div>
                <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-1">
                    <TrendingUp className="w-4 h-4" />
                    Market Cap
                  </div>
                  <p className="text-2xl font-bold text-corporate-blue">
                    {formatCurrency(marketCap)}
                  </p>
                </div>
                <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-1">
                    <Users className="w-4 h-4" />
                    Public Shares
                  </div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {corporation.public_shares.toLocaleString()}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    ({publicSharesPercentage.toFixed(1)}%)
                  </p>
                </div>
              </div>
            </div>

            {/* Shareholders */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-lg">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Shareholders</h2>
              {corporation.shareholders && corporation.shareholders.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200 dark:border-gray-700">
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Shareholder</th>
                        <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Shares</th>
                        <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Ownership</th>
                        <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Value</th>
                      </tr>
                    </thead>
                    <tbody>
                      {corporation.shareholders
                        .sort((a, b) => b.shares - a.shares)
                        .map((sh) => {
                          const ownershipPercentage = (sh.shares / corporation.shares) * 100;
                          const value = sh.shares * corporation.share_price;
                          const isShareholderCeo = sh.user_id === corporation.ceo_id;
                          return (
                            <tr
                              key={sh.id}
                              className={`border-b border-gray-100 dark:border-gray-800 ${isShareholderCeo ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}
                            >
                              <td className="py-3 px-4">
                                {sh.user ? (
                                  <Link
                                    href={`/profile/${sh.user.profile_id}`}
                                    className="flex items-center gap-3 hover:text-corporate-blue transition-colors"
                                  >
                                    {sh.user.profile_image_url && (
                                      <img
                                        src={sh.user.profile_image_url}
                                        alt={sh.user.username}
                                        className="w-8 h-8 rounded-full object-cover"
                                        onError={(e) => {
                                          e.currentTarget.src = '/defaultpfp.jpg';
                                        }}
                                      />
                                    )}
                                    <div>
                                      <div className="font-medium text-gray-900 dark:text-white">
                                        {sh.user.player_name || sh.user.username}
                                        {isShareholderCeo && (
                                          <span className="ml-2 text-xs bg-corporate-blue text-white px-2 py-0.5 rounded">CEO</span>
                                        )}
                                      </div>
                                      <div className="text-xs text-gray-500 dark:text-gray-400">@{sh.user.username}</div>
                                    </div>
                                  </Link>
                                ) : (
                                  <span className="text-gray-500 dark:text-gray-400">Unknown User</span>
                                )}
                              </td>
                              <td className="text-right py-3 px-4 font-medium text-gray-900 dark:text-white">
                                {sh.shares.toLocaleString()}
                              </td>
                              <td className="text-right py-3 px-4 text-gray-700 dark:text-gray-300">
                                {ownershipPercentage.toFixed(2)}%
                              </td>
                              <td className="text-right py-3 px-4 font-semibold text-gray-900 dark:text-white">
                                {formatCurrency(value)}
                              </td>
                            </tr>
                          );
                        })}
                      {/* Public shares row */}
                      <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-700/50">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center">
                              <Users className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                            </div>
                            <div>
                              <div className="font-medium text-gray-900 dark:text-white">Public Market</div>
                              <div className="text-xs text-gray-500 dark:text-gray-400">Available for purchase</div>
                            </div>
                          </div>
                        </td>
                        <td className="text-right py-3 px-4 font-medium text-gray-900 dark:text-white">
                          {corporation.public_shares.toLocaleString()}
                        </td>
                        <td className="text-right py-3 px-4 text-gray-700 dark:text-gray-300">
                          {publicSharesPercentage.toFixed(2)}%
                        </td>
                        <td className="text-right py-3 px-4 font-semibold text-gray-900 dark:text-white">
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

          {/* Sidebar */}
          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-lg">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Quick Actions</h3>
              <div className="space-y-2">
                <Link
                  href="/stock-market"
                  className="block w-full px-4 py-2 text-center border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  View Stock Market
                </Link>
                {corporation.ceo && (
                  <Link
                    href={`/profile/${corporation.ceo.profile_id}`}
                    className="block w-full px-4 py-2 text-center border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    View CEO Profile
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppNavigation>
  );
}
