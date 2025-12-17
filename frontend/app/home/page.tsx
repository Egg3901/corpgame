"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AppNavigation from '@/components/AppNavigation';
import { authAPI } from '@/lib/api';

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    const load = async () => {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      if (!token) {
        router.replace('/login');
        return;
      }

      try {
        const user = await authAPI.getMe();
        router.replace(`/profile/${user.profile_id}`);
      } catch (error) {
        console.error('Home redirect failed:', error);
        localStorage.removeItem('token');
        router.replace('/login');
      }
    };

    load();
  }, [router]);

  return (
    <AppNavigation>
      <div className="min-h-screen flex items-center justify-center text-gray-600 dark:text-gray-200">
        Loading your profile...
      </div>
    </AppNavigation>
  );
}

