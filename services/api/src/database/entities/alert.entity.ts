/**
 * Purpose: Alert lifecycle entities — the alert itself (from a scanner)
 * and each per-channel delivery attempt to the owner.
 * Responsibilities: Maps `alert_events` and `alert_deliveries`.
 * Security: No scanner-identifying field exists here for anonymous
 * alerts; `scannerFingerprintHash` is a short-retention, non-reversible
 * abuse signal only, never a real identity. `scannerLocationExact` is
 * populated only when the scanner explicitly consented for that event.
 * Related: packages/api-contracts/src/alert.ts, modules/alerts,
 * modules/public-tag, services/worker notification jobs.
 */
import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { TagEntity } from './tag.entity';
import { VehicleEntity } from './vehicle.entity';

export type AlertCategory =
  | 'blocking_access'
  | 'lights_on'
  | 'window_or_door_open'
  | 'being_towed'
  | 'accident_emergency'
  | 'parking_concern'
  | 'other';

@Entity('alert_events')
@Index(['tagId', 'createdAt'])
@Index(['vehicleId'])
export class AlertEventEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  tagId!: string;

  @ManyToOne(() => TagEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tagId' })
  tag!: TagEntity;

  @Column({ type: 'uuid' })
  vehicleId!: string;

  @ManyToOne(() => VehicleEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'vehicleId' })
  vehicle!: VehicleEntity;

  @Column({ type: 'varchar', length: 30 })
  category!: AlertCategory;

  @Column({ type: 'varchar', length: 10, default: 'normal' })
  severity!: 'normal' | 'emergency';

  @Column({ type: 'varchar', length: 280, nullable: true })
  note!: string | null;

  @Column({ type: 'varchar', length: 120, nullable: true })
  scannerLocationLabel!: string | null;

  @Column({ type: 'jsonb', nullable: true })
  scannerLocationExact!: { latitude: number; longitude: number } | null;

  /** Short-TTL, non-reversible abuse signal — not an identity. Purged by the retention job. */
  @Column({ type: 'varchar', length: 64, nullable: true })
  scannerFingerprintHash!: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @Column({ type: 'timestamptz', nullable: true })
  acknowledgedAt!: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  archivedAt!: Date | null;

  @Column({ type: 'boolean', default: false })
  reportedAsAbuse!: boolean;
}

@Entity('alert_deliveries')
@Index(['alertEventId'])
export class AlertDeliveryEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  alertEventId!: string;

  @ManyToOne(() => AlertEventEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'alertEventId' })
  alertEvent!: AlertEventEntity;

  @Column({ type: 'varchar', length: 20 })
  channel!: 'push' | 'whatsapp' | 'sms' | 'email';

  @Column({ type: 'varchar', length: 20, default: 'queued' })
  status!: 'queued' | 'sent' | 'delivered' | 'failed' | 'skipped';

  @Column({ type: 'varchar', length: 200, nullable: true })
  failureReason!: string | null;

  @Column({ type: 'int', default: 0 })
  attemptCount!: number;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @Column({ type: 'timestamptz', nullable: true })
  lastAttemptedAt!: Date | null;
}
