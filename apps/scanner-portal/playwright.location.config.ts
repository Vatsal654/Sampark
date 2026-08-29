/**
 * Purpose: Playwright config for e2e/location-sharing.spec.ts — exercises
 * the "Share my location" opt-in flow with a real browser and Playwright's
 * built-in geolocation permission/coordinate mocking
 * (context.grantPermissions/setGeolocation), against a real HTTP mock
 * server so the actual POST body can be inspected.
 * Caveat: this runs against Chromium, not Safari/iOS — it verifies the
 * app's own logic (permission requested only after opt-in, captured
 * coordinates actually included in the POST, denial handled without
 * blocking submission) but is not a substitute for testing on a real
 * iPhone, which the physical-device checklist in
 * docs/LOCAL_DEVELOPMENT.md still calls for separately.
 * Related: e2e/location-sharing.spec.ts, e2e/mock-alert-server.js,
 * lib/geolocation.ts, components/AlertFlow.tsx.
 */
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  testMatch: ['location-sharing.spec.ts'],
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: 'list',
  timeout: 30_000,
  use: {
    baseURL: 'http://localhost:3000',
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
        MOCK_ALERT_LOOKUP_ALLOWED_ORIGINS: 'http://localhost:3000',
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
