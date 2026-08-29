/**
 * Purpose: Generates a per-request CSP nonce and applies the portal's
 * Content-Security-Policy header.
 * Responsibilities: Next.js's App Router streams server-rendered data to
 * the client via inline <script> tags (RSC payload + hydration
 * bootstrap) — this is not optional and not something app code controls.
 * A CSP with `script-src 'self'` and no nonce/`unsafe-inline` blocks
 * every one of those tags, which silently breaks hydration: the page
 * never becomes interactive, `useEffect` never runs, and the browser
 * never even attempts the tag-lookup API call — indistinguishable from
 * the outside from "the portal isn't calling the API at all". A static
 * CSP declared in next.config.js's headers() cannot carry a per-request
 * nonce, which is why this lives in middleware instead.
 * Security: Uses the documented Next.js nonce + 'strict-dynamic' pattern
 * (https://nextjs.org/docs/app/building-your-application/configuring/content-security-policy)
 * rather than adding 'unsafe-inline' — the CSP stays exactly as strict
 * (no blanket inline-script allowance), it just trusts the specific,
 * randomly-generated-per-request scripts Next.js itself needs to emit.
 * connect-src still allow-lists only 'self' plus the configured API
 * origin, so this makes no other endpoint reachable than before.
 * Related: next.config.js, docs/SECURITY.md "Transport & headers".
 */
import { NextResponse, type NextRequest } from 'next/server';

/**
 * CSP's connect-src matches by origin (scheme+host+port); a source with a path (e.g.
 * "http://192.168.1.8:3001/v1") is treated as an exact-path allowance, not a prefix, so it does
 * NOT match a request to ".../v1/public/tags/...". Strip NEXT_PUBLIC_API_BASE_URL down to just
 * its origin here so the actual API calls (which always include the "/v1/..." path) are allowed.
 * Pure (takes the raw value as an argument) so it's unit-testable without touching process.env.
 */
export function apiOriginForCsp(rawApiBaseUrl: string | undefined): string {
  if (!rawApiBaseUrl) return '';
  try {
    return new URL(rawApiBaseUrl).origin;
  } catch {
    return '';
  }
}

/** Pure so it's unit-testable without a real NextRequest/middleware invocation. */
export function buildCspHeader(nonce: string, apiOrigin: string): string {
  return [
    `default-src 'self'`,
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`,
    `style-src 'self' 'unsafe-inline'`,
    `img-src 'self' data:`,
    `connect-src 'self' ${apiOrigin}`.trim(),
    `base-uri 'self'`,
    `form-action 'self'`,
    `frame-ancestors 'none'`,
  ].join('; ');
}

export function middleware(request: NextRequest) {
  const nonce = crypto.randomUUID();
  const cspHeader = buildCspHeader(nonce, apiOriginForCsp(process.env.NEXT_PUBLIC_API_BASE_URL));

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce', nonce);
  requestHeaders.set('Content-Security-Policy', cspHeader);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set('Content-Security-Policy', cspHeader);
  return response;
}

export const config = {
  matcher: [
    // Every route except static assets and image optimization output, matching Next's own
    // documented example for this pattern.
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
