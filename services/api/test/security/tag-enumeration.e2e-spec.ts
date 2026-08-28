/**
 * Purpose: Security regression — QR ID enumeration defenses
 * (docs/THREAT_MODEL.md §3.1): an unknown ID and a known ID with a bad
 * signature must be indistinguishable, and public-tag reads are
 * rate-limited.
 */
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { generateOpaqueTagId } from '@sampark/shared-security';
import { createTestApp } from '../support/test-app';
import { createVehicle, issueTag, signOpaqueId, signUpAdmin, signUpOwner } from '../support/fixtures';

describe('Tag enumeration defenses (security)', () => {
  let app: INestApplication;
  beforeAll(async () => {
    app = await createTestApp();
  });
  afterAll(async () => {
    await app.close();
  });

  it('returns an identical 404 shape for an unknown ID and a real ID with a forged signature', async () => {
    const unknownId = generateOpaqueTagId();
    const unknownResponse = await request(app.getHttpServer()).get(`/v1/public/tags/${unknownId}?sig=forged`);

    const admin = await signUpAdmin(app);
    const { opaqueId } = await issueTag(app, admin.accessToken);
    const forgedSigResponse = await request(app.getHttpServer()).get(`/v1/public/tags/${opaqueId}?sig=forged-signature-value`);

    expect(unknownResponse.status).toBe(404);
    expect(forgedSigResponse.status).toBe(404);
    expect(Object.keys(unknownResponse.body).sort()).toEqual(Object.keys(forgedSigResponse.body).sort());
  });

  it('never reveals owner data even with a correct signature before activation', async () => {
    const admin = await signUpAdmin(app);
    const { opaqueId } = await issueTag(app, admin.accessToken);
    const signature = signOpaqueId(opaqueId);

    const response = await request(app.getHttpServer()).get(`/v1/public/tags/${opaqueId}?sig=${signature}`);
    expect(response.status).toBe(200);
    expect(response.body.vehicleDisplayLabel).toBeNull();
    expect(JSON.stringify(response.body)).not.toMatch(/phone|plate|name|address/i);
  });

  it('rate-limits repeated lookups against the same tag', async () => {
    const owner = await signUpOwner(app);
    const vehicle = await createVehicle(app, owner.accessToken);
    const admin = await signUpAdmin(app);
    const { opaqueId, activationPin } = await issueTag(app, admin.accessToken);
    await request(app.getHttpServer())
      .post('/v1/owner/tags/activate')
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .send({ opaqueId, activationPin, vehicleId: vehicle.id });
    const signature = signOpaqueId(opaqueId);

    const results: number[] = [];
    for (let i = 0; i < 35; i += 1) {
      const response = await request(app.getHttpServer()).get(`/v1/public/tags/${opaqueId}?sig=${signature}`);
      results.push(response.status);
    }
    expect(results).toContain(400);
  });
});
