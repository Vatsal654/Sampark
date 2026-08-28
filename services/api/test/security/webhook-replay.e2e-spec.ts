/**
 * Purpose: Security regression — webhook forgery and replay
 * (docs/THREAT_MODEL.md §3.10): a bad signature is rejected, and a
 * previously-processed idempotency key is rejected on replay even with a
 * valid signature.
 */
import type { INestApplication } from '@nestjs/common';
import { createHmac } from 'node:crypto';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { createTestApp } from '../support/test-app';

function sign(idempotencyKey: string, eventType: string, timestamp: number, payload: Record<string, unknown>): string {
  const canonical = JSON.stringify({ idempotencyKey, eventType, timestamp, payload });
  return createHmac('sha256', process.env.PROVIDER_WEBHOOK_SECRET!).update(canonical).digest('hex');
}

describe('Webhook signature verification and replay protection (security)', () => {
  let app: INestApplication;
  beforeAll(async () => {
    app = await createTestApp();
  });
  afterAll(async () => {
    await app.close();
  });

  it('rejects a webhook with an invalid signature', async () => {
    const idempotencyKey = randomUUID();
    const timestamp = Math.floor(Date.now() / 1000);
    const payload = { foo: 'bar' };
    const response = await request(app.getHttpServer())
      .post('/v1/webhooks/sms')
      .send({ idempotencyKey, eventType: 'delivered', timestamp, signature: 'not-the-real-signature', payload });
    expect(response.status).toBe(400);
  });

  it('rejects a webhook whose timestamp is outside the tolerance window', async () => {
    const idempotencyKey = randomUUID();
    const staleTimestamp = Math.floor(Date.now() / 1000) - 10 * 60;
    const payload = { foo: 'bar' };
    const signature = sign(idempotencyKey, 'delivered', staleTimestamp, payload);
    const response = await request(app.getHttpServer())
      .post('/v1/webhooks/sms')
      .send({ idempotencyKey, eventType: 'delivered', timestamp: staleTimestamp, signature, payload });
    expect(response.status).toBe(400);
  });

  it('accepts a validly signed webhook once, then rejects the exact same event as a replay', async () => {
    const idempotencyKey = randomUUID();
    const timestamp = Math.floor(Date.now() / 1000);
    const payload = { foo: 'bar' };
    const signature = sign(idempotencyKey, 'delivered', timestamp, payload);
    const body = { idempotencyKey, eventType: 'delivered', timestamp, signature, payload };

    const first = await request(app.getHttpServer()).post('/v1/webhooks/sms').send(body);
    expect(first.status).toBe(201);

    const replay = await request(app.getHttpServer()).post('/v1/webhooks/sms').send(body);
    expect(replay.status).toBe(409);
  });
});
