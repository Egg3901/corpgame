/**
 * Request Logging Middleware
 * 
 * Implements audit trail logging for all API requests.
 * Captures essential request/response information for security and debugging.
 * 
 * **Logged Information:**
 * - Timestamp (ISO 8601 format)
 * - Client IP address
 * - HTTP method
 * - Request path
 * - Response status code
 * - Request duration (ms)
 * - User ID (if authenticated)
 * 
 * **Features:**
 * - Environment-aware logging (development vs production)
 * - Sensitive data filtering (passwords, tokens)
 * - Performance impact monitoring
 * - Structured log format (JSON in production)
 * 
 * Created: 2025-12-31
 * Phase: 6.4 - Request Logging Implementation
 */

import { NextRequest, NextResponse } from 'next/server';
import { getClientIp } from '@/lib/utils/requestIp';

/**
 * Log entry interface
 */
interface LogEntry {
  /** ISO 8601 timestamp */
  timestamp: string;
  /** Client IP address */
  ip: string;
  /** HTTP method */
  method: string;
  /** Request path */
  path: string;
  /** Response status code */
  status: number;
  /** Request duration in milliseconds */
  duration: number;
  /** User ID (if authenticated) */
  userId?: string;
  /** User agent string */
  userAgent?: string;
  /** Referer header */
  referer?: string;
}

/**
 * Sensitive paths that should not log request/response bodies
 */
const SENSITIVE_PATHS = [
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/refresh',
  '/api/users/password'
];

/**
 * Check if a path is sensitive (contains passwords, tokens, etc.)
 */
function isSensitivePath(pathname: string): boolean {
  return SENSITIVE_PATHS.some(path => pathname.startsWith(path));
}

/**
 * Extract user ID from JWT token in Authorization header
 * 
 * **Note:** This is a simple extraction for logging purposes.
 * Proper authentication should be handled by auth middleware.
 * 
 * @param request - Next.js request object
 * @returns User ID or undefined
 */
function extractUserId(request: NextRequest): string | undefined {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return undefined;
    }
    
    const token = authHeader.substring(7);
    
    // Decode JWT payload (without verification - just for logging)
    const payloadBase64 = token.split('.')[1];
    if (!payloadBase64) {
      return undefined;
    }
    
    const payload = JSON.parse(Buffer.from(payloadBase64, 'base64').toString());
    return payload.userId || payload.id || payload.sub;
  } catch {
    return undefined;
  }
}

/**
 * Format log entry based on environment
 * 
 * **Development:** Human-readable format with colors
 * **Production:** Structured JSON format
 * 
 * @param entry - Log entry
 * @returns Formatted log string
 */
function formatLogEntry(entry: LogEntry): string {
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  if (isDevelopment) {
    // Development: Colorful, human-readable format
    const statusColor = entry.status >= 500 ? '\x1b[31m' : // Red for 5xx
                       entry.status >= 400 ? '\x1b[33m' : // Yellow for 4xx
                       entry.status >= 300 ? '\x1b[36m' : // Cyan for 3xx
                       '\x1b[32m'; // Green for 2xx
    const reset = '\x1b[0m';
    const gray = '\x1b[90m';
    
    return [
      `${gray}[${entry.timestamp}]${reset}`,
      `${entry.method}`,
      `${entry.path}`,
      `${statusColor}${entry.status}${reset}`,
      `${gray}${entry.duration}ms${reset}`,
      `${gray}${entry.ip}${reset}`,
      entry.userId ? `${gray}user:${entry.userId}${reset}` : ''
    ].filter(Boolean).join(' ');
  }
  
  // Production: Structured JSON format
  return JSON.stringify(entry);
}

/**
 * Write log entry to console
 * 
 * In production, these logs can be piped to a logging service
 * (e.g., Datadog, LogDNA, CloudWatch) via stdout.
 * 
 * @param entry - Log entry
 */
function writeLog(entry: LogEntry): void {
  const formatted = formatLogEntry(entry);
  
  // Use appropriate console method based on status
  if (entry.status >= 500) {
    console.error(formatted);
  } else if (entry.status >= 400) {
    console.warn(formatted);
  } else {
    console.log(formatted);
  }
}

/**
 * Request logging middleware
 * 
 * Logs all API requests with timing information.
 * Should be applied early in middleware chain for accurate timing.
 * 
 * **Usage:**
 * ```typescript
 * // In middleware.ts
 * import { loggingMiddleware } from '@/lib/middleware/logging';
 * 
 * export async function middleware(request: NextRequest) {
 *   const startTime = Date.now();
 *   
 *   // Process request
 *   const response = await NextResponse.next();
 *   
 *   // Log request
 *   await loggingMiddleware(request, response, startTime);
 *   
 *   return response;
 * }
 * ```
 * 
 * **Note:** This middleware does not modify the request or response.
 * It only logs information and returns the response as-is.
 * 
 * @param request - Next.js request object
 * @param response - Next.js response object
 * @param startTime - Request start timestamp (Date.now())
 */
export async function loggingMiddleware(
  request: NextRequest,
  response: NextResponse,
  startTime: number
): Promise<void> {
  const pathname = request.nextUrl.pathname;
  
  // Skip logging for non-API routes (optional - adjust based on needs)
  if (!pathname.startsWith('/api/')) {
    return;
  }
  
  // Skip logging for health check endpoints (optional)
  if (pathname === '/api/health' || pathname === '/api/ping') {
    return;
  }
  
  // Calculate request duration
  const duration = Date.now() - startTime;
  
  // Extract information
  const ip = getClientIp(request);
  const userId = extractUserId(request);
  const userAgent = request.headers.get('user-agent') || undefined;
  const referer = request.headers.get('referer') || undefined;
  
  // Build log entry
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    ip,
    method: request.method,
    path: pathname,
    status: response.status,
    duration,
    userId,
    userAgent,
    referer
  };
  
  // Write log
  writeLog(entry);
}

/**
 * Log custom event (for important business operations)
 * 
 * Use this to log significant events beyond HTTP requests.
 * 
 * @example
 * ```typescript
 * // Log share purchase
 * logEvent({
 *   type: 'SHARE_PURCHASE',
 *   userId: '123',
 *   corporationId: '456',
 *   quantity: 100,
 *   price: 50.25
 * });
 * ```
 */
export function logEvent(event: Record<string, any>): void {
  const entry = {
    timestamp: new Date().toISOString(),
    ...event
  };
  
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  if (isDevelopment) {
    console.log('\x1b[35m[EVENT]\x1b[0m', entry);
  } else {
    console.log(JSON.stringify(entry));
  }
}

/**
 * Log error with context
 * 
 * Use this to log errors with additional context.
 * 
 * @example
 * ```typescript
 * try {
 *   await processPayment();
 * } catch (error) {
 *   logError('Payment processing failed', error, {
 *     userId: '123',
 *     amount: 100.00
 *   });
 * }
 * ```
 */
export function logError(
  message: string,
  error: Error | unknown,
  context?: Record<string, any>
): void {
  const entry = {
    timestamp: new Date().toISOString(),
    level: 'ERROR',
    message,
    error: error instanceof Error ? {
      name: error.name,
      message: error.message,
      stack: error.stack
    } : String(error),
    context
  };
  
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  if (isDevelopment) {
    console.error('\x1b[31m[ERROR]\x1b[0m', message);
    console.error(error);
    if (context) {
      console.error('Context:', context);
    }
  } else {
    console.error(JSON.stringify(entry));
  }
}

/**
 * Get logging configuration (for debugging)
 */
export function getLoggingConfig(): {
  environment: string;
  sensitivePaths: string[];
  logFormat: 'human' | 'json';
} {
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  return {
    environment: process.env.NODE_ENV || 'unknown',
    sensitivePaths: SENSITIVE_PATHS,
    logFormat: isDevelopment ? 'human' : 'json'
  };
}
