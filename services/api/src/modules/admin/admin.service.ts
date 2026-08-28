/**
 * Purpose: Core admin console operations — tag inventory/issuance,
 * feature-flag control, audit log viewing, break-glass access, abuse
 * review, and support ticket listing.
 * Responsibilities: Every mutating method here writes an AuditService
 * entry with the acting admin's ID and (where required) their stated
 * reason, per docs/SECURITY.md "Admin break-glass" and "Authorization".
 * Security: This service never returns a plaintext phone/plate — list
 * views return only masked/opaque identifiers. Route-level permission
 * enforcement happens in the controller via @RequirePermission +
 * PermissionsGuard; this service assumes it has already been checked and
 * does not re-derive authorization from role strings itself.
 * Related: rbac/permissions.ts, common/guards/permissions.guard.ts,
 * database/entities/admin.entity.ts.
 */
import { BadRequestException, ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import bcrypt from 'bcryptjs';
import { generateOpaqueTagId, hashForLookup } from '@sampark/shared-security';
import {
  TagEntity,
  TagShipmentEntity,
  AlertEventEntity,
  CallSessionEntity,
  AbuseReportEntity,
  BlockedIdentityEntity,
  FeatureFlagEntity,
  AuditEventEntity,
  SupportTicketEntity,
} from '../../database/entities';
import { APP_CONFIG, type AppConfig } from '../../config/config.module';
import { AuditService } from '../../common/audit/audit.service';
import { DEFAULT_FEATURE_FLAGS, type FeatureFlagKey } from '@sampark/shared-config';

interface BreakGlassGrant {
  id: string;
  requestedByAdminId: string;
  targetType: string;
  targetId: string;
  reason: string;
  approvedByAdminId: string | null;
  expiresAt: Date | null;
}

@Injectable()
export class AdminService {
  // In-memory break-glass grant ledger for this process. A production deployment would persist
  // this in Postgres (a break_glass_grants table) so grants survive restarts and are queryable
  // across instances; kept in-memory here to bound scope while still enforcing every rule in
  // docs/OPERATIONS_RUNBOOK.md "Break-glass access".
  private readonly breakGlassGrants = new Map<string, BreakGlassGrant>();

  constructor(
    @InjectRepository(TagEntity) private readonly tags: Repository<TagEntity>,
    @InjectRepository(TagShipmentEntity) private readonly shipments: Repository<TagShipmentEntity>,
    @InjectRepository(AlertEventEntity) private readonly alertEvents: Repository<AlertEventEntity>,
    @InjectRepository(CallSessionEntity) private readonly callSessions: Repository<CallSessionEntity>,
    @InjectRepository(AbuseReportEntity) private readonly abuseReports: Repository<AbuseReportEntity>,
    @InjectRepository(BlockedIdentityEntity) private readonly blockedIdentities: Repository<BlockedIdentityEntity>,
    @InjectRepository(FeatureFlagEntity) private readonly featureFlags: Repository<FeatureFlagEntity>,
    @InjectRepository(AuditEventEntity) private readonly auditEvents: Repository<AuditEventEntity>,
    @InjectRepository(SupportTicketEntity) private readonly supportTickets: Repository<SupportTicketEntity>,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
    private readonly audit: AuditService,
  ) {}

  // --- tags ---------------------------------------------------------------

  async listTags() {
    const rows = await this.tags.find({ order: { createdAt: 'DESC' }, take: 200 });
    return rows.map((tag) => ({
      id: tag.id,
      opaqueId: tag.opaqueId,
      status: tag.status,
      vehicleDisplayLabel: null,
      ownerIdMasked: tag.ownerId ? `${tag.ownerId.slice(0, 8)}…` : null,
      createdAt: tag.createdAt.toISOString(),
    }));
  }

  async issueTags(adminId: string, batchReference: string, quantity: number) {
    const issued: Array<{ opaqueId: string; activationPin: string }> = [];
    for (let i = 0; i < quantity; i += 1) {
      const opaqueId = generateOpaqueTagId();
      const activationPin = Math.floor(100000 + Math.random() * 900000).toString();
      const tag = await this.tags.save(
        this.tags.create({ opaqueId, status: 'issued', activationPinHash: await bcrypt.hash(activationPin, 10) }),
      );
      await this.shipments.save(this.shipments.create({ tagId: tag.id, batchReference, shipmentStatus: 'issued' }));
      issued.push({ opaqueId, activationPin });
    }
    await this.audit.record({ actorType: 'admin', actorId: adminId, action: 'tags.issued', targetType: 'tag_batch', metadata: { batchReference, quantity } });
    return { issued };
  }

  async suspendTag(adminId: string, tagId: string, reason: string) {
    const tag = await this.tags.findOne({ where: { id: tagId } });
    if (!tag) throw new NotFoundException('Tag not found');
    tag.status = 'revoked';
    await this.tags.save(tag);
    await this.audit.record({ actorType: 'admin', actorId: adminId, action: 'tag.suspended', targetType: 'tag', targetId: tag.id, reason });
    return { id: tag.id, status: tag.status };
  }

  // --- alerts / calls (read-only monitoring) ------------------------------

  async listAlerts() {
    const rows = await this.alertEvents.find({ order: { createdAt: 'DESC' }, take: 200 });
    return rows.map((a) => ({
      id: a.id,
      tagId: a.tagId,
      category: a.category,
      severity: a.severity,
      reportedAsAbuse: a.reportedAsAbuse,
      createdAt: a.createdAt.toISOString(),
    }));
  }

  async listCalls() {
    const rows = await this.callSessions.find({ order: { createdAt: 'DESC' }, take: 200 });
    return rows.map((c) => ({ id: c.id, tagId: c.tagId, status: c.status, createdAt: c.createdAt.toISOString() }));
  }

  // --- abuse / block list --------------------------------------------------

  async listAbuseReports() {
    const rows = await this.abuseReports.find({ order: { createdAt: 'DESC' }, take: 200 });
    return rows;
  }

  async blockIdentity(adminId: string, identityType: BlockedIdentityEntity['identityType'], rawIdentity: string, reason: string) {
    const identityHash = hashForLookup(rawIdentity, this.config.FIELD_ENCRYPTION_ROOT_KEY);
    const row = await this.blockedIdentities.save(
      this.blockedIdentities.create({ identityType, identityHash, reason, blockedByAdminId: adminId }),
    );
    await this.audit.record({ actorType: 'admin', actorId: adminId, action: 'identity.blocked', targetType: 'blocked_identity', targetId: row.id, reason });
    return { id: row.id };
  }

  // --- feature flags --------------------------------------------------------

  async listFeatureFlags() {
    const keys = Object.keys(DEFAULT_FEATURE_FLAGS) as FeatureFlagKey[];
    const rows = await this.featureFlags.find({ where: { key: In(keys) } });
    const byKey = new Map(rows.map((r) => [r.key, r]));
    return keys.map((key) => {
      const row = byKey.get(key);
      return {
        key,
        enabled: row?.enabled ?? DEFAULT_FEATURE_FLAGS[key],
        envCapabilityEnabled: this.envCapabilityFor(key),
        updatedAt: (row?.updatedAt ?? new Date(0)).toISOString(),
        updatedByAdminId: row?.updatedByAdminId ?? null,
      };
    });
  }

  async updateFeatureFlag(adminId: string, key: FeatureFlagKey, enabled: boolean, reason: string) {
    if (enabled && !this.envCapabilityFor(key)) {
      throw new ForbiddenException(
        `Cannot enable "${key}": the underlying provider capability is not configured on this deployment.`,
      );
    }
    let row = await this.featureFlags.findOne({ where: { key } });
    if (!row) row = this.featureFlags.create({ key });
    row.enabled = enabled;
    row.updatedByAdminId = adminId;
    row.lastChangeReason = reason;
    row.updatedAt = new Date();
    await this.featureFlags.save(row);
    await this.audit.record({ actorType: 'admin', actorId: adminId, action: 'feature_flag.updated', targetType: 'feature_flag', targetId: key, reason, metadata: { enabled } });
    return { key, enabled: row.enabled };
  }

  private envCapabilityFor(key: FeatureFlagKey): boolean {
    switch (key) {
      case 'live_call_bridging':
        return this.config.FEATURE_LIVE_CALL_BRIDGING;
      case 'real_sms':
        return this.config.FEATURE_REAL_SMS;
      case 'real_whatsapp':
        return this.config.FEATURE_REAL_WHATSAPP;
      case 'document_vault':
        return this.config.FEATURE_DOCUMENT_VAULT;
      case 'no_tag_lookup':
        return this.config.FEATURE_NO_TAG_LOOKUP;
      case 'real_payments':
        return this.config.FEATURE_REAL_PAYMENTS;
      case 'maintenance_mode':
        return true;
      default:
        return false;
    }
  }

  // --- audit ------------------------------------------------------------

  async listAuditEvents() {
    const rows = await this.auditEvents.find({ order: { createdAt: 'DESC' }, take: 200 });
    return rows.map((row) => ({
      id: row.id,
      actorType: row.actorType,
      actorIdMasked: row.actorId ? `${row.actorId.slice(0, 8)}…` : null,
      action: row.action,
      targetType: row.targetType,
      targetIdMasked: row.targetId ? `${row.targetId.slice(0, 8)}…` : null,
      reason: row.reason,
      createdAt: row.createdAt.toISOString(),
    }));
  }

  // --- break-glass --------------------------------------------------------

  async requestBreakGlass(adminId: string, targetType: string, targetId: string, reason: string) {
    const id = crypto.randomUUID();
    this.breakGlassGrants.set(id, { id, requestedByAdminId: adminId, targetType, targetId, reason, approvedByAdminId: null, expiresAt: null });
    await this.audit.record({ actorType: 'admin', actorId: adminId, action: 'break_glass.requested', targetType, targetId, reason });
    return { id, status: 'pending' as const };
  }

  async approveBreakGlass(approverAdminId: string, requestId: string) {
    const grant = this.breakGlassGrants.get(requestId);
    if (!grant) throw new NotFoundException('Break-glass request not found');
    if (grant.requestedByAdminId === approverAdminId) {
      throw new BadRequestException('A break-glass request cannot be approved by its own requester');
    }
    grant.approvedByAdminId = approverAdminId;
    grant.expiresAt = new Date(Date.now() + 60 * 60 * 1000);
    await this.audit.record({
      actorType: 'admin',
      actorId: approverAdminId,
      action: 'break_glass.approved',
      targetType: grant.targetType,
      targetId: grant.targetId,
      reason: grant.reason,
      metadata: { requestId, expiresAt: grant.expiresAt.toISOString() },
    });
    return { id: grant.id, status: 'approved' as const, expiresAt: grant.expiresAt.toISOString() };
  }

  // --- support tickets ------------------------------------------------------

  async listSupportTickets() {
    return this.supportTickets.find({ order: { createdAt: 'DESC' }, take: 200 });
  }
}
