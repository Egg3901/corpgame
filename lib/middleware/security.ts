/**
 * Security Headers Middleware
 * 
 * Implements security best practices by setting protective HTTP headers.
 * Equivalent to helmet.js for Next.js applications.
 * 
 * **Security Headers Implemented:**
 * - X-Frame-Options: Prevents clickjacking attacks
 * - X-Content-Type-Options: Prevents MIME-sniffing
 * - Strict-Transport-Security: Forces HTTPS connections
 * - Content-Security-Policy: Restricts resource loading
 * - X-XSS-Protection: Enables browser XSS filtering
 * - Referrer-Policy: Controls referrer information
 * - Permissions-Policy: Controls browser features
 * 
 * **References:**
 * - OWASP Secure Headers Project
 * - Mozilla Observatory recommendations
 * 
 * Created: 2025-12-31
 * Phase: 6.3 - Security Headers Implementation
 */

import { NextRequest, NextResponse } from 'next/server';

/**
 * Security headers configuration interface
 */
interface SecurityConfig {
  /** Enable X-Frame-Options header */
  frameOptions: boolean;
  /** Enable X-Content-Type-Options header */
  contentTypeOptions: boolean;
  /** Enable Strict-Transport-Security header (HSTS) */
  strictTransportSecurity: boolean;
  /** Enable Content-Security-Policy header */
  contentSecurityPolicy: boolean;
  /** Enable X-XSS-Protection header */
  xssProtection: boolean;
  /** Enable Referrer-Policy header */
  referrerPolicy: boolean;
  /** Enable Permissions-Policy header */
  permissionsPolicy: boolean;
}

/**
 * Default security configuration (all enabled)
 */
const DEFAULT_CONFIG: SecurityConfig = {
  frameOptions: true,
  contentTypeOptions: true,
  strictTransportSecurity: true,
  contentSecurityPolicy: true,
  xssProtection: true,
  referrerPolicy: true,
  permissionsPolicy: true
};

/**
 * Content Security Policy (CSP) configuration
 * 
 * **Policy Directives:**
 * - default-src: Fallback for all resource types
 * - script-src: JavaScript sources
 * - style-src: CSS sources
 * - img-src: Image sources
 * - font-src: Font sources
 * - connect-src: Fetch/XHR/WebSocket sources
 * - frame-ancestors: Embedding permissions
 * 
 * **Note:** Adjust based on your application's needs.
 * Current policy is balanced for most Next.js applications.
 */
const CSP_DIRECTIVES = {
  'default-src': ["'self'"],
  'script-src': [
    "'self'",
    "'unsafe-eval'", // Required for Next.js in development
    "'unsafe-inline'" // Required for Next.js inline scripts
  ],
  'style-src': [
    "'self'",
    "'unsafe-inline'" // Required for HeroUI and Tailwind
  ],
  'img-src': [
    "'self'",
    'data:', // For data URIs (base64 images)
    'https:' // Allow external images
  ],
  'font-src': [
    "'self'",
    'data:' // For data URI fonts
  ],
  'connect-src': [
    "'self'",
    'https://*.vercel-insights.com' // For Vercel analytics (if used)
  ],
  'frame-ancestors': ["'none'"], // Prevent embedding (clickjacking protection)
  'base-uri': ["'self'"],
  'form-action': ["'self'"],
  'object-src': ["'none'"], // Disable plugins (Flash, Java, etc.)
  'upgrade-insecure-requests': [] // Upgrade HTTP to HTTPS
};

/**
 * Build Content Security Policy header value
 * 
 * @returns CSP string in standard format
 */
function buildCSP(): string {
  return Object.entries(CSP_DIRECTIVES)
    .map(([directive, values]) => {
      if (values.length === 0) {
        // Directive with no values (e.g., upgrade-insecure-requests)
        return directive;
      }
      return `${directive} ${values.join(' ')}`;
    })
    .join('; ');
}

/**
 * Build Permissions Policy header value
 * 
 * Controls browser features and APIs that can be used.
 * Restricts access to sensitive features by default.
 */
function buildPermissionsPolicy(): string {
  const policies = [
    'camera=()', // Disable camera
    'microphone=()', // Disable microphone
    'geolocation=()', // Disable geolocation
    'interest-cohort=()', // Disable FLoC tracking
    'payment=()', // Disable payment APIs
    'usb=()', // Disable USB access
    'magnetometer=()', // Disable magnetometer
    'gyroscope=()', // Disable gyroscope
    'accelerometer=()' // Disable accelerometer
  ];
  
  return policies.join(', ');
}

/**
 * Build all security headers
 * 
 * @param config - Security configuration
 * @returns Headers object
 */
function buildSecurityHeaders(config: SecurityConfig): Record<string, string> {
  const headers: Record<string, string> = {};
  
  // X-Frame-Options: Prevent clickjacking
  if (config.frameOptions) {
    headers['X-Frame-Options'] = 'DENY';
  }
  
  // X-Content-Type-Options: Prevent MIME-sniffing
  if (config.contentTypeOptions) {
    headers['X-Content-Type-Options'] = 'nosniff';
  }
  
  // Strict-Transport-Security: Force HTTPS (only in production)
  if (config.strictTransportSecurity && process.env.NODE_ENV === 'production') {
    headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains; preload';
  }
  
  // Content-Security-Policy: Restrict resource loading
  if (config.contentSecurityPolicy) {
    headers['Content-Security-Policy'] = buildCSP();
  }
  
  // X-XSS-Protection: Enable browser XSS filtering (legacy browsers)
  if (config.xssProtection) {
    headers['X-XSS-Protection'] = '1; mode=block';
  }
  
  // Referrer-Policy: Control referrer information
  if (config.referrerPolicy) {
    headers['Referrer-Policy'] = 'strict-origin-when-cross-origin';
  }
  
  // Permissions-Policy: Control browser features
  if (config.permissionsPolicy) {
    headers['Permissions-Policy'] = buildPermissionsPolicy();
  }
  
  return headers;
}

/**
 * Security headers middleware
 * 
 * Adds security headers to all responses.
 * Headers are applied globally to all routes (API and pages).
 * 
 * **Usage:**
 * ```typescript
 * // In middleware.ts
 * import { securityHeadersMiddleware } from '@/lib/middleware/security';
 * 
 * export function middleware(request: NextRequest) {
 *   // Apply security headers to all responses
 *   const response = NextResponse.next();
 *   return securityHeadersMiddleware(request, response);
 * }
 * ```
 * 
 * @param request - Next.js request object
 * @param response - Next.js response object (optional, creates new if not provided)
 * @returns NextResponse with security headers
 */
export function securityHeadersMiddleware(
  request: NextRequest,
  response?: NextResponse
): NextResponse {
  const config = DEFAULT_CONFIG;
  const securityHeaders = buildSecurityHeaders(config);
  
  // Create response if not provided
  const finalResponse = response || NextResponse.next();
  
  // Add security headers
  Object.entries(securityHeaders).forEach(([key, value]) => {
    finalResponse.headers.set(key, value);
  });
  
  return finalResponse;
}

/**
 * Get current security configuration (for debugging)
 */
export function getSecurityConfig(): {
  config: SecurityConfig;
  headers: Record<string, string>;
  csp: string;
  permissionsPolicy: string;
} {
  const config = DEFAULT_CONFIG;
  
  return {
    config,
    headers: buildSecurityHeaders(config),
    csp: buildCSP(),
    permissionsPolicy: buildPermissionsPolicy()
  };
}

/**
 * Apply security headers to a specific response
 * 
 * Use this in API routes when you need fine-grained control.
 * 
 * @example
 * ```typescript
 * export async function GET(request: NextRequest) {
 *   const data = await fetchData();
 *   const response = NextResponse.json(data);
 *   return applySecurityHeaders(response);
 * }
 * ```
 */
export function applySecurityHeaders(response: NextResponse): NextResponse {
  const securityHeaders = buildSecurityHeaders(DEFAULT_CONFIG);
  
  Object.entries(securityHeaders).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  
  return response;
}
