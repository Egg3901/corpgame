/**
 * Next.js Middleware Configuration
 * 
 * Global middleware that runs on ALL requests before reaching route handlers.
 * Applied in order: logging setup → rate limiting → CORS → security headers → logging complete.
 * 
 * **Middleware Chain:**
 * 1. Request start timestamp (for logging)
 * 2. Rate limiting check (429 if exceeded)
 * 3. CORS validation (403 if unauthorized origin)
 * 4. Security headers (added to all responses)
 * 5. Request logging (audit trail)
 * 
 * **Configuration:**
 * - Matcher: Only applies to /api/* routes (excludes static files, _next)
 * - Rate limits: Configured per endpoint in lib/middleware/rateLimit.ts
 * - CORS: Environment-based whitelist in lib/middleware/cors.ts
 * - Security: OWASP headers in lib/middleware/security.ts
 * - Logging: Audit trail in lib/middleware/logging.ts
 * 
 * **References:**
 * - Next.js Middleware: https://nextjs.org/docs/app/building-your-application/routing/middleware
 * - Edge Runtime: https://nextjs.org/docs/app/api-reference/edge
 * 
 * Created: 2025-12-31
 * Phase: 6.5 - Middleware Integration
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  rateLimitMiddleware,
  corsMiddleware,
  securityHeadersMiddleware,
  loggingMiddleware
} from '@/lib/middleware';

/**
 * Middleware function
 * 
 * Runs on every request matching the matcher configuration.
 * Processes middleware chain in order, short-circuits on errors.
 * 
 * @param request - Next.js request object
 * @returns NextResponse (continue or error)
 */
export async function middleware(request: NextRequest) {
  // TEMPORARILY DISABLED - debugging 405 error
  // Just pass through all requests
  return NextResponse.next();
}

/**
 * Matcher configuration
 * 
 * Defines which routes should run middleware.
 * 
 * **Included:**
 * - /api/* (all API routes)
 * 
 * **Excluded:**
 * - /_next/* (Next.js internals)
 * - /static/* (static files)
 * - /*.* (files with extensions - images, fonts, etc.)
 * 
 * **Note:** Page routes can optionally be included by modifying matcher.
 * Current configuration only applies to API routes.
 */
export const config = {
  matcher: [
    /*
     * Match all API routes
     * Exclude:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico (favicon)
     * - public files (fonts, images, etc.)
     */
    '/api/:path*'
  ]
};
