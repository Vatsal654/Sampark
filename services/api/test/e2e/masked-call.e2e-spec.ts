/**
 * Purpose: E2E flow 5 — scanner requests a masked callback using the mock
 * OTP provider, and the request is correctly gated by
 * FEATURE_LIVE_CALL_BRIDGING (off by default per docs/DECISIONS.md ADR-4).
 */
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from '../support/test-app';
import { createVehicle, issueTag, signOpaqueId, signUpAdmin, signUpOwner, uniqueNepaliPhone } from '../support/fixtures';
import { readLatestOtpCode } from '../support/otp-helper';

async function activateTag(app: INestApplication) {
  const owner = await signUpOwner(app);
  const vehicle = await createVehicle(app, owner.accessToken);
  const admin = await signUpAdmin(app);
  const { opaqueId, activationPin } = await issueTag(app, admin.accessToken);
  await request(app.getHttpServer())
    .post('/v1/owner/tags/activate')
    .set('Authorization', `Bearer ${owner.accessToken}`)
    .send({ opaqueId, activationPin, vehicleId: vehicle.id })
    .expect(201);
  return { opaqueId, signature: signOpaqueId(opaqueId) };
}

describe('Masked callback (e2e)', () => {
  describe('with live call bridging disabled (default)', () => {
    let app: INestApplication;
    beforeAll(async () => {
      app = await createTestApp();
    });
    afterAll(async () => {
      await app.close();
    });

    it('still allows OTP verification but refuses to create a call session', async () => {
      const { opaqueId, signature } = await activateTag(app);
      const scannerPhone = uniqueNepaliPhone();

      await request(app.getHttpServer())
        .post(`/v1/public/tags/${opaqueId}/call/otp?sig=${signature}`)
        .send({ phoneE164: scannerPhone })
        .expect(201);
      const code = await readLatestOtpCode(app);
      const verify = await request(app.getHttpServer())
        .post(`/v1/public/tags/${opaqueId}/call/verify?sig=${signature}`)
        .send({ phoneE164: scannerPhone, code });
      expect(verify.status).toBe(201);
      const scanSessionToken = verify.body.scanSessionToken as string;

      const callRequest = await request(app.getHttpServer())
        .post(`/v1/public/tags/${opaqueId}/call/request?sig=${signature}`)
        .send({ scanSessionToken, consentToConnect: true });
      expect(callRequest.status).toBe(403);
    });

    it('rejects an incorrect OTP code without revealing the correct one', async () => {
      const { opaqueId, signature } = await activateTag(app);
      const scannerPhone = uniqueNepaliPhone();
      await request(app.getHttpServer())
        .post(`/v1/public/tags/${opaqueId}/call/otp?sig=${signature}`)
        .send({ phoneE164: scannerPhone });
      const response = await request(app.getHttpServer())
        .post(`/v1/public/tags/${opaqueId}/call/verify?sig=${signature}`)
        .send({ phoneE164: scannerPhone, code: '999999' });
      expect(response.status).toBe(401);
    });
  });

  describe('with live call bridging enabled', () => {
    let app: INestApplication;
    beforeAll(async () => {
      process.env.FEATURE_LIVE_CALL_BRIDGING = 'true';
      app = await createTestApp();
    });
    afterAll(async () => {
      await app.close();
      process.env.FEATURE_LIVE_CALL_BRIDGING = 'false';
    });

    it('creates a pending call session and cannot reuse the scan session token', async () => {
      const { opaqueId, signature } = await activateTag(app);
      const scannerPhone = uniqueNepaliPhone();

      await request(app.getHttpServer())
        .post(`/v1/public/tags/${opaqueId}/call/otp?sig=${signature}`)
        .send({ phoneE164: scannerPhone });
      const code = await readLatestOtpCode(app);
      const verify = await request(app.getHttpServer())
        .post(`/v1/public/tags/${opaqueId}/call/verify?sig=${signature}`)
        .send({ phoneE164: scannerPhone, code });
      const scanSessionToken = verify.body.scanSessionToken as string;

      const firstRequest = await request(app.getHttpServer())
        .post(`/v1/public/tags/${opaqueId}/call/request?sig=${signature}`)
        .send({ scanSessionToken, consentToConnect: true });
      expect(firstRequest.status).toBe(201);
      expect(firstRequest.body.status).toBe('pending');

      const replay = await request(app.getHttpServer())
        .post(`/v1/public/tags/${opaqueId}/call/request?sig=${signature}`)
        .send({ scanSessionToken, consentToConnect: true });
      expect(replay.status).toBe(401);
    });
  });
});
