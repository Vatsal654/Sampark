/**
 * Purpose: Playwright config for e2e/cors.spec.ts — the regression test
 * for the real root cause behind "the client never sends the tag-lookup
 * request" on a physical device: the scanner portal's own origin not
 * being included in the API's CORS_ALLOWED_ORIGINS. A real browser's
 * CORS enforcement can only be tested against a real HTTP response
 * (page.route() interception bypasses CORS entirely, since it never
 * touches the real network stack), so this starts both a real `next
 * dev` server AND a real (minimal, dependency-free) HTTP server
 * standing in for the API's CORS behavior specifically — see
 * e2e/mock-cors-server.js.
 * Related: e2e/cors.spec.ts, e2e/mock-cors-server.js,
 * playwright.dev.config.ts, lib/api-client.ts's unreachableApiHint().
 */
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  testMatch: ['cors.spec.ts'],
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
      command: 'node e2e/mock-cors-server.js',
      url: 'http://127.0.0.1:3001',
      reuseExistingServer: false,
      timeout: 15_000,
      env: {
        MOCK_CORS_PORT: '3001',
        // Only "localhost" is allowed — the tests deliberately load the page from "127.0.0.1"
        // instead (a different origin, even though it's the same machine) to exercise a real,
        // browser-enforced CORS rejection without needing any machine-specific LAN IP or an
        // /etc/hosts entry, so this is portable to any developer machine or CI runner.
        MOCK_CORS_ALLOWED_ORIGINS: 'http://localhost:3000',
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
