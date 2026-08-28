/**
 * Purpose: Authenticated proxy from the browser to the backend admin API
 * — the browser never holds the admin's bearer token, only this server-
 * side route does (read from the httpOnly session cookie).
 * Responsibilities: Forwards GET/POST to
 * `{API_BASE_URL}/admin/{...path}`, attaching `Authorization: Bearer
 * <token>`; every mutating request (POST) must carry a matching
 * `x-csrf-token` header and `sampark_admin_csrf` cookie (double-submit
 * CSRF check) per docs/SECURITY.md.
 * Security: Returns 401 with no upstream call at all if the session
 * cookie is missing — never forwards an unauthenticated request upstream
 * and lets the backend's own guard be the only line of defense.
 * Related: lib/session.ts, app/api/session/login/route.ts.
 */
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { CSRF_COOKIE, CSRF_HEADER, SESSION_COOKIE, apiBaseUrl } from '../../../../lib/session';

async function proxy(request: Request, path: string[]): Promise<NextResponse> {
  const sessionToken = cookies().get(SESSION_COOKIE)?.value;
  if (!sessionToken) {
    return NextResponse.json({ message: 'Not authenticated' }, { status: 401 });
  }

  if (request.method !== 'GET') {
    const csrfCookie = cookies().get(CSRF_COOKIE)?.value;
    const csrfHeader = request.headers.get(CSRF_HEADER);
    if (!csrfCookie || !csrfHeader || csrfCookie !== csrfHeader) {
      return NextResponse.json({ message: 'CSRF check failed' }, { status: 403 });
    }
  }

  const upstreamUrl = `${apiBaseUrl()}/admin/${path.join('/')}`;
  const upstream = await fetch(upstreamUrl, {
    method: request.method,
    headers: {
      authorization: `Bearer ${sessionToken}`,
      'content-type': 'application/json',
    },
    body: request.method === 'GET' ? undefined : await request.text(),
  });

  const responseBody = await upstream.text();
  return new NextResponse(responseBody, {
    status: upstream.status,
    headers: { 'content-type': upstream.headers.get('content-type') ?? 'application/json' },
  });
}

export async function GET(request: Request, { params }: { params: { path: string[] } }) {
  return proxy(request, params.path);
}
export async function POST(request: Request, { params }: { params: { path: string[] } }) {
  return proxy(request, params.path);
}
