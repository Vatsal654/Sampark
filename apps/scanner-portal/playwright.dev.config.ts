/**
 * Purpose: Playwright config that runs against a REAL `next dev` server,
 * not a production build.
 * Responsibilities: playwright.config.ts (the default) only ever starts
 * a production build (`next build && next start`), so it has never once
 * caught a dev-mode-only regression — which is exactly the shape of two
 * real bugs this app shipped: a CSP missing 'unsafe-eval' (required by
 * webpack's eval-based Fast Refresh runtime, never used in production
 * builds) that silently broke hydration only under `next dev`, present
 * on a physical device but invisible to `next build`/`next start`
 * testing. This config exists so `e2e/dev-mode.spec.ts` runs against the
 * actual dev server every time, closing that gap for good.
 * Related: e2e/dev-mode.spec.ts, middleware.ts, docs/LOCAL_DEVELOPMENT.md.
 */
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  testMatch: ['dev-mode.spec.ts'],
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: 'list',
  timeout: 60_000,
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    // Deliberately `next dev`, not build+start — see the header comment above. The "dev" script
    // already binds -p 3000.
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: false,
    timeout: 60_000,
    env: {
      // A LAN-shaped, non-loopback value on purpose — this is the configuration under which the
      // real bug occurred (a loopback default would never have been affected by the missing
      // 'unsafe-eval', since the symptom only shows up once the app is actually trying to do
      // something after hydrating). The exact host doesn't matter — nothing in this test suite
      // depends on the tag lookup fetch actually succeeding, only on it being correctly attempted.
      NEXT_PUBLIC_API_BASE_URL: 'http://192.168.1.8:3001/v1',
    },
  },
});
