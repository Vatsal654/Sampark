/**
 * Purpose: Verifies and records inbound provider webhooks (SMS/WhatsApp/
 * voice/push delivery callbacks), and applies voice callbacks to the
 * relevant call_sessions row.
 * Responsibilities: `verifyAndRecord` checks an HMAC signature + timestamp
 * window, then inserts into provider_webhook_events relying on its unique
 * (provider, idempotencyKey) constraint to reject replays.
 * Security: Per docs/THREAT_MODEL.md §3.10, a webhook that fails signature
 * verification or falls outside the timestamp tolerance is rejected
 * before any business logic runs. NOTE: this mock-provider implementation
 * signs over the parsed JSON body (via a canonical stringify) rather than
 * the exact raw request bytes; a production adapter for a real provider
 * must instead verify against that provider's documented raw-body scheme.
 * Related: database/entities/webhook.entity.ts, database/entities/call.entity.ts.
 */
import { BadRequestException, ConflictException, Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { ProviderWebhookEventEntity, CallSessionEntity } from '../../database/entities';
import { APP_CONFIG, type AppConfig } from '../../config/config.module';

const TIMESTAMP_TOLERANCE_SECONDS = 5 * 60;

export interface WebhookEnvelope {
  idempotencyKey: string;
  eventType: string;
  timestamp: number;
  signature: string;
  payload: Record<string, unknown>;
}

@Injectable()
export class WebhooksService {
  constructor(
    @InjectRepository(ProviderWebhookEventEntity) private readonly events: Repository<ProviderWebhookEventEntity>,
    @InjectRepository(CallSessionEntity) private readonly callSessions: Repository<CallSessionEntity>,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
  ) {}

  async verifyAndRecord(provider: ProviderWebhookEventEntity['provider'], envelope: WebhookEnvelope): Promise<void> {
    const ageSeconds = Math.abs(Date.now() / 1000 - envelope.timestamp);
    if (ageSeconds > TIMESTAMP_TOLERANCE_SECONDS) {
      throw new BadRequestException('Webhook timestamp outside tolerance window');
    }

    const expectedSignature = this.sign(envelope.idempotencyKey, envelope.eventType, envelope.timestamp, envelope.payload);
    const expectedBuf = Buffer.from(expectedSignature);
    const actualBuf = Buffer.from(envelope.signature);
    if (expectedBuf.length !== actualBuf.length || !timingSafeEqual(expectedBuf, actualBuf)) {
      throw new BadRequestException('Invalid webhook signature');
    }

    try {
      const record = this.events.create({
        provider,
        idempotencyKey: envelope.idempotencyKey,
        eventType: envelope.eventType,
        payload: envelope.payload,
      });
      await this.events.save(record);
    } catch {
      throw new ConflictException('Duplicate webhook event (already processed)');
    }

    if (provider === 'voice') {
      await this.applyVoiceEvent(envelope);
    }
  }

  sign(idempotencyKey: string, eventType: string, timestamp: number, payload: Record<string, unknown>): string {
    const canonical = JSON.stringify({ idempotencyKey, eventType, timestamp, payload });
    return createHmac('sha256', this.config.PROVIDER_WEBHOOK_SECRET).update(canonical).digest('hex');
  }

  private async applyVoiceEvent(envelope: WebhookEnvelope): Promise<void> {
    const callSessionId = envelope.payload.callSessionId;
    if (typeof callSessionId !== 'string') return;
    const session = await this.callSessions.findOne({ where: { id: callSessionId } });
    if (!session) return;

    switch (envelope.eventType) {
      case 'ringing':
        session.status = 'ringing';
        break;
      case 'connected':
        session.status = 'connected';
        break;
      case 'ended':
        session.status = 'ended';
        session.endedAt = new Date();
        break;
      case 'failed':
        session.status = 'failed';
        session.endedAt = new Date();
        break;
      default:
        return;
    }
    if (typeof envelope.payload.providerBridgeReference === 'string') {
      session.providerBridgeReference = envelope.payload.providerBridgeReference;
    }
    await this.callSessions.save(session);
  }
}
