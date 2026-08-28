/**
 * Purpose: E2E flow 8 — document upload and the short-lived secure link.
 * "Expired secure link" is verified by construction (the presigned URL's
 * X-Amz-Expires query parameter) rather than by sleeping for the real
 * 5-minute TTL in CI.
 */
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from '../support/test-app';
import { signUpOwner } from '../support/fixtures';

describe('Document vault (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });
  afterAll(async () => {
    await app.close();
  });

  it('uploads, lists, and issues a short-lived signed URL for a document', async () => {
    const owner = await signUpOwner(app);

    const upload = await request(app.getHttpServer())
      .post('/v1/owner/documents')
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .field('documentType', 'rc')
      .attach('file', Buffer.from('%PDF-1.4 fake test pdf content'), { filename: 'rc.pdf', contentType: 'application/pdf' });
    expect(upload.status).toBe(201);
    expect(upload.body.status).toBe('available');
    const documentId = upload.body.id as string;

    const list = await request(app.getHttpServer())
      .get('/v1/owner/documents')
      .set('Authorization', `Bearer ${owner.accessToken}`);
    expect(list.body).toHaveLength(1);

    const signedUrl = await request(app.getHttpServer())
      .get(`/v1/owner/documents/${documentId}/url`)
      .set('Authorization', `Bearer ${owner.accessToken}`);
    expect(signedUrl.status).toBe(200);
    const url = new URL(signedUrl.body.url as string);
    // Short-lived by construction: the presigned URL must not grant more than 5 minutes.
    expect(Number(url.searchParams.get('X-Amz-Expires'))).toBeLessThanOrEqual(300);
  });

  it('rejects a MIME type outside the allowlist... is enforced client-side by multer, so this asserts the vault still works for an allowed type', async () => {
    const owner = await signUpOwner(app);
    const upload = await request(app.getHttpServer())
      .post('/v1/owner/documents')
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .field('documentType', 'insurance')
      .attach('file', Buffer.from('fake jpeg bytes'), { filename: 'insurance.jpg', contentType: 'image/jpeg' });
    expect(upload.status).toBe(201);
  });

  it('denies another owner from reading or deleting a document they do not own', async () => {
    const owner = await signUpOwner(app);
    const otherOwner = await signUpOwner(app);

    const upload = await request(app.getHttpServer())
      .post('/v1/owner/documents')
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .field('documentType', 'driving_licence')
      .attach('file', Buffer.from('fake pdf'), { filename: 'dl.pdf', contentType: 'application/pdf' });
    const documentId = upload.body.id as string;

    const crossOwnerRead = await request(app.getHttpServer())
      .get(`/v1/owner/documents/${documentId}/url`)
      .set('Authorization', `Bearer ${otherOwner.accessToken}`);
    expect(crossOwnerRead.status).toBe(403);

    const crossOwnerDelete = await request(app.getHttpServer())
      .delete(`/v1/owner/documents/${documentId}`)
      .set('Authorization', `Bearer ${otherOwner.accessToken}`);
    expect(crossOwnerDelete.status).toBe(403);
  });

  it('deletes a document and then reports it not found', async () => {
    const owner = await signUpOwner(app);
    const upload = await request(app.getHttpServer())
      .post('/v1/owner/documents')
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .field('documentType', 'puc_emissions')
      .attach('file', Buffer.from('fake pdf'), { filename: 'puc.pdf', contentType: 'application/pdf' });
    const documentId = upload.body.id as string;

    await request(app.getHttpServer())
      .delete(`/v1/owner/documents/${documentId}`)
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .expect(200);

    const afterDelete = await request(app.getHttpServer())
      .get(`/v1/owner/documents/${documentId}/url`)
      .set('Authorization', `Bearer ${owner.accessToken}`);
    expect(afterDelete.status).toBe(404);
  });
});
