/**
 * Purpose: Core identity entities for vehicle owners — the account
 * itself, its verified phone credential, active device sessions, and
 * recorded consents.
 * Responsibilities: Maps the `users`, `verified_phone_credentials`,
 * `user_sessions`, and `consents` tables.
 * Security: `phoneE164Encrypted`/`phoneLookupHash` implement the
 * envelope-encryption + keyed-hash pattern from docs/PRIVACY_DATA_MAP.md —
 * the plaintext phone is never a queryable column. `refreshTokenHash`
 * stores only a hash, never the token itself.
 * Related: packages/shared-security/crypto.ts, modules/auth.
 */
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export type UserStatus = 'active' | 'deletion_requested' | 'deleted';

@Entity('users')
export class UserEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  fullName!: string | null;

  @Column({ type: 'varchar', length: 10, default: 'en' })
  preferredLocale!: string;

  @Column({ type: 'varchar', length: 20, default: 'active' })
  status!: UserStatus;

  @Column({ type: 'boolean', default: false })
  biometricLockEnabled!: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;

  @Column({ type: 'timestamptz', nullable: true })
  deletionRequestedAt!: Date | null;
}

@Entity('verified_phone_credentials')
@Index(['phoneLookupHash'], { unique: true })
export class VerifiedPhoneCredentialEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  userId!: string;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user!: UserEntity;

  /** Envelope-encrypted E.164 phone number. Never selected into a log. */
  @Column({ type: 'text' })
  phoneEncrypted!: string;

  /** HMAC-keyed hash of the normalized phone, used for equality lookup only. */
  @Column({ type: 'varchar', length: 64 })
  phoneLookupHash!: string;

  @CreateDateColumn({ type: 'timestamptz' })
  verifiedAt!: Date;
}

@Entity('user_sessions')
@Index(['userId'])
export class UserSessionEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  userId!: string;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user!: UserEntity;

  @Column({ type: 'varchar', length: 80, nullable: true })
  deviceName!: string | null;

  /** bcrypt hash of the opaque refresh token — the plaintext token is never stored. */
  @Column({ type: 'varchar', length: 100 })
  refreshTokenHash!: string;

  @Column({ type: 'boolean', default: false })
  revoked!: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @Column({ type: 'timestamptz' })
  lastUsedAt!: Date;

  @Column({ type: 'timestamptz' })
  expiresAt!: Date;
}

@Entity('consents')
@Index(['userId', 'consentType'])
export class ConsentEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  userId!: string;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user!: UserEntity;

  @Column({ type: 'varchar', length: 60 })
  consentType!: string;

  @Column({ type: 'boolean' })
  granted!: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  recordedAt!: Date;
}
