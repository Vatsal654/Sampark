/**
 * Purpose: Regression coverage for the reported bug "I enabled Share my
 * location but the scanner never asked for permission and the owner
 * never saw a location" — exercises the real "Share my location"
 * checkbox → navigator.geolocation → POST body chain with a real
 * browser, Playwright's geolocation permission/coordinate mocking, and
 * a real HTTP server that records what the POST actually contained.
 * Caveat: Chromium, not Safari/iOS — see playwright.location.config.ts's
 * header comment. The most likely real root cause on a physical iPhone
 * testing over http://192.168.1.8:3000 is the browser's secure-context
 * restriction on the Geolocation API (see lib/geolocation.ts's
 * isSecureContextForGeolocation doc comment) — that specific case is
 * covered by lib/geolocation.spec.ts's pure unit tests instead, since
 * both localhost and 127.0.0.1 count as secure contexts to Chromium
 * (so this Playwright suite can't reproduce an insecure context without
 * a real non-loopback address, which isn't portable to a test runner).
 */
import { test, expect } from '@playwright/test';

const SLUG = 'deadbeefdeadbeefdeadbeefdeadbeef.4RqPYoP5k-ObuA3kTWXdbxPXm2pNVvqkyKmd-_vr35c';

async function lastAlertBody(page: import('@playwright/test').Page) {
  const response = await page.request.get('http://127.0.0.1:3001/__test/last-alert-body');
  const text = await response.text();
  return text === 'null' ? null : (JSON.parse(text) as { category: string; location?: { latitude: number; longitude: number } });
}

test('never requests location until the user explicitly checks "Share my location"', async ({ page }) => {
  const geoRequests: string[] = [];
  await page.context().addInitScript(() => {
    const original = navigator.geolocation.getCurrentPosition.bind(navigator.geolocation);
    (window as unknown as { __geoCalls: number }).__geoCalls = 0;
    navigator.geolocation.getCurrentPosition = ((...args: Parameters<typeof original>) => {
      (window as unknown as { __geoCalls: number }).__geoCalls += 1;
      return original(...args);
    }) as typeof original;
  });

  await page.goto(`/t/${SLUG}`);
  await page.getByRole('button', { name: 'Send an alert' }).click();
  await page.getByRole('radio', { name: 'Blocking access' }).click();

  const calls = await page.evaluate(() => (window as unknown as { __geoCalls: number }).__geoCalls);
  expect(calls).toBe(0);
  void geoRequests;
});

test('opt-in + permission granted: shows "Location ready to share" and the POST body includes the captured coordinates', async ({
  page,
}) => {
  await page.context().grantPermissions(['geolocation'], { origin: 'http://localhost:3000' });
  await page.context().setGeolocation({ latitude: 27.7172, longitude: 85.324 });

  await page.goto(`/t/${SLUG}`);
  await page.getByRole('button', { name: 'Send an alert' }).click();
  await page.getByRole('radio', { name: 'Blocking access' }).click();
  await page.getByLabel('Share my location with the vehicle owner').check();

  await expect(page.getByText('Location ready to share')).toBeVisible();

  await page.getByRole('button', { name: 'Send', exact: true }).click();
  await expect(page.getByText('Alert sent securely')).toBeVisible();

  const body = await lastAlertBody(page);
  expect(body?.location).toEqual({ latitude: 27.7172, longitude: 85.324 });
});

test('opt-in + permission denied: explains location is unavailable, still lets the alert send, and never attaches a location', async ({
  page,
}) => {
  // With no permission decision made (no grantPermissions() call), this headless Chromium build
  // leaves geolocation in "prompt" state indefinitely rather than auto-denying — getCurrentPosition()
  // then never calls either callback at all (confirmed empirically: it does NOT honor its own
  // `timeout` option while stuck waiting on an unresolved permission decision), so waiting it out
  // isn't a reliable way to test the denied path. Overriding getCurrentPosition() directly is the
  // same technique mock-alert-server.js uses for the backend: replace the one real dependency
  // (here, the browser's own geolocation implementation) so the denied path is deterministic,
  // without bypassing any of AlertFlow.tsx's/lib/geolocation.ts's own logic under test.
  await page.addInitScript(() => {
    navigator.geolocation.getCurrentPosition = (_success, error) => {
      error?.({ code: 1, message: 'User denied Geolocation', PERMISSION_DENIED: 1, POSITION_UNAVAILABLE: 2, TIMEOUT: 3 } as GeolocationPositionError);
    };
  });

  await page.goto(`/t/${SLUG}`);
  await page.getByRole('button', { name: 'Send an alert' }).click();
  await page.getByRole('radio', { name: 'Blocking access' }).click();
  await page.getByLabel('Share my location with the vehicle owner').check();

  await expect(page.getByText('Location unavailable — send without location', { exact: false })).toBeVisible();

  // Never silently blocked from sending just because location failed.
  const sendButton = page.getByRole('button', { name: 'Send', exact: true });
  await expect(sendButton).toBeEnabled();
  await sendButton.click();
  await expect(page.getByText('Alert sent securely')).toBeVisible();

  const body = await lastAlertBody(page);
  expect(body?.location).toBeUndefined();
});

test('opt-out (checkbox never checked): no location UI shown, and the POST never carries a location field', async ({ page }) => {
  await page.context().grantPermissions(['geolocation'], { origin: 'http://localhost:3000' });
  await page.context().setGeolocation({ latitude: 27.7172, longitude: 85.324 });

  await page.goto(`/t/${SLUG}`);
  await page.getByRole('button', { name: 'Send an alert' }).click();
  await page.getByRole('radio', { name: 'Blocking access' }).click();

  await expect(page.getByText('Location ready to share')).not.toBeVisible();
  await expect(page.getByText('Location unavailable', { exact: false })).not.toBeVisible();

  await page.getByRole('button', { name: 'Send', exact: true }).click();
  await expect(page.getByText('Alert sent securely')).toBeVisible();

  // Coordinates were mocked as available at the browser level, but since the box was never
  // checked, captureLocation() must never have been called at all — proving opt-out is a hard
  // "no location", not just "the UI happens not to show it".
  const body = await lastAlertBody(page);
  expect(body?.location).toBeUndefined();
});
