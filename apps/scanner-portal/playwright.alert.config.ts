/**
 * Purpose: Playwright config for e2e/alert-submission.spec.ts — the
 * regression test for "the tag lookup works on a physical device, but
 * tapping Send Alert never reaches the backend": a real browser's CORS
 * enforcement can only be tested against a real HTTP response
 * (page.route() interception bypasses CORS entirely), so this starts
 * both a real `next dev` server AND a real (minimal, dependency-free)
 * HTTP server that allows the tag-lookup GET for any origin but only
 * allows the alert-submission POST for one specific origin — see
 * e2e/mock-alert-server.js.
 * Related: e2e/alert-submission.spec.ts, e2e/mock-alert-server.js,
 * playwright.cors.config.ts (the same pattern, for the tag lookup).
 */
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  testMatch: ['alert-submission.spec.ts'],
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: 'list',
  timeout: 30_000,
  use: {
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: [
    {
      command: 'node e2e/mock-alert-server.js',
      url: 'http://127.0.0.1:3001',
      reuseExistingServer: false,
      timeout: 15_000,
      env: {
        MOCK_ALERT_PORT: '3001',
        // The tag lookup (GET) succeeds from either origin the tests use, so the page always
        // loads and "Send Alert" is always reachable — only the alert-submission POST is
        // origin-restricted, to isolate exactly the bug this test regresses.
        MOCK_ALERT_LOOKUP_ALLOWED_ORIGINS: 'http://localhost:3000,http://127.0.0.1:3000',
        MOCK_ALERT_SUBMIT_ALLOWED_ORIGINS: 'http://localhost:3000',
      },
    },
    {
      command: 'npm run dev',
      url: 'http://localhost:3000',
      reuseExistingServer: false,
      timeout: 60_000,
      env: {
        NEXT_PUBLIC_API_BASE_URL: 'http://127.0.0.1:3001/v1',
      },
    },
  ],
});
