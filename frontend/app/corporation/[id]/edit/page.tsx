'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import AppNavigation from '@/components/AppNavigation';
import { corporationAPI, CorporationResponse, authAPI } from '@/lib/api';
import { Building2, Upload, X, Save, ArrowLeft, Zap } from 'lucide-react';

export default function EditCorporationPage() {
  const router = useRouter();
  const params = useParams();
  const corpId = parseInt(params.id as string, 10);

  const [corporation, setCorporation] = useState<CorporationResponse | null>(null);
  const [viewerUserId, setViewerUserId] = useState<number | null>(null);
  const [userActions, setUserActions] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form state
  const [name, setName] = useState('');
  const [originalName, setOriginalName] = useState('');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  const NAME_CHANGE_COST = 10;

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [corpData, userData] = await Promise.all([
          corporationAPI.getById(corpId),
          authAPI.getMe().catch(() => null),
        ]);
        
        setCorporation(corpData);
        setName(corpData.name);
        setOriginalName(corpData.name);
        
        if (corpData.logo) {
          setLogoPreview(corpData.logo);
        }
        
        if (userData) {
          setViewerUserId(userData.id);
          setUserActions(userData.actions || 0);
          
          // Check if user is CEO
          if (userData.id !== corpData.ceo_id) {
            setError('You must be the CEO to edit this corporation');
          }
        } else {
          setError('Please log in to edit this corporation');
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

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        setError('Logo file size must be less than 2MB');
        return;
      }
      setLogoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
      setError('');
    }
  };

  const removeLogo = () => {
    setLogoFile(null);
    // Restore original logo if exists
    if (corporation?.logo) {
      setLogoPreview(corporation.logo);
    } else {
      setLogoPreview(null);
    }
  };

  const isNameChanged = name.trim() !== originalName;
  const canAffordNameChange = userActions >= NAME_CHANGE_COST;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSaving(true);

    try {
      // Update name if changed
      if (isNameChanged) {
        if (!canAffordNameChange) {
          setError(`You need ${NAME_CHANGE_COST} actions to change the corporation name. You have ${userActions} actions.`);
          setSaving(false);
          return;
        }
        
        await corporationAPI.update(corpId, { name: name.trim() });
        setOriginalName(name.trim());
        setUserActions(prev => prev - NAME_CHANGE_COST);
      }

      // Upload new logo if selected
      if (logoFile) {
        await corporationAPI.uploadLogo(corpId, logoFile);
        setLogoFile(null);
      }

      setSuccess('Corporation updated successfully!');
      
      // Refresh corporation data
      const updatedCorp = await corporationAPI.getById(corpId);
      setCorporation(updatedCorp);
      
      // Redirect back to corporation page after short delay
      setTimeout(() => {
        router.push(`/corporation/${corpId}`);
      }, 1500);
    } catch (err: any) {
      console.error('Failed to update corporation:', err);
      const errorMessage = err.response?.data?.error || 'Failed to update corporation';
      setError(errorMessage);
    } finally {
      setSaving(false);
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

  if (error && !corporation) {
    return (
      <AppNavigation>
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-gray-100 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 flex items-center justify-center">
          <div className="text-center">
            <p className="text-xl text-red-600 dark:text-red-400 mb-4">{error}</p>
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

  const isCeo = viewerUserId === corporation?.ceo_id;

  if (!isCeo) {
    return (
      <AppNavigation>
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-gray-100 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 flex items-center justify-center">
          <div className="text-center">
            <p className="text-xl text-red-600 dark:text-red-400 mb-4">Only the CEO can edit this corporation</p>
            <Link
              href={`/corporation/${corpId}`}
              className="text-corporate-blue hover:underline"
            >
              Return to Corporation
            </Link>
          </div>
        </div>
      </AppNavigation>
    );
  }

  return (
    <AppNavigation>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-gray-100 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          {/* Header */}
          <div className="mb-8">
            <Link
              href={`/corporation/${corpId}`}
              className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-corporate-blue dark:hover:text-corporate-blue-light transition-colors mb-4"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Corporation
            </Link>
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">Edit Corporation</h1>
            <p className="text-gray-600 dark:text-gray-400">
              Update your corporation's name and logo.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-lg">
            {/* Error/Success Messages */}
            {error && (
              <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-red-600 dark:text-red-400">{error}</p>
              </div>
            )}
            
            {success && (
              <div className="mb-6 p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg">
                <p className="text-emerald-600 dark:text-emerald-400">{success}</p>
              </div>
            )}

            <div className="space-y-6">
              {/* Corporation Name */}
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Corporation Name
                </label>
                <input
                  type="text"
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-corporate-blue focus:border-transparent"
                  placeholder="Enter corporation name"
                />
                
                {/* Action cost indicator */}
                {isNameChanged && (
                  <div className={`mt-2 flex items-center gap-2 text-sm ${canAffordNameChange ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400'}`}>
                    <Zap className="w-4 h-4" />
                    <span>
                      Changing name costs <span className="font-semibold">{NAME_CHANGE_COST} actions</span>
                      {' '}(You have {userActions} actions)
                    </span>
                  </div>
                )}
              </div>

              {/* Logo Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Corporation Logo
                </label>
                {logoPreview ? (
                  <div className="relative inline-block">
                    <img
                      src={logoPreview}
                      alt="Logo preview"
                      className="w-32 h-32 object-cover rounded-lg border border-gray-300 dark:border-gray-600"
                      onError={(e) => {
                        e.currentTarget.src = '/defaultpfp.jpg';
                      }}
                    />
                    <button
                      type="button"
                      onClick={removeLogo}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                    {logoFile && (
                      <span className="block mt-2 text-xs text-emerald-600 dark:text-emerald-400">
                        New logo selected
                      </span>
                    )}
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer hover:border-corporate-blue transition-colors bg-gray-50 dark:bg-gray-700">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <Upload className="w-8 h-8 mb-2 text-gray-400" />
                      <p className="mb-2 text-sm text-gray-500 dark:text-gray-400">
                        <span className="font-semibold">Click to upload</span> or drag and drop
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">PNG, JPG, WEBP (MAX. 2MB)</p>
                    </div>
                    <input
                      type="file"
                      className="hidden"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={handleLogoChange}
                    />
                  </label>
                )}
                
                {/* Change logo button when preview exists */}
                {logoPreview && !logoFile && (
                  <label className="inline-flex items-center gap-2 mt-3 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer text-sm">
                    <Upload className="w-4 h-4" />
                    Change Logo
                    <input
                      type="file"
                      className="hidden"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={handleLogoChange}
                    />
                  </label>
                )}
              </div>

              {/* Actions Remaining */}
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                    <Zap className="w-5 h-5 text-amber-500" />
                    <span className="text-sm font-medium">Your Actions</span>
                  </div>
                  <span className="text-lg font-bold text-gray-900 dark:text-white">
                    {userActions}
                  </span>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => router.back()}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving || (!isNameChanged && !logoFile) || (isNameChanged && !canAffordNameChange)}
                  className="flex-1 px-4 py-2 bg-corporate-blue text-white rounded-lg font-semibold hover:bg-corporate-blue-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                >
                  {saving ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-5 h-5" />
                      Save Changes
                    </>
                  )}
                </button>
              </div>

              {/* Disabled state explanation */}
              {isNameChanged && !canAffordNameChange && (
                <p className="text-center text-sm text-red-600 dark:text-red-400">
                  You don't have enough actions to change the corporation name.
                </p>
              )}
            </div>
          </form>
        </div>
      </div>
    </AppNavigation>
  );
}


