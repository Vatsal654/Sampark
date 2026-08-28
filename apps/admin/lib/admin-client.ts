'use client';
/**
 * Purpose: Client-side fetch wrapper for the admin console, calling this
 * app's own `/api/admin/*` proxy routes — never the backend API directly
 * (the browser never holds the admin bearer token).
 * Responsibilities: Reads the non-httpOnly CSRF cookie and attaches it as
 * a header on every mutating request, per the double-submit pattern in
 * app/api/admin/[...path]/route.ts.
 * Related: lib/session.ts, app/api/admin/[...path]/route.ts.
 */
import { CSRF_COOKIE, CSRF_HEADER } from './session-constants';

function readCookie(name: string): string | null {
  const match = document.cookie.split('; ').find((row) => row.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.split('=').slice(1).join('=')) : null;
}

export class AdminApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

export async function adminGet<T>(path: string): Promise<T> {
  const response = await fetch(`/api/admin/${path}`, { method: 'GET' });
  return handle<T>(response);
}

export async function adminPost<T>(path: string, body?: unknown): Promise<T> {
  const csrf = readCookie(CSRF_COOKIE);
  const response = await fetch(`/api/admin/${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...(csrf ? { [CSRF_HEADER]: csrf } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  return handle<T>(response);
}

async function handle<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const body = await response.json().catch(() => ({ message: 'Request failed' }));
    throw new AdminApiError(response.status, body.message ?? 'Request failed');
  }
  return (await response.json()) as T;
}
