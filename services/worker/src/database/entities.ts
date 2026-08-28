/**
 * Purpose: TypeORM entities for the tables the worker reads/writes.
 * Responsibilities: A deliberately independent copy of the columns
 * services/api's entities define for the same tables — the worker and
 * API are separate deployables (docs/ARCHITECTURE.md) and each should be
 * buildable/deployable without depending on the other's build output.
 * Only the columns the worker actually touches are declared here.
 * Security: Same classification rules as services/api's entities apply —
 * see docs/PRIVACY_DATA_MAP.md. This file must stay in sync with
 * services/api/src/database/migrations for any column it references.
 * Related: services/api/src/database/entities/*, jobs/*.
 */
import { Column, CreateDateColumn, Entity, PrimaryColumn, PrimaryGeneratedColumn } from 'typeorm';

@Entity('users')
export class UserEntity {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ type: 'varchar', length: 20 }) status!: 'active' | 'deletion_requested' | 'deleted';
  @Column({ type: 'timestamptz', nullable: true }) deletionRequestedAt!: Date | null;
}

@Entity('vehicles')
export class VehicleEntity {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ type: 'uuid' }) ownerId!: string;
  @Column({ type: 'varchar', length: 60 }) displayLabel!: string;
}

@Entity('tags')
export class TagEntity {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ type: 'uuid', nullable: true }) vehicleId!: string | null;
  @Column({ type: 'uuid', nullable: true }) ownerId!: string | null;
  @Column({ type: 'varchar', length: 20 }) status!: string;
}

@Entity('notification_preferences')
export class NotificationPreferenceEntity {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ type: 'uuid' }) userId!: string;
  @Column({ type: 'jsonb' }) channelOrder!: Array<'push' | 'whatsapp' | 'sms' | 'email'>;
  @Column({ type: 'boolean' }) maskedCallsEnabled!: boolean;
  @Column({ type: 'varchar', length: 5, nullable: true }) quietHoursStart!: string | null;
  @Column({ type: 'varchar', length: 5, nullable: true }) quietHoursEnd!: string | null;
  @Column({ type: 'boolean' }) emergencyBypassQuietHours!: boolean;
}

@Entity('emergency_contacts')
export class EmergencyContactEntity {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ type: 'uuid' }) userId!: string;
  @Column({ type: 'varchar', length: 60 }) name!: string;
  @Column({ type: 'text' }) phoneEncrypted!: string;
}

@Entity('alert_events')
export class AlertEventEntity {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ type: 'uuid' }) tagId!: string;
  @Column({ type: 'uuid' }) vehicleId!: string;
  @Column({ type: 'varchar', length: 30 }) category!: string;
  @Column({ type: 'varchar', length: 10 }) severity!: 'normal' | 'emergency';
  @Column({ type: 'varchar', length: 280, nullable: true }) note!: string | null;
  @CreateDateColumn({ type: 'timestamptz' }) createdAt!: Date;
}

@Entity('alert_deliveries')
export class AlertDeliveryEntity {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ type: 'uuid' }) alertEventId!: string;
  @Column({ type: 'varchar', length: 20 }) channel!: 'push' | 'whatsapp' | 'sms' | 'email';
  @Column({ type: 'varchar', length: 20 }) status!: 'queued' | 'sent' | 'delivered' | 'failed' | 'skipped';
  @Column({ type: 'varchar', length: 200, nullable: true }) failureReason!: string | null;
  @Column({ type: 'int' }) attemptCount!: number;
  @Column({ type: 'timestamptz', nullable: true }) lastAttemptedAt!: Date | null;
}

@Entity('call_sessions')
export class CallSessionEntity {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ type: 'uuid' }) tagId!: string;
  @Column({ type: 'varchar', length: 20 }) status!: string;
  @Column({ type: 'varchar', length: 100, nullable: true }) providerBridgeReference!: string | null;
  @Column({ type: 'timestamptz' }) expiresAt!: Date;
}

@Entity('scan_sessions')
export class ScanSessionEntity {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @CreateDateColumn({ type: 'timestamptz' }) createdAt!: Date;
}

@Entity('otp_challenges')
export class OtpChallengeEntity {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @CreateDateColumn({ type: 'timestamptz' }) createdAt!: Date;
}

@Entity('documents')
export class DocumentEntity {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ type: 'uuid' }) ownerId!: string;
  @Column({ type: 'varchar', length: 200 }) storageObjectKey!: string;
  @Column({ type: 'timestamptz', nullable: true }) deletedAt!: Date | null;
}

@Entity('feature_flags')
export class FeatureFlagEntity {
  @PrimaryColumn({ type: 'varchar', length: 40 }) key!: string;
  @Column({ type: 'boolean' }) enabled!: boolean;
}

export const WORKER_ENTITIES = [
  UserEntity,
  VehicleEntity,
  TagEntity,
  NotificationPreferenceEntity,
  EmergencyContactEntity,
  AlertEventEntity,
  AlertDeliveryEntity,
  CallSessionEntity,
  ScanSessionEntity,
  OtpChallengeEntity,
  DocumentEntity,
  FeatureFlagEntity,
];
