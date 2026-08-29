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

describe('unreachableApiHint — the exact "phone scans a LAN QR but API base is still localhost" case', () => {
  it('warns when the page was loaded from a LAN IP but the API base URL is still localhost', () => {
    const hint = unreachableApiHint('http://localhost:3001/v1', '192.168.1.8');
    expect(hint).not.toBeNull();
    expect(hint).toContain('192.168.1.8');
    expect(hint).toContain('localhost:3001/v1');
    expect(hint).toContain('NEXT_PUBLIC_API_BASE_URL');
  });

  it('stays silent for ordinary same-machine development (both loopback)', () => {
    expect(unreachableApiHint('http://localhost:3001/v1', 'localhost')).toBeNull();
    expect(unreachableApiHint('http://127.0.0.1:3001/v1', '127.0.0.1')).toBeNull();
  });

  it('stays silent once the API base URL is already correctly configured for LAN use', () => {
    expect(unreachableApiHint('http://192.168.1.8:3001/v1', '192.168.1.8')).toBeNull();
  });

  it('stays silent for a deployed HTTPS API base URL regardless of page host', () => {
    expect(unreachableApiHint('https://api.sampark.example', '192.168.1.8')).toBeNull();
  });

  it('does not throw on a malformed API base URL — reports nothing rather than crashing', () => {
    expect(() => unreachableApiHint('not-a-url', '192.168.1.8')).not.toThrow();
    expect(unreachableApiHint('not-a-url', '192.168.1.8')).toBeNull();
  });
});
