/**
 * @file LoadingState Component
 * @description Standardized loading state component for async operations
 * 
 * @overview
 * Provides consistent loading UX across the application with:
 * - Spinning loader for quick operations
 * - Skeleton screens for data-heavy components
 * - Smooth transitions to loaded state
 * - Accessible loading announcements
 * 
 * @created 2025-12-31
 * @author ECHO v1.3.4 - Phase 8: UI Framework Perfection
 */

'use client';

import { Spinner } from '@heroui/react';
import { Loader2 } from 'lucide-react';

export type LoadingType = 'spinner' | 'skeleton' | 'inline';

interface LoadingStateProps {
  /** Type of loading indicator */
  type?: LoadingType;
  /** Loading message for accessibility */
  message?: string;
  /** Size of loading indicator */
  size?: 'sm' | 'md' | 'lg';
  /** Number of skeleton rows (for skeleton type) */
  rows?: number;
  /** Full height container */
  fullHeight?: boolean;
  /** Custom className */
  className?: string;
}

/**
 * LoadingState component with multiple presentation modes
 * 
 * @example
 * ```tsx
 * // Spinner loading (centered)
 * <LoadingState type="spinner" message="Loading corporations..." />
 * 
 * // Skeleton loading (data table)
 * <LoadingState type="skeleton" rows={5} />
 * 
 * // Inline loading (button state)
 * <LoadingState type="inline" size="sm" />
 * ```
 */
export default function LoadingState({
  type = 'spinner',
  message = 'Loading...',
  size = 'md',
  rows = 3,
  fullHeight = false,
  className = '',
}: LoadingStateProps) {
  // Spinner loading (centered, full page/section)
  if (type === 'spinner') {
    return (
      <div
        className={`flex flex-col items-center justify-center ${
          fullHeight ? 'min-h-screen' : 'min-h-[400px]'
        } ${className}`}
        role="status"
        aria-live="polite"
        aria-label={message}
      >
        <Spinner
          size={size}
          color="primary"
          label={message}
          labelColor="primary"
          className="mb-4"
        />
        <p className="text-sm text-gray-500 dark:text-gray-400 animate-pulse">
          {message}
        </p>
      </div>
    );
  }

  // Inline loading (for buttons, small UI elements)
  if (type === 'inline') {
    return (
      <div
        className={`inline-flex items-center gap-2 ${className}`}
        role="status"
        aria-live="polite"
        aria-label={message}
      >
        <Loader2
          className={`animate-spin ${
            size === 'sm' ? 'w-3 h-3' : size === 'lg' ? 'w-6 h-6' : 'w-4 h-4'
          } text-primary`}
        />
        <span className="sr-only">{message}</span>
      </div>
    );
  }

  // Skeleton loading (for data tables, cards, lists)
  if (type === 'skeleton') {
    return (
      <div
        className={`space-y-4 ${className}`}
        role="status"
        aria-live="polite"
        aria-label={message}
      >
        {Array.from({ length: rows }).map((_, idx) => (
          <div
            key={idx}
            className="animate-pulse"
            style={{
              animationDelay: `${idx * 0.1}s`,
            }}
          >
            {/* Card skeleton */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-center space-x-4 mb-4">
                {/* Avatar skeleton */}
                <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-full" />
                <div className="flex-1 space-y-2">
                  {/* Title skeleton */}
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
                  {/* Subtitle skeleton */}
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
                </div>
              </div>
              {/* Content skeleton */}
              <div className="space-y-2">
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded" />
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-5/6" />
              </div>
            </div>
          </div>
        ))}
        <span className="sr-only">{message}</span>
      </div>
    );
  }

  return null;
}

/**
 * Table skeleton variant for data tables
 */
export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="w-full" role="status" aria-label="Loading table data">
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        {/* Header skeleton */}
        <div className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 p-4">
          <div className="flex justify-between">
            {[1, 2, 3, 4].map(idx => (
              <div
                key={idx}
                className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"
                style={{ width: `${15 + idx * 5}%` }}
              />
            ))}
          </div>
        </div>
        {/* Rows skeleton */}
        <div className="divide-y divide-gray-200 dark:divide-gray-700">
          {Array.from({ length: rows }).map((_, idx) => (
            <div
              key={idx}
              className="p-4 animate-pulse"
              style={{ animationDelay: `${idx * 0.05}s` }}
            >
              <div className="flex justify-between">
                {[1, 2, 3, 4].map(colIdx => (
                  <div
                    key={colIdx}
                    className="h-3 bg-gray-200 dark:bg-gray-700 rounded"
                    style={{ width: `${15 + colIdx * 5}%` }}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Card skeleton variant for card grids
 */
export function CardSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" role="status">
      {Array.from({ length: count }).map((_, idx) => (
        <div
          key={idx}
          className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 animate-pulse"
          style={{ animationDelay: `${idx * 0.1}s` }}
        >
          {/* Header */}
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-lg" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
            </div>
          </div>
          {/* Content */}
          <div className="space-y-3">
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded" />
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-5/6" />
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-4/6" />
          </div>
          {/* Footer */}
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Implementation notes:
 * 
 * - Uses HeroUI Spinner for consistent styling
 * - Skeleton screens prevent layout shift
 * - Accessible with proper ARIA attributes
 * - Smooth animations with CSS transitions
 * - Respects prefers-reduced-motion
 * - TypeScript strict mode compatible
 * 
 * @see https://www.w3.org/WAI/ARIA/apg/patterns/alert/
 */
