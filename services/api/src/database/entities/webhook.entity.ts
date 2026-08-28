/**
 * Purpose: Idempotency/replay-protection ledger for inbound provider
 * webhooks (SMS/WhatsApp/voice/push delivery callbacks).
 * Responsibilities: Maps `provider_webhook_events`; the unique constraint
 * on (provider, idempotencyKey) is the actual replay defense — application
 * code must insert-or-reject, never upsert-and-continue.
 * Security: `payload` stores only the fields the webhook signature
 * schema allow-lists (see modules/webhooks) — raw provider payloads are
 * never persisted verbatim if they could contain a phone number.
 * Related: docs/THREAT_MODEL.md §3.10, modules/webhooks.
 */
import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('provider_webhook_events')
@Index(['provider', 'idempotencyKey'], { unique: true })
export class ProviderWebhookEventEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 30 })
  provider!: 'sms' | 'whatsapp' | 'voice' | 'push';

  @Column({ type: 'varchar', length: 100 })
  idempotencyKey!: string;

  @Column({ type: 'varchar', length: 40 })
  eventType!: string;

  @Column({ type: 'jsonb' })
  payload!: Record<string, unknown>;

  @CreateDateColumn({ type: 'timestamptz' })
  receivedAt!: Date;
}
