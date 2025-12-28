'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { usePathname } from 'next/navigation';

type Theme = 'light' | 'midnight' | 'black' | 'bloomberg';

interface ThemeContextValue {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: 'light',
  setTheme: () => undefined,
  toggleTheme: () => undefined,
});

// Routes that should not have theme applied (use their own styles)
const PUBLIC_ROUTES = ['/', '/login', '/register'];

function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.includes(pathname) || pathname.startsWith('/register/');
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>('light');
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const storedTheme = typeof window !== 'undefined' ? localStorage.getItem('theme') : null;
    const prefersDark =
      typeof window !== 'undefined' ? window.matchMedia('(prefers-color-scheme: dark)').matches : false;

    let initialTheme: Theme = 'light';
    // Migrate old 'dark' theme to 'midnight'
    if (storedTheme === 'dark') {
      initialTheme = 'midnight';
    } else if (storedTheme === 'midnight' || storedTheme === 'black' || storedTheme === 'bloomberg') {
      initialTheme = storedTheme as Theme;
    } else if (!storedTheme && prefersDark) {
      initialTheme = 'midnight';
    }

    setTheme(initialTheme);
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const root = document.documentElement;

    // Remove all theme classes first
    root.classList.remove('dark', 'midnight', 'black', 'bloomberg');

    // Don't apply theme classes on public routes - they have their own styles
    if (isPublicRoute(pathname)) {
      return;
    }

    // Add the appropriate theme class for authenticated routes
    if (theme === 'midnight') {
      root.classList.add('dark', 'midnight');
    } else if (theme === 'black') {
      root.classList.add('dark', 'black');
    } else if (theme === 'bloomberg') {
      root.classList.add('bloomberg');
    }

    localStorage.setItem('theme', theme);
  }, [theme, mounted, pathname]);

  const value = useMemo(
    () => ({
      theme,
      setTheme,
      toggleTheme: () =>
        setTheme((prev) => {
          if (prev === 'light') return 'midnight';
          if (prev === 'midnight') return 'black';
          if (prev === 'black') return 'bloomberg';
          return 'light';
        }),
    }),
    [theme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export const useTheme = () => useContext(ThemeContext);
