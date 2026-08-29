import { apiOriginForCsp, buildCspHeader } from './middleware';

describe('apiOriginForCsp — connect-src must be an origin, not a path', () => {
  it('strips the path off a configured API base URL, keeping only the origin', () => {
    expect(apiOriginForCsp('http://192.168.1.8:3001/v1')).toBe('http://192.168.1.8:3001');
  });

  it('strips the path off the localhost default too', () => {
    expect(apiOriginForCsp('http://localhost:3001/v1')).toBe('http://localhost:3001');
  });

  it('returns an empty string when unset, rather than throwing', () => {
    expect(apiOriginForCsp(undefined)).toBe('');
  });

  it('returns an empty string for a malformed value, rather than throwing', () => {
    expect(apiOriginForCsp('not-a-url')).toBe('');
  });

  it('preserves a deployed HTTPS origin', () => {
    expect(apiOriginForCsp('https://api.sampark.example/v1')).toBe('https://api.sampark.example');
  });
});

describe('buildCspHeader — nonce-based script-src, origin-only connect-src', () => {
  it('includes the given nonce in script-src, with no unsafe-inline anywhere in script-src', () => {
    const header = buildCspHeader('test-nonce-123', 'http://192.168.1.8:3001', false);
    expect(header).toContain("script-src 'self' 'nonce-test-nonce-123' 'strict-dynamic'");
    expect(header).not.toMatch(/script-src[^;]*unsafe-inline/);
  });

  it('allows connecting to the configured API origin alongside self', () => {
    const header = buildCspHeader('n', 'http://192.168.1.8:3001', false);
    expect(header).toContain("connect-src 'self' http://192.168.1.8:3001");
  });

  it('a fresh nonce changes script-src between calls — never reused across requests', () => {
    const a = buildCspHeader('nonce-a', 'http://localhost:3001', false);
    const b = buildCspHeader('nonce-b', 'http://localhost:3001', false);
    expect(a).not.toBe(b);
  });

  it('keeps frame-ancestors/base-uri/form-action locked down regardless of API origin', () => {
    const header = buildCspHeader('n', 'http://192.168.1.8:3001', false);
    expect(header).toContain("frame-ancestors 'none'");
    expect(header).toContain("base-uri 'self'");
    expect(header).toContain("form-action 'self'");
  });
});

describe('buildCspHeader — unsafe-eval is dev-only, never shipped to production', () => {
  it('production (isDevelopment=false) never includes unsafe-eval — the strictest case', () => {
    const header = buildCspHeader('n', 'http://192.168.1.8:3001', false);
    expect(header).not.toContain('unsafe-eval');
  });

  it('development (isDevelopment=true) includes unsafe-eval in script-src, required for next dev\'s webpack HMR/Fast Refresh (eval-based module wrapping) to run at all', () => {
    const header = buildCspHeader('n', 'http://192.168.1.8:3001', true);
    expect(header).toContain("script-src 'self' 'nonce-n' 'strict-dynamic' 'unsafe-eval'");
  });

  it('unsafe-eval, when present, is scoped to script-src only — never leaks into other directives', () => {
    const header = buildCspHeader('n', 'http://192.168.1.8:3001', true);
    const directives = header.split('; ');
    const withEval = directives.filter((d) => d.includes('unsafe-eval'));
    expect(withEval).toEqual([expect.stringContaining('script-src')]);
  });
});
