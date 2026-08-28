/**
 * Purpose: Clears the admin session and CSRF cookies.
 * Related: lib/session.ts.
 */
import { NextResponse } from 'next/server';
import { CSRF_COOKIE, SESSION_COOKIE } from '../../../../lib/session';

export async function POST(): Promise<NextResponse> {
  const response = NextResponse.json({ success: true });
  response.cookies.delete(SESSION_COOKIE);
  response.cookies.delete(CSRF_COOKIE);
  return response;
}
