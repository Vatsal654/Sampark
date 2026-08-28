/**
 * Purpose: Initial schema migration creating every table in the product
 * spec's data model (docs/API.md, docs/PRIVACY_DATA_MAP.md).
 * Responsibilities: Hand-written (not auto-generated) so column types,
 * indexes, and foreign keys are deliberate and reviewable in one place.
 * Security: Enables `pgcrypto` for `gen_random_uuid()` — no other
 * extension is required. Every table with a Sensitive/Critical field per
 * the privacy data map stores only encrypted/hashed columns, never
 * plaintext (see the entity file comments for the field-by-field mapping).
 * Related: database/entities/*, docs/PRIVACY_DATA_MAP.md.
 */
import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1700000000000 implements MigrationInterface {
  name = 'InitialSchema1700000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS pgcrypto;`);

    await queryRunner.query(`
      CREATE TABLE users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "fullName" VARCHAR(100),
        "preferredLocale" VARCHAR(10) NOT NULL DEFAULT 'en',
        status VARCHAR(20) NOT NULL DEFAULT 'active',
        "biometricLockEnabled" BOOLEAN NOT NULL DEFAULT false,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "deletionRequestedAt" TIMESTAMPTZ
      );
    `);

    await queryRunner.query(`
      CREATE TABLE verified_phone_credentials (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "userId" UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        "phoneEncrypted" TEXT NOT NULL,
        "phoneLookupHash" VARCHAR(64) NOT NULL,
        "verifiedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
      );
      CREATE UNIQUE INDEX "IDX_vpc_phone_lookup_hash" ON verified_phone_credentials("phoneLookupHash");
    `);

    await queryRunner.query(`
      CREATE TABLE user_sessions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "userId" UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        "deviceName" VARCHAR(80),
        "refreshTokenHash" VARCHAR(100) NOT NULL,
        revoked BOOLEAN NOT NULL DEFAULT false,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "lastUsedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "expiresAt" TIMESTAMPTZ NOT NULL
      );
      CREATE INDEX "IDX_user_sessions_userId" ON user_sessions("userId");
    `);

    await queryRunner.query(`
      CREATE TABLE consents (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "userId" UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        "consentType" VARCHAR(60) NOT NULL,
        granted BOOLEAN NOT NULL,
        "recordedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
      );
      CREATE INDEX "IDX_consents_user_type" ON consents("userId", "consentType");
    `);

    await queryRunner.query(`
      CREATE TABLE vehicles (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "ownerId" UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        "displayLabel" VARCHAR(60) NOT NULL,
        category VARCHAR(20) NOT NULL,
        "plateNumberEncrypted" TEXT NOT NULL,
        "plateLookupHash" VARCHAR(64) NOT NULL,
        make VARCHAR(40),
        model VARCHAR(40),
        color VARCHAR(30),
        "imageObjectKey" VARCHAR(200),
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
      );
      CREATE INDEX "IDX_vehicles_ownerId" ON vehicles("ownerId");
      CREATE UNIQUE INDEX "IDX_vehicles_plate_lookup_hash" ON vehicles("plateLookupHash");
    `);

    await queryRunner.query(`
      CREATE TABLE tags (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "opaqueId" VARCHAR(32) NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'manufactured',
        "activationPinHash" VARCHAR(100),
        "vehicleId" UUID REFERENCES vehicles(id) ON DELETE SET NULL,
        "ownerId" UUID REFERENCES users(id) ON DELETE SET NULL,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "activatedAt" TIMESTAMPTZ
      );
      CREATE UNIQUE INDEX "IDX_tags_opaqueId" ON tags("opaqueId");
    `);

    await queryRunner.query(`
      CREATE TABLE tag_shipments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "tagId" UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
        "batchReference" VARCHAR(60) NOT NULL,
        "shipmentStatus" VARCHAR(20) NOT NULL DEFAULT 'issued',
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
      );
      CREATE INDEX "IDX_tag_shipments_tagId" ON tag_shipments("tagId");
    `);

    await queryRunner.query(`
      CREATE TABLE tag_activation_challenges (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "tagId" UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
        "requestedByUserId" UUID NOT NULL,
        successful BOOLEAN NOT NULL,
        outcome VARCHAR(20) NOT NULL,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
      );
      CREATE INDEX "IDX_tac_tagId" ON tag_activation_challenges("tagId");
    `);

    await queryRunner.query(`
      CREATE TABLE alert_events (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "tagId" UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
        "vehicleId" UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
        category VARCHAR(30) NOT NULL,
        severity VARCHAR(10) NOT NULL DEFAULT 'normal',
        note VARCHAR(280),
        "scannerLocationLabel" VARCHAR(120),
        "scannerLocationExact" JSONB,
        "scannerFingerprintHash" VARCHAR(64),
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "acknowledgedAt" TIMESTAMPTZ,
        "archivedAt" TIMESTAMPTZ,
        "reportedAsAbuse" BOOLEAN NOT NULL DEFAULT false
      );
      CREATE INDEX "IDX_alert_events_tag_created" ON alert_events("tagId", "createdAt");
      CREATE INDEX "IDX_alert_events_vehicleId" ON alert_events("vehicleId");
    `);

    await queryRunner.query(`
      CREATE TABLE alert_deliveries (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "alertEventId" UUID NOT NULL REFERENCES alert_events(id) ON DELETE CASCADE,
        channel VARCHAR(20) NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'queued',
        "failureReason" VARCHAR(200),
        "attemptCount" INT NOT NULL DEFAULT 0,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "lastAttemptedAt" TIMESTAMPTZ
      );
      CREATE INDEX "IDX_alert_deliveries_alertEventId" ON alert_deliveries("alertEventId");
    `);

    await queryRunner.query(`
      CREATE TABLE otp_challenges (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "phoneLookupHash" VARCHAR(64) NOT NULL,
        purpose VARCHAR(40) NOT NULL,
        "codeHash" VARCHAR(100) NOT NULL,
        "attemptCount" INT NOT NULL DEFAULT 0,
        consumed BOOLEAN NOT NULL DEFAULT false,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "expiresAt" TIMESTAMPTZ NOT NULL
      );
      CREATE INDEX "IDX_otp_challenges_phone_purpose" ON otp_challenges("phoneLookupHash", purpose);
    `);

    await queryRunner.query(`
      CREATE TABLE scan_sessions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "tagId" UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
        "scannerPhoneLookupHash" VARCHAR(64) NOT NULL,
        "tokenHash" VARCHAR(100) NOT NULL,
        "scopedAction" VARCHAR(20) NOT NULL,
        used BOOLEAN NOT NULL DEFAULT false,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "expiresAt" TIMESTAMPTZ NOT NULL
      );
      CREATE INDEX "IDX_scan_sessions_tagId" ON scan_sessions("tagId");
    `);

    await queryRunner.query(`
      CREATE TABLE call_sessions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "tagId" UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
        "scanSessionId" UUID NOT NULL REFERENCES scan_sessions(id) ON DELETE CASCADE,
        status VARCHAR(20) NOT NULL DEFAULT 'pending',
        "providerBridgeReference" VARCHAR(100),
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "expiresAt" TIMESTAMPTZ NOT NULL,
        "endedAt" TIMESTAMPTZ
      );
      CREATE INDEX "IDX_call_sessions_tag_created" ON call_sessions("tagId", "createdAt");
    `);

    await queryRunner.query(`
      CREATE TABLE emergency_profiles (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "userId" UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
        "bloodGroup" VARCHAR(10) NOT NULL DEFAULT 'unknown',
        "allergiesNoteEncrypted" TEXT,
        "safeInstructionsEncrypted" TEXT,
        "shareBloodGroup" BOOLEAN NOT NULL DEFAULT false,
        "shareAllergies" BOOLEAN NOT NULL DEFAULT false,
        "shareSafeInstructions" BOOLEAN NOT NULL DEFAULT false,
        "shareContactsWithResponders" BOOLEAN NOT NULL DEFAULT true,
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE TABLE emergency_contacts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "userId" UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name VARCHAR(60) NOT NULL,
        "phoneEncrypted" TEXT NOT NULL,
        "phoneLookupHash" VARCHAR(64) NOT NULL,
        relationship VARCHAR(40),
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE TABLE documents (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "ownerId" UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        "vehicleId" UUID REFERENCES vehicles(id) ON DELETE SET NULL,
        "documentType" VARCHAR(30) NOT NULL,
        "storageObjectKey" VARCHAR(200) NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'pending_scan',
        "expiresOn" DATE,
        "uploadedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "deletedAt" TIMESTAMPTZ
      );
      CREATE INDEX "IDX_documents_ownerId" ON documents("ownerId");
    `);

    await queryRunner.query(`
      CREATE TABLE document_access_grants (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "documentId" UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
        "shareCodeHash" VARCHAR(100) NOT NULL,
        revoked BOOLEAN NOT NULL DEFAULT false,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "expiresAt" TIMESTAMPTZ NOT NULL
      );
      CREATE INDEX "IDX_document_access_grants_documentId" ON document_access_grants("documentId");
    `);

    await queryRunner.query(`
      CREATE TABLE abuse_reports (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "alertEventId" UUID REFERENCES alert_events(id) ON DELETE SET NULL,
        "reportedByUserId" UUID,
        reason VARCHAR(30) NOT NULL,
        note VARCHAR(280),
        "reviewStatus" VARCHAR(20) NOT NULL DEFAULT 'open',
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
      );
      CREATE INDEX "IDX_abuse_reports_alertEventId" ON abuse_reports("alertEventId");
    `);

    await queryRunner.query(`
      CREATE TABLE blocked_identities (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "identityType" VARCHAR(20) NOT NULL,
        "identityHash" VARCHAR(64) NOT NULL,
        reason VARCHAR(280) NOT NULL,
        "blockedByAdminId" UUID,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "expiresAt" TIMESTAMPTZ
      );
      CREATE UNIQUE INDEX "IDX_blocked_identities_hash" ON blocked_identities("identityHash");
    `);

    await queryRunner.query(`
      CREATE TABLE notification_preferences (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "userId" UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
        "channelOrder" JSONB NOT NULL DEFAULT '["push","whatsapp","sms"]',
        "maskedCallsEnabled" BOOLEAN NOT NULL DEFAULT true,
        "quietHoursStart" VARCHAR(5),
        "quietHoursEnd" VARCHAR(5),
        "emergencyBypassQuietHours" BOOLEAN NOT NULL DEFAULT true,
        "geoEventRetentionDays" INT NOT NULL DEFAULT 90,
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE TABLE no_tag_lookup_requests (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "requestedByUserId" UUID NOT NULL,
        "plateLookupHash" VARCHAR(64) NOT NULL,
        "statedReason" VARCHAR(280) NOT NULL,
        outcome VARCHAR(30) NOT NULL DEFAULT 'feature_disabled',
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
      );
      CREATE INDEX "IDX_no_tag_lookup_requestedByUserId" ON no_tag_lookup_requests("requestedByUserId");
    `);

    await queryRunner.query(`
      CREATE TABLE provider_webhook_events (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        provider VARCHAR(30) NOT NULL,
        "idempotencyKey" VARCHAR(100) NOT NULL,
        "eventType" VARCHAR(40) NOT NULL,
        payload JSONB NOT NULL,
        "receivedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
      );
      CREATE UNIQUE INDEX "IDX_provider_webhook_events_provider_key" ON provider_webhook_events(provider, "idempotencyKey");
    `);

    await queryRunner.query(`
      CREATE TABLE admin_roles (
        key VARCHAR(30) PRIMARY KEY,
        description VARCHAR(120) NOT NULL
      );
    `);

    await queryRunner.query(`
      CREATE TABLE admin_users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "fullName" VARCHAR(100) NOT NULL,
        email VARCHAR(120) NOT NULL,
        "ssoSubject" VARCHAR(200) NOT NULL,
        role VARCHAR(30) NOT NULL REFERENCES admin_roles(key),
        "mfaEnabled" BOOLEAN NOT NULL DEFAULT true,
        active BOOLEAN NOT NULL DEFAULT true,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
      );
      CREATE UNIQUE INDEX "IDX_admin_users_ssoSubject" ON admin_users("ssoSubject");
    `);

    await queryRunner.query(`
      CREATE TABLE feature_flags (
        key VARCHAR(40) PRIMARY KEY,
        enabled BOOLEAN NOT NULL DEFAULT false,
        "updatedByAdminId" UUID,
        "lastChangeReason" VARCHAR(280),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE TABLE audit_events (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "actorType" VARCHAR(20) NOT NULL,
        "actorId" UUID,
        action VARCHAR(60) NOT NULL,
        "targetType" VARCHAR(40) NOT NULL,
        "targetId" UUID,
        reason VARCHAR(500),
        metadata JSONB,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
      );
      CREATE INDEX "IDX_audit_events_target" ON audit_events("targetType", "targetId");
      CREATE INDEX "IDX_audit_events_createdAt" ON audit_events("createdAt");
    `);

    await queryRunner.query(`
      CREATE TABLE support_tickets (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "userId" UUID,
        subject VARCHAR(120) NOT NULL,
        description VARCHAR(2000) NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'open',
        "assignedAdminId" UUID,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
      );
      CREATE INDEX "IDX_support_tickets_userId" ON support_tickets("userId");
    `);

    await queryRunner.query(`
      CREATE TABLE orders (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "userId" UUID NOT NULL,
        quantity INT NOT NULL,
        "amountNpr" INT NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'pending',
        "paymentReference" VARCHAR(100),
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now()
      );
      CREATE INDEX "IDX_orders_userId" ON orders("userId");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const tables = [
      'orders',
      'support_tickets',
      'audit_events',
      'feature_flags',
      'admin_users',
      'admin_roles',
      'provider_webhook_events',
      'no_tag_lookup_requests',
      'notification_preferences',
      'blocked_identities',
      'abuse_reports',
      'document_access_grants',
      'documents',
      'emergency_contacts',
      'emergency_profiles',
      'call_sessions',
      'scan_sessions',
      'otp_challenges',
      'alert_deliveries',
      'alert_events',
      'tag_activation_challenges',
      'tag_shipments',
      'tags',
      'vehicles',
      'consents',
      'user_sessions',
      'verified_phone_credentials',
      'users',
    ];
    for (const table of tables) {
      await queryRunner.query(`DROP TABLE IF EXISTS ${table} CASCADE;`);
    }
  }
}
