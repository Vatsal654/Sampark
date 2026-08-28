/**
 * Purpose: Shared test fixtures — random unique phone/plate generation
 * (since every spec shares one Postgres container) and a one-call owner
 * signup helper used by most e2e specs.
 */
import { randomInt, randomUUID } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import { getDataSourceToken } from '@nestjs/typeorm';
import type { DataSource } from 'typeorm';
import request from 'supertest';
import { readLatestOtpCode } from './otp-helper';
import { signTagReference } from '@sampark/shared-security';
import { AdminRoleEntity, AdminUserEntity } from '../../src/database/entities';

/** Computes the same tag signature the API would, using the test env's known TAG_SIGNING_SECRET. */
export function signOpaqueId(opaqueId: string): string {
  return signTagReference(opaqueId, process.env.TAG_SIGNING_SECRET!);
}

/**
 * Generates a unique, validly-shaped Nepali mobile number.
 * Uses process-wide crypto randomness rather than a simple counter — every
 * e2e/security spec file gets its own fresh Jest module registry (so a
 * module-level counter resets to 0 per file) but all files share ONE real
 * Postgres database for the whole test run, so a counter-based scheme
 * would collide across files. Random 9-digit suffixes make that
 * practically impossible within a single test run.
 */
export function uniqueNepaliPhone(): string {
  const suffix = randomInt(100000000, 999999999).toString();
  return `+9779${suffix}`;
}

export function uniquePlateNumber(): string {
  return `TEST${randomInt(0, 999999).toString().padStart(6, '0')}`;
}

export interface SignedUpOwner {
  accessToken: string;
  refreshToken: string;
  phoneE164: string;
}

export async function signUpOwner(app: INestApplication): Promise<SignedUpOwner> {
  const phoneE164 = uniqueNepaliPhone();
  await request(app.getHttpServer()).post('/v1/auth/otp/request').send({ phoneE164 }).expect(201);
  const code = await readLatestOtpCode(app);
  const verifyResponse = await request(app.getHttpServer())
    .post('/v1/auth/otp/verify')
    .send({ phoneE164, code })
    .expect(201);
  return {
    accessToken: verifyResponse.body.accessToken as string,
    refreshToken: verifyResponse.body.refreshToken as string,
    phoneE164,
  };
}

export async function createVehicle(app: INestApplication, accessToken: string, displayLabel = 'Test Scooter') {
  const response = await request(app.getHttpServer())
    .post('/v1/owner/vehicles')
    .set('Authorization', `Bearer ${accessToken}`)
    .send({ displayLabel, category: 'scooter', plateNumber: uniquePlateNumber() })
    .expect(201);
  return response.body as { id: string; tagId: string | null };
}

/** Seeds an admin_roles/admin_users row directly (bypassing any UI) and logs in via the mock-SSO endpoint. */
export async function signUpAdmin(app: INestApplication, role: AdminUserEntity['role'] = 'super_admin') {
  const dataSource = app.get<DataSource>(getDataSourceToken());
  const roleRepo = dataSource.getRepository(AdminRoleEntity);
  const adminRepo = dataSource.getRepository(AdminUserEntity);

  const existingRole = await roleRepo.findOne({ where: { key: role } });
  if (!existingRole) {
    await roleRepo.save(roleRepo.create({ key: role, description: role }));
  }

  // See uniqueNepaliPhone's comment: random, not counter-based, because every admin_users row
  // this creates lands in the one real Postgres database shared by the whole test run.
  const email = `test-admin-${randomUUID()}@example-test.local`;
  await adminRepo.save(
    adminRepo.create({ fullName: 'Test Admin', email, ssoSubject: `test|${email}`, role }),
  );

  const loginResponse = await request(app.getHttpServer())
    .post('/v1/admin/auth/login')
    .send({ email, mfaCode: '000000' })
    .expect(201);
  return { accessToken: loginResponse.body.accessToken as string, email };
}

export async function issueTag(app: INestApplication, adminAccessToken: string): Promise<{ opaqueId: string; activationPin: string }> {
  const response = await request(app.getHttpServer())
    .post('/v1/admin/tags/issue')
    .set('Authorization', `Bearer ${adminAccessToken}`)
    .send({ batchReference: `test-batch-${Date.now()}`, quantity: 1 })
    .expect(201);
  return (response.body.issued as Array<{ opaqueId: string; activationPin: string }>)[0]!;
}
