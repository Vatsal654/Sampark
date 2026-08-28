/**
 * Purpose: Secure document vault entities.
 * Responsibilities: Maps `documents` and `document_access_grants`.
 * Security: `storageObjectKey` is a random UUID, never derived from
 * plate/user data, and is never returned directly to a client — only a
 * short-lived signed URL is (see modules/documents). Inspector shares are
 * a distinct revocable token, separate from the owner's own access.
 * Related: packages/api-contracts/src/document.ts, modules/documents.
 */
import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { UserEntity } from './user.entity';
import { VehicleEntity } from './vehicle.entity';

@Entity('documents')
@Index(['ownerId'])
export class DocumentEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  ownerId!: string;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'ownerId' })
  owner!: UserEntity;

  @Column({ type: 'uuid', nullable: true })
  vehicleId!: string | null;

  @ManyToOne(() => VehicleEntity, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'vehicleId' })
  vehicle!: VehicleEntity | null;

  @Column({ type: 'varchar', length: 30 })
  documentType!: 'rc' | 'driving_licence' | 'insurance' | 'puc_emissions' | 'other';

  @Column({ type: 'varchar', length: 200 })
  storageObjectKey!: string;

  @Column({ type: 'varchar', length: 20, default: 'pending_scan' })
  status!: 'pending_scan' | 'available' | 'rejected';

  @Column({ type: 'date', nullable: true })
  expiresOn!: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  uploadedAt!: Date;

  @Column({ type: 'timestamptz', nullable: true })
  deletedAt!: Date | null;
}

@Entity('document_access_grants')
@Index(['documentId'])
export class DocumentAccessGrantEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  documentId!: string;

  @ManyToOne(() => DocumentEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'documentId' })
  document!: DocumentEntity;

  @Column({ type: 'varchar', length: 100 })
  shareCodeHash!: string;

  @Column({ type: 'boolean', default: false })
  revoked!: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @Column({ type: 'timestamptz' })
  expiresAt!: Date;
}
