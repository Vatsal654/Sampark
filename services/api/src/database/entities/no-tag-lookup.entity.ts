/**
 * Purpose: Audit/data-model scaffold for the disabled-by-default no-tag
 * vehicle lookup feature (product spec §7).
 * Responsibilities: Maps `no_tag_lookup_requests`. Recording a row here
 * never implies a real relay call was made — `outcome` is
 * `feature_disabled` for every request while `FEATURE_NO_TAG_LOOKUP=false`.
 * Security: This entity intentionally has no field capable of holding
 * owner PII — see modules/no-tag-lookup and docs/DECISIONS.md ADR-5.
 * Related: modules/no-tag-lookup.
 */
import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('no_tag_lookup_requests')
@Index(['requestedByUserId'])
export class NoTagLookupRequestEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  requestedByUserId!: string;

  @Column({ type: 'varchar', length: 64 })
  plateLookupHash!: string;

  @Column({ type: 'varchar', length: 280 })
  statedReason!: string;

  @Column({ type: 'varchar', length: 30, default: 'feature_disabled' })
  outcome!: 'feature_disabled' | 'relay_attempted' | 'rate_limited' | 'blocked' | 'human_review';

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;
}
