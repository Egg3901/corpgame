/**
 * CORS (Cross-Origin Resource Sharing) Middleware
 * 
 * Configures CORS policies for API endpoints.
 * Enables secure cross-origin requests from authorized domains.
 * 
 * **Features:**
 * - Environment-based origin whitelist
 * - Automatic preflight request handling (OPTIONS)
 * - Credentials support for cookie-based authentication
 * - Configurable allowed methods and headers
 * 
 * **Environment Configuration:**
 * - Development: Allows localhost origins (3000, 3001)
 * - Production: Allows only specified domains from CORS_ORIGINS env var
 * 
 * Created: 2025-12-31
 * Phase: 6.2 - CORS Configuration
 */

import { NextRequest, NextResponse } from 'next/server';

/**
 * CORS configuration interface
 */
interface CorsConfig {
  /** Allowed origins (domains) */
  allowedOrigins: string[];
  /** Allowed HTTP methods */
  allowedMethods: string[];
  /** Allowed headers */
  allowedHeaders: string[];
  /** Allow credentials (cookies, authorization headers) */
  credentials: boolean;
  /** Max age for preflight cache (seconds) */
  maxAge: number;
}

/**
 * Default CORS configuration
 */
const DEFAULT_CONFIG: CorsConfig = {
  allowedOrigins: [],
  allowedMethods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
    'Origin'
  ],
  credentials: true,
  maxAge: 86400 // 24 hours
};

/**
 * Get allowed origins based on environment
 * 
 * **Development:** Localhost origins (for local testing)
 * **Production:** Domains specified in CORS_ORIGINS environment variable
 * 
 * @returns Array of allowed origin URLs
 */
function getAllowedOrigins(): string[] {
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  if (isDevelopment) {
    // Development: Allow common localhost ports
    return [
      'http://localhost:3000',
      'http://localhost:3001',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:3001'
    ];
  }
  
  // Production: Use environment variable
  const corsOrigins = process.env.CORS_ORIGINS;
  
  if (!corsOrigins) {
    console.warn('⚠️ CORS_ORIGINS not configured. CORS will reject all origins in production.');
    return [];
  }
  
  // Split by comma, trim whitespace
  return corsOrigins.split(',').map(origin => origin.trim());
}

/**
 * Check if an origin is allowed
 * 
 * @param origin - Origin header value from request
 * @param allowedOrigins - Array of allowed origins
 * @returns True if origin is allowed, false otherwise
 */
function isOriginAllowed(origin: string | null, allowedOrigins: string[]): boolean {
  if (!origin) {
    return false;
  }
  
  return allowedOrigins.includes(origin);
}

/**
 * Build CORS headers for a request
 * 
 * @param origin - Request origin (if allowed)
 * @param config - CORS configuration
 * @returns Headers object
 */
function buildCorsHeaders(origin: string | null, config: CorsConfig): Record<string, string> {
  const headers: Record<string, string> = {};
  
  if (origin) {
    headers['Access-Control-Allow-Origin'] = origin;
  }
  
  headers['Access-Control-Allow-Methods'] = config.allowedMethods.join(', ');
  headers['Access-Control-Allow-Headers'] = config.allowedHeaders.join(', ');
  
  if (config.credentials) {
    headers['Access-Control-Allow-Credentials'] = 'true';
  }
  
  headers['Access-Control-Max-Age'] = String(config.maxAge);
  
  return headers;
}

/**
 * CORS middleware
 * 
 * Handles CORS for API endpoints. Validates origin, sets appropriate headers,
 * and handles preflight OPTIONS requests.
 * 
 * **Usage:**
 * ```typescript
 * // In middleware.ts
 * import { corsMiddleware } from '@/lib/middleware/cors';
 * 
 * export function middleware(request: NextRequest) {
 *   const corsResult = corsMiddleware(request);
 *   if (corsResult.status === 200 || corsResult.status === 204) {
 *     // Preflight or rejected request
 *     return corsResult;
 *   }
 *   
 *   // Continue to next middleware
 *   return NextResponse.next();
 * }
 * ```
 * 
 * @param request - Next.js request object
 * @returns NextResponse with CORS headers or error
 */
export function corsMiddleware(request: NextRequest): NextResponse {
  const pathname = request.nextUrl.pathname;
  
  // Skip CORS for non-API routes
  if (!pathname.startsWith('/api/')) {
    return NextResponse.next();
  }
  
  const origin = request.headers.get('origin');
  const allowedOrigins = getAllowedOrigins();
  const config = DEFAULT_CONFIG;
  
  // Check if origin is allowed
  const originAllowed = isOriginAllowed(origin, allowedOrigins);
  
  // Handle preflight OPTIONS request
  if (request.method === 'OPTIONS') {
    if (!originAllowed) {
      // Reject preflight from unauthorized origin
      return new NextResponse(null, {
        status: 204,
        headers: {
          'Content-Length': '0'
        }
      });
    }
    
    // Accept preflight request
    const corsHeaders = buildCorsHeaders(origin, config);
    return new NextResponse(null, {
      status: 204,
      headers: corsHeaders
    });
  }
  
  // Handle actual request
  if (!originAllowed) {
    // No origin header (same-origin request) or unauthorized origin
    // For same-origin requests, continue without CORS headers
    if (!origin) {
      return NextResponse.next();
    }
    
    // Reject request from unauthorized origin
    return NextResponse.json(
      { 
        error: 'CORS policy violation',
        message: 'Origin not allowed'
      },
      { 
        status: 403,
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
  }
  
  // Origin allowed - add CORS headers and continue
  const corsHeaders = buildCorsHeaders(origin, config);
  
  return NextResponse.next({
    headers: corsHeaders
  });
}

/**
 * Get current CORS configuration (for debugging)
 */
export function getCorsConfig(): {
  environment: string;
  allowedOrigins: string[];
  config: CorsConfig;
} {
  return {
    environment: process.env.NODE_ENV || 'unknown',
    allowedOrigins: getAllowedOrigins(),
    config: DEFAULT_CONFIG
  };
}

/**
 * Manually check if an origin is allowed (for testing)
 */
export function checkOrigin(origin: string): boolean {
  return isOriginAllowed(origin, getAllowedOrigins());
}
