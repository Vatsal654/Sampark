/**
 * Purpose: End-to-end coverage of the dashboard panels. Bypasses the
 * login UI by seeding the session/CSRF cookies directly (the fake
 * upstream server accepts any bearer token, mirroring how the real API's
 * AdminAuthGuard would reject an invalid one — that rejection path is
 * covered separately in services/api's own admin-auth security spec).
 */
import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page, baseURL }) => {
  const url = new URL(baseURL!);
  await page.context().addCookies([
    { name: 'sampark_admin_session', value: 'fake-admin-access-token', domain: url.hostname, path: '/', httpOnly: true },
    { name: 'sampark_admin_csrf', value: 'fake-csrf-token', domain: url.hostname, path: '/' },
  ]);
});

test('shows the tag inventory panel by default', async ({ page }) => {
  await page.goto('/dashboard');
  await expect(page.getByRole('heading', { name: 'Tag inventory' })).toBeVisible();
  await expect(page.getByText('aaaa1111')).toBeVisible();
});

test('navigates to the feature flags panel and shows capability-gated state', async ({ page }) => {
  await page.goto('/dashboard');
  await page.getByRole('button', { name: 'Feature flags' }).click();
  await expect(page.getByRole('heading', { name: 'Feature flags' })).toBeVisible();
  await expect(page.getByText('live_call_bridging')).toBeVisible();
  // The row for a capability that isn't configured (live_call_bridging) must not offer "Enable".
  const row = page.locator('tr', { hasText: 'live_call_bridging' });
  await expect(row.getByRole('button', { name: 'Enable' })).toBeDisabled();
});

test('navigates to the audit log panel', async ({ page }) => {
  await page.goto('/dashboard');
  await page.getByRole('button', { name: 'Audit log' }).click();
  await expect(page.getByRole('heading', { name: 'Audit log' })).toBeVisible();
});

test('signs out and returns to the login page', async ({ page }) => {
  await page.goto('/dashboard');
  await page.getByRole('button', { name: 'Sign out' }).click();
  await expect(page).toHaveURL(/\/login/);
});
