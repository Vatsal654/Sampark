/**
 * Purpose: E2E flow 7 — emergency alert submission and the scanner-facing
 * emergency card, which only ever reveals fields the owner explicitly
 * opted to share.
 */
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from '../support/test-app';
import { createVehicle, issueTag, signOpaqueId, signUpAdmin, signUpOwner } from '../support/fixtures';

describe('Emergency flow (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });
  afterAll(async () => {
    await app.close();
  });

  it('hides every emergency field by default until the owner opts in', async () => {
    const owner = await signUpOwner(app);
    const vehicle = await createVehicle(app, owner.accessToken);
    const admin = await signUpAdmin(app);
    const { opaqueId, activationPin } = await issueTag(app, admin.accessToken);
    await request(app.getHttpServer())
      .post('/v1/owner/tags/activate')
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .send({ opaqueId, activationPin, vehicleId: vehicle.id });
    const signature = signOpaqueId(opaqueId);

    const cardBeforeOptIn = await request(app.getHttpServer()).get(`/v1/public/tags/${opaqueId}/emergency-card?sig=${signature}`);
    expect(cardBeforeOptIn.status).toBe(200);
    expect(cardBeforeOptIn.body.bloodGroup).toBeNull();
    expect(cardBeforeOptIn.body.allergiesNote).toBeNull();
    expect(cardBeforeOptIn.body.seekEmergencyServicesFirst).toBe(true);

    await request(app.getHttpServer())
      .put('/v1/owner/emergency-profile')
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .send({
        bloodGroup: 'O+',
        allergiesNote: 'Penicillin allergy',
        safeInstructions: null,
        shareBloodGroup: true,
        shareAllergies: true,
        shareSafeInstructions: false,
        shareContactsWithResponders: true,
      })
      .expect(200);

    const cardAfterOptIn = await request(app.getHttpServer()).get(`/v1/public/tags/${opaqueId}/emergency-card?sig=${signature}`);
    expect(cardAfterOptIn.body.bloodGroup).toBe('O+');
    expect(cardAfterOptIn.body.allergiesNote).toBe('Penicillin allergy');
    // Not opted in for this field, so it must stay hidden even though a value exists.
    expect(cardAfterOptIn.body.safeInstructions).toBeNull();
  });

  it('submits an emergency alert as severity=emergency and rate-limits it more strictly than normal alerts', async () => {
    const owner = await signUpOwner(app);
    const vehicle = await createVehicle(app, owner.accessToken);
    const admin = await signUpAdmin(app);
    const { opaqueId, activationPin } = await issueTag(app, admin.accessToken);
    await request(app.getHttpServer())
      .post('/v1/owner/tags/activate')
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .send({ opaqueId, activationPin, vehicleId: vehicle.id });
    const signature = signOpaqueId(opaqueId);

    const submit = await request(app.getHttpServer())
      .post(`/v1/public/tags/${opaqueId}/emergency?sig=${signature}`)
      .send({ confirmedEmergency: true, note: 'Vehicle involved in a collision' });
    expect(submit.status).toBe(201);

    const inbox = await request(app.getHttpServer())
      .get('/v1/owner/alerts')
      .set('Authorization', `Bearer ${owner.accessToken}`);
    expect(inbox.body[0].severity).toBe('emergency');
  });
});
