'use client';

import { useEffect, useState, ChangeEvent, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { RefreshCw, Lock, Eye, EyeOff, Monitor } from 'lucide-react';
import { authAPI, AuthResponse, profileAPI, normalizeImageUrl } from '@/lib/api';
import { Button, Textarea } from "@heroui/react";
import { getErrorMessage } from '@/lib/utils';
import { useTheme } from '@/components/ThemeProvider';

type CurrentUser = AuthResponse['user'] & { email: string };

export default function SettingsPage() {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const fileInputRef = useRef<HTMLInputElement>(null);
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
      } catch (err: unknown) {
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

  const handleSelectTheme = (value: 'light' | 'midnight' | 'black' | 'bloomberg') => {
    if (value !== theme) {
      setTheme(value);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const handleBioChange = async () => {
    if (!user) return;
    setSavingBio(true);
    try {
      await profileAPI.updateProfile({ bio });
      // Update the local user state with the new bio
      setUser(prev => prev ? { ...prev, bio } : null);
    } catch (err: unknown) {
      console.error('Bio update failed:', err);
      // Reset to original value on error
      setBio(user.bio || "I'm a new user, say hi!");
      alert(getErrorMessage(err, 'Failed to update bio'));
    } finally {
      setSavingBio(false);
    }
  };

  const handleAvatarChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      console.log('No file selected');
      return;
    }

    console.log('File selected:', {
      name: file.name,
      type: file.type,
      size: file.size
    });

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
    console.log('Starting avatar upload...');
    try {
      const result = await profileAPI.uploadAvatar(file);
      console.log('Avatar upload result:', result);
      setUser((prev) => (prev ? { ...prev, profile_image_url: result.profile_image_url } : prev));
      console.log('User state updated with new profile_image_url');
    } catch (err: unknown) {
      console.error('Avatar upload failed:', err);
      setUploadError(getErrorMessage(err, 'Upload failed. Please try again.'));
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
    <div
      className="min-h-screen text-[rgb(var(--foreground-rgb))] py-10 px-4 bloomberg:bg-black bloomberg:text-[#00ff41]"
      style={{
        background: `linear-gradient(to bottom, transparent, rgb(var(--background-end-rgb))) rgb(var(--background-start-rgb))`
      }}
    >
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm uppercase tracking-wide text-gray-500 dark:text-gray-400 bloomberg:text-bloomberg-green-dim">Account</p>
            <h1 className="text-3xl font-semibold text-gray-900 dark:text-white bloomberg:text-bloomberg-green">Settings</h1>
          </div>
          <Button
            onPress={() => router.back()}
            variant="bordered"
            className="border-gray-300 dark:border-gray-700 bloomberg:border-bloomberg-green bloomberg:text-bloomberg-green"
          >
            Go Back
          </Button>
        </div>

        <section
          className="rounded-xl shadow-sm border"
          style={{
            backgroundColor: 'rgb(var(--background-start-rgb))',
            borderColor: 'rgba(var(--foreground-rgb), 0.15)'
          }}
        >
          <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700/60">
            <h2 className="text-lg font-semibold">Account Details</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">This information comes from your profile.</p>
          </div>
          <div className="px-6 py-6 space-y-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full overflow-hidden bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                <img
                  src={normalizeImageUrl(user?.profile_image_url)}
                  alt="Profile"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    console.error('Profile image failed to load:', e.currentTarget.src);
                    e.currentTarget.src = "/defaultpfp.jpg";
                  }}
                  onLoad={() => console.log('Profile image loaded successfully:', normalizeImageUrl(user?.profile_image_url))}
                />
              </div>
              <div>
                <div className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Profile image</div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">JPG, PNG, or WEBP. Max 2MB.</p>
                <div className="flex flex-col gap-2">
                  <Button
                    variant="flat"
                    color="primary"
                    className="w-full sm:w-auto"
                    isLoading={uploading}
                    onPress={triggerFileInput}
                  >
                    {uploading ? 'Uploading...' : 'Choose File'}
                  </Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={handleAvatarChange}
                    disabled={uploading}
                    className="hidden"
                    tabIndex={-1}
                    aria-hidden="true"
                    autoComplete="off"
                  />
                </div>
                {uploadError && <p className="text-sm text-red-500 mt-1">{uploadError}</p>}
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
              <div>
                <p className="text-xs uppercase text-gray-500 dark:text-gray-400 font-semibold">Username</p>
                <Button
                  onPress={() => setRevealUsername(!revealUsername)}
                  variant="light"
                  className="flex items-center gap-2 mt-1 text-lg font-medium text-gray-900 dark:text-gray-100 hover:text-gray-700 dark:hover:text-gray-300 transition-colors group h-auto p-0 min-w-0 bg-transparent data-[hover=true]:bg-transparent"
                  disableRipple
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
                </Button>
              </div>
              <div>
                <p className="text-xs uppercase text-gray-500 dark:text-gray-400 font-semibold">Email</p>
                <Button
                  onPress={() => setRevealEmail(!revealEmail)}
                  variant="light"
                  className="flex items-center gap-2 mt-1 text-lg font-medium text-gray-900 dark:text-gray-100 hover:text-gray-700 dark:hover:text-gray-300 transition-colors group h-auto p-0 min-w-0 bg-transparent data-[hover=true]:bg-transparent"
                  disableRipple
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
                </Button>
              </div>
            </div>
            <div>
              <p className="text-xs uppercase text-gray-500 dark:text-gray-400 font-semibold">Display Name</p>
              <p className="text-lg font-medium mt-1">{user?.player_name || 'Not set'}</p>
            </div>
            <div>
              <Textarea
                label="Bio"
                labelPlacement="outside"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="I'm a new user, say hi!"
                maxLength={500}
                minRows={3}
                variant="bordered"
                description={`${bio.length}/500 characters`}
                autoComplete="off"
              />
              <div className="flex justify-end mt-2">
                <Button
                  onPress={handleBioChange}
                  isDisabled={savingBio || bio === (user?.bio || "I'm a new user, say hi!")}
                  isLoading={savingBio}
                  color="primary"
                  size="sm"
                >
                  Save Bio
                </Button>
              </div>
            </div>
          </div>
        </section>

        <section
          className="rounded-xl shadow-sm border bloomberg:border-bloomberg-green"
          style={{
            backgroundColor: 'rgb(var(--background-start-rgb))',
            borderColor: 'rgba(var(--foreground-rgb), 0.15)'
          }}
        >
          <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700/60 bloomberg:border-bloomberg-green">
            <div>
              <h2 className="text-lg font-semibold">Appearance</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 bloomberg:text-bloomberg-green-dim">
                Choose your visual theme. Each theme provides a unique experience tailored to different preferences.
              </p>
            </div>
          </div>
          <div className="px-6 py-6 space-y-4">
            <div className="space-y-3">
              <div className="text-sm font-medium text-gray-700 dark:text-gray-200 bloomberg:text-bloomberg-green-bright">
                Select Theme
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => handleSelectTheme('light')}
                  onKeyDown={(e) => { if(e.key === 'Enter' || e.key === ' ') handleSelectTheme('light'); }}
                  className={`group relative px-4 py-6 rounded-lg border-2 text-sm font-medium transition-all cursor-pointer ${
                    theme === 'light'
                      ? 'border-corporate-blue bg-corporate-blue/5 text-corporate-blue'
                      : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:border-gray-600 bloomberg:border-bloomberg-green-dim bloomberg:bg-black bloomberg:text-bloomberg-green bloomberg:hover:border-bloomberg-green'
                  }`}
                >
                  <div className="flex flex-col items-center gap-2">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                      theme === 'light' ? 'bg-corporate-blue/10' : 'bg-gray-100 dark:bg-gray-700 bloomberg:bg-bloomberg-green/10'
                    }`}>
                      <Monitor className="w-6 h-6" />
                    </div>
                    <span className="font-semibold">Light</span>
                    <span className="text-xs text-gray-500 dark:text-gray-400 bloomberg:text-bloomberg-green-dim text-center">
                      Clean, bright
                    </span>
                  </div>
                </div>

                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => handleSelectTheme('midnight')}
                  onKeyDown={(e) => { if(e.key === 'Enter' || e.key === ' ') handleSelectTheme('midnight'); }}
                  className={`group relative px-4 py-6 rounded-lg border-2 text-sm font-medium transition-all cursor-pointer ${
                    theme === 'midnight'
                      ? 'border-corporate-blue bg-corporate-blue/5 text-corporate-blue'
                      : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:border-gray-600 bloomberg:border-bloomberg-green-dim bloomberg:bg-black bloomberg:text-bloomberg-green bloomberg:hover:border-bloomberg-green'
                  }`}
                >
                  <div className="flex flex-col items-center gap-2">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                      theme === 'midnight' ? 'bg-corporate-blue/10' : 'bg-gray-100 dark:bg-gray-700 bloomberg:bg-bloomberg-green/10'
                    }`}>
                      <Monitor className="w-6 h-6" />
                    </div>
                    <span className="font-semibold">Midnight</span>
                    <span className="text-xs text-gray-500 dark:text-gray-400 bloomberg:text-bloomberg-green-dim text-center">
                      Dark blue-gray
                    </span>
                  </div>
                </div>

                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => handleSelectTheme('black')}
                  onKeyDown={(e) => { if(e.key === 'Enter' || e.key === ' ') handleSelectTheme('black'); }}
                  className={`group relative px-4 py-6 rounded-lg border-2 text-sm font-medium transition-all cursor-pointer ${
                    theme === 'black'
                      ? 'border-corporate-blue bg-corporate-blue/5 text-corporate-blue'
                      : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:border-gray-600 bloomberg:border-bloomberg-green-dim bloomberg:bg-black bloomberg:text-bloomberg-green bloomberg:hover:border-bloomberg-green'
                  }`}
                >
                  <div className="flex flex-col items-center gap-2">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                      theme === 'black' ? 'bg-corporate-blue/10' : 'bg-gray-100 dark:bg-gray-700 bloomberg:bg-bloomberg-green/10'
                    }`}>
                      <Monitor className="w-6 h-6" />
                    </div>
                    <span className="font-semibold">Black</span>
                    <span className="text-xs text-gray-500 dark:text-gray-400 bloomberg:text-bloomberg-green-dim text-center">
                      Pure OLED black
                    </span>
                  </div>
                </div>

                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => handleSelectTheme('bloomberg')}
                  onKeyDown={(e) => { if(e.key === 'Enter' || e.key === ' ') handleSelectTheme('bloomberg'); }}
                  className={`group relative px-4 py-6 rounded-lg border-2 text-sm font-medium transition-all cursor-pointer ${
                    theme === 'bloomberg'
                      ? 'border-bloomberg-green-bright bg-bloomberg-green/5 text-bloomberg-green-bright shadow-[0_0_15px_rgba(0,255,65,0.3)]'
                      : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:border-gray-600 bloomberg:border-bloomberg-green-dim bloomberg:bg-black bloomberg:text-bloomberg-green bloomberg:hover:border-bloomberg-green'
                  }`}
                >
                  <div className="flex flex-col items-center gap-2">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bloomberg ${
                      theme === 'bloomberg' ? 'bg-bloomberg-green/10' : 'bg-gray-100 dark:bg-gray-700 bloomberg:bg-bloomberg-green/10'
                    }`}>
                      <Monitor className="w-6 h-6" />
                    </div>
                    <span className="font-semibold font-bloomberg">Bloomberg</span>
                    <span className="text-xs text-gray-500 dark:text-gray-400 bloomberg:text-bloomberg-green-dim text-center">
                      Retro terminal
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 p-4 rounded-lg bg-gray-50 dark:bg-gray-900 bloomberg:bg-black bloomberg:border bloomberg:border-bloomberg-green-dim">
              <p className="text-xs text-gray-600 dark:text-gray-400 bloomberg:text-bloomberg-green-dim">
                <strong className="font-semibold text-gray-800 dark:text-gray-200 bloomberg:text-bloomberg-green">
                  Current Theme: {theme.charAt(0).toUpperCase() + theme.slice(1)}
                </strong>
                <br />
                Your theme preference is saved automatically and will persist across sessions.
              </p>
            </div>
          </div>
        </section>

      </div>
    </div>
  );
}
