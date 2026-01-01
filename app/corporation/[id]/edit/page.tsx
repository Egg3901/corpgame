'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import AppNavigation from '@/components/AppNavigation';
import { corporationAPI, CorporationResponse, authAPI } from '@/lib/api';
import { getErrorMessage } from '@/lib/utils';
import { Building2, Upload, X, Save, ArrowLeft, Zap } from 'lucide-react';
import { Input, Button } from "@heroui/react";

export default function EditCorporationPage() {
  const router = useRouter();
  const params = useParams();
  const corpId = parseInt(params.id as string, 10);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      } catch (err: unknown) {
        console.error('Failed to fetch corporation:', err);
        const errorMessage = getErrorMessage(err, 'Failed to load corporation');
        setError(errorMessage.includes('404') || errorMessage.toLowerCase().includes('not found') ? 'Corporation not found' : errorMessage);
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
        e.target.value = '';
        return;
      }
      setLogoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
      setError('');
      e.target.value = '';
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
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
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
    } catch (err: unknown) {
      console.error('Failed to update corporation:', err);
      setError(getErrorMessage(err, 'Failed to update corporation'));
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
              Update your corporation&apos;s name and logo.
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
                <Input
                  label="Corporation Name"
                  labelPlacement="outside"
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  isRequired
                  placeholder="Enter corporation name"
                  variant="bordered"
                  autoComplete="off"
                  description={
                    isNameChanged ? (
                      <div className={`flex items-center gap-2 text-sm ${canAffordNameChange ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400'}`}>
                        <Zap className="w-4 h-4" />
                        <span>
                          Changing name costs <span className="font-semibold">{NAME_CHANGE_COST} actions</span>
                          {' '}(You have {userActions} actions)
                        </span>
                      </div>
                    ) : "Changing the name costs actions"
                  }
                />
              </div>

              {/* Logo Upload */}
              <div>
                <div className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Corporation Logo
                </div>
                
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleLogoChange}
                  tabIndex={-1}
                  aria-hidden="true"
                  autoComplete="off"
                />

                {logoPreview ? (
                  <div className="flex flex-col gap-3">
                    <div className="relative inline-block w-fit">
                      <img
                        src={logoPreview}
                        alt="Logo preview"
                        className="w-32 h-32 object-cover rounded-lg border border-gray-300 dark:border-gray-600"
                        onError={(e) => {
                          e.currentTarget.src = '/defaultpfp.jpg';
                        }}
                      />
                      <Button
                        isIconOnly
                        size="sm"
                        color="danger"
                        variant="flat"
                        onPress={removeLogo}
                        className="absolute -top-2 -right-2 rounded-full p-1"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                    
                    {logoFile && (
                      <span className="block text-xs text-emerald-600 dark:text-emerald-400">
                        New logo selected
                      </span>
                    )}

                    {!logoFile && (
                      <Button
                        variant="flat"
                        startContent={<Upload className="w-4 h-4" />}
                        onPress={triggerFileInput}
                        className="w-fit"
                      >
                        Change Logo
                      </Button>
                    )}
                  </div>
                ) : (
                  <Button
                    onPress={triggerFileInput}
                    variant="bordered"
                    className="w-full h-32 border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-corporate-blue dark:hover:border-corporate-blue bg-gray-50 dark:bg-gray-700 flex flex-col items-center justify-center gap-2"
                  >
                    <Upload className="w-8 h-8 text-gray-400" />
                    <div className="flex flex-col items-center">
                      <span className="text-sm text-gray-500 dark:text-gray-400 font-normal">
                        <span className="font-semibold">Click to upload</span> logo
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400 font-normal">PNG, JPG, WEBP (MAX. 2MB)</span>
                    </div>
                  </Button>
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
                <Button
                  type="button"
                  variant="bordered"
                  onPress={() => router.back()}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  color="primary"
                  isDisabled={saving || (!isNameChanged && !logoFile) || (isNameChanged && !canAffordNameChange)}
                  isLoading={saving}
                  startContent={!saving && <Save className="w-5 h-5" />}
                  className="flex-1 font-semibold"
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>

              {/* Disabled state explanation */}
              {isNameChanged && !canAffordNameChange && (
                <p className="text-center text-sm text-red-600 dark:text-red-400">
                  You don&apos;t have enough actions to change the corporation name.
                </p>
              )}
            </div>
          </form>
        </div>
      </div>
    </AppNavigation>
  );
}


