"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import AppNavigation from '@/components/AppNavigation';
import { corporationAPI, authAPI, CorpFocus } from '@/lib/api';
import { Building2, Upload, X, AlertCircle } from 'lucide-react';

// Valid sectors matching backend
const SECTORS = [
  'Technology',
  'Finance',
  'Healthcare',
  'Manufacturing',
  'Energy',
  'Retail',
  'Real Estate',
  'Transportation',
  'Media',
  'Telecommunications',
  'Agriculture',
  'Defense',
  'Hospitality',
  'Construction',
  'Pharmaceuticals',
  'Mining',
] as const;

// Corporation focus types
const FOCUS_OPTIONS: { value: CorpFocus; label: string; description: string }[] = [
  { value: 'diversified', label: 'Diversified', description: 'Can build all unit types (retail, production, service, extraction)' },
  { value: 'extraction', label: 'Extraction', description: 'Specializes in resource extraction only' },
  { value: 'production', label: 'Production', description: 'Can build production and extraction units' },
  { value: 'retail', label: 'Retail', description: 'Specializes in retail operations only' },
  { value: 'service', label: 'Service', description: 'Specializes in service operations only' },
];

export default function CreateCorporationPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [type, setType] = useState('');
  const [focus, setFocus] = useState<CorpFocus>('diversified');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [checkingExisting, setCheckingExisting] = useState(true);
  const [existingCorporation, setExistingCorporation] = useState<{ id: number; name: string } | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const checkExistingCorporation = async () => {
      try {
        const me = await authAPI.getMe();
        const corporations = await corporationAPI.getAll();
        const myCorp = corporations.find(
          (corp: any) => corp.ceo?.profile_id === me.profile_id || corp.ceo_id === me.id
        );
        if (myCorp) {
          setExistingCorporation({ id: myCorp.id, name: myCorp.name });
        }
      } catch (err) {
        console.warn('Failed to check existing corporation:', err);
      } finally {
        setCheckingExisting(false);
      }
    };

    checkExistingCorporation();
  }, []);

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
    }
  };

  const removeLogo = () => {
    setLogoFile(null);
    setLogoPreview(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Create corporation
      const corporation = await corporationAPI.create({
        name: name.trim(),
        type: type.trim() || undefined,
        focus,
      });

      // Upload logo if provided
      if (logoFile && corporation.id) {
        try {
          await corporationAPI.uploadLogo(corporation.id, logoFile);
        } catch (logoError) {
          console.warn('Logo upload failed:', logoError);
          // Continue even if logo upload fails
        }
      }

      // Redirect to corporation detail page
      router.push(`/corporation/${corporation.id}`);
    } catch (err: any) {
      console.error('Failed to create corporation:', err);
      setError(err.response?.data?.error || 'Failed to create corporation');
      setLoading(false);
    }
  };

  if (checkingExisting) {
    return (
      <AppNavigation>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-lg text-gray-600 dark:text-gray-200">Checking eligibility...</div>
        </div>
      </AppNavigation>
    );
  }

  if (existingCorporation) {
    return (
      <AppNavigation>
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-gray-100 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
          <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-8 shadow-lg text-center">
              <div className="mb-6">
                <div className="mx-auto w-16 h-16 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center mb-4">
                  <AlertCircle className="w-8 h-8 text-amber-600 dark:text-amber-400" />
                </div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                  You Already Have a Corporation
                </h1>
                <p className="text-gray-600 dark:text-gray-400">
                  You can only be CEO of one corporation at a time. You are currently the CEO of:
                </p>
              </div>
              
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 mb-6">
                <p className="text-xl font-semibold text-gray-900 dark:text-white">
                  {existingCorporation.name}
                </p>
              </div>

              <div className="flex gap-4 justify-center">
                <button
                  onClick={() => router.back()}
                  className="px-6 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Go Back
                </button>
                <Link
                  href={`/corporation/${existingCorporation.id}`}
                  className="px-6 py-2 bg-corporate-blue text-white rounded-lg font-semibold hover:bg-corporate-blue-dark transition-colors flex items-center gap-2"
                >
                  <Building2 className="w-5 h-5" />
                  View My Corporation
                </Link>
              </div>
            </div>
          </div>
        </div>
      </AppNavigation>
    );
  }

  return (
    <AppNavigation>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-gray-100 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">Create Corporation</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Start a new corporation. You'll own 80% of the shares (400,000 shares) at $1.00 per share.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-lg">
          {error && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          <div className="space-y-6">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Corporation Name *
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
            </div>

            <div>
              <label htmlFor="type" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Sector / Industry *
              </label>
              <select
                id="type"
                value={type}
                onChange={(e) => setType(e.target.value)}
                required
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-corporate-blue focus:border-transparent"
              >
                <option value="">Select a sector...</option>
                {SECTORS.map((sector) => (
                  <option key={sector} value={sector}>{sector}</option>
                ))}
              </select>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Your sector determines what resources you can extract and products you can produce.
              </p>
            </div>

            <div>
              <label htmlFor="focus" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Corporation Focus *
              </label>
              <select
                id="focus"
                value={focus}
                onChange={(e) => setFocus(e.target.value as CorpFocus)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-corporate-blue focus:border-transparent"
              >
                {FOCUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                {FOCUS_OPTIONS.find(o => o.value === focus)?.description}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Logo (Optional)
              </label>
              {logoPreview ? (
                <div className="relative inline-block">
                  <img
                    src={logoPreview}
                    alt="Logo preview"
                    className="w-32 h-32 object-cover rounded-lg border border-gray-300 dark:border-gray-600"
                  />
                  <button
                    type="button"
                    onClick={removeLogo}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
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
            </div>

            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-200 mb-2">Default Settings</h3>
              <ul className="text-sm text-blue-800 dark:text-blue-300 space-y-1">
                <li>• Total Shares: 500,000</li>
                <li>• Your Ownership: 400,000 shares (80%)</li>
                <li>• Public Shares: 100,000 shares (20%)</li>
                <li>• Initial Share Price: $1.00</li>
              </ul>
            </div>

            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => router.back()}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || !name.trim() || !type}
                className="flex-1 px-4 py-2 bg-corporate-blue text-white rounded-lg font-semibold hover:bg-corporate-blue-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Building2 className="w-5 h-5" />
                    Create Corporation
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
      </div>
    </AppNavigation>
  );
}

