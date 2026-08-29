/**
 * Purpose: Regression coverage for the reported bug "the tag lookup
 * works on a physical device (GET succeeds, the page loads), but
 * tapping Send Alert does nothing — no request ever reaches the API,
 * no alert appears anywhere, and the failure is invisible": a CORS
 * gap scoped to only the alert-submission POST route reproduces this
 * exactly, with a real browser and a real HTTP response (page.route()
 * interception never touches CORS enforcement, so it can't test this —
 * see mock-alert-server.js). Asserts two things the fix guarantees:
 * (1) the scanner never shows "Alert sent securely" unless the backend
 * actually returned success, and (2) a submission that never reaches
 * the backend renders the same clear "Unable to connect to Sampark"
 * state the tag lookup already had, instead of a generic, easy-to-miss
 * "Something went wrong".
 * Run via `npm run test:e2e:alert`.
 */
import { test, expect } from '@playwright/test';

const SLUG = 'deadbeefdeadbeefdeadbeefdeadbeef.4RqPYoP5k-ObuA3kTWXdbxPXm2pNVvqkyKmd-_vr35c';

test('a successful alert submission shows the confirmation screen only after the backend responds', async ({ page }) => {
  await page.goto(`http://localhost:3000/t/${SLUG}`);
  await page.getByRole('button', { name: 'Send an alert' }).click();
  await page.getByRole('radio', { name: 'Blocking access' }).click();
  await page.getByRole('button', { name: 'Send', exact: true }).click();

  await expect(page.getByText('Alert sent securely')).toBeVisible();
});

test('an alert-submission POST blocked by CORS (while the tag GET still succeeds) never shows "Alert sent" and instead shows a clear connectivity error', async ({
  page,
}) => {
  const consoleMsgs: string[] = [];
  page.on('console', (msg) => consoleMsgs.push(msg.text()));

  // "127.0.0.1" and "localhost" are different origins to a browser even on the same machine —
  // the mock server allows the tag lookup (GET) from both, but only allows the alert-submission
  // POST from "http://localhost:3000" (see playwright.alert.config.ts), so loading from
  // 127.0.0.1 reproduces "the lookup works, the alert submission silently doesn't" precisely.
  await page.goto(`http://127.0.0.1:3000/t/${SLUG}`);
  await expect(page.getByText('Mock Test Vehicle')).toBeVisible();

  await page.getByRole('button', { name: 'Send an alert' }).click();
  await page.getByRole('radio', { name: 'Blocking access' }).click();
  await page.getByRole('button', { name: 'Send', exact: true }).click();

  await expect(page.getByText('Unable to connect to Sampark')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Try again' })).toBeVisible();
  await expect(page.getByText('Alert sent securely')).not.toBeVisible();

  // The dev-only on-page diagnostics (never shown in production) must reflect a real fetch
  // attempt that never got a response, not a silently-swallowed click.
  const diagnosticsText = await page.getByTestId('dev-diagnostics-alert').innerText();
  expect(diagnosticsText).toContain('network_error');
  expect(diagnosticsText).toContain('Submission started');

  const allConsoleText = consoleMsgs.join('\n');
  expect(allConsoleText).toMatch(/CORS/i);
});
