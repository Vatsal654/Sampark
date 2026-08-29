import { resolveApiBaseUrl, unreachableApiHint } from './api-client';

describe('resolveApiBaseUrl — NEXT_PUBLIC_API_BASE_URL configuration', () => {
  it('defaults to localhost when NEXT_PUBLIC_API_BASE_URL is unset', () => {
    expect(resolveApiBaseUrl(undefined)).toBe('http://localhost:3001/v1');
  });

  it('uses the configured LAN base URL instead of silently falling back to localhost', () => {
    const resolved = resolveApiBaseUrl('http://192.168.1.8:3001/v1');
    expect(resolved).toBe('http://192.168.1.8:3001/v1');
    expect(resolved).not.toContain('localhost');
  });

  it('falls back to localhost on an empty string rather than requesting against an empty base', () => {
    expect(resolveApiBaseUrl('')).toBe('http://localhost:3001/v1');
  });

  it('falls back to localhost on a whitespace-only value', () => {
    expect(resolveApiBaseUrl('   ')).toBe('http://localhost:3001/v1');
  });
});

describe('unreachableApiHint — a fetch has already failed, so it always has something to say', () => {
  it('gives the confident diagnosis when the page was loaded from a LAN IP but the API base URL is still localhost', () => {
    const hint = unreachableApiHint('http://localhost:3001/v1', '192.168.1.8');
    expect(hint).toContain('192.168.1.8');
    expect(hint).toContain('localhost:3001/v1');
    expect(hint).toContain('NEXT_PUBLIC_API_BASE_URL');
  });

  it('gives the general (reachability-or-CORS) hint for ordinary same-machine development (both loopback) — the fetch still failed, so something is still wrong', () => {
    const hint = unreachableApiHint('http://localhost:3001/v1', 'localhost');
    expect(hint).toContain('NEXT_PUBLIC_API_BASE_URL');
    expect(hint).toContain('CORS_ALLOWED_ORIGINS');
  });

  it('names CORS_ALLOWED_ORIGINS — not just NEXT_PUBLIC_API_BASE_URL — once the API base URL is already correctly configured for LAN use, since a CORS rejection and an unreachable host are indistinguishable to this code', () => {
    const hint = unreachableApiHint('http://192.168.1.8:3001/v1', '192.168.1.8');
    expect(hint).toContain('192.168.1.8');
    expect(hint).toContain('CORS_ALLOWED_ORIGINS');
    expect(hint).toContain('NEXT_PUBLIC_API_BASE_URL');
  });

  it('gives the general hint for a deployed HTTPS API base URL regardless of page host', () => {
    const hint = unreachableApiHint('https://api.sampark.example', '192.168.1.8');
    expect(hint).toContain('api.sampark.example');
    expect(hint).toContain('CORS_ALLOWED_ORIGINS');
  });

  it('does not throw on a malformed API base URL — falls back to the general hint rather than crashing', () => {
    expect(() => unreachableApiHint('not-a-url', '192.168.1.8')).not.toThrow();
    const hint = unreachableApiHint('not-a-url', '192.168.1.8');
    expect(hint).toContain('not-a-url');
    expect(hint).toContain('CORS_ALLOWED_ORIGINS');
  });
});
