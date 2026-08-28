/**
 * Purpose: Security regression — admin RBAC enforcement and break-glass
 * self-approval prevention (docs/SECURITY.md "Admin break-glass").
 */
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from '../support/test-app';
import { signUpAdmin } from '../support/fixtures';

describe('Admin auth and RBAC (security)', () => {
  let app: INestApplication;
  beforeAll(async () => {
    app = await createTestApp();
  });
  afterAll(async () => {
    await app.close();
  });

  it('rejects an admin route with no token', async () => {
    const response = await request(app.getHttpServer()).get('/v1/admin/tags');
    expect(response.status).toBe(401);
  });

  it('rejects an owner access token presented on an admin route', async () => {
    const response = await request(app.getHttpServer()).get('/v1/admin/tags').set('Authorization', 'Bearer not-a-real-admin-token');
    expect(response.status).toBe(401);
  });

  it('denies a support_agent from updating feature flags (role lacks the permission)', async () => {
    const supportAgent = await signUpAdmin(app, 'support_agent');
    const response = await request(app.getHttpServer())
      .post('/v1/admin/feature-flags/document_vault')
      .set('Authorization', `Bearer ${supportAgent.accessToken}`)
      .send({ enabled: true, reason: 'Trying to enable without permission' });
    expect(response.status).toBe(403);
  });

  it('allows a security_admin to update feature flags', async () => {
    const securityAdmin = await signUpAdmin(app, 'security_admin');
    const response = await request(app.getHttpServer())
      .get('/v1/admin/feature-flags')
      .set('Authorization', `Bearer ${securityAdmin.accessToken}`);
    expect(response.status).toBe(200);
  });

  it('refuses to enable a flag whose underlying provider capability is not configured', async () => {
    const securityAdmin = await signUpAdmin(app, 'security_admin');
    const response = await request(app.getHttpServer())
      .post('/v1/admin/feature-flags/real_sms')
      .set('Authorization', `Bearer ${securityAdmin.accessToken}`)
      .send({ enabled: true, reason: 'Attempting to enable real SMS with no provider configured' });
    expect(response.status).toBe(403);
  });

  it('prevents a break-glass request from approving itself', async () => {
    const securityAdmin = await signUpAdmin(app, 'security_admin');
    const request1 = await request(app.getHttpServer())
      .post('/v1/admin/break-glass/request')
      .set('Authorization', `Bearer ${securityAdmin.accessToken}`)
      .send({ targetType: 'document', targetId: '00000000-0000-0000-0000-000000000000', reason: 'Investigating a support ticket about a lost document' });
    expect(request1.status).toBe(201);

    const selfApprove = await request(app.getHttpServer())
      .post(`/v1/admin/break-glass/${request1.body.id}/approve`)
      .set('Authorization', `Bearer ${securityAdmin.accessToken}`);
    expect(selfApprove.status).toBe(400);
  });

  it('allows a second security_admin to approve a break-glass request', async () => {
    const requester = await signUpAdmin(app, 'security_admin');
    const approver = await signUpAdmin(app, 'security_admin');
    const requestResponse = await request(app.getHttpServer())
      .post('/v1/admin/break-glass/request')
      .set('Authorization', `Bearer ${requester.accessToken}`)
      .send({ targetType: 'document', targetId: '00000000-0000-0000-0000-000000000001', reason: 'Investigating a second support ticket' });

    const approval = await request(app.getHttpServer())
      .post(`/v1/admin/break-glass/${requestResponse.body.id}/approve`)
      .set('Authorization', `Bearer ${approver.accessToken}`);
    expect(approval.status).toBe(201);
    expect(approval.body.status).toBe('approved');
  });
});
