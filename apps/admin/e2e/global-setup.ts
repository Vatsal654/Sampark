/**
 * Purpose: Starts the fake upstream API server before the admin
 * Playwright suite runs, since the app's proxy routes need something to
 * fetch() from. Returns a teardown callback Playwright invokes after the
 * whole run finishes.
 * Related: fake-upstream-server.ts.
 */
import { startFakeUpstream } from './fake-upstream-server';

export const FAKE_UPSTREAM_PORT = 4010;

export default async function globalSetup(): Promise<() => Promise<void>> {
  const server = startFakeUpstream(FAKE_UPSTREAM_PORT);
  return async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  };
}
