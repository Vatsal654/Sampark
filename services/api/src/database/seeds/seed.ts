/**
 * Purpose: Populates local Postgres with fictional, clearly-marked
 * development-only data so the scanner portal, owner app, and admin
 * console have something to demo immediately after `docker compose up`.
 * Responsibilities: Seeds admin roles + one admin user per role, one
 * demo owner with a vehicle and an activated tag, and prints the exact
 * scanner URL + admin login to use.
 * Security: Every value here is fictional and obviously so ("Demo Owner",
 * +9779800000001) — never run this against a production database
 * (guarded by NODE_ENV below).
 * Related: docs/LOCAL_DEVELOPMENT.md.
 */
/* eslint-disable no-console -- CLI script; stdout output is the intended UI */
import 'reflect-metadata';
import bcrypt from 'bcryptjs';
import { encryptField, hashForLookup, generateOpaqueTagId, signTagReference } from '@sampark/shared-security';
import { AppDataSource } from '../data-source';
import {
  UserEntity,
  VerifiedPhoneCredentialEntity,
  VehicleEntity,
  TagEntity,
  AdminRoleEntity,
  AdminUserEntity,
  FeatureFlagEntity,
} from '../entities';

const ROOT_KEY = process.env.FIELD_ENCRYPTION_ROOT_KEY ?? 'dev-only-field-encryption-key-do-not-use-prod';
const TAG_SIGNING_SECRET = process.env.TAG_SIGNING_SECRET ?? 'dev-only-tag-signing-secret-do-not-use-in-prod-32ch';

const ADMIN_ROLE_DESCRIPTIONS: Record<string, string> = {
  support_agent: 'Front-line support with redacted-by-default views',
  operations_agent: 'Tag inventory, issuance, and fulfilment operations',
  fraud_reviewer: 'Abuse report and block-list review',
  security_admin: 'Break-glass approval and feature-flag control',
  super_admin: 'Full access, used sparingly',
};

async function main(): Promise<void> {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Refusing to run development seed data against a production environment.');
  }

  await AppDataSource.initialize();

  const roleRepo = AppDataSource.getRepository(AdminRoleEntity);
  for (const [key, description] of Object.entries(ADMIN_ROLE_DESCRIPTIONS)) {
    const exists = await roleRepo.findOne({ where: { key: key as AdminRoleEntity['key'] } });
    if (!exists) await roleRepo.save(roleRepo.create({ key: key as AdminRoleEntity['key'], description }));
  }

  const adminRepo = AppDataSource.getRepository(AdminUserEntity);
  const demoAdminEmail = 'demo-admin@example-dev.local';
  let admin = await adminRepo.findOne({ where: { email: demoAdminEmail } });
  if (!admin) {
    admin = await adminRepo.save(
      adminRepo.create({
        fullName: '(Dev) Demo Super Admin',
        email: demoAdminEmail,
        ssoSubject: 'dev-mock-sso|demo-admin',
        role: 'super_admin',
      }),
    );
  }

  const userRepo = AppDataSource.getRepository(UserEntity);
  const credentialRepo = AppDataSource.getRepository(VerifiedPhoneCredentialEntity);
  const demoPhone = '+9779800000001';
  const phoneHash = hashForLookup(demoPhone, ROOT_KEY);
  let credential = await credentialRepo.findOne({ where: { phoneLookupHash: phoneHash } });
  let owner: UserEntity;
  if (!credential) {
    owner = await userRepo.save(userRepo.create({ fullName: '(Dev) Demo Owner' }));
    credential = await credentialRepo.save(
      credentialRepo.create({ userId: owner.id, phoneEncrypted: encryptField(demoPhone, ROOT_KEY), phoneLookupHash: phoneHash }),
    );
  } else {
    owner = await userRepo.findOneOrFail({ where: { id: credential.userId } });
  }

  const vehicleRepo = AppDataSource.getRepository(VehicleEntity);
  const demoPlate = 'BA2PA1234';
  const plateHash = hashForLookup(demoPlate, ROOT_KEY);
  let vehicle = await vehicleRepo.findOne({ where: { plateLookupHash: plateHash } });
  if (!vehicle) {
    vehicle = await vehicleRepo.save(
      vehicleRepo.create({
        ownerId: owner.id,
        displayLabel: 'Demo Red Scooter',
        category: 'scooter',
        plateNumberEncrypted: encryptField(demoPlate, ROOT_KEY),
        plateLookupHash: plateHash,
        color: 'Red',
      }),
    );
  }

  const tagRepo = AppDataSource.getRepository(TagEntity);
  let tag = await tagRepo.findOne({ where: { vehicleId: vehicle.id } });
  if (!tag) {
    const opaqueId = generateOpaqueTagId();
    tag = await tagRepo.save(
      tagRepo.create({
        opaqueId,
        status: 'active',
        vehicleId: vehicle.id,
        ownerId: owner.id,
        activatedAt: new Date(),
        activationPinHash: await bcrypt.hash('123456', 10),
      }),
    );
  }

  const flagRepo = AppDataSource.getRepository(FeatureFlagEntity);
  const existingFlag = await flagRepo.findOne({ where: { key: 'document_vault' } });
  if (!existingFlag) {
    await flagRepo.save(flagRepo.create({ key: 'document_vault', enabled: true, updatedAt: new Date(), lastChangeReason: 'seed default' }));
  }

  const signature = signTagReference(tag.opaqueId, TAG_SIGNING_SECRET);

  console.log('\nSeed complete (development data only).\n');
  console.log(`Scanner portal demo URL:\n  http://localhost:3000/t/${tag.opaqueId}.${signature}\n`);
  console.log(`Owner login phone (OTP code is printed at /dev/simulator or the API log): ${demoPhone}`);
  console.log(`Admin login: email=${demoAdminEmail}  mfaCode=<any 6 digits, e.g. 000000>\n`);

  await AppDataSource.destroy();
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
