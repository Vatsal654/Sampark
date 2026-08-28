/**
 * Purpose: Security regression — public free-text input validation
 * (docs/THREAT_MODEL.md §3.7). The API is JSON-only so there is no
 * server-side HTML rendering to inject into; this test instead proves
 * the length/shape guards zod enforces at the boundary actually reject
 * malformed input rather than silently truncating or coercing it.
 */
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from '../support/test-app';
import { createVehicle, issueTag, signOpaqueId, signUpAdmin, signUpOwner } from '../support/fixtures';

describe('Public input validation (security)', () => {
  let app: INestApplication;
  beforeAll(async () => {
    app = await createTestApp();
  });
  afterAll(async () => {
    await app.close();
  });

  it('rejects an alert with an unrecognized category rather than falling through to "other"', async () => {
    const owner = await signUpOwner(app);
    const vehicle = await createVehicle(app, owner.accessToken);
    const admin = await signUpAdmin(app);
    const { opaqueId, activationPin } = await issueTag(app, admin.accessToken);
    await request(app.getHttpServer())
      .post('/v1/owner/tags/activate')
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .send({ opaqueId, activationPin, vehicleId: vehicle.id });
    const signature = signOpaqueId(opaqueId);

    const response = await request(app.getHttpServer())
      .post(`/v1/public/tags/${opaqueId}/alerts?sig=${signature}`)
      .send({ category: '<script>alert(1)</script>' });
    expect(response.status).toBe(400);
  });

  it('rejects an oversized free-text note instead of truncating it silently', async () => {
    const owner = await signUpOwner(app);
    const vehicle = await createVehicle(app, owner.accessToken);
    const admin = await signUpAdmin(app);
    const { opaqueId, activationPin } = await issueTag(app, admin.accessToken);
    await request(app.getHttpServer())
      .post('/v1/owner/tags/activate')
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .send({ opaqueId, activationPin, vehicleId: vehicle.id });
    const signature = signOpaqueId(opaqueId);

    const response = await request(app.getHttpServer())
      .post(`/v1/public/tags/${opaqueId}/alerts?sig=${signature}`)
      .send({ category: 'other', note: 'x'.repeat(281) });
    expect(response.status).toBe(400);
  });

  it('stores an HTML-shaped note as inert text, never executed server-side, and returns it verbatim to the owner', async () => {
    const owner = await signUpOwner(app);
    const vehicle = await createVehicle(app, owner.accessToken);
    const admin = await signUpAdmin(app);
    const { opaqueId, activationPin } = await issueTag(app, admin.accessToken);
    await request(app.getHttpServer())
      .post('/v1/owner/tags/activate')
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .send({ opaqueId, activationPin, vehicleId: vehicle.id });
    const signature = signOpaqueId(opaqueId);
    const payload = '<img src=x onerror=alert(1)>';

    await request(app.getHttpServer())
      .post(`/v1/public/tags/${opaqueId}/alerts?sig=${signature}`)
      .send({ category: 'other', note: payload })
      .expect(201);

    const inbox = await request(app.getHttpServer())
      .get('/v1/owner/alerts')
      .set('Authorization', `Bearer ${owner.accessToken}`);
    // The API returns JSON, not rendered HTML — the payload is stored/returned as inert text.
    // apps/scanner-portal and apps/admin never use dangerouslySetInnerHTML on this field.
    expect(inbox.body[0].note).toBe(payload);
  });
});
