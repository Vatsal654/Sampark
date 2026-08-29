import { baseEnvSchema, loadEnv } from './env';

const validEnv = {
  DATABASE_URL: 'postgres://user:pass@localhost:5432/sampark',
  REDIS_URL: 'redis://localhost:6379',
  JWT_ACCESS_SECRET: 'a'.repeat(32),
  JWT_REFRESH_SECRET: 'b'.repeat(32),
  TAG_SIGNING_SECRET: 'c'.repeat(32),
  FIELD_ENCRYPTION_ROOT_KEY: 'd'.repeat(32),
};

describe('loadEnv', () => {
  it('parses a valid environment and applies safe defaults', () => {
    const config = loadEnv(baseEnvSchema, validEnv);
    expect(config.NODE_ENV).toBe('development');
    expect(config.FEATURE_LIVE_CALL_BRIDGING).toBe(false);
    expect(config.FEATURE_NO_TAG_LOOKUP).toBe(false);
    expect(config.CORS_ALLOWED_ORIGINS).toContain('http://localhost:3000');
  });

  it('rejects a missing required secret with a clear message', () => {
    const { DATABASE_URL: _omit, ...rest } = validEnv;
    expect(() => loadEnv(baseEnvSchema, rest)).toThrow(/DATABASE_URL/);
  });

  it('rejects short secrets rather than silently truncating', () => {
    expect(() =>
      loadEnv(baseEnvSchema, { ...validEnv, JWT_ACCESS_SECRET: 'too-short' }),
    ).toThrow(/JWT_ACCESS_SECRET/);
  });

  it('parses feature flags as booleans regardless of "1"/"true" spelling', () => {
    const config = loadEnv(baseEnvSchema, { ...validEnv, FEATURE_REAL_SMS: '1' });
    expect(config.FEATURE_REAL_SMS).toBe(true);
  });

  it('SCANNER_BASE_URL (dev-tag-qr.ts\'s physical-device override) is not part of this schema, so setting it in a real deployment has no effect on production config at all', () => {
    expect(Object.keys(baseEnvSchema.shape)).not.toContain('SCANNER_BASE_URL');
    const config = loadEnv(baseEnvSchema, { ...validEnv, SCANNER_BASE_URL: 'http://192.168.1.8:3000' });
    expect(config).not.toHaveProperty('SCANNER_BASE_URL');
  });
});
