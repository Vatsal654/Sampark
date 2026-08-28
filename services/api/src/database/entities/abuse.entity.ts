/**
 * Purpose: Abuse-prevention entities shared by the scanner portal and the
 * owner app's "report abuse" action.
 * Responsibilities: Maps `abuse_reports` and `blocked_identities`.
 * Security: `blocked_identities` stores only hashed phone/device/IP-range
 * values — enforcement is a guard-layer lookup, never a plaintext scan.
 * Related: modules/abuse, common/rate-limit.
 */
import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('abuse_reports')
@Index(['alertEventId'])
export class AbuseReportEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', nullable: true })
  alertEventId!: string | null;

  @Column({ type: 'uuid', nullable: true })
  reportedByUserId!: string | null;

  @Column({ type: 'varchar', length: 30 })
  reason!: 'harassment' | 'spam' | 'false_emergency' | 'damaged' | 'suspicious_or_cloned' | 'other';

  @Column({ type: 'varchar', length: 280, nullable: true })
  note!: string | null;

  @Column({ type: 'varchar', length: 20, default: 'open' })
  reviewStatus!: 'open' | 'reviewing' | 'resolved' | 'dismissed';

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;
}

@Entity('blocked_identities')
@Index(['identityHash'], { unique: true })
export class BlockedIdentityEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 20 })
  identityType!: 'phone' | 'device_fingerprint' | 'ip_range';

  @Column({ type: 'varchar', length: 64 })
  identityHash!: string;

  @Column({ type: 'varchar', length: 280 })
  reason!: string;

  @Column({ type: 'uuid', nullable: true })
  blockedByAdminId!: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @Column({ type: 'timestamptz', nullable: true })
  expiresAt!: Date | null;
}
