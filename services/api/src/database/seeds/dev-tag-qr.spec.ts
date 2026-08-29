import { isPlausibleOpaqueTagId, parseTagPath, verifyTagSignature } from '@sampark/shared-security';
import {
  assertNotProduction,
  buildDevTagScanUrl,
  DEFAULT_SCANNER_BASE_URL,
  DEV_TAG_ACTIVATION_PIN,
  DEV_TAG_OPAQUE_ID,
  resolveScannerBaseUrl,
} from './dev-tag-qr';

const TAG_SIGNING_SECRET = process.env.TAG_SIGNING_SECRET ?? 'dev-only-tag-signing-secret-do-not-use-in-prod-32ch';

describe('development tag identity', () => {
  it('DEV_TAG_OPAQUE_ID matches the exact shape production tags use (tag-id.ts)', () => {
    expect(isPlausibleOpaqueTagId(DEV_TAG_OPAQUE_ID)).toBe(true);
  });

  it('DEV_TAG_ACTIVATION_PIN is the documented, well-known development PIN', () => {
    expect(DEV_TAG_ACTIVATION_PIN).toBe('123456');
  });
});

describe('buildDevTagScanUrl — QR payload format', () => {
  it('produces the same "{origin}/t/{opaqueId}.{signature}" shape seed.ts already prints for its demo tag', () => {
    const url = buildDevTagScanUrl();
    expect(url).toMatch(/^http:\/\/localhost:3000\/t\/[0-9a-f]{32}\.[A-Za-z0-9_-]+$/);
  });

  it('round-trips through the exact parser apps/mobile uses (extractOpaqueIdFromScan mirrors parseTagPath)', () => {
    const url = buildDevTagScanUrl();
    const fragment = url.split('/t/')[1]!;
    const parsed = parseTagPath(fragment);

    expect(parsed).not.toBeNull();
    expect(parsed!.opaqueId).toBe(DEV_TAG_OPAQUE_ID);
  });

  it('carries a genuinely valid signature — not a fake one — so the same QR also works for the scanner-facing (non-owner) flow', () => {
    const url = buildDevTagScanUrl();
    const fragment = url.split('/t/')[1]!;
    const parsed = parseTagPath(fragment)!;

    expect(verifyTagSignature(parsed.opaqueId, parsed.signature, TAG_SIGNING_SECRET)).toBe(true);
  });

  it('a tampered opaque id fails signature verification, same as it would for a real tag', () => {
    const url = buildDevTagScanUrl();
    const fragment = url.split('/t/')[1]!;
    const parsed = parseTagPath(fragment)!;

    expect(verifyTagSignature('0'.repeat(32), parsed.signature, TAG_SIGNING_SECRET)).toBe(false);
  });
});

describe('resolveScannerBaseUrl — SCANNER_BASE_URL override for physical-device testing', () => {
  it('defaults to localhost when SCANNER_BASE_URL is unset', () => {
    expect(resolveScannerBaseUrl({})).toBe(DEFAULT_SCANNER_BASE_URL);
  });

  it('uses the configured LAN base URL instead of silently falling back to localhost', () => {
    const resolved = resolveScannerBaseUrl({ SCANNER_BASE_URL: 'http://192.168.1.8:3000' });
    expect(resolved).toBe('http://192.168.1.8:3000');
    expect(resolved).not.toContain('localhost');
  });

  it('normalizes a trailing slash the same way for either origin', () => {
    expect(resolveScannerBaseUrl({ SCANNER_BASE_URL: 'http://192.168.1.8:3000/' })).toBe('http://192.168.1.8:3000');
  });

  it('rejects a malformed SCANNER_BASE_URL instead of silently falling back to localhost', () => {
    expect(() => resolveScannerBaseUrl({ SCANNER_BASE_URL: 'not-a-url' })).toThrow('is not a valid URL');
  });

  it('rejects a non-http(s) scheme instead of silently falling back to localhost', () => {
    expect(() => resolveScannerBaseUrl({ SCANNER_BASE_URL: 'javascript:alert(1)' })).toThrow(
      'must use http:// or https://',
    );
  });
});

describe('buildDevTagScanUrl — configured base URL leaves the opaque ID and signature intact', () => {
  it('produces the same opaque ID and a validly-signed path regardless of which scanner base URL is used', () => {
    const localUrl = buildDevTagScanUrl(DEFAULT_SCANNER_BASE_URL);
    const lanUrl = buildDevTagScanUrl('http://192.168.1.8:3000');

    const localFragment = localUrl.split('/t/')[1]!;
    const lanFragment = lanUrl.split('/t/')[1]!;
    expect(lanFragment).toBe(localFragment);

    const parsed = parseTagPath(lanFragment)!;
    expect(parsed.opaqueId).toBe(DEV_TAG_OPAQUE_ID);
    expect(verifyTagSignature(parsed.opaqueId, parsed.signature, TAG_SIGNING_SECRET)).toBe(true);
  });

  it('places the configured base URL, and only it, in front of the unchanged /t/ path', () => {
    const url = buildDevTagScanUrl('http://192.168.1.8:3000');
    expect(url).toBe(`http://192.168.1.8:3000/t/${url.split('/t/')[1]}`);
    expect(url).not.toContain('localhost');
  });
});

describe('assertNotProduction — development-only gating', () => {
  const originalNodeEnv = process.env.NODE_ENV;
  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
  });

  it('throws when NODE_ENV=production, refusing to run at all', () => {
    process.env.NODE_ENV = 'production';
    expect(() => assertNotProduction()).toThrow('Refusing to generate a development tag against a production environment.');
  });

  it('does not throw in development', () => {
    process.env.NODE_ENV = 'development';
    expect(() => assertNotProduction()).not.toThrow();
  });

  it('does not throw when NODE_ENV is unset (matches every other dev-only gate in this codebase)', () => {
    delete process.env.NODE_ENV;
    expect(() => assertNotProduction()).not.toThrow();
  });

  it('still refuses to run under NODE_ENV=production even with a LAN SCANNER_BASE_URL configured — a dev override can never bypass the production gate', () => {
    process.env.NODE_ENV = 'production';
    expect(() =>
      resolveScannerBaseUrl({ NODE_ENV: 'production', SCANNER_BASE_URL: 'http://192.168.1.8:3000' }) && assertNotProduction(),
    ).toThrow('Refusing to generate a development tag against a production environment.');
  });
});
