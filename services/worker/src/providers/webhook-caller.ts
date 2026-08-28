/**
 * Purpose: Lets a mock provider simulate a real provider's asynchronous
 * delivery-status callback by POSTing a signed webhook envelope back to
 * the API, exercising the exact same signature-verification path a real
 * SMS/WhatsApp/voice provider's webhook would go through.
 * Responsibilities: Signs `{idempotencyKey, eventType, timestamp, payload}`
 * with PROVIDER_WEBHOOK_SECRET using the identical scheme as
 * services/api/src/modules/webhooks/webhooks.service.ts#sign — this must
 * stay byte-for-byte identical or the mock provider's callbacks will be
 * rejected as invalid signatures.
 * Security: This is a development/demo convenience specific to the mock
 * providers; a real provider signs its own webhooks with its own key
 * distributed via that provider's dashboard, not this helper.
 * Related: services/api/src/modules/webhooks/webhooks.service.ts.
 */
import { createHmac } from 'node:crypto';
import { Injectable, Inject } from '@nestjs/common';
import { WORKER_CONFIG, type WorkerConfig } from '../config/config.module';
import { logger } from '@sampark/shared-security';

@Injectable()
export class WebhookCallerService {
  constructor(@Inject(WORKER_CONFIG) private readonly config: WorkerConfig) {}

  async send(
    provider: 'sms' | 'whatsapp' | 'voice' | 'push',
    eventType: string,
    payload: Record<string, unknown>,
  ): Promise<void> {
    const idempotencyKey = crypto.randomUUID();
    const timestamp = Math.floor(Date.now() / 1000);
    const canonical = JSON.stringify({ idempotencyKey, eventType, timestamp, payload });
    const signature = createHmac('sha256', this.config.PROVIDER_WEBHOOK_SECRET).update(canonical).digest('hex');

    try {
      await fetch(`${this.config.API_BASE_URL}/v1/webhooks/${provider}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ idempotencyKey, eventType, timestamp, signature, payload }),
      });
    } catch (error) {
      logger.warn('Mock provider webhook callback failed to reach the API', {
        provider,
        eventType,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
}
