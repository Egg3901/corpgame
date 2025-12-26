'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';

type Theme = 'light' | 'dark' | 'bloomberg';

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

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>('light');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const storedTheme = typeof window !== 'undefined' ? localStorage.getItem('theme') : null;
    const prefersDark =
      typeof window !== 'undefined' ? window.matchMedia('(prefers-color-scheme: dark)').matches : false;

    let initialTheme: Theme = 'light';
    if (storedTheme === 'dark' || storedTheme === 'bloomberg') {
      initialTheme = storedTheme as Theme;
    } else if (!storedTheme && prefersDark) {
      initialTheme = 'dark';
    }

    setTheme(initialTheme);
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const root = document.documentElement;

    // Remove all theme classes
    root.classList.remove('dark', 'bloomberg');

    // Add the appropriate theme class
    if (theme === 'dark') {
      root.classList.add('dark');
    } else if (theme === 'bloomberg') {
      root.classList.add('bloomberg');
    }

    localStorage.setItem('theme', theme);
  }, [theme, mounted]);

  const value = useMemo(
    () => ({
      theme,
      setTheme,
      toggleTheme: () =>
        setTheme((prev) => {
          if (prev === 'light') return 'dark';
          if (prev === 'dark') return 'bloomberg';
          return 'light';
        }),
    }),
    [theme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export const useTheme = () => useContext(ThemeContext);
