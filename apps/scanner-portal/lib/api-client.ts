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
const DEFAULT_API_BASE_URL = 'http://localhost:3001/v1';

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

const API_BASE_URL = resolveApiBaseUrl(process.env.NEXT_PUBLIC_API_BASE_URL);

/**
 * Returns a developer-facing hint when the API base URL looks unreachable from the device that
 * loaded this page — specifically the exact failure this exists to catch: the page was opened
 * via a LAN IP (a physical phone) but the API base URL is still a loopback address, which on that
 * phone refers to the phone itself. Returns null when there's nothing suspicious to report (both
 * loopback — normal same-machine dev; API already non-loopback — correctly configured; or a
 * malformed API base URL, which is reported elsewhere). Pure and side-effect free so it's
 * unit-testable on its own.
 */
export function unreachableApiHint(apiBaseUrl: string, pageHostname: string): string | null {
  const isLoopback = (host: string) => host === 'localhost' || host === '127.0.0.1' || host === '::1';
  let apiHost: string;
  try {
    apiHost = new URL(apiBaseUrl).hostname;
  } catch {
    return null;
  }
  if (!isLoopback(apiHost) || isLoopback(pageHostname)) return null;
  return (
    `This page was loaded from "${pageHostname}", but the API base URL is still "${apiBaseUrl}" — ` +
    `"localhost" refers to this device, not your computer. Set NEXT_PUBLIC_API_BASE_URL to your ` +
    `computer's LAN IP (e.g. http://192.168.1.8:3001/v1) in apps/scanner-portal/.env.local and ` +
    `restart the dev server — env vars are inlined at server start, not read live.`
  );
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
  }
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
    // "localhost" (itself). Logged only in development; never includes response contents, since
    // there is none here. The opaqueId/signature in `url` are already visible in this page's own
    // address bar, so logging them to this browser's own console discloses nothing new.
    if (process.env.NODE_ENV !== 'production') {
      console.error(`[Sampark scanner] Request to ${url} failed before reaching the server.`, err);
      if (typeof window !== 'undefined') {
        const hint = unreachableApiHint(API_BASE_URL, window.location.hostname);
        if (hint) console.warn(`[Sampark scanner] ${hint}`);
      }
    }
    throw new ApiError(0, 'Could not reach the Sampark API');
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
    throw new ApiError(response.status, message);
  }
  return (await response.json()) as T;
}

export function getTag(opaqueId: string, signature: string) {
  return request<{
    opaqueId: string;
    status: string;
    vehicleDisplayLabel: string | null;
    vehicleCategory: string | null;
    callbackEnabled: boolean;
    emergencyEnabled: boolean;
  }>(`/public/tags/${opaqueId}?sig=${encodeURIComponent(signature)}`);
}

export function submitAlert(
  opaqueId: string,
  signature: string,
  body: { category: string; note?: string; location?: { latitude: number; longitude: number } },
) {
  return request<{ alertId: string; acknowledged: true }>(`/public/tags/${opaqueId}/alerts?sig=${encodeURIComponent(signature)}`, {
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
