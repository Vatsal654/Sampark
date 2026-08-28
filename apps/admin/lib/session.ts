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

export function generateCsrfToken(): string {
  return randomBytes(24).toString('base64url');
}

export function apiBaseUrl(): string {
  return process.env.API_BASE_URL ?? 'http://localhost:3001/v1';
}
