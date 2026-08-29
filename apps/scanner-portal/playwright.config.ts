/**
 * Purpose: Playwright config for the scanner portal — runs against a
 * production build served locally, with the API base URL pointed at a
 * running Sampark API (see e2e/README.md).
 * Related: playwright.dev.config.ts, which runs e2e/dev-mode.spec.ts
 * (excluded here) against a real `next dev` server instead — some of
 * its assertions (e.g. CSP containing 'unsafe-eval') are true only in
 * dev mode and would fail against this config's production build.
 */
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  testIgnore: ['dev-mode.spec.ts'],
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: 'list',
  use: {
    baseURL: process.env.SCANNER_PORTAL_BASE_URL ?? 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: process.env.CI
    ? {
        command: 'npm run build && npm run start',
        url: 'http://localhost:3000',
        reuseExistingServer: false,
        timeout: 120_000,
      }
    : undefined,
});
