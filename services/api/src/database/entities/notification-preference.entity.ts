/**
 * Purpose: Owner notification/privacy preference entity.
 * Responsibilities: Maps `notification_preferences`, one row per user.
 * Security: `tagPaused` here is a global default; per-tag pause state
 * lives on the tag entity itself and takes precedence — see
 * modules/tags PauseTagUseCase.
 * Related: packages/api-contracts/src/notification-preferences.ts,
 * services/worker delivery-order decision logic.
 */
import { Column, Entity, JoinColumn, OneToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { UserEntity } from './user.entity';

@Entity('notification_preferences')
export class NotificationPreferenceEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', unique: true })
  userId!: string;

  @OneToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user!: UserEntity;

  @Column({ type: 'jsonb', default: () => `'["push","whatsapp","sms"]'` })
  channelOrder!: Array<'push' | 'whatsapp' | 'sms' | 'email'>;

  @Column({ type: 'boolean', default: true })
  maskedCallsEnabled!: boolean;

  @Column({ type: 'varchar', length: 5, nullable: true })
  quietHoursStart!: string | null;

  @Column({ type: 'varchar', length: 5, nullable: true })
  quietHoursEnd!: string | null;

  @Column({ type: 'boolean', default: true })
  emergencyBypassQuietHours!: boolean;

  @Column({ type: 'int', default: 90 })
  geoEventRetentionDays!: number;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}
