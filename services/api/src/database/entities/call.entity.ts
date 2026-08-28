/**
 * Purpose: Masked-call and OTP-challenge entities.
 * Responsibilities: Maps `call_sessions`, `otp_challenges`, and
 * `scan_sessions` (the short-lived token issued after a scanner verifies
 * their own phone, scoping exactly one tag+action).
 * Security: `call_sessions` never stores either party's raw phone number
 * — those live only transiently in the VoiceBridgeProvider adapter's
 * in-memory bridge state, per docs/THREAT_MODEL.md §3.5. `otp_challenges`
 * stores only a hashed code (see shared-security/otp.ts).
 * Related: modules/calls, modules/auth, packages/shared-security/otp.ts.
 */
import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('otp_challenges')
@Index(['phoneLookupHash', 'purpose'])
export class OtpChallengeEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /** HMAC-keyed hash of the normalized phone this OTP was sent to — never the plaintext number. */
  @Column({ type: 'varchar', length: 64 })
  phoneLookupHash!: string;

  @Column({ type: 'varchar', length: 20 })
  purpose!: 'owner_login' | 'scanner_call_verification';

  @Column({ type: 'varchar', length: 100 })
  codeHash!: string;

  @Column({ type: 'int', default: 0 })
  attemptCount!: number;

  @Column({ type: 'boolean', default: false })
  consumed!: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @Column({ type: 'timestamptz' })
  expiresAt!: Date;
}

@Entity('scan_sessions')
@Index(['tagId'])
export class ScanSessionEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  tagId!: string;

  /** HMAC-keyed hash of the scanner's verified phone for this single session — purged by retention job. */
  @Column({ type: 'varchar', length: 64 })
  scannerPhoneLookupHash!: string;

  @Column({ type: 'varchar', length: 100 })
  tokenHash!: string;

  @Column({ type: 'varchar', length: 20 })
  scopedAction!: 'masked_call';

  @Column({ type: 'boolean', default: false })
  used!: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @Column({ type: 'timestamptz' })
  expiresAt!: Date;
}

@Entity('call_sessions')
@Index(['tagId', 'createdAt'])
export class CallSessionEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  tagId!: string;

  @Column({ type: 'uuid' })
  scanSessionId!: string;

  @Column({ type: 'varchar', length: 20, default: 'pending' })
  status!: 'pending' | 'ringing' | 'connected' | 'ended' | 'failed' | 'expired';

  /** Opaque bridge-session reference returned by the VoiceBridgeProvider — never a phone number. */
  @Column({ type: 'varchar', length: 100, nullable: true })
  providerBridgeReference!: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @Column({ type: 'timestamptz' })
  expiresAt!: Date;

  @Column({ type: 'timestamptz', nullable: true })
  endedAt!: Date | null;
}
