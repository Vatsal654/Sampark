/**
 * Purpose: Location-capture logic for the "Share my location" option in
 * AlertFlow.tsx, kept pure/injectable so it's unit-testable without a
 * real browser Geolocation API — see components/AlertFlow.tsx for how
 * this is wired to the actual checkbox and submit flow.
 * Security/Privacy: Capture is only ever initiated by an explicit user
 * toggle (never on page load or tag lookup) — see AlertFlow.tsx, which
 * calls captureLocation() solely from its checkbox's onChange handler.
 * A denied/unavailable/insecure-context result must never be silently
 * treated as "shared" — every LocationCaptureState other than 'ready'
 * must render user-visible copy explaining the alert will be sent
 * without location, never a false claim that it was shared.
 * Related: components/AlertFlow.tsx, docs/LOCAL_DEVELOPMENT.md
 * "Location sharing and secure contexts".
 */

export type LocationUnavailableReason =
  | 'insecure_context'
  | 'unsupported'
  | 'permission_denied'
  | 'position_unavailable'
  | 'timeout';

export type LocationCaptureState =
  | { status: 'idle' }
  | { status: 'requesting' }
  | { status: 'ready'; location: { latitude: number; longitude: number } }
  | { status: 'unavailable'; reason: LocationUnavailableReason };

/**
 * The Geolocation API is restricted by every major browser (including iOS Safari) to secure
 * contexts: pages served over https://, plus the special-cased localhost/127.0.0.1/::1 loopback
 * origins. A page loaded over plain http:// from a LAN IP address (e.g.
 * http://192.168.1.8:3000 — exactly the physical-device testing setup this app documents in
 * docs/LOCAL_DEVELOPMENT.md) is NOT a secure context: calling getCurrentPosition() there fails
 * silently or via the error callback, and critically, the browser never shows its native
 * permission prompt at all. This is a browser platform restriction, not something any amount of
 * application code can work around — the fix is serving over HTTPS (or testing from
 * localhost/an emulator instead of a LAN IP). Checking this before even attempting
 * getCurrentPosition lets the UI say so immediately and accurately, rather than silently
 * swallowing an error that isn't actually "permission denied".
 * Takes `win` as a parameter (rather than reading `window` directly) so it's testable without a
 * real browser, matching this codebase's established pattern (see resolveApiBaseUrl in
 * api-client.ts).
 */
export function isSecureContextForGeolocation(win: { isSecureContext?: boolean } | undefined): boolean {
  return win?.isSecureContext === true;
}

/** Minimal subset of the DOM Geolocation interface this module needs — lets tests inject a fake
 * implementation instead of depending on a real browser's navigator.geolocation. */
export interface GeolocationLike {
  getCurrentPosition(
    onSuccess: (position: { coords: { latitude: number; longitude: number } }) => void,
    onError: (error: { code: number; message: string }) => void,
    options?: { enableHighAccuracy?: boolean; timeout?: number; maximumAge?: number },
  ): void;
}

/** GeolocationPositionError codes per the spec: 1 = PERMISSION_DENIED, 2 = POSITION_UNAVAILABLE,
 * 3 = TIMEOUT. Any other/unrecognized code is treated as position_unavailable rather than
 * silently defaulting to a misleading "denied" — the two have very different, user-relevant
 * meanings (permission_denied is actionable via device Settings; position_unavailable usually
 * isn't). */
export function mapGeolocationErrorCode(code: number): LocationUnavailableReason {
  if (code === 1) return 'permission_denied';
  if (code === 3) return 'timeout';
  return 'position_unavailable';
}

/**
 * Requests the current position exactly once, resolving to a LocationCaptureState rather than
 * throwing — the caller (AlertFlow.tsx) always has a concrete state to render, never an unhandled
 * rejection. Never called except in direct response to the user checking "Share my location" —
 * see AlertFlow.tsx's onChange handler, which is the only call site.
 *
 * The `timeout: 8000` option below asks getCurrentPosition() to give up after 8s, but that option
 * only bounds the time spent acquiring a fix — it does NOT reliably bound how long the browser
 * waits on an unresolved permission decision first (confirmed empirically against this app's own
 * Playwright suite: a left-open/never-answered permission prompt can leave getCurrentPosition()
 * never calling either callback at all, indefinitely). Without a hard backstop here, that would
 * leave AlertFlow.tsx's "requesting" state — and its disabled Send button — stuck forever. The
 * race below guarantees a concrete result within ~8.5s no matter what the browser itself does.
 */
export function captureLocation(geolocation: GeolocationLike): Promise<LocationCaptureState> {
  let timeoutId: ReturnType<typeof setTimeout>;
  const request = new Promise<LocationCaptureState>((resolve) => {
    geolocation.getCurrentPosition(
      (position) =>
        resolve({
          status: 'ready',
          location: { latitude: position.coords.latitude, longitude: position.coords.longitude },
        }),
      (error) => resolve({ status: 'unavailable', reason: mapGeolocationErrorCode(error.code) }),
      { timeout: 8000, maximumAge: 0 },
    );
  });
  const hardTimeout = new Promise<LocationCaptureState>((resolve) => {
    timeoutId = setTimeout(() => resolve({ status: 'unavailable', reason: 'timeout' }), 8500);
  });
  // Whichever settles first, clear the backstop timer so it never fires (or keeps a Node/test
  // process alive) after the real result is already known.
  return Promise.race([request, hardTimeout]).finally(() => clearTimeout(timeoutId));
}
