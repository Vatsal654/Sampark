/**
 * Purpose: Security regression — OTP abuse controls (docs/THREAT_MODEL.md
 * §3.6): attempt lockout and resend cooldown.
 */
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { OTP_MAX_ATTEMPTS } from '@sampark/shared-security';
import { createTestApp } from '../support/test-app';
import { uniqueNepaliPhone } from '../support/fixtures';

describe('OTP abuse controls (security)', () => {
  let app: INestApplication;
  beforeAll(async () => {
    app = await createTestApp();
  });
  afterAll(async () => {
    await app.close();
  });

  it('locks out after too many incorrect attempts, even with the eventual correct code', async () => {
    const phoneE164 = uniqueNepaliPhone();
    await request(app.getHttpServer()).post('/v1/auth/otp/request').send({ phoneE164 });

    for (let i = 0; i < OTP_MAX_ATTEMPTS; i += 1) {
      const response = await request(app.getHttpServer()).post('/v1/auth/otp/verify').send({ phoneE164, code: '000000' });
      expect(response.status).toBe(401);
    }

    // Read the real code only after exhausting attempts, to prove lockout applies even to a
    // subsequently-correct guess.
    const simulator = await request(app.getHttpServer()).get('/v1/dev/simulator');
    const latestOtpEvent = (simulator.body.events as Array<{ channel: string; summary: string }>).find(
      (event) => event.channel === 'otp',
    )!;
    const realCode = /OTP (\d{6})/.exec(latestOtpEvent.summary)![1];

    const finalAttempt = await request(app.getHttpServer()).post('/v1/auth/otp/verify').send({ phoneE164, code: realCode });
    expect(finalAttempt.status).toBe(401);
  });

  it('returns the same response while cooling down from a recent request (no resend-spam oracle)', async () => {
    const phoneE164 = uniqueNepaliPhone();
    const first = await request(app.getHttpServer()).post('/v1/auth/otp/request').send({ phoneE164 });
    const second = await request(app.getHttpServer()).post('/v1/auth/otp/request').send({ phoneE164 });

    expect(first.status).toBe(second.status);
    expect(Object.keys(first.body).sort()).toEqual(Object.keys(second.body).sort());
  });

  it('rejects an OTP request for a non-Nepali number at the validation layer', async () => {
    const response = await request(app.getHttpServer()).post('/v1/auth/otp/request').send({ phoneE164: '+14155552671' });
    expect(response.status).toBe(400);
  });
});
