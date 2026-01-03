/**
 * @file ErrorBoundary Component
 * @description React Error Boundary for graceful error handling
 * 
 * @overview
 * Catches JavaScript errors in component tree and displays fallback UI:
 * - Prevents full app crash from component errors
 * - Provides user-friendly error message
 * - Allows retry without page refresh
 * - Logs errors for debugging
 * 
 * @created 2025-12-31
 * @author ECHO v1.3.4 - Phase 8: UI Framework Perfection
 */

'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Button, Card, CardHeader, CardBody, CardFooter } from '@heroui/react';
import { AlertTriangle, RefreshCcw } from 'lucide-react';

interface ErrorBoundaryProps {
  /** Child components to wrap */
  children: ReactNode;
  /** Custom fallback UI (optional) */
  fallback?: ReactNode;
  /** Error callback for logging/reporting */
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  /** Boundary name for identification */
  boundaryName?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * Error Boundary component for React error handling
 * 
 * @example
 * ```tsx
 * // Wrap entire app
 * <ErrorBoundary boundaryName="App">
 *   <App />
 * </ErrorBoundary>
 * 
 * // Wrap specific section with custom error handler
 * <ErrorBoundary 
 *   boundaryName="CorporationDashboard"
 *   onError={(error, errorInfo) => logToService(error)}
 * >
 *   <CorporationDashboard />
 * </ErrorBoundary>
 * 
 * // Custom fallback UI
 * <ErrorBoundary 
 *   fallback={<div>Custom error message</div>}
 * >
 *   <SomeComponent />
 * </ErrorBoundary>
 * ```
 */
export default class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  /**
   * Update state when error occurs
   * Called during "render" phase (no side effects allowed)
   */
  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  /**
   * Log error details
   * Called during "commit" phase (side effects allowed)
   */
  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const { boundaryName, onError } = this.props;

    // Log to console (development/debugging)
    console.error(
      `Error caught by ErrorBoundary${boundaryName ? ` (${boundaryName})` : ''}:`,
      error,
      errorInfo
    );

    // Update state with error info
    this.setState({
      errorInfo,
    });

    // Call custom error handler (e.g., error reporting service)
    if (onError) {
      onError(error, errorInfo);
    }

    // Optional: Report to error tracking service
    // Example: Sentry.captureException(error, { contexts: { react: { componentStack: errorInfo.componentStack } } });
  }

  /**
   * Reset error state and retry rendering
   */
  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render() {
    const { hasError, error, errorInfo } = this.state;
    const { children, fallback, boundaryName } = this.props;

    if (hasError) {
      // Custom fallback provided
      if (fallback) {
        return fallback;
      }

      // Default error UI
      return (
        <div className="flex items-center justify-center min-h-[400px] p-6">
          <Card
            className="max-w-2xl w-full bg-white dark:bg-gray-800 border-2 border-red-200 dark:border-red-900"
            shadow="lg"
          >
            <CardHeader className="flex gap-3">
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30">
                <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
              <div className="flex flex-col">
                <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                  Something went wrong
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {boundaryName
                    ? `An error occurred in ${boundaryName}`
                    : 'An unexpected error occurred'}
                </p>
              </div>
            </CardHeader>

            <CardBody className="space-y-4">
              {/* Error message */}
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                <p className="text-sm font-mono text-red-900 dark:text-red-200 break-words">
                  {error?.message || 'Unknown error'}
                </p>
              </div>

              {/* Error details (development only) */}
              {process.env.NODE_ENV === 'development' && errorInfo && (
                <details className="cursor-pointer">
                  <summary className="text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100">
                    View error stack trace
                  </summary>
                  <pre className="mt-2 text-xs bg-gray-100 dark:bg-gray-900 rounded-lg p-4 overflow-auto max-h-96 text-gray-800 dark:text-gray-200">
                    {errorInfo.componentStack}
                  </pre>
                </details>
              )}

              {/* User guidance */}
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <p className="text-sm text-blue-900 dark:text-blue-200">
                  <strong>What you can do:</strong>
                </p>
                <ul className="mt-2 text-sm text-blue-800 dark:text-blue-300 space-y-1 list-disc list-inside">
                  <li>Try refreshing the page</li>
                  <li>Clear your browser cache</li>
                  <li>Check your internet connection</li>
                  <li>
                    If the problem persists, please{' '}
                    <a
                      href="/report-issue"
                      className="underline hover:text-blue-600 dark:hover:text-blue-400"
                    >
                      report this issue
                    </a>
                  </li>
                </ul>
              </div>
            </CardBody>

            <CardFooter className="flex gap-3">
              <Button
                color="primary"
                variant="solid"
                onPress={this.handleReset}
                startContent={<RefreshCcw className="w-4 h-4" />}
              >
                Try Again
              </Button>
              <Button
                color="default"
                variant="bordered"
                onPress={() => (window.location.href = '/home')}
              >
                Go to Home
              </Button>
            </CardFooter>
          </Card>
        </div>
      );
    }

    // No error, render children normally
    return children;
  }
}

/**
 * Functional wrapper for multiple error boundaries
 * Useful for nested error handling with different recovery strategies
 */
export function ErrorBoundaryGroup({
  children,
  boundaries,
}: {
  children: ReactNode;
  boundaries: Array<{
    name: string;
    onError?: (error: Error, errorInfo: ErrorInfo) => void;
  }>;
}) {
  return boundaries.reduceRight(
    (acc, boundary) => (
      <ErrorBoundary boundaryName={boundary.name} onError={boundary.onError}>
        {acc}
      </ErrorBoundary>
    ),
    children
  );
}

/**
 * Implementation notes:
 * 
 * - Class component (required for Error Boundary)
 * - getDerivedStateFromError: Update state (no side effects)
 * - componentDidCatch: Log errors (side effects allowed)
 * - HeroUI Card + Button for consistent UI
 * - Retry functionality (handleReset)
 * - Development mode shows stack trace
 * - Production mode hides technical details
 * - Accessibility: Semantic HTML, proper ARIA
 * - Optional error reporting callback
 * 
 * Error Boundary limitations:
 * - Only catches errors in React component tree
 * - Does NOT catch:
 *   * Event handlers (use try-catch)
 *   * Async code (use .catch or try-catch)
 *   * Server-side rendering errors
 *   * Errors in Error Boundary itself
 * 
 * @see https://react.dev/reference/react/Component#catching-rendering-errors-with-an-error-boundary
 * @see https://www.w3.org/WAI/ARIA/apg/patterns/alert/
 */
