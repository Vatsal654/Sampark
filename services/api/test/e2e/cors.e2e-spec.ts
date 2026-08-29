/**
 * Purpose: Regression coverage for a real bug found via a physical
 * device: the scanner portal's LAN origin was correctly added to
 * services/api/.env's CORS_ALLOWED_ORIGINS, the API was restarted, and
 * a browser's fetch from that origin was still blocked by CORS. The
 * root cause was that nothing in this codebase ever loaded .env into
 * process.env (no dotenv import anywhere, no @nestjs/config
 * ConfigModule) — main.ts's loadEnv(baseEnvSchema) read straight from
 * process.env, so a correctly-edited .env had zero effect unless the
 * shell/platform separately exported those variables, and
 * CORS_ALLOWED_ORIGINS silently fell back to its schema default
 * (localhost only). Fixed by loading .env in main.ts and
 * database/data-source.ts (see those files). This spec exists so that
 * class of bug — CORS_ALLOWED_ORIGINS not actually reaching
 * app.enableCors() — has a real, running-API regression test, not just
 * a unit test of config parsing.
 * Related: src/main.ts, test/support/test-app.ts (which previously
 * never called app.enableCors() at all, so no e2e spec could exercise
 * this even in principle — fixed alongside this file).
 */
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from '../support/test-app';

const LOCALHOST_ORIGIN = 'http://localhost:3000';
const LAN_ORIGIN = 'http://192.168.1.8:3000';
const DISALLOWED_ORIGIN = 'http://evil.example:3000';
const TAG_PATH = '/v1/public/tags/deadbeefdeadbeefdeadbeefdeadbeef?sig=x';
const PREFLIGHT_PATH = '/v1/public/tags/deadbeefdeadbeefdeadbeefdeadbeef';

describe('CORS_ALLOWED_ORIGINS, configured to include a LAN origin (e2e, real running API)', () => {
  let app: INestApplication;
  const originalCorsEnv = process.env.CORS_ALLOWED_ORIGINS;

  beforeAll(async () => {
    process.env.CORS_ALLOWED_ORIGINS = `${LOCALHOST_ORIGIN},http://localhost:3002,${LAN_ORIGIN}`;
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
    if (originalCorsEnv === undefined) delete process.env.CORS_ALLOWED_ORIGINS;
    else process.env.CORS_ALLOWED_ORIGINS = originalCorsEnv;
  });

  it('a configured LAN origin receives Access-Control-Allow-Origin on a real GET response', async () => {
    const response = await request(app.getHttpServer()).get(TAG_PATH).set('Origin', LAN_ORIGIN);
    expect(response.headers['access-control-allow-origin']).toBe(LAN_ORIGIN);
  });

  it('the configured localhost origin still works, unaffected by adding the LAN origin', async () => {
    const response = await request(app.getHttpServer()).get(TAG_PATH).set('Origin', LOCALHOST_ORIGIN);
    expect(response.headers['access-control-allow-origin']).toBe(LOCALHOST_ORIGIN);
  });

  it('an origin outside CORS_ALLOWED_ORIGINS receives no Access-Control-Allow-Origin', async () => {
    const response = await request(app.getHttpServer()).get(TAG_PATH).set('Origin', DISALLOWED_ORIGIN);
    expect(response.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('Access-Control-Allow-Credentials remains true for an allowed origin', async () => {
    const response = await request(app.getHttpServer()).get(TAG_PATH).set('Origin', LAN_ORIGIN);
    expect(response.headers['access-control-allow-credentials']).toBe('true');
  });

  it('an OPTIONS preflight for the LAN origin gets the correct CORS headers', async () => {
    const response = await request(app.getHttpServer())
      .options(PREFLIGHT_PATH)
      .set('Origin', LAN_ORIGIN)
      .set('Access-Control-Request-Method', 'GET')
      .set('Access-Control-Request-Headers', 'content-type');
    expect(response.headers['access-control-allow-origin']).toBe(LAN_ORIGIN);
    expect(response.headers['access-control-allow-methods']).toEqual(expect.stringContaining('GET'));
    expect(response.headers['access-control-allow-credentials']).toBe('true');
  });

  it('an OPTIONS preflight for a disallowed origin gets no Access-Control-Allow-Origin', async () => {
    const response = await request(app.getHttpServer())
      .options(PREFLIGHT_PATH)
      .set('Origin', DISALLOWED_ORIGIN)
      .set('Access-Control-Request-Method', 'GET');
    expect(response.headers['access-control-allow-origin']).toBeUndefined();
  });
});

describe('CORS_ALLOWED_ORIGINS default — an unconfigured deployment stays secure (e2e, real running API)', () => {
  let app: INestApplication;
  const originalCorsEnv = process.env.CORS_ALLOWED_ORIGINS;

  beforeAll(async () => {
    // Exercise the schema's own default (no override at all) — the exact production-safety
    // property this bug's fallback could have silently broken in the other direction: a
    // deployment that never sets CORS_ALLOWED_ORIGINS must NOT end up allowing an arbitrary
    // origin through.
    delete process.env.CORS_ALLOWED_ORIGINS;
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
    if (originalCorsEnv === undefined) delete process.env.CORS_ALLOWED_ORIGINS;
    else process.env.CORS_ALLOWED_ORIGINS = originalCorsEnv;
  });

  it('never allows an arbitrary LAN IP through when unconfigured', async () => {
    const response = await request(app.getHttpServer()).get(TAG_PATH).set('Origin', LAN_ORIGIN);
    expect(response.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('still allows the documented default localhost dev origin', async () => {
    const response = await request(app.getHttpServer()).get(TAG_PATH).set('Origin', LOCALHOST_ORIGIN);
    expect(response.headers['access-control-allow-origin']).toBe(LOCALHOST_ORIGIN);
  });

  it('never allows an arbitrary disallowed origin through when unconfigured', async () => {
    const response = await request(app.getHttpServer()).get(TAG_PATH).set('Origin', DISALLOWED_ORIGIN);
    expect(response.headers['access-control-allow-origin']).toBeUndefined();
  });
});
