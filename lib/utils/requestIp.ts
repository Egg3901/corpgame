import { NextRequest } from 'next/server';

/**
 * Normalize IP address
 * Removes IPv6 prefix and trims whitespace
 */
const normalizeIp = (ip: string): string => {
  return (ip || '').trim().replace(/^::ffff:/, '');
};

/**
 * Extracts the client IP address from a Next.js request
 * 
 * Supports multiple proxy configurations and header formats commonly
 * used in production environments (Vercel, Cloudflare, nginx, etc.)
 * 
 * **Header Priority:**
 * 1. `x-forwarded-for` - Standard proxy header (returns first IP in chain)
 * 2. `x-real-ip` - Alternative proxy header
 * 3. Fallback: '0.0.0.0' (Edge Runtime limitation)
 * 
 * @param request - Next.js request object (NextRequest)
 * @returns Normalized client IP address
 * 
 * @example
 * ```typescript
 * import { getClientIp } from '@/lib/utils/requestIp';
 * 
 * export async function POST(request: NextRequest) {
 *   const clientIp = getClientIp(request);
 *   console.log(`Request from: ${clientIp}`);
 *   
 *   // Check if IP is banned
 *   if (await BannedIpModel.isIpBanned(clientIp)) {
 *     return NextResponse.json({ error: 'IP banned' }, { status: 403 });
 *   }
 * }
 * ```
 * 
 * @remarks
 * - Next.js Edge Runtime does not expose socket/connection information
 * - x-forwarded-for can contain multiple IPs (comma-separated), we use the first (client IP)
 * - IP normalization handles IPv6 formats (::ffff:127.0.0.1 → 127.0.0.1)
 * - Returns '0.0.0.0' when no IP can be determined (e.g., server-side rendering)
 */
export const getClientIp = (request: NextRequest): string => {
  // Priority 1: x-forwarded-for (standard proxy header)
  // Format: "client, proxy1, proxy2" - we want the first IP (client)
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    const clientIp = forwarded.split(',')[0].trim();
    return normalizeIp(clientIp);
  }
  
  // Priority 2: x-real-ip (alternative proxy header)
  const realIp = request.headers.get('x-real-ip');
  if (realIp) {
    return normalizeIp(realIp.trim());
  }
  
  // Fallback: '0.0.0.0'
  // Note: Next.js Edge Runtime does not expose socket/connection info
  // In production behind a proxy, headers should always be available
  return normalizeIp('0.0.0.0');
};
