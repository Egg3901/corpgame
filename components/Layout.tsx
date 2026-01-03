'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Layout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAuthPage = pathname === '/login' || pathname === '/register';

  return (
    <div className="min-h-screen bg-surface-0">
      {/* Skip link for keyboard navigation */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-accent focus:text-white focus:rounded-lg focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2"
      >
        Skip to main content
      </a>
      <nav className="bg-surface-1 shadow-sm border-b border-line-subtle">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link href="/" className="text-2xl font-bold text-accent">
                Corporate Warfare
              </Link>
            </div>
            <div className="flex items-center space-x-4">
              {!isAuthPage && (
                <>
                  <Link
                    href="/login"
                    className="text-content-secondary hover:text-accent px-3 py-2 rounded-md text-sm font-medium transition-colors"
                  >
                    Login
                  </Link>
                  <Link
                    href="/register"
                    className="bg-accent text-content-inverse px-4 py-2 rounded-md text-sm font-medium hover:bg-accent/90 transition-colors"
                  >
                    Register
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>
      <main id="main-content">{children}</main>
    </div>
  );
}




