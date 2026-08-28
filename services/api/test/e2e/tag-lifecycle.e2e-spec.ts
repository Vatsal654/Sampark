/**
 * Purpose: E2E flow 2 (tag activation) and flow 6 (pause), plus lost/
 * replacement lifecycle transitions.
 */
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from '../support/test-app';
import { createVehicle, issueTag, signOpaqueId, signUpAdmin, signUpOwner } from '../support/fixtures';

describe('Tag lifecycle (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('activates a tag with a valid PIN and rejects an invalid one', async () => {
    const owner = await signUpOwner(app);
    const vehicle = await createVehicle(app, owner.accessToken);
    const admin = await signUpAdmin(app);
    const { opaqueId, activationPin } = await issueTag(app, admin.accessToken);

    const badPin = await request(app.getHttpServer())
      .post('/v1/owner/tags/activate')
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .send({ opaqueId, activationPin: '000000', vehicleId: vehicle.id });
    expect(badPin.status).toBe(401);

    const activated = await request(app.getHttpServer())
      .post('/v1/owner/tags/activate')
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .send({ opaqueId, activationPin, vehicleId: vehicle.id });
    expect(activated.status).toBe(201);
    expect(activated.body.status).toBe('active');

    const signature = signOpaqueId(opaqueId);
    const publicView = await request(app.getHttpServer()).get(`/v1/public/tags/${opaqueId}?sig=${signature}`);
    expect(publicView.status).toBe(200);
    expect(publicView.body.status).toBe('active');
    expect(publicView.body.vehicleDisplayLabel).toBe('Test Scooter');
  });

  it('rejects reusing the same opaque ID once already active (no takeover)', async () => {
    const owner = await signUpOwner(app);
    const otherOwner = await signUpOwner(app);
    const vehicle = await createVehicle(app, owner.accessToken);
    const otherVehicle = await createVehicle(app, otherOwner.accessToken);
    const admin = await signUpAdmin(app);
    const { opaqueId, activationPin } = await issueTag(app, admin.accessToken);

    await request(app.getHttpServer())
      .post('/v1/owner/tags/activate')
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .send({ opaqueId, activationPin, vehicleId: vehicle.id })
      .expect(201);

    const takeoverAttempt = await request(app.getHttpServer())
      .post('/v1/owner/tags/activate')
      .set('Authorization', `Bearer ${otherOwner.accessToken}`)
      .send({ opaqueId, activationPin, vehicleId: otherVehicle.id });
    expect(takeoverAttempt.status).toBe(403);
  });

  it('pauses and resumes a tag, reflected in the public view', async () => {
    const owner = await signUpOwner(app);
    const vehicle = await createVehicle(app, owner.accessToken);
    const admin = await signUpAdmin(app);
    const { opaqueId, activationPin } = await issueTag(app, admin.accessToken);
    await request(app.getHttpServer())
      .post('/v1/owner/tags/activate')
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .send({ opaqueId, activationPin, vehicleId: vehicle.id });

    const listResponse = await request(app.getHttpServer())
      .get('/v1/owner/vehicles')
      .set('Authorization', `Bearer ${owner.accessToken}`);
    const tagId = listResponse.body[0].tagId as string;

    await request(app.getHttpServer())
      .post(`/v1/owner/tags/${tagId}/pause`)
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .expect(201);

    const signature = signOpaqueId(opaqueId);
    const pausedView = await request(app.getHttpServer()).get(`/v1/public/tags/${opaqueId}?sig=${signature}`);
    expect(pausedView.body.status).toBe('paused');

    await request(app.getHttpServer())
      .post(`/v1/owner/tags/${tagId}/resume`)
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .expect(201);
    const resumedView = await request(app.getHttpServer()).get(`/v1/public/tags/${opaqueId}?sig=${signature}`);
    expect(resumedView.body.status).toBe('active');
  });

  it('reports a tag lost, making it unavailable to scanners', async () => {
    const owner = await signUpOwner(app);
    const vehicle = await createVehicle(app, owner.accessToken);
    const admin = await signUpAdmin(app);
    const { opaqueId, activationPin } = await issueTag(app, admin.accessToken);
    await request(app.getHttpServer())
      .post('/v1/owner/tags/activate')
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .send({ opaqueId, activationPin, vehicleId: vehicle.id });

    const listResponse = await request(app.getHttpServer())
      .get('/v1/owner/vehicles')
      .set('Authorization', `Bearer ${owner.accessToken}`);
    const tagId = listResponse.body[0].tagId as string;

    await request(app.getHttpServer())
      .post(`/v1/owner/tags/${tagId}/report-lost`)
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .expect(201);

    const signature = signOpaqueId(opaqueId);
    const view = await request(app.getHttpServer()).get(`/v1/public/tags/${opaqueId}?sig=${signature}`);
    expect(view.body.status).toBe('reported_lost');
    expect(view.body.vehicleDisplayLabel).toBeNull();
  });
});
