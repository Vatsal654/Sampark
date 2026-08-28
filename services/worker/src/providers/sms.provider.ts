/**
 * Purpose: Adapter interface + mock/unimplemented implementations for SMS
 * alert delivery.
 * Security: Never logs the destination phone number in plaintext; the
 * mock only logs a masked form via the shared logger's redaction filter.
 * Related: jobs/notification-delivery.processor.ts, webhook-caller.ts.
 */
import { Injectable, NotImplementedException } from '@nestjs/common';
import { logger, maskPhoneForDisplay } from '@sampark/shared-security';
import { WORKER_CONFIG, type WorkerConfig } from '../config/config.module';
import { WebhookCallerService } from './webhook-caller';

export interface SmsProvider {
  send(phoneE164: string, message: string, alertDeliveryId: string): Promise<{ providerMessageId: string }>;
}

export const SMS_PROVIDER = 'SMS_PROVIDER';

@Injectable()
export class MockSmsProvider implements SmsProvider {
  constructor(private readonly webhookCaller: WebhookCallerService) {}

  async send(phoneE164: string, message: string, alertDeliveryId: string): Promise<{ providerMessageId: string }> {
    logger.info('Mock SMS send', { to: maskPhoneForDisplay(phoneE164), length: message.length });
    // Simulate an async delivery report arriving shortly after the initial send.
    setTimeout(() => {
      void this.webhookCaller.send('sms', 'delivered', { alertDeliveryId });
    }, 1500);
    return { providerMessageId: `mock-sms-${crypto.randomUUID()}` };
  }
}

@Injectable()
export class UnimplementedSmsProvider implements SmsProvider {
  async send(): Promise<{ providerMessageId: string }> {
    throw new NotImplementedException('No Nepal-licensed SMS aggregator is configured. See docs/DEPLOYMENT.md.');
  }
}

export function smsProviderFactory(config: WorkerConfig, mock: MockSmsProvider, real: UnimplementedSmsProvider): SmsProvider {
  return config.SMS_PROVIDER === 'mock' ? mock : real;
}
export const SMS_PROVIDER_FACTORY = { provide: SMS_PROVIDER, useFactory: smsProviderFactory, inject: [WORKER_CONFIG, MockSmsProvider, UnimplementedSmsProvider] };
