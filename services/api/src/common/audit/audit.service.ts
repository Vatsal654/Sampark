/**
 * Purpose: Records immutable, append-only audit events for every
 * sensitive state change (tag lifecycle, admin actions, break-glass
 * access, feature flag changes) per docs/SECURITY.md.
 * Responsibilities: `record()` inserts one audit_events row. No update or
 * delete method exists on this service by design.
 * Security: `metadata` passed here is redacted defensively (redactForLogging)
 * before storage even though it should never carry PII in the first
 * place — defense in depth for a table that support staff can read.
 * Related: database/entities/admin.entity.ts (AuditEventEntity),
 * modules/admin/break-glass, docs/OPERATIONS_RUNBOOK.md.
 */
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { redactForLogging } from '@sampark/shared-security';
import { AuditEventEntity } from '../../database/entities';

export interface RecordAuditEventInput {
  actorType: 'owner' | 'admin' | 'system' | 'scanner';
  actorId?: string | null;
  action: string;
  targetType: string;
  targetId?: string | null;
  reason?: string | null;
  metadata?: Record<string, unknown> | null;
}

@Injectable()
export class AuditService {
  constructor(@InjectRepository(AuditEventEntity) private readonly repo: Repository<AuditEventEntity>) {}

  async record(input: RecordAuditEventInput): Promise<void> {
    const entity = this.repo.create({
      actorType: input.actorType,
      actorId: input.actorId ?? null,
      action: input.action,
      targetType: input.targetType,
      targetId: input.targetId ?? null,
      reason: input.reason ?? null,
      metadata: input.metadata ? (redactForLogging(input.metadata) as Record<string, unknown>) : null,
    });
    await this.repo.save(entity);
  }
}
