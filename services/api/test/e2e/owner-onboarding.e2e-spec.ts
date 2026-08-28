/**
 * Purpose: E2E flow 1 — owner onboarding via phone OTP, session listing,
 * refresh, and sign-out.
 */
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from '../support/test-app';
import { readLatestOtpCode } from '../support/otp-helper';
import { uniqueNepaliPhone } from '../support/fixtures';

describe('Owner onboarding (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('requests and verifies an OTP, issuing a session', async () => {
    const phoneE164 = uniqueNepaliPhone();

    const requestResponse = await request(app.getHttpServer()).post('/v1/auth/otp/request').send({ phoneE164 });
    expect(requestResponse.status).toBe(201);
    expect(requestResponse.body).toEqual({ sent: true, retryAfterSeconds: expect.any(Number) });

    const code = await readLatestOtpCode(app);
    const verifyResponse = await request(app.getHttpServer()).post('/v1/auth/otp/verify').send({ phoneE164, code });
    expect(verifyResponse.status).toBe(201);
    expect(verifyResponse.body.accessToken).toEqual(expect.any(String));
    expect(verifyResponse.body.refreshToken).toEqual(expect.any(String));

    const sessions = await request(app.getHttpServer())
      .get('/v1/auth/sessions')
      .set('Authorization', `Bearer ${verifyResponse.body.accessToken}`);
    expect(sessions.status).toBe(200);
    expect(sessions.body).toHaveLength(1);
    expect(sessions.body[0].isCurrent).toBe(true);
  });

  it('returns the same response shape for an unregistered vs. registered phone (no enumeration oracle)', async () => {
    const unregistered = await request(app.getHttpServer())
      .post('/v1/auth/otp/request')
      .send({ phoneE164: uniqueNepaliPhone() });
    const registeredPhone = uniqueNepaliPhone();
    await request(app.getHttpServer()).post('/v1/auth/otp/request').send({ phoneE164: registeredPhone });
    const code = await readLatestOtpCode(app);
    await request(app.getHttpServer()).post('/v1/auth/otp/verify').send({ phoneE164: registeredPhone, code });
    const registered = await request(app.getHttpServer())
      .post('/v1/auth/otp/request')
      .send({ phoneE164: registeredPhone });

    expect(Object.keys(unregistered.body).sort()).toEqual(Object.keys(registered.body).sort());
    expect(unregistered.status).toBe(registered.status);
  });

  it('rejects an invalid OTP code', async () => {
    const phoneE164 = uniqueNepaliPhone();
    await request(app.getHttpServer()).post('/v1/auth/otp/request').send({ phoneE164 });
    const response = await request(app.getHttpServer()).post('/v1/auth/otp/verify').send({ phoneE164, code: '000000' });
    expect(response.status).toBe(401);
  });

  it('rotates the refresh token and rejects the old one on reuse', async () => {
    const phoneE164 = uniqueNepaliPhone();
    await request(app.getHttpServer()).post('/v1/auth/otp/request').send({ phoneE164 });
    const code = await readLatestOtpCode(app);
    const { body: tokens } = await request(app.getHttpServer()).post('/v1/auth/otp/verify').send({ phoneE164, code });

    const refreshed = await request(app.getHttpServer()).post('/v1/auth/refresh').send({ refreshToken: tokens.refreshToken });
    expect(refreshed.status).toBe(201);
    expect(refreshed.body.refreshToken).not.toBe(tokens.refreshToken);

    const reused = await request(app.getHttpServer()).post('/v1/auth/refresh').send({ refreshToken: tokens.refreshToken });
    expect(reused.status).toBe(401);
  });

  it('signs out of all devices, invalidating every session', async () => {
    const phoneE164 = uniqueNepaliPhone();
    await request(app.getHttpServer()).post('/v1/auth/otp/request').send({ phoneE164 });
    const code = await readLatestOtpCode(app);
    const { body: tokens } = await request(app.getHttpServer()).post('/v1/auth/otp/verify').send({ phoneE164, code });

    await request(app.getHttpServer())
      .post('/v1/auth/logout-all')
      .set('Authorization', `Bearer ${tokens.accessToken}`)
      .expect(201);

    const refreshAfterLogoutAll = await request(app.getHttpServer()).post('/v1/auth/refresh').send({ refreshToken: tokens.refreshToken });
    expect(refreshAfterLogoutAll.status).toBe(401);
  });
});
