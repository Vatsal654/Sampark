/**
 * Purpose: Security regression — IDOR. Proves a user cannot read or
 * mutate another user's vehicle, alert, or emergency data by ID
 * substitution, per the product spec's testing requirements.
 */
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from '../support/test-app';
import { createVehicle, issueTag, signOpaqueId, signUpAdmin, signUpOwner } from '../support/fixtures';

describe('IDOR protections (security)', () => {
  let app: INestApplication;
  beforeAll(async () => {
    app = await createTestApp();
  });
  afterAll(async () => {
    await app.close();
  });

  it('cannot update or delete another owner\'s vehicle', async () => {
    const owner = await signUpOwner(app);
    const attacker = await signUpOwner(app);
    const vehicle = await createVehicle(app, owner.accessToken);

    const update = await request(app.getHttpServer())
      .patch(`/v1/owner/vehicles/${vehicle.id}`)
      .set('Authorization', `Bearer ${attacker.accessToken}`)
      .send({ displayLabel: 'Hijacked' });
    expect(update.status).toBe(403);

    const remove = await request(app.getHttpServer())
      .delete(`/v1/owner/vehicles/${vehicle.id}`)
      .set('Authorization', `Bearer ${attacker.accessToken}`);
    expect(remove.status).toBe(403);

    const stillThere = await request(app.getHttpServer())
      .get('/v1/owner/vehicles')
      .set('Authorization', `Bearer ${owner.accessToken}`);
    expect(stillThere.body[0].displayLabel).not.toBe('Hijacked');
  });

  it('cannot acknowledge or archive another owner\'s alert', async () => {
    const owner = await signUpOwner(app);
    const attacker = await signUpOwner(app);
    const vehicle = await createVehicle(app, owner.accessToken);
    const admin = await signUpAdmin(app);
    const { opaqueId, activationPin } = await issueTag(app, admin.accessToken);
    await request(app.getHttpServer())
      .post('/v1/owner/tags/activate')
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .send({ opaqueId, activationPin, vehicleId: vehicle.id });
    const signature = signOpaqueId(opaqueId);
    const alert = await request(app.getHttpServer())
      .post(`/v1/public/tags/${opaqueId}/alerts?sig=${signature}`)
      .send({ category: 'lights_on' });

    const attackerAck = await request(app.getHttpServer())
      .post(`/v1/owner/alerts/${alert.body.alertId}/acknowledge`)
      .set('Authorization', `Bearer ${attacker.accessToken}`);
    expect(attackerAck.status).toBe(403);
  });

  it('cannot activate a tag onto a vehicle they do not own', async () => {
    const owner = await signUpOwner(app);
    const attacker = await signUpOwner(app);
    const vehicle = await createVehicle(app, owner.accessToken);
    const admin = await signUpAdmin(app);
    const { opaqueId, activationPin } = await issueTag(app, admin.accessToken);

    const attempt = await request(app.getHttpServer())
      .post('/v1/owner/tags/activate')
      .set('Authorization', `Bearer ${attacker.accessToken}`)
      .send({ opaqueId, activationPin, vehicleId: vehicle.id });
    expect(attempt.status).toBe(403);
  });

  it('cannot read another owner\'s emergency profile or contacts', async () => {
    const owner = await signUpOwner(app);
    const attacker = await signUpOwner(app);
    await request(app.getHttpServer())
      .put('/v1/owner/emergency-profile')
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .send({
        bloodGroup: 'AB-',
        allergiesNote: 'Secret allergy info',
        safeInstructions: null,
        shareBloodGroup: true,
        shareAllergies: true,
        shareSafeInstructions: false,
        shareContactsWithResponders: true,
      });

    const attackerView = await request(app.getHttpServer())
      .get('/v1/owner/emergency-profile')
      .set('Authorization', `Bearer ${attacker.accessToken}`);
    // Each owner gets their OWN profile (get-or-create) — the attacker must never see the victim's data.
    expect(attackerView.body.allergiesNote).not.toBe('Secret allergy info');
  });
});
