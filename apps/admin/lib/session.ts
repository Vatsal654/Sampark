/**
 * Purpose: Server-only session helpers (route handlers only — never
 * imported from a 'use client' component, which is why the cookie/header
 * name constants live in lib/session-constants.ts instead).
 * Related: lib/session-constants.ts, app/api/session/*, app/api/admin/[...path]/route.ts.
 */
import { randomBytes } from 'node:crypto';

export { SESSION_COOKIE, CSRF_COOKIE, CSRF_HEADER } from './session-constants';

export function cookieSecure(): boolean {
  return process.env.COOKIE_SECURE === 'true';
}

/**
 * TEMPORARY: mirrors ADMIN_AUTH_DISABLED on services/api. When set, the
 * proxy route and middleware skip the session/CSRF checks entirely so the
 * admin console can be used without logging in first. Refuses to honor the
 * flag outside development, so a stray setting can never weaken a real
 * deployment. Remove alongside the backend's AdminAuthGuard bypass once the
 * login flow is being exercised again.
 */
export function adminAuthDisabled(): boolean {
  return process.env.ADMIN_AUTH_DISABLED === 'true' && process.env.NODE_ENV !== 'production';
}

export function generateCsrfToken(): string {
  return randomBytes(24).toString('base64url');
}

export function apiBaseUrl(): string {
  return process.env.API_BASE_URL ?? 'http://localhost:3001/v1';
}
