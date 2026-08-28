/**
 * Purpose: Tag-order/fulfilment entity, kept behind a mocked payment
 * adapter interface per product spec §4H.
 * Responsibilities: Maps `orders`.
 * Security: No payment credential or card data is ever modeled here —
 * `paymentReference` is an opaque adapter-provided reference only, and
 * `FEATURE_REAL_PAYMENTS` gates whether the payment adapter's live
 * implementation can be selected at all (see shared-config/env.ts).
 * Related: modules/orders, docs/README.md payment provider note.
 */
import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('orders')
@Index(['userId'])
export class OrderEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  userId!: string;

  @Column({ type: 'int' })
  quantity!: number;

  @Column({ type: 'int' })
  amountNpr!: number;

  @Column({ type: 'varchar', length: 20, default: 'pending' })
  status!: 'pending' | 'paid' | 'fulfilled' | 'cancelled' | 'refunded';

  @Column({ type: 'varchar', length: 100, nullable: true })
  paymentReference!: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;
}
