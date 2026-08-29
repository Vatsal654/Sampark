/**
 * Purpose: Regression coverage for the real root cause found behind
 * "the scanner opens fine on a physical device, but the API terminal
 * never sees a request, and the page shows a generic failure state":
 * the scanner portal's own origin isn't in the API's
 * CORS_ALLOWED_ORIGINS. The browser blocks the fetch with no
 * server-side trace at all (a rejected/omitted CORS preflight leaves no
 * access log — NestJS has none by default), and the resulting
 * `TypeError: Failed to fetch` is indistinguishable, to application
 * code, from the API being genuinely unreachable — which is exactly why
 * this was so hard to diagnose from logs alone. As of the network_error
 * classification work (lib/api-client.ts's ApiErrorKind), this correctly
 * renders the distinct "Unable to connect to Sampark" state with a retry
 * button rather than the generic "Tag not found" it used to collapse
 * into — this test asserts that classification is correct for a real
 * CORS rejection specifically, not just for a mocked network failure.
 * Run via
 * `npm run test:e2e:cors`, which starts a real `next dev` server AND a
 * real (non-mocked) small HTTP server standing in for the API's CORS
 * decision — see mock-cors-server.js and playwright.cors.config.ts for
 * why page.route() interception can't test this (it never touches a
 * real response, so real CORS enforcement never happens).
 */
import { test, expect } from '@playwright/test';

const SLUG = 'deadbeefdeadbeefdeadbeefdeadbeef.4RqPYoP5k-ObuA3kTWXdbxPXm2pNVvqkyKmd-_vr35c';

test('a page origin missing from CORS_ALLOWED_ORIGINS is blocked exactly like the reported bug — and the console names the real cause', async ({ page }) => {
  const consoleMsgs: string[] = [];
  page.on('console', (msg) => consoleMsgs.push(msg.text()));

  // "127.0.0.1" and "localhost" are different origins to a browser, even on the same machine —
  // the mock server only allows "http://localhost:3000" (see playwright.cors.config.ts), so this
  // reproduces a real CORS rejection without needing any LAN IP or /etc/hosts entry.
  await page.goto(`http://127.0.0.1:3000/t/${SLUG}`);
  await page.waitForTimeout(3000);

  // The correctly-classified user-visible outcome: a network_error, not a stuck spinner and not
  // the generic "Tag not found" (a real 404) — the browser never tells the app it was CORS
  // specifically (no distinct "CORS error" message is possible), but "we couldn't connect" is
  // still the accurate category, and it comes with a retry button.
  await expect(page.getByText('Unable to connect to Sampark')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Try again' })).toBeVisible();
  await expect(page.getByText('Tag not found', { exact: true })).not.toBeVisible();

  const allConsoleText = consoleMsgs.join('\n');
  expect(allConsoleText).toMatch(/CORS/i);
  expect(allConsoleText).toContain('CORS_ALLOWED_ORIGINS');
  expect(allConsoleText).toContain('NEXT_PUBLIC_API_BASE_URL');
});

test('the identical page origin succeeds once it is included in CORS_ALLOWED_ORIGINS', async ({ page }) => {
  await page.goto(`http://localhost:3000/t/${SLUG}`);
  await expect(page.getByText('This tag is not yet activated')).toBeVisible();
});
