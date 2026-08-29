/**
 * Purpose: Regression coverage for two real bugs that only manifested
 * under `next dev` (never under `next build`/`next start`, which is all
 * playwright.config.ts's default suite ever exercises): a CSP missing
 * 'unsafe-eval' that silently blocked webpack's dev-mode Fast Refresh
 * runtime from executing at all, and the env-var-inlining break that
 * preceded it. Both broke hydration completely — the tag lookup fetch
 * was simply never attempted, with no console error a developer would
 * notice without deliberately checking for it. Run via
 * `npm run test:e2e:dev`, which points Playwright at playwright.dev.config.ts
 * (a real `next dev` server, not a production build).
 */
import { test, expect } from '@playwright/test';

const SLUG = 'deadbeefdeadbeefdeadbeefdeadbeef.4RqPYoP5k-ObuA3kTWXdbxPXm2pNVvqkyKmd-_vr35c';

test.describe('next dev — CSP allows the dev server to actually run', () => {
  test('the Content-Security-Policy on /t/[slug] carries a nonce and unsafe-eval, never unsafe-inline', async ({ page }) => {
    const response = await page.goto(`/t/${SLUG}`);
    const csp = response?.headers()['content-security-policy'] ?? '';

    expect(csp).toMatch(/script-src[^;]*'nonce-[0-9a-f-]+'/);
    // Required for next dev's webpack Fast Refresh (eval-based module wrapping) to run at all —
    // its absence is exactly the bug this test exists to catch (see file header).
    expect(csp).toMatch(/script-src[^;]*'unsafe-eval'/);
    // style-src legitimately carries 'unsafe-inline' (for CSS-in-JS) — only script-src must never.
    expect(csp).not.toMatch(/script-src[^;]*unsafe-inline/);
  });

  test('no CSP violation is reported to the page — the exact signal the underlying bug produced', async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (err) => pageErrors.push(err.message));

    // Deliberately not waiting for networkidle: the tag-lookup fetch here targets a real,
    // unmocked LAN-shaped address that this test doesn't expect to ever resolve — a CSP
    // violation (a pageerror, synchronous with script evaluation) would already have fired well
    // before that, so a short bounded wait is enough and doesn't make the test hang on a fetch
    // it was never trying to complete.
    await page.goto(`/t/${SLUG}`);
    await page.waitForTimeout(3000);

    const cspViolations = pageErrors.filter((m) => /content security policy/i.test(m));
    expect(cspViolations).toEqual([]);
  });
});

test.describe('next dev — client hydration actually completes', () => {
  test('the page moves past "Loading…" once the (mocked) tag lookup resolves — proving client JS actually ran', async ({ page }) => {
    await page.route('**/v1/public/tags/**', (route) =>
      route.fulfill({
        json: {
          opaqueId: 'deadbeefdeadbeefdeadbeefdeadbeef',
          status: 'active',
          vehicleDisplayLabel: 'Dev Mode Test Vehicle',
          vehicleCategory: 'car',
          callbackEnabled: false,
          emergencyEnabled: false,
        },
      }),
    );

    await page.goto(`/t/${SLUG}`);
    await expect(page.getByText('Dev Mode Test Vehicle')).toBeVisible();
    await expect(page.getByText('Loading')).not.toBeVisible();
  });

  test('the tag lookup fetch is attempted with the correct opaqueId, signature, and path shape', async ({ page }) => {
    let capturedUrl: string | null = null;
    await page.route('**/v1/public/tags/**', (route) => {
      capturedUrl = route.request().url();
      return route.fulfill({
        json: {
          opaqueId: 'deadbeefdeadbeefdeadbeefdeadbeef',
          status: 'issued',
          vehicleDisplayLabel: null,
          vehicleCategory: null,
          callbackEnabled: false,
          emergencyEnabled: false,
        },
      });
    });

    await page.goto(`/t/${SLUG}`);
    await expect(page.getByText('This tag is not yet activated')).toBeVisible();

    expect(capturedUrl).not.toBeNull();
    const url = new URL(capturedUrl!);
    expect(url.pathname).toBe('/v1/public/tags/deadbeefdeadbeefdeadbeefdeadbeef');
    expect(url.searchParams.get('sig')).toBe('4RqPYoP5k-ObuA3kTWXdbxPXm2pNVvqkyKmd-_vr35c');
  });
});
