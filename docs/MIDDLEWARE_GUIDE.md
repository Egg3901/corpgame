# Middleware Configuration Guide

**Version:** 1.0  
**Last Updated:** 2025-12-31  
**Applies To:** Phase 6 Security & Performance Middleware

---

## Overview

The Corporate Game Platform uses a comprehensive middleware stack to handle cross-cutting concerns:

- **Rate Limiting:** Protect API routes from abuse and DoS attacks
- **CORS:** Control cross-origin resource sharing for API security
- **Security Headers:** Add HTTP security headers following OWASP best practices
- **Request Logging:** Log all API requests for monitoring and debugging

All middleware applies to `/api/*` routes automatically via Next.js middleware configuration.

---

## Architecture

### Middleware Execution Order

```
Incoming Request
      ↓
[1. Rate Limiting] → Check request limits, return 429 if exceeded
      ↓
[2. CORS Headers] → Validate origin, add CORS headers
      ↓
[3. Security Headers] → Add security headers (CSP, HSTS, X-Frame-Options, etc.)
      ↓
[4. Request Logging] → Log request details (method, URL, IP, user)
      ↓
API Route Handler
      ↓
Response
      ↓
[Logging] → Log response status and duration
      ↓
Client
```

**Execution Order Matters:**
1. Rate limiting first (block abusive requests early)
2. CORS next (validate origin before processing)
3. Security headers (apply to all responses)
4. Logging last (capture all request details)

### Middleware Location

```
middleware.ts                    # Root middleware (Next.js entry point)
lib/middleware/
  ├── index.ts                  # Middleware composition
  ├── rateLimit.ts              # Rate limiting logic (340 lines)
  ├── cors.ts                   # CORS handling (160 lines)
  ├── security.ts               # Security headers (200 lines)
  └── logging.ts                # Request logging (180 lines)
```

---

## Rate Limiting

### Overview

Implements **token bucket algorithm** with in-memory storage. Each IP address/user gets a bucket of tokens that refills over time.

**Default Limits:**
- Public endpoints: 100 requests/15 minutes
- Authenticated endpoints: 500 requests/15 minutes
- Sensitive endpoints (auth, admin): 20 requests/15 minutes

### Configuration

**File:** `lib/middleware/rateLimit.ts`

```typescript
const RATE_LIMITS = {
  // Public endpoints (no auth required)
  default: {
    maxRequests: 100,        // 100 requests
    windowMs: 15 * 60 * 1000, // per 15 minutes
  },
  
  // Authenticated endpoints (normal users)
  authenticated: {
    maxRequests: 500,
    windowMs: 15 * 60 * 1000,
  },
  
  // Sensitive endpoints (auth, admin)
  sensitive: {
    maxRequests: 20,
    windowMs: 15 * 60 * 1000,
  },
  
  // Admin endpoints (super users)
  admin: {
    maxRequests: 1000,
    windowMs: 15 * 60 * 1000,
  },
};
```

### Endpoint Classification

**Automatic classification by path:**

```typescript
function getRateLimitTier(pathname: string): keyof typeof RATE_LIMITS {
  // Admin routes
  if (pathname.startsWith('/api/admin')) return 'admin';
  
  // Sensitive routes (auth, password reset, etc.)
  if (pathname.match(/\/(login|register|reset-password|verify)/)) {
    return 'sensitive';
  }
  
  // Authenticated routes (check session)
  if (session?.user) return 'authenticated';
  
  // Public routes
  return 'default';
}
```

### Response Headers

Rate limit information included in every response:

```
X-RateLimit-Limit: 100           # Total requests allowed
X-RateLimit-Remaining: 87        # Requests remaining
X-RateLimit-Reset: 1672531200    # Timestamp when limit resets
```

### Error Response (429 Too Many Requests)

```json
{
  "error": "Too many requests, please try again later.",
  "retryAfter": 45,  // Seconds until retry allowed
  "limit": 100,
  "windowMs": 900000
}
```

### Custom Limits for Specific Routes

**Example: Lower limit for expensive operations**

```typescript
// In your API route
export async function POST(request: Request) {
  // Custom rate limit for this specific endpoint
  const customLimit = {
    maxRequests: 10,
    windowMs: 60 * 1000, // 10 requests per minute
  };
  
  // Rate limit check would happen in middleware
  // (implementation depends on your architecture)
}
```

### Testing Rate Limits Locally

```bash
# Test rate limit (default: 100 requests/15min)
for i in {1..105}; do
  curl http://localhost:3000/api/corporations
  sleep 0.1
done

# Should see 429 error after 100 requests:
# {"error":"Too many requests, please try again later.","retryAfter":900}
```

### Production Considerations

**Current Implementation:** In-memory storage (simple, fast, but doesn't persist)

**Limitations:**
- Resets on server restart
- Doesn't work across multiple servers (load balancing)
- No persistent tracking

**Future Enhancement:** Redis-based rate limiting

```typescript
// Future implementation with Redis
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_URL,
  token: process.env.UPSTASH_REDIS_TOKEN,
});

async function checkRateLimit(key: string, limit: number, windowMs: number) {
  const count = await redis.incr(key);
  if (count === 1) {
    await redis.expire(key, Math.ceil(windowMs / 1000));
  }
  return { count, limit, allowed: count <= limit };
}
```

---

## CORS Configuration

### Overview

Controls which origins can access API routes. Uses environment-based whitelist for security.

**Security Model:**
- Development: Allow localhost origins (3000, 3001, etc.)
- Production: Strict whitelist from environment variable
- Credentials: Allowed (for cookie-based auth)
- Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS
- Headers: Content-Type, Authorization

### Configuration

**Environment Variables:**

```bash
# .env.local (development)
NEXT_PUBLIC_APP_URL=http://localhost:3000

# .env.production
NEXT_PUBLIC_APP_URL=https://corpgame.com
CORS_ORIGINS=https://corpgame.com,https://www.corpgame.com,https://api.corpgame.com
```

**File:** `lib/middleware/cors.ts`

```typescript
// Parse allowed origins from environment
const ALLOWED_ORIGINS = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',')
  : [process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'];

function isOriginAllowed(origin: string | null): boolean {
  if (!origin) return true; // Same-origin requests
  
  // In development, allow localhost with any port
  if (process.env.NODE_ENV === 'development' && origin.includes('localhost')) {
    return true;
  }
  
  // Check against whitelist
  return ALLOWED_ORIGINS.some(allowed => 
    origin === allowed || origin.startsWith(allowed)
  );
}
```

### Response Headers

**Allowed Origin (dynamically set):**

```
Access-Control-Allow-Origin: https://corpgame.com
Access-Control-Allow-Credentials: true
Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization
Access-Control-Max-Age: 86400  # 24 hours
```

### Preflight Requests (OPTIONS)

Automatically handled by middleware:

```typescript
// Browser sends OPTIONS request before POST/PUT/DELETE
if (request.method === 'OPTIONS') {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders,
  });
}
```

### Common CORS Errors

**Error:** "No 'Access-Control-Allow-Origin' header is present"

**Cause:** Origin not in whitelist

**Solution:** Add origin to `CORS_ORIGINS` environment variable

```bash
CORS_ORIGINS=https://corpgame.com,https://staging.corpgame.com,https://new-domain.com
```

---

**Error:** "Credentials flag is true, but Access-Control-Allow-Credentials is false"

**Cause:** Browser trying to send cookies but CORS not configured

**Solution:** Ensure `credentials: 'include'` in fetch AND `Access-Control-Allow-Credentials: true` header

```typescript
// Frontend
fetch('/api/endpoint', {
  credentials: 'include', // Send cookies
});

// Backend (automatic via middleware)
headers.set('Access-Control-Allow-Credentials', 'true');
```

### Testing CORS Locally

```bash
# Test CORS from different origin
curl -H "Origin: https://malicious-site.com" \
     -H "Access-Control-Request-Method: POST" \
     -X OPTIONS \
     http://localhost:3000/api/corporations

# Should return 403 if origin not allowed

# Test with allowed origin
curl -H "Origin: http://localhost:3000" \
     -H "Access-Control-Request-Method: POST" \
     -X OPTIONS \
     http://localhost:3000/api/corporations

# Should return 204 with CORS headers
```

---

## Security Headers

### Overview

Adds HTTP security headers following **OWASP Secure Headers Project** best practices.

**Headers Applied:**
- Content Security Policy (CSP)
- X-Content-Type-Options
- X-Frame-Options
- X-XSS-Protection
- Referrer-Policy
- Permissions-Policy
- Strict-Transport-Security (HTTPS only)

### Configuration

**File:** `lib/middleware/security.ts`

```typescript
const SECURITY_HEADERS = {
  // Prevent clickjacking
  'X-Frame-Options': 'DENY',
  
  // Prevent MIME sniffing
  'X-Content-Type-Options': 'nosniff',
  
  // XSS protection (legacy, but still useful)
  'X-XSS-Protection': '1; mode=block',
  
  // Referrer policy (privacy)
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  
  // Permissions policy (restrict browser features)
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  
  // Content Security Policy (XSS protection)
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "font-src 'self' data:",
    "connect-src 'self' https://api.corpgame.com",
    "frame-ancestors 'none'",
  ].join('; '),
};

// HSTS only in production (requires HTTPS)
if (process.env.NODE_ENV === 'production') {
  SECURITY_HEADERS['Strict-Transport-Security'] = 
    'max-age=31536000; includeSubDomains; preload';
}
```

### Content Security Policy (CSP)

**Purpose:** Prevent XSS attacks by controlling which resources can load

**Current Policy:**

```
Content-Security-Policy:
  default-src 'self';                          # Only load resources from same origin
  script-src 'self' 'unsafe-eval' 'unsafe-inline';  # Allow inline scripts (Next.js requirement)
  style-src 'self' 'unsafe-inline';            # Allow inline styles (Tailwind requirement)
  img-src 'self' data: https:;                 # Allow images from anywhere (HTTPS or data URIs)
  font-src 'self' data:;                       # Allow fonts from same origin or data URIs
  connect-src 'self' https://api.corpgame.com; # API requests to self or API domain
  frame-ancestors 'none';                      # Cannot be embedded in iframes
```

**Customizing CSP:**

If you need to load resources from external domains (CDN, analytics, etc.):

```typescript
// Add to CSP in lib/middleware/security.ts
const CSP_DIRECTIVES = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://cdn.example.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' data: https://fonts.gstatic.com",
  "img-src 'self' data: https: https://cdn.example.com",
  "connect-src 'self' https://api.corpgame.com https://analytics.example.com",
];
```

### Testing Security Headers

```bash
# Check security headers
curl -I http://localhost:3000/api/corporations

# Should see:
# X-Frame-Options: DENY
# X-Content-Type-Options: nosniff
# Content-Security-Policy: default-src 'self'; ...
# etc.
```

**Online Tools:**
- [Security Headers Scanner](https://securityheaders.com/)
- [Mozilla Observatory](https://observatory.mozilla.org/)

### CSP Violations

**Error in browser console:** "Refused to load script from 'https://evil.com/script.js' because it violates CSP"

**Solution:** Intentional! CSP blocked potentially malicious script. If you need to load from that domain, add to CSP whitelist.

**Report-Only Mode (Testing):**

```typescript
// Test CSP without blocking (report violations only)
'Content-Security-Policy-Report-Only': CSP_DIRECTIVES.join('; ') + 
  '; report-uri /api/csp-report'
```

---

## Request Logging

### Overview

Logs all API requests for monitoring, debugging, and audit trail.

**Logged Information:**
- Timestamp
- HTTP method (GET, POST, etc.)
- Request path
- Client IP address
- User ID (if authenticated)
- Response status code
- Response time (milliseconds)

### Configuration

**File:** `lib/middleware/logging.ts`

```typescript
interface RequestLog {
  timestamp: string;
  method: string;
  path: string;
  ip: string | null;
  userId: string | null;
  status: number;
  duration: number; // milliseconds
}

function logRequest(log: RequestLog) {
  if (process.env.NODE_ENV === 'development') {
    // Development: Colorful console output
    console.log(
      `${log.timestamp} | ${log.method} ${log.path} | ` +
      `Status: ${log.status} | Duration: ${log.duration}ms | ` +
      `IP: ${log.ip} | User: ${log.userId || 'anonymous'}`
    );
  } else {
    // Production: JSON for log aggregation (e.g., CloudWatch, Datadog)
    console.log(JSON.stringify(log));
  }
}
```

### Log Formats

**Development (human-readable):**

```
2025-12-31T10:30:45.123Z | POST /api/corporations | Status: 201 | Duration: 145ms | IP: 127.0.0.1 | User: user_123
2025-12-31T10:30:47.456Z | GET /api/corporations/corp_456 | Status: 200 | Duration: 23ms | IP: 127.0.0.1 | User: user_123
```

**Production (JSON):**

```json
{"timestamp":"2025-12-31T10:30:45.123Z","method":"POST","path":"/api/corporations","ip":"203.0.113.42","userId":"user_123","status":201,"duration":145}
{"timestamp":"2025-12-31T10:30:47.456Z","method":"GET","path":"/api/corporations/corp_456","ip":"203.0.113.42","userId":"user_123","status":200,"duration":23}
```

### Custom Event Logging

**Log business events (not just HTTP requests):**

```typescript
// In your API route
import { logEvent } from '@/lib/middleware/logging';

export async function POST(request: Request) {
  // ... create corporation ...
  
  // Log custom business event
  logEvent({
    event: 'corporation_created',
    corporationId: corp.id,
    userId: session.user.id,
    metadata: {
      sector: corp.sector,
      initialCapital: corp.capital,
    },
  });
  
  return NextResponse.json(corp);
}
```

### Log Aggregation (Production)

**Send logs to centralized service:**

```typescript
// Future: Send to log aggregation service
import { Axiom } from '@axiomhq/js';

const axiom = new Axiom({
  token: process.env.AXIOM_TOKEN,
  dataset: process.env.AXIOM_DATASET,
});

function logRequest(log: RequestLog) {
  if (process.env.NODE_ENV === 'production') {
    // Send to Axiom (or similar service)
    axiom.ingest([log]);
  } else {
    console.log(JSON.stringify(log));
  }
}
```

**Popular log services:**
- Axiom (free tier: 500MB/month)
- Datadog (APM and logging)
- Logtail (formerly Timber)
- AWS CloudWatch Logs
- Google Cloud Logging

### Privacy Considerations

**DO NOT log:**
- Passwords (plain or hashed)
- API keys or tokens
- Credit card numbers
- Personal identifiable information (PII) unless necessary

**Redact sensitive data:**

```typescript
function sanitizeRequest(req: Request): any {
  const body = await req.json();
  
  // Redact password field
  if (body.password) {
    body.password = '[REDACTED]';
  }
  
  return body;
}
```

---

## Troubleshooting

### Issue: Rate Limiting Not Working

**Symptoms:** Can make unlimited requests without hitting 429 error

**Possible Causes:**
1. Middleware not applied to route
2. Rate limit store not initialized
3. IP address extraction failing

**Solution:**

```typescript
// Check middleware.ts
export const config = {
  matcher: '/api/:path*', // Ensure this matches your routes
};

// Check IP extraction
console.log('Client IP:', request.headers.get('x-forwarded-for'));
```

### Issue: CORS Errors in Production

**Symptoms:** "No 'Access-Control-Allow-Origin' header" error

**Possible Causes:**
1. Origin not in whitelist
2. Environment variable not set
3. Typo in origin URL

**Solution:**

```bash
# Check environment variable
echo $CORS_ORIGINS

# Verify origin matches exactly
# ❌ Wrong: https://corpgame.com/ (trailing slash)
# ✅ Right: https://corpgame.com

# Update environment variable
CORS_ORIGINS=https://corpgame.com,https://www.corpgame.com
```

### Issue: CSP Blocking Resources

**Symptoms:** Browser console shows "Refused to load..." errors

**Possible Causes:**
1. External resource not in CSP whitelist
2. Inline script/style without 'unsafe-inline'
3. Data URI not allowed

**Solution:**

```typescript
// Add domain to CSP
"script-src 'self' 'unsafe-eval' 'unsafe-inline' https://trusted-cdn.com",
"img-src 'self' data: https: https://trusted-images.com",

// Or use nonce-based CSP (more secure)
const nonce = crypto.randomUUID();
response.headers.set(
  'Content-Security-Policy',
  `script-src 'self' 'nonce-${nonce}'`
);
```

### Issue: Logs Not Appearing

**Symptoms:** Console empty, no logs visible

**Possible Causes:**
1. Console log level too high
2. Next.js swallowing logs
3. Production environment not outputting to console

**Solution:**

```bash
# Development: Check console log level
# Production: Check log aggregation service

# Force log output
console.error('Force log:', logData); # Always visible

# Check Next.js output
next build --debug
```

---

## Production Deployment

### Environment Variables Checklist

**Required for production:**

```bash
# CORS Configuration
CORS_ORIGINS=https://corpgame.com,https://www.corpgame.com

# Application URL
NEXT_PUBLIC_APP_URL=https://corpgame.com

# Optional: Custom rate limits
RATE_LIMIT_MAX_REQUESTS=500
RATE_LIMIT_WINDOW_MS=900000

# Optional: Log aggregation
AXIOM_TOKEN=your_token_here
AXIOM_DATASET=corpgame-production

# Optional: Redis for distributed rate limiting
UPSTASH_REDIS_URL=https://your-redis.upstash.io
UPSTASH_REDIS_TOKEN=your_token_here
```

### Verification Steps

1. **Test rate limiting:**
   ```bash
   for i in {1..105}; do curl https://corpgame.com/api/corporations; done
   ```

2. **Test CORS:**
   ```bash
   curl -H "Origin: https://corpgame.com" \
        -H "Access-Control-Request-Method: POST" \
        -X OPTIONS \
        https://corpgame.com/api/corporations
   ```

3. **Check security headers:**
   ```bash
   curl -I https://corpgame.com/api/corporations
   ```

4. **Verify logging:**
   - Check log aggregation dashboard
   - Confirm requests appearing in real-time

### Monitoring

**Key Metrics:**
- Rate limit hit rate (% of requests rate limited)
- CORS rejection rate (% of requests blocked by CORS)
- Average request duration
- Error rate (% of 4xx/5xx responses)

**Alerts to Set:**
- Rate limit hit rate > 5% (possible attack)
- Error rate > 1% (application issues)
- Average duration > 500ms (performance degradation)

---

## Migration Guide

### From No Middleware (v1.0) to Middleware Stack (v2.0)

**Steps:**

1. **Install middleware files:**
   ```bash
   # Copy middleware files to project
   cp -r lib/middleware /your-project/lib/
   cp middleware.ts /your-project/
   ```

2. **Set environment variables:**
   ```bash
   echo "CORS_ORIGINS=http://localhost:3000" >> .env.local
   ```

3. **Test locally:**
   ```bash
   npm run dev
   # Make API requests, verify headers and rate limiting
   ```

4. **Deploy to production:**
   ```bash
   # Set production environment variables
   vercel env add CORS_ORIGINS production
   
   # Deploy
   git push origin main
   ```

5. **Verify production:**
   - Test rate limiting
   - Check security headers (securityheaders.com)
   - Verify CORS with frontend domain

---

## Examples

### Example 1: Custom Rate Limit for Expensive Endpoint

```typescript
// app/api/analytics/generate-report/route.ts
import { NextResponse } from 'next/server';

// This endpoint generates large reports (expensive operation)
// We want stricter rate limiting: 5 requests per hour

export async function POST(request: Request) {
  // Note: Custom rate limits would be configured in middleware
  // For now, rate limiting happens automatically via middleware
  
  const report = await generateExpensiveReport();
  
  return NextResponse.json(report);
}

// In middleware.ts, add custom handling:
if (pathname === '/api/analytics/generate-report') {
  return applyRateLimit(request, {
    maxRequests: 5,
    windowMs: 60 * 60 * 1000, // 1 hour
  });
}
```

### Example 2: Adding New Allowed Origin

```bash
# Add new subdomain to allowed origins
# Old: CORS_ORIGINS=https://corpgame.com
# New: CORS_ORIGINS=https://corpgame.com,https://staging.corpgame.com

# Update environment variable (Vercel)
vercel env add CORS_ORIGINS production

# Enter value: https://corpgame.com,https://staging.corpgame.com

# Redeploy
vercel --prod
```

### Example 3: Whitelisting CDN in CSP

```typescript
// lib/middleware/security.ts

// Add CDN to CSP
const CSP_DIRECTIVES = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://cdn.jsdelivr.net", // Added CDN
  "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net", // Added CDN
  "img-src 'self' data: https: https://cdn.jsdelivr.net", // Added CDN
  "font-src 'self' data: https://cdn.jsdelivr.net", // Added CDN
  "connect-src 'self' https://api.corpgame.com",
  "frame-ancestors 'none'",
];
```

---

## FAQ

**Q: How do I disable rate limiting for testing?**

A: Set high limits or add IP whitelist in development:

```typescript
// lib/middleware/rateLimit.ts
if (process.env.NODE_ENV === 'development') {
  return; // Skip rate limiting in development
}
```

**Q: Can I use different rate limits for different users?**

A: Yes, classify by user role:

```typescript
function getRateLimitTier(session: Session | null): keyof typeof RATE_LIMITS {
  if (session?.user?.role === 'admin') return 'admin';
  if (session?.user?.role === 'premium') return 'authenticated';
  if (session?.user) return 'authenticated';
  return 'default';
}
```

**Q: How do I whitelist specific IPs from rate limiting?**

A: Add IP whitelist check:

```typescript
const WHITELISTED_IPS = ['203.0.113.42', '203.0.113.43'];

if (WHITELISTED_IPS.includes(clientIp)) {
  return; // Skip rate limiting
}
```

**Q: Does middleware work with serverless (Vercel)?**

A: Yes! Next.js middleware runs on Edge Runtime (globally distributed, low latency).

**Q: How do I test middleware locally?**

A: Run `npm run dev` and use curl or Postman to make requests. Check response headers and console logs.

---

## Related Documentation

- [Phase 6 Completion Report](./COMPLETION_REPORT_PHASE_6_20251231.md)
- [Security Best Practices](./SECURITY.md)
- [API Documentation](./API_OVERVIEW.md)
- [OWASP Secure Headers Project](https://owasp.org/www-project-secure-headers/)

---

**Document Version:** 1.0  
**Created:** 2025-12-31  
**Author:** Backend Team  
**Status:** Production-ready documentation
