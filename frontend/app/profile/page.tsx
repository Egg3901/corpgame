"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ProfileIndexPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/home');
  }, [router]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center text-gray-600">
      Redirecting to your profile...
    </div>
  );
}
