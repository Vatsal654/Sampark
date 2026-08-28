/**
 * Purpose: E2E coverage for tag order placement (mocked payment) and
 * owner-initiated support tickets (product spec §4H).
 */
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from '../support/test-app';
import { signUpOwner } from '../support/fixtures';

describe('Orders and support tickets (e2e)', () => {
  let app: INestApplication;
  beforeAll(async () => {
    app = await createTestApp();
  });
  afterAll(async () => {
    await app.close();
  });

  it('places an order which settles via the mock payment provider', async () => {
    const owner = await signUpOwner(app);
    const create = await request(app.getHttpServer())
      .post('/v1/owner/orders')
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .send({ quantity: 2 });
    expect(create.status).toBe(201);
    expect(create.body.status).toBe('paid');
    expect(create.body.amountNpr).toBeGreaterThan(0);

    const list = await request(app.getHttpServer())
      .get('/v1/owner/orders')
      .set('Authorization', `Bearer ${owner.accessToken}`);
    expect(list.body).toHaveLength(1);
  });

  it('creates and lists a support ticket scoped to the owner', async () => {
    const owner = await signUpOwner(app);
    const attacker = await signUpOwner(app);

    const create = await request(app.getHttpServer())
      .post('/v1/owner/support-tickets')
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .send({ subject: 'Tag will not activate', description: 'The activation PIN is rejected every time I try it.' });
    expect(create.status).toBe(201);
    expect(create.body.status).toBe('open');

    const ownList = await request(app.getHttpServer())
      .get('/v1/owner/support-tickets')
      .set('Authorization', `Bearer ${owner.accessToken}`);
    expect(ownList.body).toHaveLength(1);

    const attackerList = await request(app.getHttpServer())
      .get('/v1/owner/support-tickets')
      .set('Authorization', `Bearer ${attacker.accessToken}`);
    expect(attackerList.body).toHaveLength(0);
  });
});
