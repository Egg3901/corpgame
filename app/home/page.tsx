"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AppNavigation from '@/components/AppNavigation';
import { authAPI } from '@/lib/api';
import { getErrorMessage } from '@/lib/utils';

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
      } catch (error: unknown) {
        console.error('Home redirect failed:', getErrorMessage(error));
        localStorage.removeItem('token');
        router.replace('/login');
      }
    };

    load();
  }, [router]);

  return (
    <AppNavigation>
      <div className="min-h-screen flex items-center justify-center text-content-secondary">
        Loading your profile...
      </div>
    </AppNavigation>
  );
}



