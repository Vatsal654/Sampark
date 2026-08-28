/**
 * Purpose: Physical tag lifecycle entities — the tag itself, its
 * fulfilment shipment record, and the activation-challenge audit trail.
 * Responsibilities: Maps `tags`, `tag_shipments`, and
 * `tag_activation_challenges`.
 * Security: `opaqueId` is public (printed on the sticker); ownership
 * binding requires a separate `activationPinHash` proof (never the
 * opaque ID alone) per docs/THREAT_MODEL.md §3.2. `signature` is derived,
 * never trusted from client input — always recomputed server-side.
 * Related: packages/shared-security/tag-signature.ts, modules/tags,
 * modules/public-tag.
 */
import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { UserEntity } from './user.entity';
import { VehicleEntity } from './vehicle.entity';

export type TagStatus =
  | 'manufactured'
  | 'issued'
  | 'pending_activation'
  | 'active'
  | 'paused'
  | 'reported_lost'
  | 'revoked'
  | 'replaced';

@Entity('tags')
@Index(['opaqueId'], { unique: true })
export class TagEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 32, unique: true })
  opaqueId!: string;

  @Column({ type: 'varchar', length: 20, default: 'manufactured' })
  status!: TagStatus;

  /** bcrypt hash of the physical activation PIN shipped separately from the QR sticker. */
  @Column({ type: 'varchar', length: 100, nullable: true })
  activationPinHash!: string | null;

  @Column({ type: 'uuid', nullable: true })
  vehicleId!: string | null;

  @ManyToOne(() => VehicleEntity, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'vehicleId' })
  vehicle!: VehicleEntity | null;

  @Column({ type: 'uuid', nullable: true })
  ownerId!: string | null;

  @ManyToOne(() => UserEntity, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'ownerId' })
  owner!: UserEntity | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;

  @Column({ type: 'timestamptz', nullable: true })
  activatedAt!: Date | null;
}

@Entity('tag_shipments')
@Index(['tagId'])
export class TagShipmentEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  tagId!: string;

  @ManyToOne(() => TagEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tagId' })
  tag!: TagEntity;

  @Column({ type: 'varchar', length: 60 })
  batchReference!: string;

  @Column({ type: 'varchar', length: 20, default: 'issued' })
  shipmentStatus!: 'issued' | 'shipped' | 'delivered' | 'warranty_replacement';

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;
}

@Entity('tag_activation_challenges')
@Index(['tagId'])
export class TagActivationChallengeEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  tagId!: string;

  @ManyToOne(() => TagEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tagId' })
  tag!: TagEntity;

  @Column({ type: 'uuid' })
  requestedByUserId!: string;

  @Column({ type: 'boolean' })
  successful!: boolean;

  @Column({ type: 'varchar', length: 20 })
  outcome!: 'activated' | 'invalid_pin' | 'already_active' | 'reassigned';

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;
}
