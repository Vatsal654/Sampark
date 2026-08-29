/**
 * Purpose: Thin fetch wrapper for the scanner portal's calls to the
 * public `/public/tags/*` API surface.
 * Responsibilities: Centralizes the base URL and JSON handling so no
 * component builds a fetch URL by hand.
 * Security: Never attaches credentials/cookies (`credentials: 'omit'`) —
 * this portal has no session concept; every request is either
 * unauthenticated or carries an explicit short-lived token in its body.
 * Development: NEXT_PUBLIC_API_BASE_URL must point at wherever the
 * browser making the request can actually reach the API. The default,
 * http://localhost:3001/v1, is only correct when that browser runs on
 * the same machine as the API (a desktop browser, an emulator). A
 * physical device on the LAN resolves "localhost" as itself, not the
 * developer's computer — set NEXT_PUBLIC_API_BASE_URL to the developer's
 * LAN IP instead, e.g. http://192.168.1.8:3001/v1, in .env.local. Next.js
 * inlines NEXT_PUBLIC_* variables into the client bundle at dev-server
 * *start* time, not on every request, so changing .env.local requires
 * restarting `next dev` — a browser refresh alone keeps serving the old
 * value. See docs/LOCAL_DEVELOPMENT.md "Testing on a physical device".
 * Related: docs/API.md, services/api public-tag module.
 */
/** Also imported by middleware.ts, so the CSP's connect-src and the client's actual fetch target
 * can never silently disagree about what "unset" resolves to — see that file's header comment. */
export const DEFAULT_API_BASE_URL = 'http://localhost:3001/v1';

/**
 * Pure so it's unit-testable without mutating process.env. Takes the already-read value as a
 * plain argument rather than reading `process.env.NEXT_PUBLIC_API_BASE_URL` itself — Next.js
 * inlines that exact member expression into a string literal at build time via static text
 * substitution, which only fires where the expression appears literally in the source. Reading it
 * indirectly (e.g. through an object parameter defaulted from `process.env`) does NOT get
 * inlined, and silently resolves to `undefined` in the client bundle regardless of what
 * NEXT_PUBLIC_API_BASE_URL was set to — so the literal expression below, at the one call site, is
 * load-bearing and must stay as-is.
 */
export function resolveApiBaseUrl(configuredValue: string | undefined): string {
  const raw = configuredValue?.trim();
  return raw && raw.length > 0 ? raw : DEFAULT_API_BASE_URL;
}

/** Exported (read-only) purely for on-page diagnostics — see components/DevDiagnostics.tsx —
 * never mutated after this module loads. */
export const API_BASE_URL = resolveApiBaseUrl(process.env.NEXT_PUBLIC_API_BASE_URL);

/**
 * Returns a developer-facing troubleshooting hint for a fetch that has already failed (this is
 * only ever called from inside request()'s catch block, never speculatively) — so even when the
 * configuration looks correct at a glance, something is still genuinely wrong and staying silent
 * would be the wrong call. Always returns a hint, tailored to what it can tell from the URLs
 * alone:
 *
 * - The confident case: the page was opened via a non-loopback host (a physical phone on the
 *   LAN) but the API base URL is still a loopback address, which on that phone refers to the
 *   phone itself, not the developer's computer.
 * - The general case (everything else, malformed API base URL included): the browser's fetch()
 *   deliberately reports a network failure and a CORS rejection identically — a `TypeError:
 *   Failed to fetch` with no further detail, for security reasons no application code can see
 *   around. A same-origin desktop setup only ever hits the first kind (the target is genuinely
 *   down); LAN/physical-device testing very commonly hits the second: NEXT_PUBLIC_API_BASE_URL
 *   and the page's own origin can both look perfectly correct while the API's
 *   CORS_ALLOWED_ORIGINS simply hasn't been updated to include this page's origin, which the
 *   browser then blocks with no server-side trace at all (NestJS logs no access log for a
 *   rejected/any other preflight by default) — indistinguishable, from here, from the API being
 *   unreachable outright. So this hint names both possibilities every time, rather than guessing.
 *
 * Pure and side-effect free so it's unit-testable on its own.
 */
export function unreachableApiHint(apiBaseUrl: string, pageHostname: string): string {
  const isLoopback = (host: string) => host === 'localhost' || host === '127.0.0.1' || host === '::1';
  let apiHost: string | null;
  try {
    apiHost = new URL(apiBaseUrl).hostname;
  } catch {
    apiHost = null;
  }

  if (apiHost && isLoopback(apiHost) && !isLoopback(pageHostname)) {
    return (
      `This page was loaded from "${pageHostname}", but the API base URL is still "${apiBaseUrl}" — ` +
      `"localhost" refers to this device, not your computer. Set NEXT_PUBLIC_API_BASE_URL to your ` +
      `computer's LAN IP (e.g. http://192.168.1.8:3001/v1) in apps/scanner-portal/.env.local and ` +
      `restart the dev server — env vars are inlined at server start, not read live.`
    );
  }

  return (
    `Could not reach "${apiBaseUrl}" from a page loaded at "${pageHostname}". The browser reports ` +
    `network failures and CORS rejections identically, so this could be either: (1) the API isn't ` +
    `actually reachable at that address from this device, or (2) — very common when testing from a ` +
    `LAN device — the API's CORS_ALLOWED_ORIGINS doesn't include this page's exact origin yet, which ` +
    `the browser blocks silently with no error on the API's own terminal. Check both: ` +
    `NEXT_PUBLIC_API_BASE_URL in apps/scanner-portal/.env.local, and CORS_ALLOWED_ORIGINS in ` +
    `services/api/.env (add this page's origin, e.g. http://${pageHostname}:3000, and restart the ` +
    `API). See docs/LOCAL_DEVELOPMENT.md "Testing on a physical device".`
  );
}

/**
 * A coarse classification of why a request failed, distinct from the raw HTTP status — this is
 * what UI code should branch on, never a raw `status` number, so that "the server said no" (404,
 * a routine/expected outcome for an invalid or expired link), "the server is broken" (5xx), and
 * "the request never reached any server at all" (network failure, CORS rejection, DNS failure —
 * all reported identically by fetch(), by browser design) are never silently collapsed into one
 * generic message. Collapsing them is exactly what made a real, live bug (a CORS_ALLOWED_ORIGINS
 * gap) look identical to a routine "this link is invalid" outcome.
 */
export type ApiErrorKind = 'not_found' | 'unauthorized' | 'server_error' | 'network_error';

function classifyStatus(status: number): ApiErrorKind {
  if (status === 404) return 'not_found';
  if (status === 401 || status === 403) return 'unauthorized';
  return 'server_error';
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly kind: ApiErrorKind,
  ) {
    super(message);
  }
}

/** Builds the exact path (relative to API_BASE_URL) the public tag lookup calls — a single
 * source of truth so a diagnostics display can show precisely the URL a request actually used,
 * without duplicating the query-encoding logic. */
export function buildPublicTagPath(opaqueId: string, signature: string): string {
  return `/public/tags/${opaqueId}?sig=${encodeURIComponent(signature)}`;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const url = `${API_BASE_URL}${path}`;
  let response: Response;
  try {
    response = await fetch(url, {
      ...init,
      credentials: 'omit',
      headers: { 'content-type': 'application/json', ...(init?.headers ?? {}) },
    });
  } catch (err) {
    // The request never reached any server — most commonly a physical device trying to reach
    // "localhost" (itself), or a CORS rejection (which fetch() reports identically to a genuine
    // network failure, by browser design — see unreachableApiHint()). Logged only in development;
    // never includes response contents, since there is none here. The opaqueId/signature in `url`
    // are already visible in this page's own address bar, so logging them to this browser's own
    // console discloses nothing new.
    if (process.env.NODE_ENV !== 'production') {
      console.error(`[Sampark scanner] Request to ${url} failed before reaching the server.`, err);
      if (typeof window !== 'undefined') {
        console.warn(`[Sampark scanner] ${unreachableApiHint(API_BASE_URL, window.location.hostname)}`);
      }
    }
    const message = err instanceof Error ? err.message : 'Network request failed';
    throw new ApiError(0, message, 'network_error');
  }
  if (!response.ok) {
    let message = `Request failed with status ${response.status}`;
    try {
      const body = (await response.json()) as { message?: string };
      if (body?.message) message = body.message;
    } catch {
      // Non-JSON error body — keep the generic message.
    }
    // A 404 is an expected, routine outcome (an invalid/expired link) — not logged. Anything else
    // (5xx, a rejected CORS preflight surfaced as a non-ok response, etc.) is worth a developer's
    // attention. Never logs `body` beyond the already-safe `message` field extracted above.
    if (process.env.NODE_ENV !== 'production' && response.status !== 404) {
      console.error(`[Sampark scanner] ${url} -> ${response.status}: ${message}`);
    }
    throw new ApiError(response.status, message, classifyStatus(response.status));
  }
  try {
    return (await response.json()) as T;
  } catch (err) {
    if (process.env.NODE_ENV !== 'production') {
      console.error(`[Sampark scanner] ${url} returned a 2xx with an unparseable body.`, err);
    }
    throw new ApiError(response.status, 'Response body was not valid JSON', 'server_error');
  }
}

export function getTag(opaqueId: string, signature: string) {
  return request<{
    opaqueId: string;
    status: string;
    vehicleDisplayLabel: string | null;
    vehicleCategory: string | null;
    callbackEnabled: boolean;
    emergencyEnabled: boolean;
  }>(buildPublicTagPath(opaqueId, signature));
}

/** Builds the exact path (relative to API_BASE_URL) alert submission calls — mirrors
 * buildPublicTagPath so a diagnostics display can show precisely the URL a request actually
 * used, without duplicating the query-encoding logic. */
export function buildAlertPath(opaqueId: string, signature: string): string {
  return `/public/tags/${opaqueId}/alerts?sig=${encodeURIComponent(signature)}`;
}

export function submitAlert(
  opaqueId: string,
  signature: string,
  body: { category: string; note?: string; location?: { latitude: number; longitude: number } },
) {
  return request<{ alertId: string; acknowledged: true }>(buildAlertPath(opaqueId, signature), {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function submitEmergency(
  opaqueId: string,
  signature: string,
  body: { note?: string; location?: { latitude: number; longitude: number }; confirmedEmergency: true },
) {
  return request<{ alertId: string; acknowledged: true }>(`/public/tags/${opaqueId}/emergency?sig=${encodeURIComponent(signature)}`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function reportTag(opaqueId: string, signature: string, body: { reason: string; note?: string }) {
  return request<{ received: true }>(`/public/tags/${opaqueId}/report?sig=${encodeURIComponent(signature)}`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function requestCallOtp(opaqueId: string, signature: string, phoneE164: string) {
  return request<{ sent: true; retryAfterSeconds: number }>(`/public/tags/${opaqueId}/call/otp?sig=${encodeURIComponent(signature)}`, {
    method: 'POST',
    body: JSON.stringify({ phoneE164 }),
  });
}

export function verifyCallOtp(opaqueId: string, signature: string, phoneE164: string, code: string) {
  return request<{ scanSessionToken: string; expiresAt: string }>(`/public/tags/${opaqueId}/call/verify?sig=${encodeURIComponent(signature)}`, {
    method: 'POST',
    body: JSON.stringify({ phoneE164, code }),
  });
}

export function requestMaskedCall(opaqueId: string, signature: string, scanSessionToken: string) {
  return request<{ callSessionId: string; status: string; expiresAt: string }>(`/public/tags/${opaqueId}/call/request?sig=${encodeURIComponent(signature)}`, {
    method: 'POST',
    body: JSON.stringify({ scanSessionToken, consentToConnect: true }),
  });
}
