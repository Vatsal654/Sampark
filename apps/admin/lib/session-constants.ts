/**
 * Purpose: Cookie/header name constants shared by both client and server
 * code. Kept dependency-free (no `node:crypto`) so importing it from a
 * client component never pulls a Node built-in into the browser bundle.
 * Related: lib/session.ts (server-only helpers), lib/admin-client.ts.
 */
export const SESSION_COOKIE = 'sampark_admin_session';
export const CSRF_COOKIE = 'sampark_admin_csrf';
export const CSRF_HEADER = 'x-csrf-token';
