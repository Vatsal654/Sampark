/**
 * Purpose: Owner emergency profile and emergency-contact entities.
 * Responsibilities: Maps `emergency_profiles` and `emergency_contacts`.
 * Security: Every scanner-visible field has its own `share*` boolean —
 * the API must AND each field with its share flag when building the
 * scanner-facing emergency card, never return the raw profile row.
 * `allergiesNoteEncrypted`/`safeInstructionsEncrypted` are envelope
 * encrypted (Critical classification, docs/PRIVACY_DATA_MAP.md).
 * Related: packages/api-contracts/src/emergency.ts, modules/emergency.
 */
import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, OneToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { UserEntity } from './user.entity';

@Entity('emergency_profiles')
export class EmergencyProfileEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', unique: true })
  userId!: string;

  @OneToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user!: UserEntity;

  @Column({ type: 'varchar', length: 5, default: 'unknown' })
  bloodGroup!: string;

  @Column({ type: 'text', nullable: true })
  allergiesNoteEncrypted!: string | null;

  @Column({ type: 'text', nullable: true })
  safeInstructionsEncrypted!: string | null;

  @Column({ type: 'boolean', default: false })
  shareBloodGroup!: boolean;

  @Column({ type: 'boolean', default: false })
  shareAllergies!: boolean;

  @Column({ type: 'boolean', default: false })
  shareSafeInstructions!: boolean;

  @Column({ type: 'boolean', default: true })
  shareContactsWithResponders!: boolean;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}

@Entity('emergency_contacts')
export class EmergencyContactEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  userId!: string;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user!: UserEntity;

  @Column({ type: 'varchar', length: 60 })
  name!: string;

  @Column({ type: 'text' })
  phoneEncrypted!: string;

  @Column({ type: 'varchar', length: 64 })
  phoneLookupHash!: string;

  @Column({ type: 'varchar', length: 40, nullable: true })
  relationship!: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;
}
