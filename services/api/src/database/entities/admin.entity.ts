/**
 * Purpose: Admin console identity, RBAC role catalogue, feature-flag
 * runtime state, audit trail, and support ticket entities.
 * Responsibilities: Maps `admin_users`, `admin_roles`, `feature_flags`,
 * `audit_events`, and `support_tickets`.
 * Security: `admin_roles` is a seeded lookup table (docs/SECURITY.md
 * "Authorization") — the actual permission matrix lives in code
 * (modules/admin/rbac/permissions.ts) so a row existing here never by
 * itself grants access. `audit_events` is append-only by convention: no
 * service in this codebase issues an UPDATE or DELETE against it.
 * Related: modules/admin, docs/SECURITY.md, docs/OPERATIONS_RUNBOOK.md.
 */
import { Column, CreateDateColumn, Entity, Index, PrimaryColumn, PrimaryGeneratedColumn } from 'typeorm';

@Entity('admin_roles')
export class AdminRoleEntity {
  @PrimaryColumn({ type: 'varchar', length: 30 })
  key!: 'support_agent' | 'operations_agent' | 'fraud_reviewer' | 'security_admin' | 'super_admin';

  @Column({ type: 'varchar', length: 120 })
  description!: string;
}

@Entity('admin_users')
@Index(['ssoSubject'], { unique: true })
export class AdminUserEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 100 })
  fullName!: string;

  @Column({ type: 'varchar', length: 120 })
  email!: string;

  /** Opaque subject identifier from the SSO/OIDC provider (mocked in dev). */
  @Column({ type: 'varchar', length: 200 })
  ssoSubject!: string;

  @Column({ type: 'varchar', length: 30 })
  role!: 'support_agent' | 'operations_agent' | 'fraud_reviewer' | 'security_admin' | 'super_admin';

  @Column({ type: 'boolean', default: true })
  mfaEnabled!: boolean;

  @Column({ type: 'boolean', default: true })
  active!: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;
}

@Entity('feature_flags')
export class FeatureFlagEntity {
  @PrimaryColumn({ type: 'varchar', length: 40 })
  key!: string;

  @Column({ type: 'boolean', default: false })
  enabled!: boolean;

  @Column({ type: 'uuid', nullable: true })
  updatedByAdminId!: string | null;

  @Column({ type: 'varchar', length: 280, nullable: true })
  lastChangeReason!: string | null;

  @Column({ type: 'timestamptz' })
  updatedAt!: Date;
}

@Entity('audit_events')
@Index(['targetType', 'targetId'])
@Index(['createdAt'])
export class AuditEventEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 20 })
  actorType!: 'owner' | 'admin' | 'system' | 'scanner';

  @Column({ type: 'uuid', nullable: true })
  actorId!: string | null;

  @Column({ type: 'varchar', length: 60 })
  action!: string;

  @Column({ type: 'varchar', length: 40 })
  targetType!: string;

  @Column({ type: 'uuid', nullable: true })
  targetId!: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  reason!: string | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata!: Record<string, unknown> | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;
}

@Entity('support_tickets')
@Index(['userId'])
export class SupportTicketEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', nullable: true })
  userId!: string | null;

  @Column({ type: 'varchar', length: 120 })
  subject!: string;

  @Column({ type: 'varchar', length: 2000 })
  description!: string;

  @Column({ type: 'varchar', length: 20, default: 'open' })
  status!: 'open' | 'in_progress' | 'resolved' | 'closed';

  @Column({ type: 'uuid', nullable: true })
  assignedAdminId!: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;
}
