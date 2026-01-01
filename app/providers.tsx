'use client';

import { HeroUIProvider } from '@heroui/react';
import { ThemeProvider } from '@/components/ThemeProvider';
import { useRouter } from 'next/navigation';

export function Providers({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  return (
    <HeroUIProvider navigate={router.push}>
      <ThemeProvider>
        {children}
      </ThemeProvider>
    </HeroUIProvider>
  );
}
