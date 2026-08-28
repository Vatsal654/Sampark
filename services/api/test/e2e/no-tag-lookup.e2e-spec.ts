/**
 * Purpose: E2E flow 10 — the no-tag lookup feature stays fully disabled
 * by default, per docs/DECISIONS.md ADR-5.
 */
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from '../support/test-app';
import { signUpOwner } from '../support/fixtures';

describe('No-tag vehicle lookup (e2e, disabled by default)', () => {
  let app: INestApplication;
  beforeAll(async () => {
    app = await createTestApp();
  });
  afterAll(async () => {
    await app.close();
  });

  it('refuses every request while FEATURE_NO_TAG_LOOKUP is off, never returning owner data', async () => {
    const owner = await signUpOwner(app);
    const response = await request(app.getHttpServer())
      .post('/v1/owner/no-tag-lookup')
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .send({ plateNumber: 'BA2PA9999', reason: 'Vehicle blocking my driveway for over an hour' });

    expect(response.status).toBe(403);
    expect(JSON.stringify(response.body)).not.toMatch(/name|phone|address/i);
  });

  it('requires authentication even while disabled', async () => {
    const response = await request(app.getHttpServer())
      .post('/v1/owner/no-tag-lookup')
      .send({ plateNumber: 'BA2PA9999', reason: 'no auth header supplied here' });
    expect(response.status).toBe(401);
  });
});
