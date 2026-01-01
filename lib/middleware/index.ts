/**
 * Middleware Barrel Exports
 * 
 * Central export point for all middleware functions.
 * Simplifies imports across the application.
 * 
 * **Available Middleware:**
 * - rateLimitMiddleware: Rate limiting with token bucket algorithm
 * - corsMiddleware: CORS configuration with origin whitelist
 * - securityHeadersMiddleware: Security headers (helmet.js equivalent)
 * - loggingMiddleware: Request logging and audit trail
 * 
 * **Usage:**
 * ```typescript
 * import { 
 *   rateLimitMiddleware, 
 *   corsMiddleware, 
 *   securityHeadersMiddleware 
 * } from '@/lib/middleware';
 * ```
 * 
 * Created: 2025-12-31
 * Phase: 6.5 - Middleware Integration
 */

// Rate Limiting
export {
  rateLimitMiddleware,
  getRateLimitStatus,
  clearRateLimits
} from './rateLimit';

// CORS
export {
  corsMiddleware,
  getCorsConfig,
  checkOrigin
} from './cors';

// Security Headers
export {
  securityHeadersMiddleware,
  getSecurityConfig,
  applySecurityHeaders
} from './security';

// Request Logging
export {
  loggingMiddleware,
  logEvent,
  logError,
  getLoggingConfig
} from './logging';
