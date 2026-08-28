/**
 * Purpose: Admin login BFF endpoint — exchanges email+MFA code for the
 * backend's admin JWT, then stores that JWT ONLY in an httpOnly cookie.
 * Responsibilities: Proxies to POST {API_BASE_URL}/admin/auth/login; on
 * success, sets the session cookie (httpOnly, SameSite=Strict) and a
 * separate CSRF cookie (readable by client JS, used for the double-submit
 * check on every mutating proxy request).
 * Security: The response body sent back to the browser never contains
 * the JWT — only `{ success: true }` — so no client-side script can ever
 * read the admin's bearer token.
 * Related: lib/session.ts, app/api/admin/[...path]/route.ts.
 */
import { NextResponse } from 'next/server';
import { CSRF_COOKIE, SESSION_COOKIE, apiBaseUrl, cookieSecure, generateCsrfToken } from '../../../../lib/session';

export async function POST(request: Request): Promise<NextResponse> {
  const body = await request.json().catch(() => null);
  if (!body || typeof body.email !== 'string' || typeof body.mfaCode !== 'string') {
    return NextResponse.json({ message: 'Invalid request' }, { status: 400 });
  }

  const upstream = await fetch(`${apiBaseUrl()}/admin/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: body.email, mfaCode: body.mfaCode }),
  });

  if (!upstream.ok) {
    const errorBody = await upstream.json().catch(() => ({ message: 'Login failed' }));
    return NextResponse.json(errorBody, { status: upstream.status });
  }

  const { accessToken, expiresAt } = (await upstream.json()) as { accessToken: string; expiresAt: string };
  const maxAgeSeconds = Math.max(1, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000));

  const response = NextResponse.json({ success: true });
  response.cookies.set(SESSION_COOKIE, accessToken, {
    httpOnly: true,
    secure: cookieSecure(),
    sameSite: 'strict',
    path: '/',
    maxAge: maxAgeSeconds,
  });
  response.cookies.set(CSRF_COOKIE, generateCsrfToken(), {
    httpOnly: false,
    secure: cookieSecure(),
    sameSite: 'strict',
    path: '/',
    maxAge: maxAgeSeconds,
  });
  return response;
}
