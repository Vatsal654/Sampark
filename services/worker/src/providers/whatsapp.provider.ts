/**
 * Purpose: Adapter interface + mock/unimplemented implementations for
 * WhatsApp alert delivery.
 * Security: Production implementations must only send pre-approved
 * WhatsApp Business templates (product spec §6) — the mock does not
 * enforce this since it never talks to Meta's API at all.
 * Related: sms.provider.ts (identical shape), webhook-caller.ts.
 */
import { Injectable, NotImplementedException } from '@nestjs/common';
import { logger, maskPhoneForDisplay } from '@sampark/shared-security';
import type { WorkerConfig } from '../config/config.module';
import { WORKER_CONFIG } from '../config/config.module';
import { WebhookCallerService } from './webhook-caller';

export interface WhatsAppProvider {
  sendTemplate(phoneE164: string, templateName: string, alertDeliveryId: string): Promise<{ providerMessageId: string }>;
}

export const WHATSAPP_PROVIDER = 'WHATSAPP_PROVIDER';

@Injectable()
export class MockWhatsAppProvider implements WhatsAppProvider {
  constructor(private readonly webhookCaller: WebhookCallerService) {}

  async sendTemplate(phoneE164: string, templateName: string, alertDeliveryId: string): Promise<{ providerMessageId: string }> {
    logger.info('Mock WhatsApp template send', { to: maskPhoneForDisplay(phoneE164), templateName });
    setTimeout(() => {
      void this.webhookCaller.send('whatsapp', 'delivered', { alertDeliveryId });
    }, 1500);
    return { providerMessageId: `mock-wa-${crypto.randomUUID()}` };
  }
}

@Injectable()
export class UnimplementedWhatsAppProvider implements WhatsAppProvider {
  async sendTemplate(): Promise<{ providerMessageId: string }> {
    throw new NotImplementedException('No WhatsApp Business API access is configured. See docs/DEPLOYMENT.md.');
  }
}

export function whatsappProviderFactory(config: WorkerConfig, mock: MockWhatsAppProvider, real: UnimplementedWhatsAppProvider): WhatsAppProvider {
  return config.WHATSAPP_PROVIDER === 'mock' ? mock : real;
}
export const WHATSAPP_PROVIDER_FACTORY = {
  provide: WHATSAPP_PROVIDER,
  useFactory: whatsappProviderFactory,
  inject: [WORKER_CONFIG, MockWhatsAppProvider, UnimplementedWhatsAppProvider],
};
