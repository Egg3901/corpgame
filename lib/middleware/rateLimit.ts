/**
 * Rate Limiting Middleware
 * 
 * Implements token bucket algorithm for API rate limiting.
 * Prevents abuse and ensures fair resource allocation.
 * 
 * **Features:**
 * - Configurable limits per endpoint pattern
 * - In-memory storage (suitable for single-instance deployments)
 * - Automatic cleanup of expired entries
 * - Standard rate limit headers (X-RateLimit-*)
 * - 429 responses with Retry-After header
 * 
 * **Rate Limit Tiers:**
 * - Authentication: 5 requests per 15 minutes (strict)
 * - Trading: 10 requests per minute (moderate)
 * - Default: 100 requests per 15 minutes (relaxed)
 * 
 * Created: 2025-12-31
 * Phase: 6.1 - Rate Limiting Implementation
 */

import { NextRequest, NextResponse } from 'next/server';
import { getClientIp } from '@/lib/utils/requestIp';

/**
 * Rate limit configuration for an endpoint
 */
interface RateLimitConfig {
  /** Time window in milliseconds */
  windowMs: number;
  /** Maximum requests allowed in the window */
  max: number;
  /** Human-readable description */
  description?: string;
}

/**
 * Request record for an IP address
 */
interface RequestRecord {
  /** Request count in current window */
  count: number;
  /** Window start timestamp */
  windowStart: number;
}

/**
 * Rate limit storage (in-memory)
 * Structure: Map<"ip:pathname", RequestRecord>
 */
const requestStore = new Map<string, RequestRecord>();

/**
 * Rate limit configurations by endpoint pattern
 * More specific patterns should be listed first (checked in order)
 */
const RATE_LIMITS: Array<{ pattern: RegExp; config: RateLimitConfig }> = [
  // Authentication endpoints (strict)
  {
    pattern: /^\/api\/auth\/login$/,
    config: { 
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 5,
      description: 'Login attempts'
    }
  },
  {
    pattern: /^\/api\/auth\/register$/,
    config: { 
      windowMs: 60 * 60 * 1000, // 1 hour
      max: 3,
      description: 'Registration attempts'
    }
  },
  {
    pattern: /^\/api\/auth\//,
    config: { 
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 200,
      description: 'Authentication operations'
    }
  },
  
  // Trading endpoints (moderate)
  {
    pattern: /^\/api\/shares\/[^/]+\/(buy|sell)$/,
    config: { 
      windowMs: 60 * 1000, // 1 minute
      max: 10,
      description: 'Share trading'
    }
  },
  {
    pattern: /^\/api\/loans\/[^/]+\/(request|approve|repay)$/,
    config: { 
      windowMs: 60 * 1000, // 1 minute
      max: 5,
      description: 'Loan operations'
    }
  },
  
  // Corporate actions (moderate)
  {
    pattern: /^\/api\/corporate-actions\//,
    config: { 
      windowMs: 5 * 60 * 1000, // 5 minutes
      max: 20,
      description: 'Corporate actions'
    }
  },
  
  // Admin endpoints (strict)
  {
    pattern: /^\/api\/admin\//,
    config: { 
      windowMs: 5 * 60 * 1000, // 5 minutes
      max: 50,
      description: 'Admin operations'
    }
  },
  
  // Default rate limit for all other API endpoints (relaxed)
  {
    pattern: /^\/api\//,
    config: { 
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100,
      description: 'General API requests'
    }
  }
];

/**
 * Find matching rate limit configuration for a pathname
 * Returns the first matching pattern (more specific patterns first)
 */
function findRateLimitConfig(pathname: string): RateLimitConfig {
  for (const { pattern, config } of RATE_LIMITS) {
    if (pattern.test(pathname)) {
      return config;
    }
  }
  
  // Fallback (should never reach here if patterns are comprehensive)
  return { 
    windowMs: 15 * 60 * 1000, 
    max: 100,
    description: 'Default'
  };
}

/**
 * Increment request count for an IP + pathname combination
 * Implements sliding window algorithm
 * 
 * @returns Current request count in window
 */
function incrementRequestCount(
  ip: string, 
  pathname: string, 
  windowMs: number
): number {
  const key = `${ip}:${pathname}`;
  const now = Date.now();
  const record = requestStore.get(key);
  
  if (!record) {
    // First request in window
    requestStore.set(key, { count: 1, windowStart: now });
    return 1;
  }
  
  // Check if window has expired
  const windowExpired = now - record.windowStart >= windowMs;
  
  if (windowExpired) {
    // Reset window
    requestStore.set(key, { count: 1, windowStart: now });
    return 1;
  }
  
  // Increment count in current window
  record.count++;
  requestStore.set(key, record);
  return record.count;
}

/**
 * Get current request count for an IP + pathname
 * Returns 0 if no record exists or window has expired
 */
function getCurrentCount(
  ip: string, 
  pathname: string, 
  windowMs: number
): number {
  const key = `${ip}:${pathname}`;
  const now = Date.now();
  const record = requestStore.get(key);
  
  if (!record) {
    return 0;
  }
  
  // Check if window has expired
  const windowExpired = now - record.windowStart >= windowMs;
  return windowExpired ? 0 : record.count;
}

/**
 * Cleanup expired entries from request store
 * Should be called periodically to prevent memory leaks
 */
function cleanupExpiredEntries(): void {
  const now = Date.now();
  const maxWindowMs = Math.max(...RATE_LIMITS.map(r => r.config.windowMs));
  
  for (const [key, record] of requestStore.entries()) {
    if (now - record.windowStart >= maxWindowMs) {
      requestStore.delete(key);
    }
  }
}

/**
 * Rate limiting middleware
 * 
 * Checks rate limits before allowing request to proceed.
 * Returns 429 Too Many Requests if limit exceeded.
 * Adds rate limit headers to all responses.
 * 
 * @example
 * ```typescript
 * // In middleware.ts or route handler
 * import { rateLimitMiddleware } from '@/lib/middleware/rateLimit';
 * 
 * export function middleware(request: NextRequest) {
 *   const rateLimitResult = rateLimitMiddleware(request);
 *   if (rateLimitResult.status === 429) {
 *     return rateLimitResult;
 *   }
 *   
 *   return NextResponse.next();
 * }
 * ```
 * 
 * @param request - Next.js request object
 * @returns NextResponse with rate limit headers or 429 error
 */
export function rateLimitMiddleware(request: NextRequest): NextResponse {
  const ip = getClientIp(request);
  const pathname = request.nextUrl.pathname;
  
  // Skip rate limiting for non-API routes
  if (!pathname.startsWith('/api/')) {
    return NextResponse.next();
  }
  
  // Find applicable rate limit configuration
  const config = findRateLimitConfig(pathname);
  
  // Get current count before incrementing
  const currentCount = getCurrentCount(ip, pathname, config.windowMs);
  
  // Check if limit would be exceeded
  if (currentCount >= config.max) {
    // Calculate retry after time
    const key = `${ip}:${pathname}`;
    const record = requestStore.get(key);
    const retryAfterMs = record 
      ? config.windowMs - (Date.now() - record.windowStart)
      : config.windowMs;
    const retryAfterSeconds = Math.ceil(retryAfterMs / 1000);
    
    return NextResponse.json(
      { 
        error: 'Too many requests',
        message: `Rate limit exceeded for ${config.description || 'this endpoint'}. Please try again later.`,
        retryAfter: retryAfterSeconds
      },
      { 
        status: 429,
        headers: {
          'Retry-After': String(retryAfterSeconds),
          'X-RateLimit-Limit': String(config.max),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': String(Math.ceil((Date.now() + retryAfterMs) / 1000))
        }
      }
    );
  }
  
  // Increment count
  const newCount = incrementRequestCount(ip, pathname, config.windowMs);
  const remaining = config.max - newCount;
  
  // Get window reset time
  const key = `${ip}:${pathname}`;
  const record = requestStore.get(key);
  const resetTime = record 
    ? Math.ceil((record.windowStart + config.windowMs) / 1000)
    : Math.ceil((Date.now() + config.windowMs) / 1000);
  
  // Allow request with rate limit headers
  return NextResponse.next({
    headers: {
      'X-RateLimit-Limit': String(config.max),
      'X-RateLimit-Remaining': String(remaining),
      'X-RateLimit-Reset': String(resetTime)
    }
  });
}

/**
 * Cleanup interval (runs every 10 minutes)
 * Automatically removes expired entries from request store
 */
if (typeof window === 'undefined') {
  // Server-side only
  setInterval(cleanupExpiredEntries, 10 * 60 * 1000);
}

/**
 * Get rate limit status for an IP + pathname (for testing/debugging)
 */
export function getRateLimitStatus(ip: string, pathname: string): {
  config: RateLimitConfig;
  currentCount: number;
  remaining: number;
  resetTime: number;
} {
  const config = findRateLimitConfig(pathname);
  const currentCount = getCurrentCount(ip, pathname, config.windowMs);
  const remaining = Math.max(0, config.max - currentCount);
  
  const key = `${ip}:${pathname}`;
  const record = requestStore.get(key);
  const resetTime = record 
    ? Math.ceil((record.windowStart + config.windowMs) / 1000)
    : Math.ceil((Date.now() + config.windowMs) / 1000);
  
  return {
    config,
    currentCount,
    remaining,
    resetTime
  };
}

/**
 * Clear all rate limit records (for testing)
 */
export function clearRateLimits(): void {
  requestStore.clear();
}
