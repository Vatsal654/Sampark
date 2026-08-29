/**
 * Purpose: Owner vehicle records.
 * Responsibilities: Maps the `vehicles` table.
 * Security: `plateNumberEncrypted`/`plateLookupHash` follow the same
 * envelope-encryption + keyed-hash pattern as phone numbers —
 * `displayLabel` is the only field ever returned to a scanner and is
 * validated at the API boundary to never resemble a plate number.
 * Related: packages/api-contracts/src/vehicle.ts, modules/vehicles.
 */
import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { UserEntity } from './user.entity';

@Entity('vehicles')
@Index(['ownerId'])
@Index(['plateLookupHash'], { unique: true })
export class VehicleEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  ownerId!: string;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'ownerId' })
  owner!: UserEntity;

  @Column({ type: 'varchar', length: 60 })
  displayLabel!: string;

  @Column({ type: 'varchar', length: 20 })
  category!: string;

  @Column({ type: 'text' })
  plateNumberEncrypted!: string;

  @Column({ type: 'varchar', length: 64 })
  plateLookupHash!: string;

  @Column({ type: 'varchar', length: 40, nullable: true })
  make!: string | null;

  @Column({ type: 'varchar', length: 40, nullable: true })
  model!: string | null;

  @Column({ type: 'varchar', length: 40, nullable: true })
  variant!: string | null;

  @Column({ type: 'smallint', nullable: true })
  manufacturingYear!: number | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  fuelType!: string | null;

  @Column({ type: 'varchar', length: 30, nullable: true })
  color!: string | null;

  @Column({ type: 'varchar', length: 32, nullable: true })
  vinNumber!: string | null;

  @Column({ type: 'varchar', length: 32, nullable: true })
  engineNumber!: string | null;

  @Column({ type: 'varchar', length: 200, nullable: true })
  imageObjectKey!: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}
