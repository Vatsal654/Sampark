/**
 * Purpose: Playwright config for the admin console — the backend proxy
 * routes (app/api/*) are exercised for real, but every upstream call to
 * the actual Sampark API is intercepted (page.route) so this suite has
 * no live-service dependency. See docs/API.md for the contract mocked.
 */
import { defineConfig, devices } from '@playwright/test';
import { FAKE_UPSTREAM_PORT } from './e2e/global-setup';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: 'list',
  globalSetup: require.resolve('./e2e/global-setup'),
  use: {
    baseURL: process.env.ADMIN_BASE_URL ?? 'http://localhost:3002',
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'npm run build && npm run start',
    url: 'http://localhost:3002',
    reuseExistingServer: false,
    timeout: 120_000,
    env: { API_BASE_URL: `http://localhost:${FAKE_UPSTREAM_PORT}/v1`, COOKIE_SECURE: 'false' },
  },
});
