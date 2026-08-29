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
 * `next dev`'s webpack Hot Module Replacement / Fast Refresh runtime
 * wraps every module in an `eval(...)` call (its `eval-source-map`
 * devtool) — completely standard webpack dev-server behavior, and
 * unrelated to anything this app's code does. Without 'unsafe-eval' in
 * script-src, the browser silently refuses to run ANY client JS under
 * `next dev` (confirmed via a live browser's own console:
 * "Refused to evaluate a string as JavaScript because 'unsafe-eval' is
 * not an allowed source of script..."), which blocks hydration just as
 * completely as the missing-nonce bug this file originally fixed — the
 * user-visible result is identical: a page stuck on "Loading…" and zero
 * requests ever reaching the API. `next build`/`next start` (and any
 * real deployment) never use eval-based module wrapping, so
 * 'unsafe-eval' is added ONLY when NODE_ENV !== 'production' — the
 * production CSP served to real users is exactly as strict as before.
 * Related: next.config.js, docs/SECURITY.md "Transport & headers".
 */
import { NextResponse, type NextRequest } from 'next/server';
import { DEFAULT_API_BASE_URL } from './lib/api-client';

/**
 * CSP's connect-src matches by origin (scheme+host+port); a source with a path (e.g.
 * "http://192.168.1.8:3001/v1") is treated as an exact-path allowance, not a prefix, so it does
 * NOT match a request to ".../v1/public/tags/...". Strip NEXT_PUBLIC_API_BASE_URL down to just
 * its origin here so the actual API calls (which always include the "/v1/..." path) are allowed.
 * Falls back to DEFAULT_API_BASE_URL — the exact same fallback lib/api-client.ts's
 * resolveApiBaseUrl() uses — when the env var is unset, rather than an empty string: a real bug
 * this caught in testing was NEXT_PUBLIC_API_BASE_URL being unset entirely (no .env.local at
 * all), where the client bundle still falls back to a concrete default (http://localhost:3001)
 * and genuinely tries to fetch it, but this function used to return '' for the same "unset"
 * case — producing a CSP with no API origin allowed at all, and the browser blocking the
 * client's own default-configuration fetch attempt with a CSP violation on `connect-src`. The
 * client and the CSP must never resolve "unset" to two different answers.
 * Pure (takes the raw value as an argument) so it's unit-testable without touching process.env.
 */
export function apiOriginForCsp(rawApiBaseUrl: string | undefined): string {
  const raw = rawApiBaseUrl?.trim();
  try {
    return new URL(raw && raw.length > 0 ? raw : DEFAULT_API_BASE_URL).origin;
  } catch {
    return new URL(DEFAULT_API_BASE_URL).origin;
  }
}

/**
 * Pure so it's unit-testable without a real NextRequest/middleware invocation. `isDevelopment`
 * gates 'unsafe-eval' — required for `next dev`'s webpack HMR/Fast Refresh runtime, never added
 * for a production build (see the file header for why).
 */
export function buildCspHeader(nonce: string, apiOrigin: string, isDevelopment: boolean): string {
  const scriptSrc = isDevelopment
    ? `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' 'unsafe-eval'`
    : `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`;
  return [
    `default-src 'self'`,
    scriptSrc,
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
  const cspHeader = buildCspHeader(
    nonce,
    apiOriginForCsp(process.env.NEXT_PUBLIC_API_BASE_URL),
    process.env.NODE_ENV !== 'production',
  );

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
