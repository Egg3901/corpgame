'use client';

import { useEffect, useState, ChangeEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Moon, Sun, RefreshCw, Lock, Eye, EyeOff } from 'lucide-react';
import { authAPI, AuthResponse, profileAPI } from '@/lib/api';
import { useTheme } from '@/components/ThemeProvider';

type CurrentUser = AuthResponse['user'] & { email: string };

export default function SettingsPage() {
  const router = useRouter();
  const { theme, toggleTheme, setTheme } = useTheme();
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [resetting, setResetting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [bio, setBio] = useState('');
  const [savingBio, setSavingBio] = useState(false);
  const [revealUsername, setRevealUsername] = useState(false);
  const [revealEmail, setRevealEmail] = useState(false);

  useEffect(() => {
    const loadUser = async () => {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      if (!token) {
        router.push('/login');
        return;
      }

      try {
        const me = await authAPI.getMe();
        setUser(me);
        setBio(me.bio || "I'm a new user, say hi!");
      } catch (err) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        router.push('/login');
      } finally {
        setLoading(false);
      }
    };

    loadUser();
  }, [router]);

  const handlePasswordReset = async () => {
    setResetting(true);
    await new Promise((resolve) => setTimeout(resolve, 800));
    alert('Password reset flow is coming soon.');
    setResetting(false);
  };

  const handleSelectTheme = (value: 'light' | 'dark') => {
    if (value !== theme) {
      setTheme(value);
    }
  };

  const handleBioChange = async () => {
    if (!user) return;
    setSavingBio(true);
    try {
      await profileAPI.updateProfile({ bio });
      // Update the local user state with the new bio
      setUser(prev => prev ? { ...prev, bio } : null);
    } catch (err: any) {
      console.error('Bio update failed:', err);
      // Reset to original value on error
      setBio(user.bio || "I'm a new user, say hi!");
    } finally {
      setSavingBio(false);
    }
  };

  const handleAvatarChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setUploadError('Please upload a JPG, PNG, or WEBP image.');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setUploadError('Max file size is 2MB.');
      return;
    }

    setUploadError(null);
    setUploading(true);
    try {
      const result = await profileAPI.uploadAvatar(file);
      setUser((prev) => (prev ? { ...prev, profile_image_url: result.profile_image_url } : prev));
    } catch (err: any) {
      console.error('Avatar upload failed:', err);
      setUploadError(err?.response?.data?.error || 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 text-gray-600 dark:text-gray-300">
        Loading your settings...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 py-10 px-4">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm uppercase tracking-wide text-gray-500 dark:text-gray-400">Account</p>
            <h1 className="text-3xl font-semibold">Settings</h1>
          </div>
          <button
            onClick={() => router.back()}
            className="px-4 py-2 text-sm font-medium rounded-md border border-gray-200 text-gray-700 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
          >
            Go Back
          </button>
        </div>

        <section className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700/50">
          <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700/60">
            <h2 className="text-lg font-semibold">Account Details</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">This information comes from your profile.</p>
          </div>
          <div className="px-6 py-6 space-y-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full overflow-hidden bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                {user?.profile_image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={user.profile_image_url}
                    alt="Profile"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-sm text-gray-500 dark:text-gray-300">No image</span>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Profile image</label>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">JPG, PNG, or WEBP. Max 2MB.</p>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={handleAvatarChange}
                  disabled={uploading}
                  className="block w-full text-sm text-gray-700 dark:text-gray-200 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border file:border-gray-200 file:bg-gray-50 file:text-sm file:font-medium file:text-gray-700 hover:file:bg-gray-100 dark:file:border-gray-700 dark:file:bg-gray-800 dark:file:text-gray-200"
                />
                {uploadError && <p className="text-sm text-red-500 mt-1">{uploadError}</p>}
                {uploading && <p className="text-sm text-gray-500 mt-1">Uploading...</p>}
              </div>
            </div>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <p className="text-xs uppercase text-gray-500 dark:text-gray-400 font-semibold">Username</p>
                <button
                  onClick={() => setRevealUsername(!revealUsername)}
                  className="flex items-center gap-2 mt-1 text-lg font-medium text-gray-900 dark:text-gray-100 hover:text-gray-700 dark:hover:text-gray-300 transition-colors group"
                >
                  {revealUsername ? (
                    <>
                      <span>{user?.username}</span>
                      <EyeOff className="w-4 h-4 opacity-60 group-hover:opacity-100" />
                    </>
                  ) : (
                    <>
                      <span className="text-gray-500 dark:text-gray-400">••••••••</span>
                      <Eye className="w-4 h-4 opacity-60 group-hover:opacity-100" />
                    </>
                  )}
                </button>
              </div>
              <div>
                <p className="text-xs uppercase text-gray-500 dark:text-gray-400 font-semibold">Email</p>
                <button
                  onClick={() => setRevealEmail(!revealEmail)}
                  className="flex items-center gap-2 mt-1 text-lg font-medium text-gray-900 dark:text-gray-100 hover:text-gray-700 dark:hover:text-gray-300 transition-colors group"
                >
                  {revealEmail ? (
                    <>
                      <span>{user?.email}</span>
                      <EyeOff className="w-4 h-4 opacity-60 group-hover:opacity-100" />
                    </>
                  ) : (
                    <>
                      <span className="text-gray-500 dark:text-gray-400">••••••••••••••••••••••</span>
                      <Eye className="w-4 h-4 opacity-60 group-hover:opacity-100" />
                    </>
                  )}
                </button>
              </div>
            </div>
            <div>
              <p className="text-xs uppercase text-gray-500 dark:text-gray-400 font-semibold">Display Name</p>
              <p className="text-lg font-medium mt-1">{user?.player_name || 'Not set'}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">Bio</label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="I'm a new user, say hi!"
                maxLength={500}
                rows={3}
                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-corporate-blue focus:border-transparent resize-none"
              />
              <div className="flex items-center justify-between mt-2">
                <p className="text-xs text-gray-500 dark:text-gray-400">{bio.length}/500 characters</p>
                <button
                  onClick={handleBioChange}
                  disabled={savingBio || bio === (user?.bio || "I'm a new user, say hi!")}
                  className="px-3 py-1 text-xs font-medium rounded-md bg-corporate-blue text-white hover:bg-corporate-blue-dark disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {savingBio ? 'Saving...' : 'Save Bio'}
                </button>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700/50">
          <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700/60 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">Appearance</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">Switch between light and dark experiences.</p>
            </div>
            <button
              onClick={toggleTheme}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-100 dark:hover:bg-gray-600 text-sm font-medium"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              Toggle
            </button>
          </div>
          <div className="px-6 py-6 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-200">Theme</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleSelectTheme('light')}
                  className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
                    theme === 'light'
                      ? 'border-corporate-blue text-corporate-blue'
                      : 'border-gray-200 text-gray-600 dark:border-gray-700 dark:text-gray-400'
                  }`}
                >
                  Light
                </button>
                <button
                  onClick={() => handleSelectTheme('dark')}
                  className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
                    theme === 'dark'
                      ? 'border-corporate-blue text-corporate-blue'
                      : 'border-gray-200 text-gray-600 dark:border-gray-700 dark:text-gray-400'
                  }`}
                >
                  Dark
                </button>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700/50">
          <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700/60">
            <h2 className="text-lg font-semibold">Security</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">Manage password and authentication.</p>
          </div>
          <div className="px-6 py-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Password</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Reset feature is not yet available.</p>
              </div>
              <button
                onClick={handlePasswordReset}
                disabled={resetting}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-corporate-blue text-white text-sm font-medium hover:bg-corporate-blue-dark disabled:opacity-60"
              >
                {resetting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                Reset Password
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
