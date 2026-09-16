/**
 * Purpose: Redirects to /login when no session cookie is present, so an
 * unauthenticated visitor never sees the dashboard shell render (even
 * briefly) before its data fetches inevitably 401.
 * Security: This is a UX convenience, not the authorization boundary —
 * every dashboard data call still goes through the CSRF + bearer-token
 * checks in app/api/admin/[...path]/route.ts and the backend's own
 * AdminAuthGuard/PermissionsGuard.
 */
import { NextResponse, type NextRequest } from 'next/server';
import { SESSION_COOKIE } from './lib/session-constants';

// TEMPORARY: ADMIN_AUTH_DISABLED (dev-only, see lib/session.ts) skips this
// redirect so /dashboard is reachable without logging in first.
const authDisabled = process.env.ADMIN_AUTH_DISABLED === 'true' && process.env.NODE_ENV !== 'production';

export function middleware(request: NextRequest) {
  if (
    !authDisabled &&
    request.nextUrl.pathname.startsWith('/dashboard') &&
    !request.cookies.get(SESSION_COOKIE)
  ) {
    return NextResponse.redirect(new URL('/login', request.url));
  }
  return NextResponse.next();
}

export const config = { matcher: ['/dashboard/:path*'] };
