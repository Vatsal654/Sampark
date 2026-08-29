/**
 * Purpose: E2E flow 3 (scanner sends an anonymous alert) and flow 4
 * (owner receives it in their inbox with per-channel delivery rows).
 */
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from '../support/test-app';
import { createVehicle, issueTag, signOpaqueId, signUpAdmin, signUpOwner } from '../support/fixtures';

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
  return { owner, opaqueId, signature: signOpaqueId(opaqueId) };
}

describe('Scanner alerts (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('lets an anonymous scanner submit an alert with no login required', async () => {
    const { owner, opaqueId, signature } = await activateTag(app);

    const submit = await request(app.getHttpServer())
      .post(`/v1/public/tags/${opaqueId}/alerts?sig=${signature}`)
      .send({ category: 'lights_on', note: 'Headlights left on' });
    expect(submit.status).toBe(201);
    expect(submit.body).toEqual({ alertId: expect.any(String), acknowledged: true });
    // No scanner phone number or identity was ever supplied — the endpoint has no such field.

    const inbox = await request(app.getHttpServer())
      .get('/v1/owner/alerts')
      .set('Authorization', `Bearer ${owner.accessToken}`);
    expect(inbox.status).toBe(200);
    expect(inbox.body).toHaveLength(1);
    expect(inbox.body[0].category).toBe('lights_on');
    expect(inbox.body[0].note).toBe('Headlights left on');
    expect(inbox.body[0].deliveries.length).toBeGreaterThan(0);
    // The owner-facing view never carries a scanner phone/identity field either.
    expect(inbox.body[0]).not.toHaveProperty('scannerPhone');
  });

  it('does not attach precise location unless the scanner explicitly shared it', async () => {
    const { owner, opaqueId, signature } = await activateTag(app);

    await request(app.getHttpServer())
      .post(`/v1/public/tags/${opaqueId}/alerts?sig=${signature}`)
      .send({ category: 'parking_concern' })
      .expect(201);

    const inbox = await request(app.getHttpServer())
      .get('/v1/owner/alerts')
      .set('Authorization', `Bearer ${owner.accessToken}`);
    expect(inbox.body[0].scannerLocationExact).toBeNull();
  });

  it('attaches exact location only when the scanner opts in for that event', async () => {
    const { owner, opaqueId, signature } = await activateTag(app);

    await request(app.getHttpServer())
      .post(`/v1/public/tags/${opaqueId}/alerts?sig=${signature}`)
      .send({ category: 'blocking_access', location: { latitude: 27.7, longitude: 85.3 } })
      .expect(201);

    const inbox = await request(app.getHttpServer())
      .get('/v1/owner/alerts')
      .set('Authorization', `Bearer ${owner.accessToken}`);
    expect(inbox.body[0].scannerLocationExact).toEqual({ latitude: 27.7, longitude: 85.3 });
  });

  it('lets the owner acknowledge and archive an alert', async () => {
    const { owner, opaqueId, signature } = await activateTag(app);
    const submit = await request(app.getHttpServer())
      .post(`/v1/public/tags/${opaqueId}/alerts?sig=${signature}`)
      .send({ category: 'other', note: 'Odd noise' });
    const alertId = submit.body.alertId as string;

    const ack = await request(app.getHttpServer())
      .post(`/v1/owner/alerts/${alertId}/acknowledge`)
      .set('Authorization', `Bearer ${owner.accessToken}`);
    expect(ack.status).toBe(201);
    expect(ack.body.acknowledgedAt).toEqual(expect.any(String));

    const archive = await request(app.getHttpServer())
      .post(`/v1/owner/alerts/${alertId}/archive`)
      .set('Authorization', `Bearer ${owner.accessToken}`);
    expect(archive.status).toBe(201);
  });

  it('persists acknowledged/archived state across a fresh GET, not just in the mutation response', async () => {
    const { owner, opaqueId, signature } = await activateTag(app);
    const submit = await request(app.getHttpServer())
      .post(`/v1/public/tags/${opaqueId}/alerts?sig=${signature}`)
      .send({ category: 'other' });
    const alertId = submit.body.alertId as string;

    await request(app.getHttpServer())
      .post(`/v1/owner/alerts/${alertId}/acknowledge`)
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .expect(201);
    await request(app.getHttpServer())
      .post(`/v1/owner/alerts/${alertId}/archive`)
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .expect(201);

    // A brand new GET (a different HTTP request entirely, simulating reopening the owner app)
    // must reflect both mutations from the database, not from anything held in memory across the
    // two prior requests.
    const inbox = await request(app.getHttpServer())
      .get('/v1/owner/alerts')
      .set('Authorization', `Bearer ${owner.accessToken}`);
    expect(inbox.body[0].acknowledgedAt).toEqual(expect.any(String));
    expect(inbox.body[0].archivedAt).toEqual(expect.any(String));
  });

  it('rejects out-of-range coordinates instead of silently storing or ignoring them', async () => {
    const { opaqueId, signature } = await activateTag(app);

    const response = await request(app.getHttpServer())
      .post(`/v1/public/tags/${opaqueId}/alerts?sig=${signature}`)
      .send({ category: 'blocking_access', location: { latitude: 200, longitude: 85.3 } });
    expect(response.status).toBe(400);
  });

  it('never lets one owner see, acknowledge, or archive another owner\'s alert (or its location)', async () => {
    const { opaqueId, signature } = await activateTag(app);
    const submit = await request(app.getHttpServer())
      .post(`/v1/public/tags/${opaqueId}/alerts?sig=${signature}`)
      .send({ category: 'blocking_access', location: { latitude: 27.7, longitude: 85.3 } });
    const alertId = submit.body.alertId as string;

    const otherOwner = await signUpOwner(app);

    const inbox = await request(app.getHttpServer())
      .get('/v1/owner/alerts')
      .set('Authorization', `Bearer ${otherOwner.accessToken}`);
    expect(inbox.status).toBe(200);
    expect(inbox.body).toEqual([]); // the other owner's inbox never contains this alert or its location at all

    const ack = await request(app.getHttpServer())
      .post(`/v1/owner/alerts/${alertId}/acknowledge`)
      .set('Authorization', `Bearer ${otherOwner.accessToken}`);
    expect(ack.status).toBe(403);

    const archive = await request(app.getHttpServer())
      .post(`/v1/owner/alerts/${alertId}/archive`)
      .set('Authorization', `Bearer ${otherOwner.accessToken}`);
    expect(archive.status).toBe(403);
  });

  it('rejects an alert against a tag that is not active', async () => {
    const admin = await signUpAdmin(app);
    const { opaqueId } = await issueTag(app, admin.accessToken); // status: issued, not activated
    const signature = signOpaqueId(opaqueId);

    const response = await request(app.getHttpServer())
      .post(`/v1/public/tags/${opaqueId}/alerts?sig=${signature}`)
      .send({ category: 'lights_on' });
    expect(response.status).toBe(403);
  });
});
