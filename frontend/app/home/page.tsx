"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
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
        router.replace(`/profile/${user.profile_slug}`);
      } catch (error) {
        console.error('Home redirect failed:', error);
        localStorage.removeItem('token');
        router.replace('/login');
      }
    };

    load();
  }, [router]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center text-gray-600">
      Loading your profile...
    </div>
  );
}
