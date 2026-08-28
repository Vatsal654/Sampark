/**
 * Purpose: End-to-end coverage of the admin login flow against the real
 * BFF route handlers, backed by the fake upstream server (global-setup.ts)
 * instead of the real Sampark API.
 */
import { test, expect } from '@playwright/test';

test('signs in with mock SSO + MFA and reaches the dashboard', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Email').fill('demo-admin@example-dev.local');
  await page.getByLabel('MFA code').fill('123456');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(/\/dashboard/);
  await expect(page.getByRole('heading', { name: 'Sampark Admin' })).toBeVisible();
});

test('redirects an unauthenticated visitor away from the dashboard', async ({ page }) => {
  await page.goto('/dashboard');
  await expect(page).toHaveURL(/\/login/);
});
